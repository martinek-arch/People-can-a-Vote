import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_BASE_URL, MAPBOX_TOKEN } from "./constants.js";
import { escapeHtml, pct, formatDate, formatRemainingTime, getEventEnd, setBar } from "./formatters.js";
import { t, applyStaticTranslations, initI18nSelector } from "./i18n.js";

if (window.__PCV_INIT_DONE__) {
  console.warn("PCV: duplicate init prevented");
} else {
  window.__PCV_INIT_DONE__ = true;

  const debugBoot = window.localStorage.getItem("pcvDebug") === "1";

  applyStaticTranslations();

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
      s.onerror = () => reject(new Error("Mapbox load failed"));
      document.head.appendChild(s);
    });
  }

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
  const authMsg = document.getElementById("authMsg");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authPassword2 = document.getElementById("authPassword2");

  const emailField = document.getElementById("emailField");
  const passwordField = document.getElementById("passwordField");
  const password2Field = document.getElementById("password2Field");
  const forgotWrap = document.getElementById("forgotWrap");
  const forgotBtn = document.getElementById("forgotBtn");

  function openModal(mode) {
    authMode = mode;
    authMsg.textContent = "";
    authPassword.value = "";
    authPassword2.value = "";
    setModeUI();
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      if (!emailField.classList.contains("hidden")) authEmail.focus();
      else authPassword.focus();
    }, 0);
  }
  function closeModal() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    authMsg.textContent = "";
  }
  function setModeUI() {
    // tabs
    tabLogin.classList.toggle("active", authMode === "login");
    tabRegister.classList.toggle("active", authMode === "register");
    tabUpdate.classList.toggle("active", authMode === "update");

    // show update tab only when relevant
    const canShowUpdateTab = (authMode === "update");
    tabUpdate.classList.toggle("hidden", !canShowUpdateTab);

    if (authMode === "login") {
      submitAuthBtn.textContent = t("auth.submit.login");
      emailField.classList.remove("hidden");
      passwordField.classList.remove("hidden");
      password2Field.classList.add("hidden");
      forgotWrap.classList.remove("hidden");
      authPassword.setAttribute("autocomplete", "current-password");
    } else if (authMode === "register") {
      submitAuthBtn.textContent = t("auth.submit.register");
      emailField.classList.remove("hidden");
      passwordField.classList.remove("hidden");
      password2Field.classList.remove("hidden");
      forgotWrap.classList.add("hidden");
      authPassword.setAttribute("autocomplete", "new-password");
      authPassword2.setAttribute("autocomplete", "new-password");
    } else {
      // update password (for logged-in "change password" OR recovery)
      submitAuthBtn.textContent = t("auth.submit.update");
      emailField.classList.add("hidden");
      passwordField.classList.remove("hidden");
      password2Field.classList.remove("hidden");
      forgotWrap.classList.add("hidden");
      authPassword.setAttribute("autocomplete", "new-password");
      authPassword2.setAttribute("autocomplete", "new-password");
    }
  }

  document.getElementById("closeModalBtn").onclick = closeModal;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("open")) closeModal(); });

  tabLogin.onclick = () => { authMode = "login"; authMsg.textContent = ""; setModeUI(); };
  tabRegister.onclick = () => { authMode = "register"; authMsg.textContent = ""; setModeUI(); };

  async function runAuth() {
    const email = (authEmail.value || "").trim();
    const p1 = authPassword.value || "";
    const p2 = authPassword2.value || "";

    if (authMode !== "update") {
      if (!email) { authMsg.textContent = "Zadej email."; return; }
    }
    if (p1.length < 8) { authMsg.textContent = t("auth.passwordMin"); return; }
    if (authMode !== "login") {
      if (p1 !== p2) { authMsg.textContent = t("auth.passwordMismatch"); return; }
    }

    submitAuthBtn.disabled = true;
    authMsg.textContent = authMode === "login" ? t("auth.working.login") : (authMode === "register" ? t("auth.working.register") : t("auth.working.update"));
    boot("Auth: working…");

    try {
      if (authMode === "login") {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password: p1 });
        if (error) throw error;
        closeModal();
        boot("Auth: signed in");
        return;
      }

      if (authMode === "register") {
        const { error } = await supabaseClient.auth.signUp({
          email,
          password: p1,
          options: { emailRedirectTo: APP_BASE_URL + "#auth" }
        });
        if (error) throw error;
        authMsg.textContent = t("auth.registerCreated");
        boot("Auth: signUp ok");
        return;
      }

      // update
      const { error } = await supabaseClient.auth.updateUser({ password: p1 });
      if (error) throw error;
      authMsg.textContent = t("auth.passwordUpdated");
      boot("Auth: password updated");
      setTimeout(() => { try { closeModal(); } catch(e){} }, 700);
    } catch (err) {
      console.error(err);
      authMsg.textContent = (err && err.message) ? err.message : t("auth.unknownError");
      boot("Auth: error");
    } finally {
      submitAuthBtn.disabled = false;
    }
  }

  submitAuthBtn.onclick = runAuth;
  authPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") runAuth(); });
  authPassword2.addEventListener("keydown", (e) => { if (e.key === "Enter") runAuth(); });

  async function forgotPasswordFlow() {
    const email = (authEmail.value || "").trim() || prompt(t("auth.resetPrompt"));
    if (!email) return;

    forgotBtn.disabled = true;
    authMsg.textContent = t("auth.resetSending");
    boot("Auth: reset email…");

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: APP_BASE_URL + "#reset"
      });
      if (error) throw error;
      authMsg.textContent = t("auth.resetSent");
      boot("Auth: reset sent");
    } catch (err) {
      console.error(err);
      authMsg.textContent = (err && err.message) ? err.message : t("auth.unknownError");
      boot("Auth: reset error");
    } finally {
      forgotBtn.disabled = false;
    }
  }
  forgotBtn.onclick = forgotPasswordFlow;

  /* ===== App auth UI ===== */
  function disableVoteButtons(disabled) {
    document.querySelectorAll("button[data-vote-btn='1']").forEach(b => { b.disabled = disabled; });
  }

  function setAuthUI() {
    const navUser = document.getElementById("navUser");
    const navHint = document.getElementById("navHint");

    const loginBtn = document.getElementById("loginNavBtn");
    const registerBtn = document.getElementById("registerNavBtn");
    const changeBtn = document.getElementById("changePassNavBtn");
    const logoutBtn = document.getElementById("logoutNavBtn");

    if (!session) {
      isVerified = false;
      navUser.textContent = t("auth.notLogged");
      navHint.textContent = t("auth.navHintLoggedOut");

      loginBtn.classList.remove("hidden");
      registerBtn.classList.remove("hidden");
      changeBtn.classList.add("hidden");
      logoutBtn.classList.add("hidden");

      disableVoteButtons(true);
      return;
    }

    isVerified = !!session.user?.email_confirmed_at;
    const email = session.user?.email || t("auth.userFallback");

    navUser.textContent = email + (isVerified ? ` (${t("auth.verified")})` : ` (${t("auth.unverified")})`);
    navHint.textContent = isVerified
      ? ""
      : t("auth.navHintUnverified");

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
  window.getEventEnd = getEventEnd;

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
        <div><b>${escapeHtml(t("vote.option.dk"))}</b></div>
        <div class="bar"><div class="barFill" data-k="dk"></div></div>
        <div class="pct">${pct(dk,total)}%</div>
      </div>

      <div class="countLine">${t("vote.totalLine", { total, yes, no, dk })}</div>
    `;
    setBar(wrap.querySelector('[data-k="yes"]'), pct(yes,total));
    setBar(wrap.querySelector('[data-k="no"]'),  pct(no,total));
    setBar(wrap.querySelector('[data-k="dk"]'),  pct(dk,total));
    return wrap;
  }
  window.renderResultBlock = renderResultBlock;

  function renderTop3(...args) {
    return renderTop3Impl(...args);
  }
  window.renderTop3 = renderTop3;

  function renderTop3Impl(items, votedMap) {
    const top3 = document.getElementById("top3");
    top3.innerHTML = "";
    if (!items?.length) {
      top3.innerHTML = `<div class='muted'>${escapeHtml(t("top3.empty"))}</div>`;
      return;
    }
    const maxVotes = Math.max(...items.map(it => it.votes || 0), 1);
    for (const [idx, it] of items.entries()) {
      const div = document.createElement("div");
      div.className = "card top3Item";
      const hasVoted = votedMap && votedMap.has(it.event_id);
      div.innerHTML = `
        <div class="top3TitleRow">
          <div class="eventTitle"><span class="top3Rank">${idx + 1}</span>${escapeHtml(it.title || "Untitled")}</div>
          ${hasVoted ? `<span class="pill top3VotedPill">${escapeHtml(t("vote.voted"))}</span>` : ""}
        </div>
        <div class="muted">${escapeHtml(cachedCountriesAll.find(c => c.code === it.country_code)?.name || it.country_code || "")}</div>
        <div class="top3Meta">
          <div class="top3Bar"><div class="top3BarFill" style="width:${Math.round(((it.votes || 0) / maxVotes) * 100)}%"></div></div>
          <span class="pill">${escapeHtml(t("top3.voters", { count: it.votes ?? 0 }))}</span>
        </div>
      `;
      div.onclick = () => {
        if (it.country_code) {
          currentCountry = it.country_code;
        }
        navigateEvent(it.event_id);
      };
      top3.appendChild(div);
    }
  }

  function setActiveView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const view = document.getElementById(viewId);
    if (view) view.classList.add("active");
    updateBreadcrumb();
  }

  function navigateHome() {
    history.replaceState({}, "", "#home");
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
    history.replaceState({}, "", `#country=${code}`);
    setActiveView("countryView");
    loadCountryDetail(code);
  }

  function navigateEvent(eventId) {
    if (!eventId || !currentCountry) return;
    currentEventId = eventId;
    history.replaceState({}, "", `#event=${eventId}`);
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

    updateMapChoropleth();
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

      answers.appendChild(mkAnswer("Ano", "yes", "answer-yes"));
      answers.appendChild(mkAnswer("Ne", "no", "answer-no"));
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
    const isRecoveryHint = h.includes("type=recovery") || h.includes("access_token") || h.includes("#reset");
    if (isRecoveryHint) {
      authMode = "update";
      setModeUI();
      openModal("update");
      authMsg.textContent = t("auth.resetFromLink");
    }
  }

  function handleInitialRoute() {
    const hash = window.location.hash || "";
    if (hash.startsWith("#country=")) {
      const code = hash.replace("#country=", "").trim();
      if (code) {
        navigateCountry(code);
        return;
      }
    }
    if (hash.startsWith("#event=")) {
      const id = hash.replace("#event=", "").trim();
      if (id) {
        setActiveView("eventView");
        loadEventDetail(id);
        return;
      }
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

  function findCountryByCode(code) {
    if (!code) return null;
    const normalized = code.toUpperCase();
    return cachedCountriesAll.find(c => String(c.code || "").toUpperCase() === normalized) || null;
  }

  function findCountryByName(name) {
    if (!name) return null;
    const normalized = name.toLowerCase();
    return cachedCountriesAll.find(c => String(c.name || "").toLowerCase() === normalized) || null;
  }

  function updateMapChoropleth() {
    if (!mapInstance || !mapReady || !countryStats.size) return;
    const denom = maxCountryVotes || 1;
    for (const [code, stats] of countryStats.entries()) {
      if (!code) continue;
      const intensity = stats.events > 0 ? Math.max(0.1, stats.votes / denom) : 0;
      mapInstance.setFeatureState(
        { source: "countries", sourceLayer: "country_boundaries", id: code },
        { intensity }
      );
    }
  }

  async function initWorldMap() {
    const mapHost = document.getElementById("worldMap");
    if (!mapHost) return;
    const mapNote = document.querySelector(".mapNote");

    function showMapFallback(message) {
      mapHost.classList.add("mapPlaceholder");
      mapHost.innerHTML = message;
      if (mapNote) {
        mapNote.textContent = t("map.unavailable");
      }
    }

    if (!MAPBOX_TOKEN) {
      showMapFallback(t("map.missingToken"));
      return;
    }

    try {
      const mapboxgl = await loadMapbox();
      mapboxgl.accessToken = MAPBOX_TOKEN;
      mapInstance = new mapboxgl.Map({
        container: mapHost,
        style: "mapbox://styles/mapbox/light-v11",
        center: [10, 20],
        zoom: 1.1
      });

      mapInstance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      let hoveredCountryId = null;

      mapInstance.on("load", () => {
        if (!mapInstance.getSource("countries")) {
          mapInstance.addSource("countries", {
            type: "vector",
            url: "mapbox://mapbox.country-boundaries-v1",
            promoteId: "iso_3166_1"
          });
        }

        if (!mapInstance.getLayer("country-fills")) {
          mapInstance.addLayer({
            id: "country-fills",
            type: "fill",
            source: "countries",
            "source-layer": "country_boundaries",
            paint: {
              "fill-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                "#93c5fd",
                [
                  "case",
                  [">", ["feature-state", "intensity"], 0],
                  [
                    "interpolate",
                    ["linear"],
                    ["feature-state", "intensity"],
                    0,
                    "#fee2e2",
                    1,
                    "#b91c1c"
                  ],
                  "rgba(0, 0, 0, 0)"
                ]
              ],
              "fill-opacity": 0.6
            }
          });
        }

        if (!mapInstance.getLayer("country-lines")) {
          mapInstance.addLayer({
            id: "country-lines",
            type: "line",
            source: "countries",
            "source-layer": "country_boundaries",
            paint: {
              "line-color": "#60a5fa",
              "line-width": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                1.5,
                0.3
              ]
            }
          });
        }

        mapReady = true;
        updateMapChoropleth();

        mapInstance.on("mousemove", "country-fills", (e) => {
          if (!e.features?.length) return;
          mapInstance.getCanvas().style.cursor = "pointer";
          const nextId = e.features[0].id;
          if (hoveredCountryId !== null && hoveredCountryId !== nextId) {
            mapInstance.setFeatureState(
              { source: "countries", sourceLayer: "country_boundaries", id: hoveredCountryId },
              { hover: false }
            );
          }
          hoveredCountryId = nextId;
          mapInstance.setFeatureState(
            { source: "countries", sourceLayer: "country_boundaries", id: hoveredCountryId },
            { hover: true }
          );
        });

        mapInstance.on("mouseleave", "country-fills", () => {
          mapInstance.getCanvas().style.cursor = "";
          if (hoveredCountryId !== null) {
            mapInstance.setFeatureState(
              { source: "countries", sourceLayer: "country_boundaries", id: hoveredCountryId },
              { hover: false }
            );
          }
          hoveredCountryId = null;
        });
      });
      mapInstance.on("click", async (e) => {
        const { lng, lat } = e.lngLat;
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=country&access_token=${MAPBOX_TOKEN}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Mapbox geocoding failed");
          const data = await res.json();
          const feature = data?.features?.[0];
          const shortCode = feature?.properties?.short_code;
          const name = feature?.text;
          const country = findCountryByCode(shortCode) || findCountryByName(name);
          if (country) {
            navigateCountry(country.code);
          } else if (name) {
            alert(t("map.countryNotFound", { name }));
          }
        } catch (err) {
          console.warn("Map lookup failed", err);
        }
      });
    } catch (err) {
      console.warn("Mapbox init failed", err);
      showMapFallback(t("map.loadFailed"));
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
      const supabaseLib = await loadSupabase();

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
          authMsg.textContent = t("auth.resetMode");
        }

        if (currentCountry) await loadEventsForCountry(currentCountry);
      });

      await loadContinentsAndCountries();
      await loadCountryStats();
      await initWorldMap();
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
