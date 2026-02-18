# People-can-a-Vote

## Runtime config
- Mapbox token is loaded at runtime from `window.__PCV_CONFIG__.mapboxToken` or `localStorage["pcvMapboxToken"]`.
- This avoids committing tokens directly in the repository.
- Quick setup: open the app once with `?mapboxToken=YOUR_PK_TOKEN` in URL; token is saved to localStorage and removed from URL.

## Troubleshooting
- If browser console shows stale syntax errors (for example `Unexpected token <<` in `i18n.js`), do a hard refresh (`Ctrl+F5`) to clear cached modules.
- Messages starting with `contentScript.js` or `runtime.lastError` usually come from browser extensions, not from this app code.
