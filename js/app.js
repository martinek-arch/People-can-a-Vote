diff --git a/js/app.js b/js/app.js
index f323067d08d86f0e59996b3db62edbb9cc7d1bd9..9b21bf921b0c6c25619799fb7d1214bcecfb34c6 100644
--- a/js/app.js
+++ b/js/app.js
@@ -1,37 +1,46 @@
 import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_BASE_URL, MAPBOX_TOKEN } from "./constants.js";
 import { escapeHtml, pct, formatDate, formatRemainingTime, getEventEnd, setBar } from "./formatters.js";
 
 if (window.__PCV_INIT_DONE__) {
   console.warn("PCV: duplicate init prevented");
 } else {
   window.__PCV_INIT_DONE__ = true;
 
  const debugBoot = window.localStorage.getItem("pcvDebug") === "1";

   function boot(msg) {
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
   }
 
   async function loadSupabase() {
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
 
   async function loadMapbox() {
     return new Promise((resolve, reject) => {
       if (window.mapboxgl) {
         resolve(window.mapboxgl);
         return;
       }
       const s = document.createElement("script");
       s.src = "https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js";
       s.async = true;
       s.onload = () => resolve(window.mapboxgl);
