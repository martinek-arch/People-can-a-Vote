import { searchEvents } from "./data-layer.js?v=20260220i";

export function createSearchFlow({
  t,
  getSupabaseClient,
  getCachedCountriesAll,
  getSearchIndex,
  setSearchIndex,
  navigateCountry,
  navigateEvent,
  setCurrentCountry,
}) {
  let searchTimer = null;

  function rebuildSearchIndex() {
    const list = document.getElementById("searchOptions");
    if (!list) return;

    list.innerHTML = "";
    const nextIndex = new Map();
    for (const c of getCachedCountriesAll()) {
      const label = t("search.countryLabel", { name: c.name, code: c.code });
      const opt = document.createElement("option");
      opt.value = label;
      list.appendChild(opt);
      nextIndex.set(label.toLowerCase(), { type: "country", code: c.code });
    }
    setSearchIndex(nextIndex);
  }

  async function updateSearch(term) {
    const list = document.getElementById("searchOptions");
    if (!list) return;

    const trimmed = (term || "").trim();
    const normalized = trimmed.toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      rebuildSearchIndex();
      return;
    }

    if (getSearchIndex().has(normalized)) {
      return;
    }

    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      rebuildSearchIndex();
      const supabaseClient = getSupabaseClient();
      const { data, error } = await searchEvents(supabaseClient, trimmed, 8);
      if (error || !data) return;

      const nextIndex = new Map(getSearchIndex());
      for (const ev of data) {
        const label = t("search.eventLabel", { title: ev.title, code: ev.country_code || "??" });
        const opt = document.createElement("option");
        opt.value = label;
        list.appendChild(opt);
        nextIndex.set(label.toLowerCase(), { type: "event", id: ev.id, country: ev.country_code });
      }
      setSearchIndex(nextIndex);
    }, 250);
  }

  function handleSearchSubmit() {
    const input = document.getElementById("globalSearch");
    if (!input) return;

    const value = (input.value || "").trim();
    const normalized = value.toLowerCase();
    if (!value) return;

    const searchIndex = getSearchIndex();
    let hit = searchIndex.get(normalized);
    if (!hit) {
      for (const [key, entry] of searchIndex.entries()) {
        if (key.includes(normalized)) {
          hit = entry;
          break;
        }
      }
    }

    if (hit?.type === "country") {
      navigateCountry(hit.code);
      return;
    }

    if (hit?.type === "event") {
      if (hit.country) {
        setCurrentCountry(hit.country);
      }
      navigateEvent(hit.id);
    }
  }

  function bindSearchUI() {
    const globalSearch = document.getElementById("globalSearch");
    if (!globalSearch) return;

    globalSearch.setAttribute("list", "searchOptions");
    globalSearch.addEventListener("input", (e) => updateSearch(e.target.value));
    globalSearch.addEventListener("change", handleSearchSubmit);
    globalSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleSearchSubmit();
      }
    });
  }

  return { rebuildSearchIndex, updateSearch, handleSearchSubmit, bindSearchUI };
}
