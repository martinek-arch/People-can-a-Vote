import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_BASE_URL, MAPBOX_TOKEN, MAPBOX_TOKEN_SOURCE, APP_BUILD_VERSION } from "./constants.js?v=20260220j";
import { escapeHtml, pct, formatDate, formatRemainingTime, getEventEnd, setBar } from "./formatters.js?v=20260220j";
import { t, applyStaticTranslations, initI18nSelector } from "./i18n.js?v=20260220j";
import { createBoot, loadSupabaseLib, loadMapboxLib } from "./bootstrap.js?v=20260220j";
import { setHomeHash, setCountryHash, setEventHash, parseHashRoute, hasRecoveryHint } from "./router.js?v=20260220j";
import { createAuthController } from "./auth.js?v=20260220j";
import { createEventsUI } from "./events-ui.js?v=20260220j";
import { createMapController } from "./map.js?v=20260220j";
import { createCountryFlow } from "./country-flow.js?v=20260220j";
import { createEventFlow } from "./event-flow.js?v=20260220j";
import { createSearchFlow } from "./search-flow.js?v=20260220j";
import { fetchTop3Events, fetchUserVotesForEvents, fetchContinents, fetchCountries, insertVote } from "./data-layer.js?v=20260220j";
import { bindNavbarActions, bindGlobalUIActions } from "./ui-init.js?v=20260220j";
import { initSessionFlow } from "./session-flow.js?v=20260220j";

if (window.__PCV_INIT_DONE__) {
  console.warn("PCV: duplicate init prevented");
} else {
  window.__PCV_INIT_DONE__ = true;

  const debugBoot = window.localStorage.getItem("pcvDebug") === "1";

  const mapDebugState = { renderer: "pending", reason: "boot" };

  function setupDebugPanel() {
    if (!debugBoot) return { updateMapStatus: () => {} };

    const panel = document.createElement("div");
    panel.id = "pcvDebugPanel";
    panel.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:9999;background:#111827;color:#f9fafb;padding:10px 12px;border-radius:10px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:360px";

    const rows = {
      build: document.createElement("div"),
      renderer: document.createElement("div"),
      tokenSource: document.createElement("div"),
      mapReason: document.createElement("div"),
      mapError: document.createElement("div"),
    };

    rows.build.textContent = `build: ${APP_BUILD_VERSION}`;
    rows.renderer.textContent = "renderer: pending";
    rows.tokenSource.textContent = `token-source: ${MAPBOX_TOKEN_SOURCE}`;
    rows.mapReason.textContent = "reason: boot";
    rows.mapError.textContent = "error: -";

    panel.append(rows.build, rows.renderer, rows.tokenSource, rows.mapReason, rows.mapError);
    document.body.appendChild(panel);

    return {
      updateMapStatus(status) {
        mapDebugState.renderer = status?.renderer || mapDebugState.renderer;
        mapDebugState.reason = status?.reason || mapDebugState.reason;
        mapDebugState.error = status?.error || "";
        rows.renderer.textContent = `renderer: ${mapDebugState.renderer}`;
        rows.mapReason.textContent = `reason: ${mapDebugState.reason}`;
        rows.mapError.textContent = `error: ${mapDebugState.error || "-"}`;
      }
    };
  }

  const debugPanel = setupDebugPanel();

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
    onStatusChange: (status) => debugPanel.updateMapStatus(status),
  });


  const countryFlow = createCountryFlow({
    t,
    boot,
    mapController,
    getSupabaseClient: () => supabaseClient,
    getSession: () => session,
    getCachedCountriesAll: () => cachedCountriesAll,
    getCurrentContinentId: () => currentContinentId,
    setCountryStats: (next) => { countryStats = next; },
    setMaxCountryVotes: (next) => { maxCountryVotes = next; },
    setCurrentCountry: (code) => { currentCountry = code; },
    fillCountries,
    renderEvents,
    updateBreadcrumb,
    escapeHtml,
  });

  const loadCountryStats = (...args) => countryFlow.loadCountryStats(...args);
  const loadEventsForCountry = (...args) => countryFlow.loadEventsForCountry(...args);
  const loadCountryDetail = (...args) => countryFlow.loadCountryDetail(...args);
  const eventFlow = createEventFlow({
    t,
    escapeHtml,
    getSupabaseClient: () => supabaseClient,
    getSession: () => session,
    setCurrentEventTitle: (title) => { currentEventTitle = title; },
    setCurrentEventId: (id) => { currentEventId = id; },
    renderEventList,
  });

  const loadEventDetail = (...args) => eventFlow.loadEventDetail(...args);

  const searchFlow = createSearchFlow({
    t,
    getSupabaseClient: () => supabaseClient,
    getCachedCountriesAll: () => cachedCountriesAll,
    getSearchIndex: () => searchIndex,
    setSearchIndex: (next) => { searchIndex = next; },
    navigateCountry,
    navigateEvent,
    setCurrentCountry: (code) => { currentCountry = code; },
  });

  const rebuildSearchIndex = (...args) => searchFlow.rebuildSearchIndex(...args);

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
    const { data, error } = await fetchTop3Events(supabaseClient);

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
        const { data: myVotes, error: vErr } = await fetchUserVotesForEvents(supabaseClient, session.user.id, ids);
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
          const { error } = await insertVote(supabaseClient, payload);

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


  async function loadContinentsAndCountries() {
    boot("Init: loading continents/countries…");

    const { data: continents, error: cErr } = await fetchContinents(supabaseClient);

    if (cErr) throw new Error("Continents load failed: " + cErr.message);

    cachedContinents = continents || [];
    const continentTabs = document.getElementById("continentTabs");
    continentTabs.innerHTML = "";

    const { data: allCountries, error: allErr } = await fetchCountries(supabaseClient);

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
      bindNavbarActions({
        goHome,
        getCurrentCountry: () => currentCountry,
        navigateCountry,
        navigateHome,
        openModal,
        signOut,
      });

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

      // Refresh and global UI actions
      bindGlobalUIActions({ loadTop3, searchFlow });

      // Session
      await initSessionFlow({
        getSupabaseClient: () => supabaseClient,
        setSession: (next) => { session = next; },
        setAuthUI,
        openModal,
        authController,
        t,
        getCurrentCountry: () => currentCountry,
        loadEventsForCountry,
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
