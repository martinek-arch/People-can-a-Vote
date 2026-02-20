# People-can-a-Vote

## Runtime config
- Mapbox token is loaded at runtime from `window.__PCV_CONFIG__.mapboxToken` or `localStorage["pcvMapboxToken"]`.
- This avoids committing tokens directly in the repository.
- Token should be configured by deploy/runtime (`window.__PCV_CONFIG__.mapboxToken`) or localStorage key `pcvMapboxToken` for local testing.
- Recommended production setup: inject `window.__PCV_CONFIG__.mapboxToken` in host HTML/template.
- Optional file-based setup: set `window.__PCV_RUNTIME_CONFIG_URL__ = "js/runtime-config.json"` and provide the JSON file on host (not in git).
- See `js/runtime-config.example.json` for format.
- Recommended production setup: create `js/runtime-config.json` on hosting (not in git) with `{ "mapboxToken": "pk..." }`.
- See `js/runtime-config.example.json` for format.
- Local quick setup in browser console:
  - `localStorage.setItem("pcvMapboxToken", "pk.YOUR_PUBLIC_TOKEN")`
  - reload page

## Troubleshooting
- If browser console shows stale syntax errors (for example `Unexpected token <<` in `i18n.js`), do a hard refresh (`Ctrl+F5`) to clear cached modules.
- Messages starting with `contentScript.js` or `runtime.lastError` usually come from browser extensions, not from this app code.
