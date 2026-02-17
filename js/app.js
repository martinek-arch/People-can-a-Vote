diff --git a/js/app.js b/js/app.js
index 1a2595bdf7082061191b2c4b26f136c87c4d2418..f323067d08d86f0e59996b3db62edbb9cc7d1bd9 100644
--- a/js/app.js
+++ b/js/app.js
@@ -1,69 +1,67 @@
+import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_BASE_URL, MAPBOX_TOKEN } from "./constants.js";
+import { escapeHtml, pct, formatDate, formatRemainingTime, getEventEnd, setBar } from "./formatters.js";
+
 if (window.__PCV_INIT_DONE__) {
   console.warn("PCV: duplicate init prevented");
 } else {
   window.__PCV_INIT_DONE__ = true;
 
   function boot(msg) {
     const el = document.getElementById("boot");
     if (el) el.textContent = msg;
     console.log(msg);
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
       s.onerror = () => reject(new Error("Mapbox load failed"));
       document.head.appendChild(s);
     });
   }
 
-  const SUPABASE_URL = "https://jqoomnhpyuikbntnrukw.supabase.co";
-  const SUPABASE_ANON_KEY = "sb_publishable_SjZ_HQWN0XRE9ebbf_OwQg_kmJeS43h";
-  const APP_BASE_URL = "https://martinek-arch.github.io/People-can-a-Vote/";
-  const MAPBOX_TOKEN = "pk.eyJ1IjoiaGVyZ290dCIsImEiOiJjbWttdHQ3cmYwZ2hmM2pyMjd2bmk1c3ZmIn0.-9CViuw1h3-gy49EsKvFiQ";
-
   let supabaseClient = null;
   let session = null;
   let isVerified = false;
   let cachedContinents = [];
   let cachedCountries = [];
   let cachedCountriesAll = [];
   let countryStats = new Map();
   let maxCountryVotes = 0;
   let searchIndex = new Map();
   let currentCountry = null;
   let currentContinentId = null;
   let currentEventId = null;
   let currentEventTitle = null;
   let mapInstance = null;
   let mapReady = false;
 
   /* ===== Modal state ===== */
   // login | register | update
   let authMode = "login";
 
   const overlay = document.getElementById("overlay");
   const tabLogin = document.getElementById("tabLogin");
   const tabRegister = document.getElementById("tabRegister");
   const tabUpdate = document.getElementById("tabUpdate");
   const submitAuthBtn = document.getElementById("submitAuthBtn");
@@ -253,92 +251,52 @@ if (window.__PCV_INIT_DONE__) {
     isVerified = !!session.user?.email_confirmed_at;
     const email = session.user?.email || "uživatel";
 
     navUser.textContent = email + (isVerified ? " (ověřený)" : " (neověřený)");
     navHint.textContent = isVerified
       ? ""
       : "Prosím potvrď email (odkaz v emailu) – bez ověření nejde hlasovat.";
 
     loginBtn.classList.add("hidden");
     registerBtn.classList.add("hidden");
     changeBtn.classList.remove("hidden");
     logoutBtn.classList.remove("hidden");
 
     disableVoteButtons(!isVerified);
   }
 
   function canVote() { return !!session && !!isVerified; }
 
   async function signOut() {
     boot("Auth: signing out…");
     await supabaseClient.auth.signOut();
     boot("Auth: signed out");
   }
 
   /* ===== Data rendering ===== */
-  function escapeHtml(s) {
-    return String(s ?? "")
-      .replaceAll("&", "&amp;")
-      .replaceAll("<", "&lt;")
-      .replaceAll(">", "&gt;")
-      .replaceAll('"', "&quot;")
-      .replaceAll("'", "&#039;");
-  }
-
-
-  function pct(n, d) {
-    if (!d || d <= 0) return 0;
-    return Math.round((n / d) * 100);
-  }
-  function formatDate(value) {
-    if (!value) return "neuvedeno";
-    const d = new Date(value);
-    if (Number.isNaN(d.getTime())) return "neuvedeno";
-    return d.toLocaleDateString("cs-CZ");
-  }
-  function formatRemainingTime(value) {
-    if (!value) return "neuvedeno";
-    const now = Date.now();
-    const end = new Date(value).getTime();
-    if (Number.isNaN(end)) return "neuvedeno";
-    const diff = Math.max(0, end - now);
-    const hours = Math.floor(diff / 36e5);
-    const minutes = Math.floor((diff % 36e5) / 6e4);
-    return `${hours} h ${minutes} min`;
-  }
-  function getEventEnd(eventItem) {
-    if (eventItem?.ends_at) return new Date(eventItem.ends_at).getTime();
-    if (eventItem?.created_at) {
-      return new Date(eventItem.created_at).getTime() + 30 * 24 * 60 * 60 * 1000;
-    }
-    return NaN;
-  }
   window.getEventEnd = getEventEnd;
-  function setBar(el, valuePct) {
-    const v = Math.max(0, Math.min(100, Number(valuePct) || 0));
-    if (el) el.style.width = v + "%";
-  }
+
   function renderResultBlock(title, r, sizeClass) {
     const yes = r?.yes || 0, no = r?.no || 0, dk = r?.dk || 0, total = r?.total || 0;
     const wrap = document.createElement("div");
     wrap.className = "resultBlock " + (sizeClass || "large");
     wrap.innerHTML = `
       <div class="resultTitle">${escapeHtml(title)}</div>
 
       <div class="rowBar">
         <div><b>Ano</b></div>
         <div class="bar"><div class="barFill" data-k="yes"></div></div>
         <div class="pct">${pct(yes,total)}%</div>
       </div>
       <div class="rowBar">
         <div><b>Ne</b></div>
         <div class="bar"><div class="barFill" data-k="no"></div></div>
         <div class="pct">${pct(no,total)}%</div>
       </div>
       <div class="rowBar">
         <div><b>Nevím</b></div>
         <div class="bar"><div class="barFill" data-k="dk"></div></div>
         <div class="pct">${pct(dk,total)}%</div>
       </div>
 
       <div class="countLine">Hlasů celkem: <b>${total}</b> (Ano: ${yes}, Ne: ${no}, Nevím: ${dk})</div>
     `;
