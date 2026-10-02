const https = require("https");

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

  await sleep(1100);

  const dest = await geocode(destination);
  if (dest) {
    result.destLat = dest.lat;
    result.destLng = dest.lng;
  }

  return result;
}

module.exports = { geocode, geocodeTripEndpoints };
