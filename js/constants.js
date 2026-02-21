const runtimeConfig = window.__PCV_CONFIG__ || {};
const BUILTIN_MAPBOX_PUBLIC_TOKEN = "pk.eyJ1IjoiaGVyZ290dCIsImEiOiJjbWttdHQ3cmYwZ2hmM2pyMjd2bmk1c3ZmIn0.-9CViuw1h3-gy49EsKvFiQ";

function normalizeToken(token) {
  const value = String(token || "").trim();
  if (!value) return "";
  if (/YOUR_PUBLIC_TOKEN|TVUJ_PUBLIC_TOKEN/i.test(value)) return "";
  return value;
}

export const SUPABASE_URL = "https://jqoomnhpyuikbntnrukw.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_SjZ_HQWN0XRE9ebbf_OwQg_kmJeS43h";
export const APP_BASE_URL = "https://martinek-arch.github.io/People-can-a-Vote/";
export const MAPBOX_TOKEN =
  normalizeToken(runtimeConfig.mapboxToken) ||
  normalizeToken(BUILTIN_MAPBOX_PUBLIC_TOKEN) ||
  normalizeToken(window.localStorage.getItem("pcvMapboxToken"));
