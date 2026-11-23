/* Funding hub: HEF bands 1-5, HELB loans, scholarships. */
/* ---------- Funding ---------- */
/* Five bands, five vertical cards. Each card carries the split as a bar, the
   scholarship/loan ratio in words, and the one sentence that explains it, so
   nothing is hidden behind an accordion the person has to discover. */
const BAND_TONE = ["rose", "peach", "amber", "sky", "lav"];
function bandSplitPct(split) {
  const m = String(split || "").match(/(\d+)\s*%\s*scholarship/i);
  return m ? Math.max(0, Math.min(100, Number(m[1]))) : 0;
}
function bandCardHTML(b, i) {
  const pct = bandSplitPct(b.split);
  const tone = BAND_TONE[i % BAND_TONE.length];
  return `<article class="band-card tone-${tone}">
    <div class="band-top"><span class="band-n">B${i + 1}</span><span class="band-tag">${esc(b.tag)}</span></div>
    <h3 class="band-title">${esc(b.b)}</h3>
    <div class="band-bar" role="img" aria-label="${pct}% scholarship, ${100 - pct}% loan">
      <i class="s" style="width:${pct}%"></i><i class="l" style="width:${100 - pct}%"></i>
    </div>
    <div class="band-legend"><span><i class="s"></i>${pct}% scholarship</span><span><i class="l"></i>${100 - pct}% loan</span></div>
    <p class="band-d">${esc(b.d)}</p>
    <a class="band-go" href="https://www.hef.co.ke" target="_blank" rel="noopener">Apply on hef.co.ke ${ic("i-ext", "sm")}</a>
  </article>`;
}
function initFunding() {
  $("#bandList").innerHTML = PF_FUNDS.map(bandCardHTML).join("");
  $("#schList").innerHTML = PF_SCH.map(
    (s) =>
      `<div class="card sch-card"><div style="display:flex;gap:12px;align-items:flex-start"><span class="tile lav" style="width:42px;height:42px;flex-basis:42px">${ic("i-award")}</span><div class="grow" style="min-width:0"><h3>${esc(s.name)}</h3><p class="small muted" style="margin-top:4px"><b style="color:var(--pine3)">Who:</b> ${esc(s.who)}</p><p class="small muted"><b style="color:var(--pine3)">Covers:</b> ${esc(s.covers)}</p><span class="chip amber" style="margin-top:8px">${ic("i-clock", "sm")} ${esc(s.window)}</span></div></div><a class="btn btn-line btn-sm" href="${s.url}" target="_blank" rel="noopener">Apply on official site ${ic("i-ext", "sm")}</a></div>`
  ).join("");
}

/* ---------- page boot ---------- */
initFunding();
reveal();
