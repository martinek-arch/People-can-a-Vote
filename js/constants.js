const runtimeConfig = window.__PCV_CONFIG__ || {};

export const SUPABASE_URL = "https://jqoomnhpyuikbntnrukw.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_SjZ_HQWN0XRE9ebbf_OwQg_kmJeS43h";
export const APP_BASE_URL = "https://martinek-arch.github.io/People-can-a-Vote/";
export const MAPBOX_TOKEN = runtimeConfig.mapboxToken || window.localStorage.getItem("pcvMapboxToken") || "";
