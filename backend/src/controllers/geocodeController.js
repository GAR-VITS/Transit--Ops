const https = require("https");

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";
const USER_AGENT = "TransitOps-FleetMgmt/1.0 (dev)";

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(new Error("Failed to parse response"));
            }
          });
        }
      )
      .on("error", reject);
  });
}

async function search(req, res) {
  const { query } = req.query;
  if (!query || query.trim().length < 2) {
    return res.json([]);
  }

  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=5&addressdetails=1`;
    const data = await fetchJSON(url);

    const suggestions = (data || []).map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));

    res.json(suggestions);
  } catch (err) {
    console.error("Nominatim search failed:", err.message);
    res.status(502).json({ error: "Geocoding service unavailable" });
  }
}

async function reverse(req, res) {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`;
    const data = await fetchJSON(url);

    if (data && data.display_name) {
      res.json({
        displayName: data.display_name,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
      });
    } else {
      res.status(404).json({ error: "No address found for these coordinates" });
    }
  } catch (err) {
    console.error("Nominatim reverse failed:", err.message);
    res.status(502).json({ error: "Reverse geocoding service unavailable" });
  }
}

async function calculateRoute(req, res) {
  const { sourceLat, sourceLng, destLat, destLng } = req.body;

  if (!sourceLat || !sourceLng || !destLat || !destLng) {
    return res.status(400).json({ error: "All four coordinates are required" });
  }

  try {
    const url = `${OSRM_BASE}/route/v1/driving/${sourceLng},${sourceLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const data = await fetchJSON(url);

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return res
        .status(404)
        .json({ error: "No route found between these points" });
    }

    const route = data.routes[0];
    res.json({
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.round(route.duration / 60),
      routeGeoJson: route.geometry,
    });
  } catch (err) {
    console.error("OSRM route calculation failed:", err.message);
    res.status(502).json({ error: "Routing service unavailable" });
  }
}

module.exports = { search, reverse, calculateRoute };
