export function setHomeHash() {
  history.replaceState({}, "", "#home");
}

export function setCountryHash(code) {
  history.replaceState({}, "", `#country=${code}`);
}

export function setEventHash(eventId) {
  history.replaceState({}, "", `#event=${eventId}`);
}

export function parseHashRoute(hashValue) {
  const hash = hashValue || "";
  if (hash.startsWith("#country=")) {
    const code = hash.replace("#country=", "").trim();
    return code ? { type: "country", value: code } : { type: "home", value: null };
  }
  if (hash.startsWith("#event=")) {
    const id = hash.replace("#event=", "").trim();
    return id ? { type: "event", value: id } : { type: "home", value: null };
  }
  return { type: "home", value: null };
}

export function hasRecoveryHint(hashValue) {
  const hash = hashValue || "";
  return hash.includes("type=recovery") || hash.includes("access_token") || hash.includes("#reset");
}
