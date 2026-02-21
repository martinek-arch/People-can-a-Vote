const runtimeConfigUrl = window.__PCV_RUNTIME_CONFIG_URL__;

if (runtimeConfigUrl) {
  try {
    const res = await fetch(new URL(runtimeConfigUrl, window.location.href), { cache: "no-store" });
    if (res.ok) {
      const cfg = await res.json();
      if (cfg && typeof cfg === "object") {
        window.__PCV_CONFIG__ = window.__PCV_CONFIG__ || {};
        Object.assign(window.__PCV_CONFIG__, cfg);
      }
    }
  } catch {
    // optional config file missing/unavailable
  }
}

await import("./app.js?v=20260220b");
