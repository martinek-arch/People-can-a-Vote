const translations = {
  cs: {
    "nav.searchPlaceholder": "Hledat zemi nebo událost",
    "nav.loading": "Načítání…",
    "nav.login": "Přihlásit",
    "nav.register": "Registrovat",
    "nav.changePassword": "Změnit heslo",
    "nav.logout": "Odhlásit",
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
    "modal.title": "Účet",
    "modal.loginTab": "Přihlášení",
    "modal.registerTab": "Registrace",
    "modal.updateTab": "Nové heslo",
    "modal.close": "Zavřít",
    "modal.passwordHint": "Doporučeno aspoň 8 znaků.",
    "modal.forgot": "Zapomenuté heslo",
    "modal.login": "Přihlásit",
    "auth.submit.login": "Přihlásit",
    "auth.submit.register": "Registrovat",
    "auth.submit.update": "Nastavit nové heslo",
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
    "modal.title": "Account",
    "modal.loginTab": "Sign in",
    "modal.registerTab": "Register",
    "modal.updateTab": "New password",
    "modal.close": "Close",
    "modal.passwordHint": "At least 8 characters recommended.",
    "modal.forgot": "Forgot password",
    "modal.login": "Sign in",
    "auth.submit.login": "Sign in",
    "auth.submit.register": "Register",
    "auth.submit.update": "Set new password",
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
