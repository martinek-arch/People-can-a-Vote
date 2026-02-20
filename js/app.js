import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_BASE_URL, MAPBOX_TOKEN } from "./constants.js?v=20260218e";
import { escapeHtml, pct, formatDate, formatRemainingTime, getEventEnd, setBar } from "./formatters.js?v=20260218e";
import { t, applyStaticTranslations, initI18nSelector } from "./i18n.js?v=20260218e";
import { createBoot, loadSupabaseLib, loadMapboxLib } from "./bootstrap.js?v=20260218e";
import { setHomeHash, setCountryHash, setEventHash, parseHashRoute, hasRecoveryHint } from "./router.js?v=20260218e";
import { createAuthController } from "./auth.js?v=20260218e";
import { createEventsUI } from "./events-ui.js?v=20260218e";
import { createMapController } from "./map.js?v=20260218e";
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_BASE_URL, MAPBOX_TOKEN } from "./constants.js?v=20260218d";
import { escapeHtml, pct, formatDate, formatRemainingTime, getEventEnd, setBar } from "./formatters.js?v=20260218d";
import { t, applyStaticTranslations, initI18nSelector } from "./i18n.js?v=20260218d";
import { createBoot, loadSupabaseLib, loadMapboxLib } from "./bootstrap.js?v=20260218d";
import { setHomeHash, setCountryHash, setEventHash, parseHashRoute, hasRecoveryHint } from "./router.js?v=20260218d";
import { createAuthController } from "./auth.js?v=20260218d";
import { createEventsUI } from "./events-ui.js?v=20260218d";
import { createMapController } from "./map.js?v=20260218d";
if (window.__PCV_INIT_DONE__) {
  console.warn("PCV: duplicate init prevented");
} else {
  window.__PCV_INIT_DONE__ = true;

  const debugBoot = window.localStorage.getItem("pcvDebug") === "1";

  applyStaticTranslations();

  const boot = createBoot(debugBoot);

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

  const authController = createAuthController({
    t,
    boot,
    appBaseUrl: APP_BASE_URL,
    getSupabaseClient: () => supabaseClient,
    getSession: () => session,
  });

  const openModal = (mode) => authController.openModal(mode);
  const setModeUI = () => authController.setModeUI();
  const setAuthUI = () => authController.setAuthUI();
  const canVote = () => authController.canVote();
  const signOut = () => authController.signOut();

  /* ===== Data rendering ===== */
  window.getEventEnd = getEventEnd;

  const eventsUI = createEventsUI({
    t,
    escapeHtml,
    pct,
    setBar,
    getCountryNameByCode: (code) => cachedCountriesAll.find((c) => c.code === code)?.name,
    onTop3Click: (item) => {
      if (item.country_code) {
        currentCountry = item.country_code;
      }
      navigateEvent(item.event_id);
    }
  });

  const renderResultBlock = (...args) => eventsUI.renderResultBlock(...args);
  window.renderResultBlock = renderResultBlock;

  const renderTop3 = (...args) => eventsUI.renderTop3(...args);
  window.renderTop3 = renderTop3;

  const mapController = createMapController({
    t,
    mapboxToken: MAPBOX_TOKEN,
    loadMapboxLib,
    getCountryStats: () => countryStats,
    getMaxCountryVotes: () => maxCountryVotes,
    getCountries: () => cachedCountriesAll,
    navigateCountry,
  });

  function setActiveView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const view = document.getElementById(viewId);
    if (view) view.classList.add("active");
    updateBreadcrumb();
  }

  function navigateHome() {
    setHomeHash();
    currentCountry = null;
    currentEventId = null;
    currentEventTitle = null;
    setActiveView("homeView");
  }

  function navigateCountry(code) {
    if (!code) return;
    currentCountry = code;
    currentEventId = null;
    currentEventTitle = null;
    setCountryHash(code);
    setActiveView("countryView");
    loadCountryDetail(code);
  }

  function navigateEvent(eventId) {
    if (!eventId || !currentCountry) return;
    currentEventId = eventId;
    setEventHash(eventId);
    setActiveView("eventView");
    loadEventDetail(eventId);
  }

  function fillCountries(...args) {
    return fillCountriesImpl(...args);
  }
  window.fillCountries = fillCountries;

  async function loadTop3() {
    boot("Data: loading TOP3…");
    const { data, error } = await supabaseClient
      .from("event_vote_counts")
      .select("event_id,votes,events(title,country_code,is_active)")
      .order("votes", { ascending: false })
      .limit(3);

    if (error) throw new Error("TOP3 load failed: " + error.message);

    const normalized = (data || [])
      .map(r => ({
        event_id: r.event_id,
        votes: r.votes,
        title: r.events?.title,
        country_code: r.events?.country_code,
        is_active: r.events?.is_active
      }))
      .filter(x => x.is_active !== false);

    let votedMap = new Map();
    if (session?.user?.id && normalized.length) {
      const ids = normalized.map(it => it.event_id);
      try {
        const { data: myVotes, error: vErr } = await supabaseClient
          .from("votes")
          .select("event_id")
          .eq("user_id", session.user.id)
          .in("event_id", ids);
        if (!vErr && myVotes) {
          votedMap = new Map(myVotes.map(v => [v.event_id, true]));
        }
      } catch (e) {
        console.warn("Top3 votes lookup failed", e);
      }
    }

    if (typeof window.renderTop3 === "function") {
      window.renderTop3(normalized, votedMap);
    }
    boot("Data: TOP3 ready");
  }

  async function fillCountriesImpl(continentId, shouldOpen = true) {
    const countryList = document.getElementById("countryList");
    const countryPopover = document.getElementById("countryPopover");
    if (!countryList || !countryPopover) return;
    countryList.innerHTML = "";
    if (shouldOpen) {
      countryPopover.classList.add("open");
    }
    currentContinentId = Number(continentId);
    cachedCountries = cachedCountriesAll.filter(c => Number(c.continent_id) === Number(continentId));
    for (const co of cachedCountries) {
      const btn = document.createElement("button");
      const code = String(co.code || "").toUpperCase();
      const eventCount = countryStats.get(code)?.events || 0;
      btn.type = "button";
      btn.className = "countryBtn";
      btn.textContent = `${co.name} (${co.code}) · ${eventCount}`;
      btn.onclick = () => {
        navigateCountry(co.code);
        countryPopover.classList.remove("open");
      };
      countryList.appendChild(btn);
    }
  }

  async function loadCountryStats() {
    const { data: events, error: eventsErr } = await supabaseClient
      .from("events")
      .select("id,country_code");
    if (eventsErr) throw new Error("Country stats events load failed: " + eventsErr.message);

    const countMap = new Map();
    for (const ev of events || []) {
      if (!ev.country_code) continue;
      const code = String(ev.country_code).toUpperCase();
      countMap.set(code, (countMap.get(code) || 0) + 1);
    }

    const { data: voteRows, error: votesErr } = await supabaseClient
      .from("event_vote_counts")
      .select("votes,events(country_code)");
    if (votesErr) throw new Error("Country stats votes load failed: " + votesErr.message);

    const votesMap = new Map();
    for (const row of voteRows || []) {
      const code = row.events?.country_code;
      if (!code) continue;
      const normalized = String(code).toUpperCase();
      votesMap.set(normalized, (votesMap.get(normalized) || 0) + (row.votes || 0));
    }

    countryStats = new Map();
    maxCountryVotes = 0;
    for (const co of cachedCountriesAll) {
      const code = String(co.code || "").toUpperCase();
      const eventCount = countMap.get(code) || 0;
      const totalVotes = votesMap.get(code) || 0;
      countryStats.set(code, { events: eventCount, votes: totalVotes });
      if (totalVotes > maxCountryVotes) maxCountryVotes = totalVotes;
    }

    mapController.updateMapChoropleth();
    if (currentContinentId !== null && typeof window.fillCountries === "function") {
      await window.fillCountries(currentContinentId, false);
    }
  }

  function updateBreadcrumb() {
    const breadcrumb = document.getElementById("breadcrumb");
    if (!breadcrumb) return;
    const country = currentCountry
      ? (cachedCountriesAll.find(c => c.code === currentCountry)?.name || currentCountry)
      : null;
    const eventTitle = currentEventTitle;
    const parts = [];

    const homeBtn = document.createElement("button");
    homeBtn.type = "button";
    homeBtn.textContent = t("nav.home");
    homeBtn.onclick = navigateHome;
    parts.push(homeBtn);

    if (country) {
      const sep1 = document.createElement("span");
      sep1.className = "crumb";
      sep1.textContent = "›";
      parts.push(sep1);
      const countryBtn = document.createElement("button");
      countryBtn.type = "button";
      countryBtn.textContent = country;
      countryBtn.onclick = () => navigateCountry(currentCountry);
      parts.push(countryBtn);
    }

    if (eventTitle) {
      const sep2 = document.createElement("span");
      sep2.className = "crumb";
      sep2.textContent = "›";
      parts.push(sep2);
      const eventSpan = document.createElement("span");
      eventSpan.className = "crumb";
      eventSpan.textContent = eventTitle;
      parts.push(eventSpan);
    }

    breadcrumb.replaceChildren(...parts);
  }

  function renderEventList(container, items, votesMap, resultsMap, emptyMessage, clickable) {
    container.innerHTML = "";
    if (!items?.length) {
      container.innerHTML = `<div class='muted'>${emptyMessage}</div>`;
      return;
    }

    for (const eventItem of items) {
      const hasVoted = votesMap && votesMap.has(eventItem.id);

      const div = document.createElement("div");
      div.className = "card" + (clickable ? " eventItem" : "");
      if (clickable) {
        div.onclick = (evt) => {
          if (evt.target.closest("button")) return;
          navigateEvent(eventItem.id);
        };
      }

      const endAt = typeof window.getEventEnd === "function" ? window.getEventEnd(eventItem) : NaN;
      const ended = eventItem.is_active === false
        ? true
        : (Number.isNaN(endAt) ? false : endAt < Date.now());
      const statusPill = ended ? `<span class='pill'>${escapeHtml(t("event.status.ended"))}</span>` : `<span class='pill'>${escapeHtml(t("event.status.active"))}</span>`;

      const remainingLabel = ended
        ? t("event.votingEnded")
        : t("event.remaining", { time: escapeHtml(formatRemainingTime(endAt)) });
      const titleLine = clickable
        ? `
          <div class="eventTitleRow">
            <div class="eventTitle">${escapeHtml(eventItem.title || "Untitled")} ${statusPill}</div>
            ${hasVoted ? `<span class="pill eventVotedPill">${escapeHtml(t("vote.voted"))}</span>` : ""}
          </div>
        `
        : "";
      const descClass = clickable ? "muted" : "eventQuestion";
      div.innerHTML = `
        ${titleLine}
        <div class="${descClass}">${escapeHtml(eventItem.description || "")}</div>
        <div class="eventMetaRow${clickable ? "" : " single"}">
          ${clickable ? `<div class="eventCountry muted">${t("event.country", { code: escapeHtml(eventItem.country_code || "") })}</div>` : ""}
          <div class="eventRemaining muted">${remainingLabel}</div>
        </div>
      `;

      // Answers
      const answers = document.createElement("div");
      answers.className = "answers";

      function mkAnswer(label, choice, className) {
        const b = document.createElement("button");
        b.textContent = label;
        b.className = `primary ${className || ""}`.trim();
        b.disabled = ended || !canVote() || hasVoted;

        b.onclick = async () => {
          if (!canVote()) {
            alert(t("vote.needAuth"));
            return;
          }
          if (ended) {
            alert(t("vote.eventEnded"));
            return;
          }
          if (hasVoted) {
            alert(t("vote.alreadyVoted"));
            return;
          }

          boot("Vote: submitting…");
          const payload = { event_id: eventItem.id, user_id: session.user.id, choice };
          const { error } = await supabaseClient.from("votes").insert(payload);

          if (error) {
            // Duplicate vote (unique constraint) -> show friendly message
            if (error.code === "23505") {
              alert(t("vote.alreadyVoted"));
            } else {
              alert(t("vote.submitFailed", { message: error.message }));
            }
            boot("Vote: error");
            return;
          }

          alert(t("vote.saved"));
          boot("Vote: OK");

          // Refresh events + TOP3 so results update immediately
          await loadEventsForCountry(eventItem.country_code);
          await loadTop3();
        };

        return b;
      }

      answers.appendChild(mkAnswer(t("vote.option.yes"), "yes", "answer-yes"));
      answers.appendChild(mkAnswer(t("vote.option.no"), "no", "answer-no"));
      answers.appendChild(mkAnswer(t("vote.option.dk"), "dont_know", "answer-dk"));
      if (!clickable) {
        if (hasVoted) {
          const votedMsg = document.createElement("div");
          votedMsg.className = "votedBadge";
          votedMsg.textContent = t("vote.voted");
          div.appendChild(votedMsg);
        } else {
          div.appendChild(answers);
        }
      }

      if (!clickable) {
        // Results (public)
        const resWrap = document.createElement("div");
        resWrap.className = "resultsWrap";

        const r = resultsMap && resultsMap.has(eventItem.id) ? resultsMap.get(eventItem.id) : null;
        if (r) {
          resWrap.appendChild(window.renderResultBlock(t("results.total"), { yes: r.yes_total, no: r.no_total, dk: r.dk_total, total: r.votes_total }, "large"));
          resWrap.appendChild(window.renderResultBlock(t("results.domestic"), { yes: r.yes_dom, no: r.no_dom, dk: r.dk_dom, total: r.votes_dom_total }, "medium"));
          resWrap.appendChild(window.renderResultBlock(t("results.foreign"), { yes: r.yes_for, no: r.no_for, dk: r.dk_for, total: r.votes_for_total }, "small"));
        } else {
          resWrap.innerHTML = `<div class='muted'>${escapeHtml(t("results.loading"))}</div>`;
        }

        div.appendChild(resWrap);
      }
      container.appendChild(div);
    }
  }

  function renderEvents(items, votesMap, resultsMap) {
    const activeWrap = document.getElementById("eventsActive");
    const archiveWrap = document.getElementById("eventsArchive");
    const now = Date.now();

    const active = [];
    const archived = [];
    for (const e of items || []) {
      const endAt = typeof window.getEventEnd === "function" ? window.getEventEnd(e) : NaN;
      const ended = e.is_active === false
        ? true
        : (Number.isNaN(endAt) ? false : endAt < now);
      if (ended || e.is_active === false) {
        archived.push(e);
      } else {
        active.push(e);
      }
    }

    renderEventList(
      activeWrap,
      active,
      votesMap,
      resultsMap,
      t("events.emptyActive"),
      true
    );
    renderEventList(
      archiveWrap,
      archived,
      votesMap,
      resultsMap,
      t("events.emptyArchive"),
      true
    );
  }


  async function loadEventsForCountry(countryCode) {
    if (!countryCode) return;
    boot("Data: loading events…");
    currentCountry = countryCode;
    const { data, error } = await supabaseClient
      .from("events")
      .select("id,title,description,country_code,is_active,is_top,ends_at,created_at")
      .eq("country_code", countryCode)
      .order("created_at", { ascending: false });

    
if (error) throw new Error("Events load failed: " + error.message);

    const events = data || [];
    const ids = events.map(x => x.id);

    // My votes (for disabling buttons) - only when logged in
    let votesMap = new Map();
    if (session?.user?.id && ids.length) {
      try {
        const { data: myVotes, error: vErr } = await supabaseClient
          .from("votes")
          .select("event_id")
          .eq("user_id", session.user.id)
          .in("event_id", ids);

        if (!vErr && myVotes) {
          votesMap = new Map(myVotes.map(v => [v.event_id, true]));
        }
      } catch (e) {
        console.warn("Votes lookup failed", e);
      }
    }

    // Public results (visible to everyone) via RPC
    let resultsMap = new Map();
    if (ids.length) {
      try {
        const { data: rows, error: rErr } = await supabaseClient.rpc("get_event_results", { event_ids: ids });
        if (!rErr && rows) {
          resultsMap = new Map(rows.map(r => [r.event_id, r]));
        } else if (rErr) {
          console.warn("Results RPC error", rErr);
        }
      } catch (e) {
        console.warn("Results lookup failed", e);
      }
    }

    renderEvents(events, votesMap, resultsMap);
    await loadCountryTop(events);
    const countryName = cachedCountriesAll.find(c => c.code === countryCode)?.name || countryCode;
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

  async function loadEventDetail(eventId) {
    const detailCard = document.getElementById("eventDetailCard");
    detailCard.innerHTML = `<div class='muted'>${escapeHtml(t("event.loading"))}</div>`;

    const { data: eventData, error } = await supabaseClient
      .from("events")
      .select("id,title,description,country_code,is_active,ends_at,created_at")
      .eq("id", eventId)
      .single();

    if (error || !eventData) {
      detailCard.innerHTML = `<div class='muted'>${escapeHtml(t("event.loadFailed"))}</div>`;
      return;
    }

    const { data: rows } = await supabaseClient.rpc("get_event_results", { event_ids: [eventId] });
    const resultsMap = new Map((rows || []).map(r => [r.event_id, r]));

    let votesMap = new Map();
    if (session?.user?.id) {
      const { data: myVotes } = await supabaseClient
        .from("votes")
        .select("event_id")
        .eq("user_id", session.user.id)
        .eq("event_id", eventId);
      if (myVotes?.length) {
        votesMap.set(eventId, true);
      }
    }

    const eventMeta = document.getElementById("eventMeta");
    document.getElementById("eventTitle").textContent = eventData.title || t("event.title");
    currentEventTitle = eventData.title || t("event.title");
    currentEventId = eventId;
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

  async function loadCountryTop(events) {
    const target = document.getElementById("countryTop");
    if (!events?.length) {
      target.textContent = t("event.topEmpty");
      return;
    }

    const ids = events.map(e => e.id);
    const { data, error } = await supabaseClient
      .from("event_vote_counts")
      .select("event_id,votes")
      .in("event_id", ids)
      .order("votes", { ascending: false })
      .limit(1);

    if (error || !data?.length) {
      target.textContent = t("event.topEmpty");
      return;
    }

    const top = data[0];
    const event = events.find(e => e.id === top.event_id);
    target.innerHTML = `
      <div class="eventTitle">${escapeHtml(event?.title || t("event.title"))}</div>
      <div class="muted">${t("event.votersTotal", { count: top.votes || 0 })}</div>
    `;
  }

  async function loadContinentsAndCountries() {
    boot("Init: loading continents/countries…");

    const { data: continents, error: cErr } = await supabaseClient
      .from("continents")
      .select("id,name,code")
      .order("id", { ascending: true });

    if (cErr) throw new Error("Continents load failed: " + cErr.message);

    cachedContinents = continents || [];
    const continentTabs = document.getElementById("continentTabs");
    continentTabs.innerHTML = "";

    const { data: allCountries, error: allErr } = await supabaseClient
      .from("countries")
      .select("code,name,continent_id")
      .order("name", { ascending: true });

    if (allErr) throw new Error("Countries load failed: " + allErr.message);
    cachedCountriesAll = allCountries || [];
    rebuildSearchIndex();

    for (const c of cachedContinents) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "continentBtn";
      btn.textContent = c.name;
      btn.onclick = async () => {
        document.querySelectorAll(".continentBtn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        if (typeof window.fillCountries === "function") {
          await window.fillCountries(c.id, true);
        }
      };
      continentTabs.appendChild(btn);
    }

    if (cachedContinents[0]) {
      const firstBtn = continentTabs.querySelector(".continentBtn");
      if (firstBtn) firstBtn.classList.add("active");
      if (typeof window.fillCountries === "function") {
        await window.fillCountries(cachedContinents[0].id, false);
      }
    }

    boot("Init: geo ready");
    updateBreadcrumb();
  }

  function goHome() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigateHome();
    const countryPopover = document.getElementById("countryPopover");
    if (countryPopover) countryPopover.classList.remove("open");
    boot("UI: home");
  }

  function maybeOpenRecoveryModal() {
    // If user comes back from reset email link, Supabase usually triggers PASSWORD_RECOVERY event.
    // We also check hash for "type=recovery" or our "#reset" marker.
    const h = window.location.hash || "";
    if (hasRecoveryHint(h)) {
      authMode = "update";
      setModeUI();
      openModal("update");
      authController.setMessage(t("auth.resetFromLink"));
    }
  }

  function handleInitialRoute() {
    const route = parseHashRoute(window.location.hash || "");
    if (route.type === "country") {
      navigateCountry(route.value);
      return;
    }
    if (route.type === "event") {
      setActiveView("eventView");
      loadEventDetail(route.value);
      return;
    }
    navigateHome();
  }

  function rebuildSearchIndex() {
    const list = document.getElementById("searchOptions");
    list.innerHTML = "";
    searchIndex = new Map();
    for (const c of cachedCountriesAll) {
      const label = t("search.countryLabel", { name: c.name, code: c.code });
      const opt = document.createElement("option");
      opt.value = label;
      list.appendChild(opt);
      searchIndex.set(label.toLowerCase(), { type: "country", code: c.code });
    }
  }

  let searchTimer = null;
  async function updateSearch(term) {
    const list = document.getElementById("searchOptions");
    const trimmed = (term || "").trim();
    const normalized = trimmed.toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      rebuildSearchIndex();
      return;
    }
    if (searchIndex.has(normalized)) {
      return;
    }
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      rebuildSearchIndex();
      const { data, error } = await supabaseClient
        .from("events")
        .select("id,title,country_code")
        .ilike("title", `%${trimmed}%`)
        .limit(8);
      if (error || !data) return;
      for (const ev of data) {
        const label = t("search.eventLabel", { title: ev.title, code: ev.country_code || "??" });
        const opt = document.createElement("option");
        opt.value = label;
        list.appendChild(opt);
        searchIndex.set(label.toLowerCase(), { type: "event", id: ev.id, country: ev.country_code });
      }
    }, 250);
  }

  function handleSearchSubmit() {
    const input = document.getElementById("globalSearch");
    const value = (input.value || "").trim();
    const normalized = value.toLowerCase();
    if (!value) return;
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
        currentCountry = hit.country;
      }
      navigateEvent(hit.id);
      return;
    }
  }

  (async function init() {
    try {
      boot("Init: JS running");
      const supabaseLib = await loadSupabaseLib(boot);

      supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      boot("Init: Supabase ready");

      // Navbar actions
      document.getElementById("backToHomeBtn").onclick = goHome;
      document.getElementById("backToCountryBtn").onclick = () => {
        if (currentCountry) {
          navigateCountry(currentCountry);
        } else {
          navigateHome();
        }
      };
      document.getElementById("loginNavBtn").onclick = () => openModal("login");
      document.getElementById("registerNavBtn").onclick = () => openModal("register");
      document.getElementById("changePassNavBtn").onclick = () => openModal("update");
      document.getElementById("logoutNavBtn").onclick = signOut;

      initI18nSelector(async () => {
        setModeUI();
        setAuthUI();
        await loadTop3();
        if (currentCountry) {
          await loadEventsForCountry(currentCountry);
        }
        if (currentEventId) {
          await navigateEvent(currentEventId);
        }
      });

      // Refresh actions
      document.getElementById("refreshTop3Btn").onclick = loadTop3;
      const globalSearch = document.getElementById("globalSearch");
      globalSearch.setAttribute("list", "searchOptions");
      globalSearch.addEventListener("input", (e) => updateSearch(e.target.value));
      globalSearch.addEventListener("change", handleSearchSubmit);
      globalSearch.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleSearchSubmit();
        }
      });
      document.addEventListener("click", (event) => {
        const popover = document.getElementById("countryPopover");
        const tabs = document.getElementById("continentTabs");
        if (!popover || !tabs) return;
        if (!popover.classList.contains("open")) return;
        const clickedInside = popover.contains(event.target) || tabs.contains(event.target);
        if (!clickedInside) {
          popover.classList.remove("open");
        }
      });

      // Session
      const { data: sessData } = await supabaseClient.auth.getSession();
      session = sessData?.session || null;
      setAuthUI();

      supabaseClient.auth.onAuthStateChange(async (event, newSession) => {
        session = newSession;
        setAuthUI();

        if (event === "PASSWORD_RECOVERY") {
          // open change password modal automatically
          openModal("update");
          authController.setMessage(t("auth.resetMode"));
        }

        if (currentCountry) await loadEventsForCountry(currentCountry);
      });

      await loadContinentsAndCountries();
      await loadCountryStats();
      await mapController.initWorldMap();
      await loadTop3();
      handleInitialRoute();
      updateBreadcrumb();

      // If user lands with recovery hash, open the update modal
      maybeOpenRecoveryModal();

      boot("Boot: ready");
    } catch (err) {
      boot("Startup error: " + err.message);
      console.error(err);
    }
  })();
}
