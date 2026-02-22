import { fetchCountryStatsEvents, fetchCountryStatsVotes, fetchEventsByCountry, fetchEventResults, fetchUserVotesForEvents, fetchCountryTopEvent } from "./data-layer.js?v=20260220f";

export function createCountryFlow({
  t,
  boot,
  mapController,
  getSupabaseClient,
  getSession,
  getCachedCountriesAll,
  getCurrentContinentId,
  setCountryStats,
  setMaxCountryVotes,
  setCurrentCountry,
  fillCountries,
  renderEvents,
  updateBreadcrumb,
  escapeHtml,
}) {
  async function loadCountryStats() {
    const supabaseClient = getSupabaseClient();
    const cachedCountriesAll = getCachedCountriesAll();

    const { data: events, error: eventsErr } = await fetchCountryStatsEvents(supabaseClient);
    if (eventsErr) throw new Error("Country stats events load failed: " + eventsErr.message);

    const countMap = new Map();
    for (const ev of events || []) {
      if (!ev.country_code) continue;
      const code = String(ev.country_code).toUpperCase();
      countMap.set(code, (countMap.get(code) || 0) + 1);
    }

    const { data: voteRows, error: votesErr } = await fetchCountryStatsVotes(supabaseClient);
    if (votesErr) throw new Error("Country stats votes load failed: " + votesErr.message);

    const votesMap = new Map();
    for (const row of voteRows || []) {
      const code = row.events?.country_code;
      if (!code) continue;
      const normalized = String(code).toUpperCase();
      votesMap.set(normalized, (votesMap.get(normalized) || 0) + (row.votes || 0));
    }

    const countryStats = new Map();
    let maxCountryVotes = 0;
    for (const co of cachedCountriesAll) {
      const code = String(co.code || "").toUpperCase();
      const eventCount = countMap.get(code) || 0;
      const totalVotes = votesMap.get(code) || 0;
      countryStats.set(code, { events: eventCount, votes: totalVotes });
      if (totalVotes > maxCountryVotes) maxCountryVotes = totalVotes;
    }

    setCountryStats(countryStats);
    setMaxCountryVotes(maxCountryVotes);

    mapController.updateMapChoropleth();
    const currentContinentId = getCurrentContinentId();
    if (currentContinentId !== null && typeof fillCountries === "function") {
      await fillCountries(currentContinentId, false);
    }
  }

  async function loadCountryTop(events) {
    const target = document.getElementById("countryTop");
    if (!events?.length) {
      target.textContent = t("event.topEmpty");
      return;
    }

    const supabaseClient = getSupabaseClient();
    const ids = events.map((e) => e.id);
    const { data, error } = await fetchCountryTopEvent(supabaseClient, ids);

    if (error || !data?.length) {
      target.textContent = t("event.topEmpty");
      return;
    }

    const top = data[0];
    const event = events.find((e) => e.id === top.event_id);
    target.innerHTML = `
      <div class="eventTitle">${escapeHtml(event?.title || t("event.title"))}</div>
      <div class="muted">${t("event.votersTotal", { count: top.votes || 0 })}</div>
    `;
  }

  async function loadEventsForCountry(countryCode) {
    if (!countryCode) return;
    const supabaseClient = getSupabaseClient();
    const session = getSession();

    boot("Data: loading events…");
    setCurrentCountry(countryCode);
    const { data, error } = await fetchEventsByCountry(supabaseClient, countryCode);

    if (error) throw new Error("Events load failed: " + error.message);

    const events = data || [];
    const ids = events.map((x) => x.id);

    let votesMap = new Map();
    if (session?.user?.id && ids.length) {
      try {
        const { data: myVotes, error: vErr } = await fetchUserVotesForEvents(supabaseClient, session.user.id, ids);
        if (!vErr && myVotes) {
          votesMap = new Map(myVotes.map((v) => [v.event_id, true]));
        }
      } catch (e) {
        console.warn("Votes lookup failed", e);
      }
    }

    let resultsMap = new Map();
    if (ids.length) {
      try {
        const { data: rows, error: rErr } = await fetchEventResults(supabaseClient, ids);
        if (!rErr && rows) {
          resultsMap = new Map(rows.map((r) => [r.event_id, r]));
        } else if (rErr) {
          console.warn("Results RPC error", rErr);
        }
      } catch (e) {
        console.warn("Results lookup failed", e);
      }
    }

    renderEvents(events, votesMap, resultsMap);
    await loadCountryTop(events);

    const cachedCountriesAll = getCachedCountriesAll();
    const countryName = cachedCountriesAll.find((c) => c.code === countryCode)?.name || countryCode;
    const eventCount = events.length;

    document.getElementById("countryTitle").textContent = countryName;
    document.getElementById("countrySubtitle").textContent = t("country.subtitleStats", { name: countryName, code: countryCode, count: eventCount });

    const homeTitle = document.getElementById("homeTitle");
    if (homeTitle) {
      homeTitle.textContent = t("country.homeTitleCode", { code: countryCode });
    }

    boot("Data: events ready");
    updateBreadcrumb();
  }

  async function loadCountryDetail(code) {
    await loadEventsForCountry(code);
  }

  return {
    loadCountryStats,
    loadCountryTop,
    loadEventsForCountry,
    loadCountryDetail,
  };
}
