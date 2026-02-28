# People-can-a-Vote

## Runtime config
- Mapbox token is resolved in this order: `window.__PCV_CONFIG__.mapboxToken` → built-in public token → `localStorage["pcvMapboxToken"]`.
- Built-in token keeps the map working out of the box; runtime config still has highest priority.
- Recommended production setup: inject `window.__PCV_CONFIG__.mapboxToken` in host HTML/template when you want to override token by environment.
- Optional file-based setup: set `window.__PCV_RUNTIME_CONFIG_URL__ = "js/runtime-config.json"` and provide the JSON file on host (not in git).
- See `js/runtime-config.example.json` for format.
- Local quick setup in browser console (optional override):
  - `localStorage.setItem("pcvMapboxToken", "pk.YOUR_PUBLIC_TOKEN")`
  - reload page

## Troubleshooting
- If browser console shows stale syntax errors (for example `Unexpected token <<` in `i18n.js`), do a hard refresh (`Ctrl+F5`) to clear cached modules.
- Messages starting with `contentScript.js` or `runtime.lastError` usually come from browser extensions, not from this app code.

- Debug panel (build/token-source/map renderer): set `localStorage.setItem("pcvDebug", "1")` and reload.

## Smoke checks
- Run repeatable browser smoke scenarios (Mapbox default + forced Leaflet fallback):
  - `python3 scripts/smoke_checks.py --start-server`
- The script enables debug mode (`pcvDebug=1`) and validates renderer state through the debug panel.
