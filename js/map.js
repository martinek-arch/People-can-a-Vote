export function createMapController({
  t,
  mapboxToken,
  loadMapboxLib,
  getCountryStats,
  getMaxCountryVotes,
  getCountries,
  navigateCountry,
}) {
  let mapInstance = null;
  let mapReady = false;

  function findCountryByCode(code) {
    if (!code) return null;
    const normalized = code.toUpperCase();
    return getCountries().find((c) => String(c.code || "").toUpperCase() === normalized) || null;
  }

  function findCountryByName(name) {
    if (!name) return null;
    const normalized = name.toLowerCase();
    return getCountries().find((c) => String(c.name || "").toLowerCase() === normalized) || null;
  }

  function updateMapChoropleth() {
    const countryStats = getCountryStats();
    if (!mapInstance || !mapReady || !countryStats.size) return;
    const denom = getMaxCountryVotes() || 1;
    for (const [code, stats] of countryStats.entries()) {
      if (!code) continue;
      const intensity = stats.events > 0 ? Math.max(0.1, stats.votes / denom) : 0;
      mapInstance.setFeatureState(
        { source: "countries", sourceLayer: "country_boundaries", id: code },
        { intensity }
      );
    }
  }

  async function initWorldMap() {
    const mapHost = document.getElementById("worldMap");
    if (!mapHost) return;
    const mapNote = document.querySelector(".mapNote");

    function showMapFallback(message) {
      mapHost.classList.add("mapPlaceholder");
      mapHost.innerHTML = message;
      if (mapNote) {
        mapNote.textContent = t("map.unavailable");
      }
    }

    if (!mapboxToken) {
      showMapFallback(t("map.missingToken"));
      return;
    }

    try {
      const mapboxgl = await loadMapboxLib();
      mapboxgl.accessToken = mapboxToken;
      mapInstance = new mapboxgl.Map({
        container: mapHost,
        style: "mapbox://styles/mapbox/light-v11",
        center: [10, 20],
        zoom: 1.1
      });

      mapInstance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      let hoveredCountryId = null;

      mapInstance.on("load", () => {
        if (!mapInstance.getSource("countries")) {
          mapInstance.addSource("countries", {
            type: "vector",
            url: "mapbox://mapbox.country-boundaries-v1",
            promoteId: "iso_3166_1"
          });
        }

        if (!mapInstance.getLayer("country-fills")) {
          mapInstance.addLayer({
            id: "country-fills",
            type: "fill",
            source: "countries",
            "source-layer": "country_boundaries",
            paint: {
              "fill-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                "#93c5fd",
                [
                  "case",
                  [">", ["feature-state", "intensity"], 0],
                  [
                    "interpolate",
                    ["linear"],
                    ["feature-state", "intensity"],
                    0,
                    "#fee2e2",
                    1,
                    "#b91c1c"
                  ],
                  "rgba(0, 0, 0, 0)"
                ]
              ],
              "fill-opacity": 0.6
            }
          });
        }

        if (!mapInstance.getLayer("country-lines")) {
          mapInstance.addLayer({
            id: "country-lines",
            type: "line",
            source: "countries",
            "source-layer": "country_boundaries",
            paint: {
              "line-color": "#60a5fa",
              "line-width": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                1.5,
                0.3
              ]
            }
          });
        }

        mapReady = true;
        updateMapChoropleth();

        mapInstance.on("mousemove", "country-fills", (e) => {
          if (!e.features?.length) return;
          mapInstance.getCanvas().style.cursor = "pointer";
          const nextId = e.features[0].id;
          if (hoveredCountryId !== null && hoveredCountryId !== nextId) {
            mapInstance.setFeatureState(
              { source: "countries", sourceLayer: "country_boundaries", id: hoveredCountryId },
              { hover: false }
            );
          }
          hoveredCountryId = nextId;
          mapInstance.setFeatureState(
            { source: "countries", sourceLayer: "country_boundaries", id: hoveredCountryId },
            { hover: true }
          );
        });

        mapInstance.on("mouseleave", "country-fills", () => {
          mapInstance.getCanvas().style.cursor = "";
          if (hoveredCountryId !== null) {
            mapInstance.setFeatureState(
              { source: "countries", sourceLayer: "country_boundaries", id: hoveredCountryId },
              { hover: false }
            );
          }
          hoveredCountryId = null;
        });
      });

      mapInstance.on("click", async (e) => {
        const { lng, lat } = e.lngLat;
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=country&access_token=${mapboxToken}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Mapbox geocoding failed");
          const data = await res.json();
          const feature = data?.features?.[0];
          const shortCode = feature?.properties?.short_code;
          const name = feature?.text;
          const country = findCountryByCode(shortCode) || findCountryByName(name);
          if (country) {
            navigateCountry(country.code);
          } else if (name) {
            alert(t("map.countryNotFound", { name }));
          }
        } catch (err) {
          console.warn("Map lookup failed", err);
        }
      });
    } catch (err) {
      console.warn("Mapbox init failed", err);
      showMapFallback(t("map.loadFailed"));
    }
  }

  return { initWorldMap, updateMapChoropleth };
}
