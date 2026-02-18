# People-can-a-Vote

## Runtime config
- Mapbox token is loaded at runtime from `window.__PCV_CONFIG__.mapboxToken` or `localStorage["pcvMapboxToken"]`.
- This avoids committing tokens directly in the repository.
