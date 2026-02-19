export function createEventsUI({ t, escapeHtml, pct, setBar, getCountryNameByCode, onTop3Click }) {
  function renderResultBlock(title, r, sizeClass) {
    const yes = r?.yes || 0;
    const no = r?.no || 0;
    const dk = r?.dk || 0;
    const total = r?.total || 0;
    const wrap = document.createElement("div");
    wrap.className = "resultBlock " + (sizeClass || "large");
    wrap.innerHTML = `
      <div class="resultTitle">${escapeHtml(title)}</div>

      <div class="rowBar">
        <div><b>${escapeHtml(t("vote.option.yes"))}</b></div>
        <div class="bar"><div class="barFill" data-k="yes"></div></div>
        <div class="pct">${pct(yes, total)}%</div>
      </div>
      <div class="rowBar">
        <div><b>${escapeHtml(t("vote.option.no"))}</b></div>
        <div class="bar"><div class="barFill" data-k="no"></div></div>
        <div class="pct">${pct(no, total)}%</div>
      </div>
      <div class="rowBar">
        <div><b>${escapeHtml(t("vote.option.dk"))}</b></div>
        <div class="bar"><div class="barFill" data-k="dk"></div></div>
        <div class="pct">${pct(dk, total)}%</div>
      </div>

      <div class="countLine">${t("vote.totalLine", { total, yes, no, dk })}</div>
    `;

    setBar(wrap.querySelector('[data-k="yes"]'), pct(yes, total));
    setBar(wrap.querySelector('[data-k="no"]'), pct(no, total));
    setBar(wrap.querySelector('[data-k="dk"]'), pct(dk, total));
    return wrap;
  }

  function renderTop3(items, votedMap) {
    const top3 = document.getElementById("top3");
    top3.innerHTML = "";
    if (!items?.length) {
      top3.innerHTML = `<div class='muted'>${escapeHtml(t("top3.empty"))}</div>`;
      return;
    }

    const maxVotes = Math.max(...items.map((it) => it.votes || 0), 1);
    for (const [idx, it] of items.entries()) {
      const div = document.createElement("div");
      div.className = "card top3Item";
      const hasVoted = votedMap && votedMap.has(it.event_id);
      div.innerHTML = `
        <div class="top3TitleRow">
          <div class="eventTitle"><span class="top3Rank">${idx + 1}</span>${escapeHtml(it.title || "Untitled")}</div>
          ${hasVoted ? `<span class="pill top3VotedPill">${escapeHtml(t("vote.voted"))}</span>` : ""}
        </div>
        <div class="muted">${escapeHtml(getCountryNameByCode(it.country_code) || it.country_code || "")}</div>
        <div class="top3Meta">
          <div class="top3Bar"><div class="top3BarFill" style="width:${Math.round(((it.votes || 0) / maxVotes) * 100)}%"></div></div>
          <span class="pill">${escapeHtml(t("top3.voters", { count: it.votes ?? 0 }))}</span>
        </div>
      `;

      div.onclick = () => onTop3Click(it);
      top3.appendChild(div);
    }
  }

  return { renderResultBlock, renderTop3 };
}
