const runtimeConfig = window.__PCV_CONFIG__ || {};
const BUILTIN_MAPBOX_PUBLIC_TOKEN = "pk.eyJ1IjoiaGVyZ290dCIsImEiOiJjbWttdHQ3cmYwZ2hmM2pyMjd2bmk1c3ZmIn0.-9CViuw1h3-gy49EsKvFiQ";

function normalizeToken(token) {
  const value = String(token || "").trim();
  if (!value) return "";
  if (/YOUR_PUBLIC_TOKEN|TVUJ_PUBLIC_TOKEN/i.test(value)) return "";
  return value;
}

function resolveMapboxToken() {
  const runtime = normalizeToken(runtimeConfig.mapboxToken);
  if (runtime) return { token: runtime, source: "runtime-config" };

  const builtin = normalizeToken(BUILTIN_MAPBOX_PUBLIC_TOKEN);
  if (builtin) return { token: builtin, source: "built-in" };

  const storage = normalizeToken(window.localStorage.getItem("pcvMapboxToken"));
  if (storage) return { token: storage, source: "localStorage" };

  return { token: "", source: "none" };
}

const resolvedMapbox = resolveMapboxToken();

export const APP_BUILD_VERSION = "20260220g";
export const SUPABASE_URL = "https://jqoomnhpyuikbntnrukw.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_SjZ_HQWN0XRE9ebbf_OwQg_kmJeS43h";
export const APP_BASE_URL = "https://martinek-arch.github.io/People-can-a-Vote/";
export const MAPBOX_TOKEN = resolvedMapbox.token;
export const MAPBOX_TOKEN_SOURCE = resolvedMapbox.source;
