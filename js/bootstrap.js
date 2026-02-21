export function createBoot(debugBoot) {
  return function boot(msg) {
    const el = document.getElementById("boot");
    if (el) {
      el.textContent = msg;
      if (!debugBoot && (msg === "Boot: ready" || msg.startsWith("Startup error:"))) {
        el.style.display = "none";
      }
    }
    if (debugBoot) {
      console.log(msg);
    }
  };
}

export async function loadSupabaseLib(boot) {
  boot("Init: loading Supabase…");
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.async = true;
    s.onload = () => resolve(window.supabase);
    s.onerror = () => reject(new Error("Supabase load failed"));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error("Supabase load timeout")), 12000);
  });
}

export async function loadMapboxLib() {
  return new Promise((resolve, reject) => {
    if (window.mapboxgl) {
      resolve(window.mapboxgl);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js";
    s.async = true;
    s.onload = () => resolve(window.mapboxgl);
    s.onerror = () => reject(new Error("Mapbox load failed"));
    document.head.appendChild(s);
  });
}
