import { fetchEventById, fetchEventResults, fetchUserVotesForEvents } from "./data-layer.js?v=20260220i";

export function createEventFlow({
  t,
  escapeHtml,
  getSupabaseClient,
  getSession,
  setCurrentEventTitle,
  setCurrentEventId,
  renderEventList,
}) {
  async function loadEventDetail(eventId) {
    const supabaseClient = getSupabaseClient();
    const session = getSession();

    const detailCard = document.getElementById("eventDetailCard");
    detailCard.innerHTML = `<div class='muted'>${escapeHtml(t("event.loading"))}</div>`;

    const { data: eventData, error } = await fetchEventById(supabaseClient, eventId);

    if (error || !eventData) {
      detailCard.innerHTML = `<div class='muted'>${escapeHtml(t("event.loadFailed"))}</div>`;
      return;
    }

    const { data: rows } = await fetchEventResults(supabaseClient, [eventId]);
    const resultsMap = new Map((rows || []).map((r) => [r.event_id, r]));

    let votesMap = new Map();
    if (session?.user?.id) {
      const { data: myVotes } = await fetchUserVotesForEvents(supabaseClient, session.user.id, [eventId]);
      if (myVotes?.length) {
        votesMap.set(eventId, true);
      }
    }

    const eventMeta = document.getElementById("eventMeta");
    document.getElementById("eventTitle").textContent = eventData.title || t("event.title");
    setCurrentEventTitle(eventData.title || t("event.title"));
    setCurrentEventId(eventId);
    if (eventMeta) {
      eventMeta.textContent = "";
      eventMeta.classList.add("hidden");
      eventMeta.classList.remove("eventQuestion");
    }

    const eventCountryHeader = document.getElementById("eventCountryHeader");
    if (eventCountryHeader) {
      eventCountryHeader.textContent = t("event.countryName", { code: eventData.country_code || "" });
    }

    const statusEl = document.getElementById("eventStatus");
    const eventEndAt = typeof window.getEventEnd === "function" ? window.getEventEnd(eventData) : NaN;
    const isClosed = eventData.is_active === false || (Number.isNaN(eventEndAt) ? false : eventEndAt < Date.now());
    if (statusEl) {
      statusEl.textContent = isClosed ? t("event.closed") : t("event.active");
      statusEl.classList.toggle("active", !isClosed);
      statusEl.classList.toggle("closed", isClosed);
    }

    detailCard.innerHTML = "";
    const wrap = document.createElement("div");
    renderEventList(wrap, [eventData], votesMap, resultsMap, "", false);
    detailCard.appendChild(wrap.firstElementChild || wrap);
  }

  return { loadEventDetail };
}
