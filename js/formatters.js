export function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function pct(n, d) {
  if (!d || d <= 0) return 0;
  return Math.round((n / d) * 100);
}

export function formatDate(value) {
  if (!value) return "neuvedeno";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "neuvedeno";
  return d.toLocaleDateString("cs-CZ");
}

export function formatRemainingTime(value) {
  if (!value) return "neuvedeno";
  const now = Date.now();
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return "neuvedeno";
  const diff = Math.max(0, end - now);
  const hours = Math.floor(diff / 36e5);
  const minutes = Math.floor((diff % 36e5) / 6e4);
  return `${hours} h ${minutes} min`;
}

export function getEventEnd(eventItem) {
  if (eventItem?.ends_at) return new Date(eventItem.ends_at).getTime();
  if (eventItem?.created_at) {
    return new Date(eventItem.created_at).getTime() + 30 * 24 * 60 * 60 * 1000;
  }
  return NaN;
}

export function setBar(el, valuePct) {
  const v = Math.max(0, Math.min(100, Number(valuePct) || 0));
  if (el) el.style.width = v + "%";
}
