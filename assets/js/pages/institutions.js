/* Institutions explorer: search, filters, shortlist, side-by-side compare. */
/* ---------- Institutions ---------- */
let instType = "";
function renderInst() {
  const inShort = instType === "shortlist";
  $("#instHead").textContent = inShort ? "My shortlist" : "Institutions & TVET Database";
  $("#instSub").textContent = inShort
    ? "The institutions you've starred — compare them side by side before KUCCPS choices close."
    : "24 universities, polytechnics and KMTC campuses with cut-offs, fees and funding — zero agent commissions.";
  const q = ($("#instSearch").value || "").toLowerCase(),
    f = $("#instField").value;
  let list = PF_INST.filter((i) => {
    if (inShort && !S.shortlist.includes(i.id)) return false;
    if (instType && !inShort) {
      if (instType === "TVET") {
        if (!(i.type.includes("TVET") || i.type.includes("KMTC"))) return false;
      } else if (i.type !== instType) return false;
    }
    if (f && i.field !== f) return false;
    if (q) {
      const hay = (i.name + " " + i.region + " " + i.field + " " + i.progs.join(" ")).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  $("#cntAll").textContent = `(${PF_INST.length})`;
  $("#cntShort").textContent = `(${S.shortlist.length})`;
  $$("#instTabs [data-type]").forEach((x) => x.classList.toggle("on", x.dataset.type === instType));
  const box = $("#instList");
  if (!list.length) {
    box.innerHTML = inShort
      ? `<div class="empty" style="grid-column:1/-1">${ic("i-star")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:4px">No shortlisted institutions yet</b>Tap the star on any institution to build your list.</div>`
      : `<div class="empty" style="grid-column:1/-1">${ic("i-search")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:4px">No institutions match</b>Try a different search or clear filters.</div>`;
    return;
  }
  box.innerHTML = list
    .map((i) => {
      const star = S.shortlist.includes(i.id),
        cmp = S.compare.includes(i.id),
        tc = i.type === "Public University" ? "lime" : i.type === "Private University" ? "amber" : "";
      return `<div class="card inst-card"><div class="inst-logo" style="background:linear-gradient(135deg,${i.color},${i.color}cc)">${esc(i.code)}</div><div class="inst-main"><h3>${esc(i.name)}</h3><div class="inst-meta"><span class="chip ${tc}">${esc(i.type)}</span><span class="chip">${ic("i-pin", "sm")} ${esc(i.region)}</span><span class="chip">${esc(i.field)}</span></div><div class="inst-rows"><div class="inst-row">${ic("i-award")}<span><b>Cut-off:</b> ${esc(i.cutoff)}</span></div><div class="inst-row">${ic("i-coins")}<span><b>Fees:</b> ${esc(i.fees)}</span></div><div class="inst-row">${ic("i-shield")}<span class="tiny">${esc(i.funding)}</span></div></div><div class="prog-chips">${i.progs
        .slice(0, 3)
        .map((p) => `<span class="chip tiny" style="font-weight:600">${esc(p)}</span>`)
        .join(
          ""
        )}${i.progs.length > 3 ? `<span class="chip tiny">+${i.progs.length - 3}</span>` : ""}</div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px"><label class="compare-check"><input type="checkbox" data-cmp="${i.id}" ${cmp ? "checked" : ""}> Compare</label><button class="btn btn-ghost btn-sm" data-detail="${i.id}" style="margin-left:auto">Details</button>${i.site ? `<a class="btn btn-line btn-sm" href="${i.site}" target="_blank" rel="noopener">Website ${ic("i-ext", "sm")}</a>` : ""}</div></div><button class="star-btn${star ? " on" : ""}" data-star="${i.id}" aria-label="Shortlist">${ic("i-star", "lg")}</button></div>`;
    })
    .join("");
  renderCompareBar();
}
function renderCompareBar() {
  const bar = $("#compareBar");
  /* the explorer is a page of its own now, so the view host is #viewBody */
  const view = $("#view-institutions") || $("#viewBody");
  if (!bar || !S.compare.length || !view || !view.classList.contains("active")) {
    if (bar) bar.classList.remove("show");
    return;
  }
  bar.classList.add("show");
  $("#cmpCount").textContent = S.compare.length + " selected";
  $("#cmpNames").textContent = S.compare
    .map((id) => {
      const i = PF_INST.find((x) => x.id === id);
      return i ? i.code : "";
    })
    .join(" · ");
  $("#cmpGo").disabled = S.compare.length < 2;
}
function instDetail(id) {
  const i = PF_INST.find((x) => x.id === id);
  if (!i) return;
  openModal(
    `<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:6px"><div class="inst-logo" style="background:linear-gradient(135deg,${i.color},${i.color}cc)">${esc(i.code)}</div><div style="flex:1;min-width:0"><h3 style="font-size:20px">${esc(i.name)}</h3><div class="inst-meta"><span class="chip lime">${esc(i.type)}</span><span class="chip">${esc(i.region)}</span></div></div><button class="modal-x" data-close>${ic("i-x")}</button></div><div class="divider"></div><div class="cmp-cell"><span>Cut-off</span><b>${esc(i.cutoff)}</b></div><div class="cmp-cell"><span>Fees</span><b>${esc(i.fees)}</b></div><div class="cmp-cell"><span>Funding</span><b>${esc(i.funding)}</b></div><h4 style="margin:18px 0 10px;font-size:15px">Programmes</h4><div class="prog-chips">${i.progs.map((p) => `<span class="chip">${esc(p)}</span>`).join("")}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px">${i.site ? `<a class="btn btn-line btn-sm" href="${i.site}" target="_blank" rel="noopener">Official website ${ic("i-ext", "sm")}</a>` : ""}<a class="btn btn-line btn-sm" href="https://students.kuccps.ac.ke/programmes/search/" target="_blank" rel="noopener">KUCCPS search ${ic("i-ext", "sm")}</a><button class="btn btn-dark btn-sm" data-close style="margin-left:auto">Done</button></div>`
  );
}
function openCompare() {
  const list = S.compare.map((id) => PF_INST.find((x) => x.id === id)).filter(Boolean);
  const rows = [
    ["Type", "type"],
    ["Region", "region"],
    ["Field", "field"],
    ["Cut-off", "cutoff"],
    ["Fees", "fees"],
    ["Funding", "funding"]
  ];
  openModal(
    `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><h3 style="font-size:20px">Compare</h3><button class="modal-x" data-close style="margin-left:auto">${ic("i-x")}</button></div><div style="display:grid;grid-template-columns:repeat(${list.length},1fr);gap:12px" class="cmp-grid">${list.map((i) => `<div style="border:1px solid var(--line);border-radius:16px;padding:14px;min-width:0"><div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><div class="inst-logo" style="width:40px;height:40px;flex-basis:40px;font-size:11px;border-radius:11px;background:linear-gradient(135deg,${i.color},${i.color}cc)">${esc(i.code)}</div><b style="font-family:var(--font-d);font-size:13.5px;line-height:1.2">${esc(i.name)}</b></div>${rows.map((r) => `<div class="cmp-cell"><span>${r[0]}</span><b>${esc(i[r[1]])}</b></div>`).join("")}</div>`).join("")}</div><style>@media(max-width:760px){.cmp-grid{grid-template-columns:1fr !important}}</style>`
  );
}
$("#instSearch").addEventListener("input", renderInst);
$("#instField").addEventListener("change", renderInst);
$("#instTabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-type]");
  if (!b) return;
  instType = b.dataset.type;
  renderInst();
});
$("#instList").addEventListener("click", (e) => {
  const star = e.target.closest("[data-star]");
  if (star) {
    const id = star.dataset.star;
    S.shortlist = S.shortlist.includes(id) ? S.shortlist.filter((x) => x !== id) : [...S.shortlist, id];
    save();
    renderInst();
    toast(S.shortlist.includes(id) ? "Added to shortlist" : "Removed", "i-star");
    return;
  }
  const d = e.target.closest("[data-detail]");
  if (d) instDetail(d.dataset.detail);
});
$("#instList").addEventListener("change", (e) => {
  const c = e.target.closest("[data-cmp]");
  if (!c) return;
  const id = c.dataset.cmp;
  if (c.checked) {
    if (S.compare.length >= 3) {
      c.checked = false;
      toast("Compare up to 3 at once", "i-info");
      return;
    }
    S.compare.push(id);
  } else S.compare = S.compare.filter((x) => x !== id);
  save();
  renderCompareBar();
});
$("#cmpClear").addEventListener("click", () => {
  S.compare = [];
  save();
  renderInst();
});
$("#cmpGo").addEventListener("click", openCompare);

/* ---------- page boot ---------- */
const IQ = new URLSearchParams(location.search);
instType = IQ.get("filter") === "shortlist" ? "shortlist" : "";
if (IQ.get("q") && $("#instSearch")) $("#instSearch").value = IQ.get("q");
if (IQ.get("field") && $("#instField")) $("#instField").value = IQ.get("field");
renderInst();
reveal();
