/* Funding hub: HEF bands 1-5, HELB loans, scholarships. */
/* ---------- Funding ---------- */
function initFunding() {
  $("#bandList").innerHTML = PF_FUNDS.map(
    (b, i) =>
      `<button class="band" data-band="${i}"><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><span class="tile ${["rose", "peach", "amber", "sky", "lav"][i]}" style="font-family:var(--font-d);font-weight:800;font-size:13px">${b.b.replace("Band ", "B")}</span><div style="flex:1;min-width:160px;text-align:left"><b style="font-family:var(--font-d);font-size:15.5px">${esc(b.b)} — ${esc(b.tag)}</b><div class="small muted">${esc(b.split)}</div></div>${ic("i-chev")}</div><div class="a">${esc(b.d)} <a href="https://www.hef.co.ke" target="_blank" rel="noopener" style="font-weight:700">Apply on hef.co.ke →</a></div></button>`
  ).join("");
  $("#bandList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-band]");
    if (!b || e.target.closest("a")) return;
    b.classList.toggle("open");
  });
  $("#schList").innerHTML = PF_SCH.map(
    (s) =>
      `<div class="card sch-card"><div style="display:flex;gap:12px;align-items:flex-start"><span class="tile lav" style="width:42px;height:42px;flex-basis:42px">${ic("i-award")}</span><div class="grow" style="min-width:0"><h3>${esc(s.name)}</h3><p class="small muted" style="margin-top:4px"><b style="color:var(--pine3)">Who:</b> ${esc(s.who)}</p><p class="small muted"><b style="color:var(--pine3)">Covers:</b> ${esc(s.covers)}</p><span class="chip amber" style="margin-top:8px">${ic("i-clock", "sm")} ${esc(s.window)}</span></div></div><a class="btn btn-line btn-sm" href="${s.url}" target="_blank" rel="noopener">Apply on official site ${ic("i-ext", "sm")}</a></div>`
  ).join("");
}

/* ---------- page boot ---------- */
initFunding();
reveal();
