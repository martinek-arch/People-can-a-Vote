const translations = {
  cs: {
    "nav.searchPlaceholder": "Hledat zemi nebo událost",
    "nav.loading": "Načítání…",
    "nav.login": "Přihlásit",
    "nav.register": "Registrovat",
    "nav.changePassword": "Změnit heslo",
    "nav.logout": "Odhlásit",
    "nav.home": "Domů",
    "home.top3Title": "TOP 3 události (nejvíc hlasujících)",
    "home.refresh": "Obnovit",
    "home.chooseCountry": "Vyber zemi",
    "home.mapTitle": "Interaktivní mapa světa",
    "home.mapNote": "Klikni na zemi a zobraz její události.",
    "country.title": "Země",
    "country.subtitle": "Výběr země podle kontinentu",
    "country.backHome": "Zpět na úvod",
    "country.topEvent": "TOP událost v zemi",
    "country.activeEvents": "Aktivní události",
    "country.archive": "Archiv / ukončené hlasování",
    "event.title": "Událost",
    "event.active": "Aktivní",
    "event.closed": "Uzavřeno",
    "event.backToCountry": "Zpět na zemi",
    "common.loading": "Načítání…",
    "modal.title": "Účet",
    "modal.loginTab": "Přihlášení",
    "modal.registerTab": "Registrace",
    "modal.updateTab": "Nové heslo",
    "modal.close": "Zavřít",
    "modal.passwordHint": "Doporučeno aspoň 8 znaků.",
    "modal.email": "Email",
    "modal.password": "Heslo",
    "modal.passwordAgain": "Heslo znovu",
    "modal.emailPlaceholder": "email@domena.cz",
    "modal.passwordPlaceholder": "••••••••",
    "modal.forgot": "Zapomenuté heslo",
    "modal.login": "Přihlásit",
    "auth.submit.login": "Přihlásit",
    "auth.submit.register": "Registrovat",
    "auth.submit.update": "Nastavit nové heslo",
    "auth.passwordMin": "Heslo musí mít alespoň 8 znaků.",
    "auth.passwordMismatch": "Hesla se neshodují.",
    "auth.working.login": "Přihlašuji…",
    "auth.working.register": "Registruji…",
    "auth.working.update": "Nastavuji nové heslo…",
    "auth.registerCreated": "Registrace vytvořena. Zkontroluj email a potvrď adresu. Pak se přihlas heslem.",
    "auth.passwordUpdated": "Heslo změněno.",
    "auth.unknownError": "Neznámá chyba",
    "auth.resetPrompt": "Zadej email pro reset hesla:",
    "auth.resetSending": "Odesílám email pro reset hesla…",
    "auth.resetSent": "Hotovo. Zkontroluj email, klikni na odkaz a nastav nové heslo.",
    "auth.notLogged": "Nepřihlášen",
    "auth.navHintLoggedOut": "Hlasování je dostupné pouze pro přihlášené a ověřené uživatele.",
    "auth.userFallback": "uživatel",
    "auth.verified": "ověřený",
    "auth.unverified": "neověřený",
    "auth.navHintVerified": "Můžeš hlasovat.",
    "auth.navHintUnverified": "Prosím potvrď email (odkaz v emailu) – bez ověření nejde hlasovat.",
    "vote.option.yes": "Ano",
    "vote.option.no": "Ne",
    "vote.option.dk": "Nevím",
    "vote.totalLine": "Hlasů celkem: <b>{total}</b> (Ano: {yes}, Ne: {no}, Nevím: {dk})",
    "top3.empty": "Zatím žádná data pro TOP 3.",
    "vote.voted": "Odhlasováno",
    "top3.voters": "hlasujících: {count}",
    "event.status.ended": "ukončeno",
    "event.status.active": "aktivní",
    "event.votingEnded": "Hlasování ukončeno",
    "event.remaining": "Do konce hlasování zbývá: {time}",
    "event.country": "Země: {code}",
    "vote.needAuth": "Hlasování je dostupné jen pro přihlášené a ověřené uživatele.",
    "vote.eventEnded": "Tato událost už je ukončená.",
    "vote.alreadyVoted": "Už jste pro tuto událost hlasoval.",
    "vote.submitFailed": "Hlasování se nepodařilo: {message}",
    "vote.saved": "Díky! Hlas byl uložen.",
    "results.total": "Celkem (všichni)",
    "results.domestic": "Občané cílové země",
    "results.foreign": "Ostatní země",
    "results.loading": "Výsledky se načítají…",
    "events.emptyActive": "V této zemi zatím nejsou žádné aktivní události.",
    "events.emptyArchive": "Zatím tu nejsou žádné ukončené události.",
    "country.subtitleStats": "Země: {name} ({code}) · Událostí: {count}",
    "country.homeTitleCode": "Země: {code}",
    "event.loading": "Načítání události…",
    "event.loadFailed": "Událost se nepodařilo načíst.",
    "event.countryName": "Země: {code}",
    "event.topEmpty": "Zatím žádná data pro TOP událost.",
    "event.votersTotal": "Hlasujících celkem: <b>{count}</b>",
    "auth.resetFromLink": "Nastav nové heslo (z reset odkazu).",
    "map.unavailable": "Mapa momentálně není dostupná.",
    "map.tokenlessMode": "Mapa běží v režimu bez tokenu (OpenStreetMap). Klikni na zemi.",
    "map.missingToken": "Mapa není dostupná (chybí token). Nastav runtime config window.__PCV_CONFIG__.mapboxToken.",
    "map.countryNotFound": "Země „{name}“ není v seznamu.",
    "map.loadFailed": "Mapa se nepodařilo načíst.",
    "auth.resetMode": "Nastav nové heslo (reset).",
    "search.countryLabel": "Země: {name} ({code})",
    "search.eventLabel": "Událost: {title} ({code})",
  },
  en: {
    "nav.searchPlaceholder": "Search country or event",
    "nav.loading": "Loading…",
    "nav.login": "Sign in",
    "nav.register": "Register",
    "nav.changePassword": "Change password",
    "nav.logout": "Sign out",
    "nav.home": "Home",
    "home.top3Title": "TOP 3 events (most voters)",
    "home.refresh": "Refresh",
    "home.chooseCountry": "Choose country",
    "home.mapTitle": "Interactive world map",
    "home.mapNote": "Click a country to show its events.",
    "country.title": "Country",
    "country.subtitle": "Select country by continent",
    "country.backHome": "Back to home",
    "country.topEvent": "Top event in country",
    "country.activeEvents": "Active events",
    "country.archive": "Archive / closed voting",
    "event.title": "Event",
    "event.active": "Active",
    "event.closed": "Closed",
    "event.backToCountry": "Back to country",
    "common.loading": "Loading…",
    "modal.title": "Account",
    "modal.loginTab": "Sign in",
    "modal.registerTab": "Register",
    "modal.updateTab": "New password",
    "modal.close": "Close",
    "modal.passwordHint": "At least 8 characters recommended.",
    "modal.email": "Email",
    "modal.password": "Password",
    "modal.passwordAgain": "Password again",
    "modal.emailPlaceholder": "email@domain.com",
    "modal.passwordPlaceholder": "••••••••",
    "modal.forgot": "Forgot password",
    "modal.login": "Sign in",
    "auth.submit.login": "Sign in",
    "auth.submit.register": "Register",
    "auth.submit.update": "Set new password",
    "auth.passwordMin": "Password must be at least 8 characters.",
    "auth.passwordMismatch": "Passwords do not match.",
    "auth.working.login": "Signing in…",
    "auth.working.register": "Registering…",
    "auth.working.update": "Setting new password…",
    "auth.registerCreated": "Registration created. Check your email, confirm your address, then sign in.",
    "auth.passwordUpdated": "Password updated.",
    "auth.unknownError": "Unknown error",
    "auth.resetPrompt": "Enter email for password reset:",
    "auth.resetSending": "Sending password reset email…",
    "auth.resetSent": "Done. Check your email, open the link and set a new password.",
    "auth.notLogged": "Not signed in",
    "auth.navHintLoggedOut": "Voting is available only for signed-in and verified users.",
    "auth.userFallback": "user",
    "auth.verified": "verified",
    "auth.unverified": "unverified",
    "auth.navHintVerified": "You can vote.",
    "auth.navHintUnverified": "Please confirm your email (link in email) – voting requires verification.",
    "vote.option.yes": "Yes",
    "vote.option.no": "No",
    "vote.option.dk": "I don't know",
    "vote.totalLine": "Total votes: <b>{total}</b> (Yes: {yes}, No: {no}, I don't know: {dk})",
    "top3.empty": "No TOP 3 data yet.",
    "vote.voted": "Voted",
    "top3.voters": "voters: {count}",
    "event.status.ended": "closed",
    "event.status.active": "active",
    "event.votingEnded": "Voting closed",
    "event.remaining": "Time left to vote: {time}",
    "event.country": "Country: {code}",
    "vote.needAuth": "Voting is available only for signed-in and verified users.",
    "vote.eventEnded": "This event is already closed.",
    "vote.alreadyVoted": "You have already voted on this event.",
    "vote.submitFailed": "Voting failed: {message}",
    "vote.saved": "Thanks! Your vote was saved.",
    "results.total": "Total (everyone)",
    "results.domestic": "Citizens of target country",
    "results.foreign": "Other countries",
    "results.loading": "Loading results…",
    "events.emptyActive": "There are no active events in this country yet.",
    "events.emptyArchive": "There are no closed events here yet.",
    "country.subtitleStats": "Country: {name} ({code}) · Events: {count}",
    "country.homeTitleCode": "Country: {code}",
    "event.loading": "Loading event…",
    "event.loadFailed": "Failed to load event.",
    "event.countryName": "Country: {code}",
    "event.topEmpty": "No top event data yet.",
    "event.votersTotal": "Total voters: <b>{count}</b>",
    "auth.resetFromLink": "Set new password (from reset link).",
    "map.unavailable": "Map is currently unavailable.",
    "map.tokenlessMode": "Map runs in tokenless mode (OpenStreetMap). Click a country.",
    "map.missingToken": "Map unavailable (missing token). Set runtime config window.__PCV_CONFIG__.mapboxToken.",
    "map.countryNotFound": "Country “{name}” is not in the list.",
    "map.loadFailed": "Failed to load map.",
    "auth.resetMode": "Set new password (reset).",
    "search.countryLabel": "Country: {name} ({code})",
    "search.eventLabel": "Event: {title} ({code})",
  },
};

const FALLBACK_LANG = "cs";

let currentLang = localStorage.getItem("pcvLang") || document.documentElement.lang || FALLBACK_LANG;
if (!translations[currentLang]) {
  currentLang = FALLBACK_LANG;
}

document.documentElement.lang = currentLang;

function interpolate(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? `{${key}}`));
}

export function t(key, vars) {
  const template = translations[currentLang]?.[key] ?? translations[FALLBACK_LANG]?.[key] ?? key;
  return vars ? interpolate(template, vars) : template;
}

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("pcvLang", lang);
  document.documentElement.lang = lang;
}

export function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
}

export function initI18nSelector(onChange) {
  const select = document.getElementById("languageSelect");
  if (!select) return;
  select.value = currentLang;
  select.addEventListener("change", () => {
    setLanguage(select.value);
    applyStaticTranslations();
    if (typeof onChange === "function") onChange();
  });
}
