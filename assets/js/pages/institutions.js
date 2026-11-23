/* Institutions explorer: search, filters, shortlist, side-by-side compare. */
/* ---------- Institutions ---------- */
let instType = "";
/* How the tabs and the header talk about the dataset. Every number below is
   counted from PF_INST itself, so the page can never claim a total the list does
   not hold. */
function instKind(i) {
  if (i.type === "Public University") return "public";
  if (i.type === "Private University") return "private";
  if (/University College/.test(i.type)) return "college";
  return "TVET";
}
function instCounts() {
  const c = { all: PF_INST.length, public: 0, private: 0, college: 0, TVET: 0, detail: 0 };
  PF_INST.forEach((i) => {
    c[instKind(i)]++;
    if (Number(i.minPts) > 0) c.detail++;
  });
  c.unis = c.public + c.private;
  return c;
}
/* The county list only ever offers counties that are actually in the dataset. */
function fillInstCounties() {
  const sel = $("#instCounty");
  if (!sel || sel.dataset.filled) return;
  const list = [...new Set(PF_INST.map((i) => i.region).filter(Boolean))].sort();
  sel.innerHTML =
    `<option value="">All counties (${list.length})</option>` + list.map((c) => `<option>${esc(c)}</option>`).join("");
  sel.dataset.filled = "1";
}
function renderInst() {
  fillInstCounties();
  const inShort = instType === "shortlist";
  const c = instCounts();
  $("#instHead").textContent = inShort ? "My shortlist" : "Institutions & TVET Database";
  $("#instSub").textContent = inShort
    ? `The ${S.shortlist.length} institution${S.shortlist.length === 1 ? "" : "s"} you've starred — compare them side by side before KUCCPS choices close.`
    : `${c.unis} chartered universities — ${c.public} public and ${c.private} private — plus ${c.college} university colleges and ${c.TVET} TVET institutions. ${c.detail} of them carry a published cluster cut-off in this dataset; the rest are listed with their county so you know they exist before you apply.`;
  const q = ($("#instSearch").value || "").toLowerCase(),
    f = $("#instField").value,
    cty = ($("#instCounty") && $("#instCounty").value) || "";
  let list = PF_INST.filter((i) => {
    if (inShort && !S.shortlist.includes(i.id)) return false;
    if (instType && !inShort) {
      if (instType === "TVET") {
        if (!(i.type.includes("TVET") || i.type.includes("KMTC"))) return false;
      } else if (instKind(i) !== instType) return false;
    }
    if (cty && i.region !== cty) return false;
    if (f && i.field !== f) return false;
    if (q) {
      const hay = (
        i.name +
        " " +
        i.region +
        " " +
        (i.town || "") +
        " " +
        i.field +
        " " +
        i.progs.join(" ")
      ).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  $("#cntAll").textContent = `(${c.all})`;
  $("#cntShort").textContent = `(${S.shortlist.length})`;
  $$("#instTabs [data-type]").forEach((x) => {
    x.classList.toggle("on", x.dataset.type === instType);
    const k = x.dataset.type;
    const tag = x.querySelector("[data-count]");
    if (tag && c[k] !== undefined) tag.textContent = `(${c[k]})`;
  });
  const box = $("#instList");
  if (!list.length) {
    box.innerHTML = inShort
      ? `<div class="empty" style="grid-column:1/-1">${ic("i-star")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:4px">No shortlisted institutions yet</b>Tap the star on any institution to build your list.</div>`
      : `<div class="empty" style="grid-column:1/-1">${ic("i-search")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:4px">No institutions match</b>Try a different search, or clear the county and field filters.</div>`;
    return;
  }
  box.innerHTML = list.map(instCardHTML).join("");
  const shown = $("#instShown");
  if (shown) shown.textContent = `Showing ${list.length} of ${c.all}`;
  renderCompareBar();
}
/* ---------- one card ----------
   Three across, and every field the dataset actually holds: the cut-off as a
   bar when there is a cluster-point figure, the entry requirement as text when
   there is not (private intakes and TVET grade rules), fees, funding and the
   whole programme list. Nothing is invented to fill the space. */
function instPtsPct(pts) {
  /* cluster points run to 48; the bar starts at 24 because nothing below that
     is ever placed in a degree programme */
  if (!pts) return 0;
  return Math.max(0, Math.min(100, Math.round(((Number(pts) - 24) / 24) * 100)));
}
function instCardHTML(i) {
  const star = S.shortlist.includes(i.id),
    cmp = S.compare.includes(i.id),
    kind = instKind(i),
    tc = kind === "public" ? "lime" : kind === "private" ? "amber" : "";
  const pts = Number(i.minPts) || 0;
  const progs = (i.progs || []).slice(0, 4);
  const where = [i.region, i.town && i.town !== i.region ? i.town : ""].filter(Boolean).join(" · ");
  return `<div class="card inst-card inst-card-3">
    <div class="inst-top">
      <div class="inst-logo" style="background:linear-gradient(135deg,${i.color},${i.color}cc)">${esc(i.code)}</div>
      <div class="inst-id"><h3>${esc(i.name)}</h3>
        <div class="inst-meta"><span class="chip ${tc}">${esc(i.type)}</span><span class="chip">${ic("i-pin", "sm")} ${esc(where || "Kenya")}</span>${i.field ? `<span class="chip">${esc(i.field)}</span>` : ""}${i.chartered ? `<span class="chip">${ic("i-award", "sm")} ${i.chartered}</span>` : ""}</div>
      </div>
      <button class="star-btn${star ? " on" : ""}" data-star="${i.id}" aria-label="Shortlist ${esc(i.name)}">${ic("i-star")}</button>
    </div>
    ${
      pts
        ? `<div class="inst-cut"><div class="inst-cut-h"><b>${pts}</b><span>min cluster points</span><small>of 48</small></div>
             <div class="inst-bar" role="img" aria-label="Cut-off ${pts} of 48 cluster points"><i style="width:${instPtsPct(pts)}%"></i></div>
             <p class="tiny muted">${esc(i.cutoff)}</p></div>`
        : `<div class="inst-cut inst-cut-alt"><div class="inst-cut-h"><b>${ic("i-award", "sm")} Entry</b><small>${esc(i.cutoff)}</small></div></div>`
    }
    <div class="inst-rows">
      <div class="inst-row">${ic("i-coins")}<span><b>Fees:</b> ${esc(i.fees)}</span></div>
      <div class="inst-row">${ic("i-shield")}<span class="tiny">${esc(i.funding)}</span></div>
    </div>
    ${
      progs.length
        ? `<div class="inst-progs"><span class="tiny muted"><b>${i.progs.length} programmes</b></span>
      <div class="prog-chips">${progs.map((p) => `<span class="chip tiny" style="font-weight:600">${esc(p)}</span>`).join("")}${
        i.progs.length > progs.length ? `<span class="chip tiny">+${i.progs.length - progs.length}</span>` : ""
      }</div></div>`
        : `<div class="inst-progs"><span class="tiny muted">Programme list not in this dataset — check the university's own prospectus.</span></div>`
    }
    <div class="inst-acts">
      <label class="compare-check"><input type="checkbox" data-cmp="${i.id}" ${cmp ? "checked" : ""}> Compare</label>
      <button class="btn btn-ghost btn-sm" data-detail="${i.id}">Details</button>
      ${i.site ? `<a class="btn btn-line btn-sm" href="${i.site}" target="_blank" rel="noopener" aria-label="Website of ${esc(i.name)}">${ic("i-ext", "sm")}</a>` : ""}
    </div>
  </div>`;
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
  const pts = Number(i.minPts) || 0;
  const star = S.shortlist.includes(i.id);
  openModal(
    `<div class="inst-detail-head"><div class="inst-logo" style="background:linear-gradient(135deg,${i.color},${i.color}cc)">${esc(i.code)}</div>
      <div style="flex:1;min-width:0"><h3 style="font-size:20px">${esc(i.name)}</h3>
        <div class="inst-meta"><span class="chip lime">${esc(i.type)}</span><span class="chip">${ic("i-pin", "sm")} ${esc(
          [i.region, i.town && i.town !== i.region ? i.town : ""].filter(Boolean).join(" · ") || "Kenya"
        )}</span>${i.field ? `<span class="chip">${esc(i.field)}</span>` : ""}${
          i.chartered ? `<span class="chip">${ic("i-award", "sm")} Chartered ${i.chartered}</span>` : ""
        }</div></div>
      <button class="modal-x" data-close aria-label="Close">${ic("i-x")}</button></div>
    <div class="divider"></div>
    ${
      pts
        ? `<div class="inst-cut"><div class="inst-cut-h"><b>${pts}</b><span>min cluster points</span><small>of 48</small></div>
           <div class="inst-bar" role="img" aria-label="Cut-off ${pts} of 48 cluster points"><i style="width:${instPtsPct(pts)}%"></i></div>
           <p class="tiny muted">KUCCPS places on <b>cluster points</b>, not on mean grade alone. ${esc(i.cutoff)} — the range moves with demand each year.</p></div>`
        : `<div class="inst-cut inst-cut-alt"><div class="inst-cut-h"><b>${ic("i-award", "sm")} Entry requirement</b><small>${esc(i.cutoff)}</small></div>
           <p class="tiny muted">This one does not run through KUCCPS central placement, so there is no cluster cut-off to show — apply to the institution and it decides from your KCSE grades.</p></div>`
    }
    <div class="cmp-cell"><span>Fees</span><b>${esc(i.fees)}</b></div>
    <div class="cmp-cell"><span>Funding</span><b>${esc(i.funding)}</b></div>
    <div class="cmp-cell"><span>Programmes listed</span><b>${i.progs.length}</b></div>
    ${
      i.progs.length
        ? `<h4 style="margin:18px 0 10px;font-size:15px">All ${i.progs.length} programmes in this dataset</h4>
    <div class="prog-chips">${i.progs.map((p) => `<span class="chip">${esc(p)}</span>`).join("")}</div>`
        : `<div class="empty compact" style="margin-top:14px">${ic("i-file")}<b>No programme list for this one yet</b>
    <p class="small">Charter and location are confirmed; its programme cut-offs are not in this dataset, so none are shown. Check the university's prospectus or the KUCCPS portal.</p></div>`
    }
    <p class="tiny muted" style="margin-top:10px">${ic("i-info", "sm")} Programmes and cut-offs are reference data for the 2025/2026 intake. Always confirm on the official KUCCPS portal before you submit choices.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px">
      <button class="btn btn-ghost btn-sm" data-star="${i.id}">${ic("i-star", "sm")} ${star ? "Remove from shortlist" : "Add to shortlist"}</button>
      ${i.site ? `<a class="btn btn-line btn-sm" href="${i.site}" target="_blank" rel="noopener">Official website ${ic("i-ext", "sm")}</a>` : ""}
      <a class="btn btn-line btn-sm" href="https://students.kuccps.ac.ke/programmes/search/" target="_blank" rel="noopener">KUCCPS search ${ic("i-ext", "sm")}</a>
      <button class="btn btn-dark btn-sm" data-close style="margin-left:auto">Done</button>
    </div>`
  );
  const starBtn = $("#modalBox [data-star]");
  if (starBtn)
    starBtn.addEventListener("click", () => {
      S.shortlist = S.shortlist.includes(i.id) ? S.shortlist.filter((x) => x !== i.id) : [...S.shortlist, i.id];
      save();
      closeModal();
      renderInst();
      toast(S.shortlist.includes(i.id) ? "Added to shortlist" : "Removed from shortlist", "i-star");
    });
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
if ($("#instCounty")) $("#instCounty").addEventListener("change", renderInst);
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
