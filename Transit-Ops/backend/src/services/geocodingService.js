/**
 * Geocoding service — uses OpenStreetMap Nominatim (free, no API key).
 * Rate-limited to 1 req/s by OSM policy; we add a small delay between calls.
 */

const https = require("https");

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

/**
 * Geocode a place name / address string → { lat, lng } or null.
 */
function geocode(query) {
  return new Promise((resolve) => {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1`;

    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "TransitOps-FleetMgmt/1.0 (dev)",
            Accept: "application/json",
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              const data = JSON.parse(body);
              if (data && data.length > 0) {
                resolve({
                  lat: parseFloat(data[0].lat),
                  lng: parseFloat(data[0].lon),
                });
              } else {
                resolve(null);
              }
            } catch {
              resolve(null);
            }
          });
        }
      )
      .on("error", () => resolve(null));
  });
}

/**
 * Small delay helper to respect Nominatim's 1 req/s policy.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Geocode both origin and destination in sequence (with 1-second gap).
 * Returns { sourceLat, sourceLng, destLat, destLng } — any may be null.
 */
async function geocodeTripEndpoints(origin, destination) {
  const result = {
    sourceLat: null,
    sourceLng: null,
    destLat: null,
    destLng: null,
  };

  const src = await geocode(origin);
  if (src) {
    result.sourceLat = src.lat;
    result.sourceLng = src.lng;
  }

  await sleep(1100); // respect Nominatim rate limit

  const dest = await geocode(destination);
  if (dest) {
    result.destLat = dest.lat;
    result.destLng = dest.lng;
  }

  return result;
}

module.exports = { geocode, geocodeTripEndpoints };
