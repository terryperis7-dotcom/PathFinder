/* ============================================================
   Charts — hand-rolled SVG, no libraries, no canvas.
   One job: turn real rows from state into something you can read
   at a glance. Nothing is invented — an empty series draws nothing
   and the caller shows an empty state instead.
   ============================================================ */

const PF_CHART_W = 640,
  PF_CHART_H = 190;

/* pts: [{ label, value, note }]  opt: { max, target, unit, id, colour }
   Returns markup for a responsive area+line chart with a target rule. */
function pfLineChart(pts, opt) {
  opt = opt || {};
  const rows = (pts || []).filter((p) => p && isFinite(p.value));
  if (!rows.length) return "";
  const W = PF_CHART_W,
    H = PF_CHART_H;
  const padL = 34,
    padR = 12,
    padT = 14,
    padB = 26;
  const iw = W - padL - padR,
    ih = H - padT - padB;
  const max = opt.max || Math.max(100, ...rows.map((p) => p.value));
  const unit = opt.unit || "%";
  const uid = "pfg-" + (opt.id || Math.random().toString(36).slice(2, 7));
  const cx = (i) => (rows.length === 1 ? padL + iw / 2 : padL + (i * iw) / (rows.length - 1));
  const cy = (v) => padT + (1 - Math.max(0, Math.min(v, max)) / max) * ih;

  const line = rows.map((p, i) => (i ? "L" : "M") + cx(i).toFixed(1) + " " + cy(p.value).toFixed(1)).join(" ");
  const area =
    rows.length > 1
      ? `${line} L${cx(rows.length - 1).toFixed(1)} ${padT + ih} L${cx(0).toFixed(1)} ${padT + ih} Z`
      : "";

  const grid = [0, 0.5, 1]
    .map((f) => {
      const v = max * f,
        y = cy(v);
      return `<line class="gc-grid" x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"/>
      <text class="gc-ax" x="${padL - 7}" y="${(y + 3.5).toFixed(1)}" text-anchor="end">${Math.round(v)}${f === 0 ? "" : unit}</text>`;
    })
    .join("");

  const tgt = opt.target
    ? `<line class="gc-tgt" x1="${padL}" y1="${cy(opt.target).toFixed(1)}" x2="${W - padR}" y2="${cy(opt.target).toFixed(1)}"/>
    <text class="gc-ax" x="${W - padR}" y="${(cy(opt.target) - 5).toFixed(1)}" text-anchor="end">target ${Math.round(opt.target)}${unit}</text>`
    : "";

  const dots = rows
    .map(
      (p, i) => `<g class="gc-dot"><circle cx="${cx(i).toFixed(1)}" cy="${cy(p.value).toFixed(1)}" r="4.5"/>
    <title>${esc(p.label)}: ${Math.round(p.value)}${unit}${p.note ? " · " + esc(p.note) : ""}</title></g>`
    )
    .join("");

  /* label every point on a wide chart, thin them out on a phone-width one */
  const step = rows.length > 8 ? Math.ceil(rows.length / 7) : 1;
  const xlab = rows
    .map((p, i) =>
      i % step === 0 || i === rows.length - 1
        ? `<text class="gc-ax" x="${cx(i).toFixed(1)}" y="${H - 7}" text-anchor="${rows.length === 1 ? "middle" : i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle"}">${esc(p.label)}</text>`
        : ""
    )
    .join("");

  return `<div class="gchart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.alt || "Progress chart")}" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${opt.colour || "#7c5cff"}" stop-opacity=".38"/>
        <stop offset="100%" stop-color="${opt.colour || "#7c5cff"}" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}${tgt}
      ${area ? `<path class="gc-area" d="${area}" fill="url(#${uid})"/>` : ""}
      ${rows.length > 1 ? `<path class="gc-line" d="${line}"/>` : ""}
      ${dots}${xlab}
    </svg>
    <div class="gc-legend">
      <span><i class="gc-k"></i>${esc(opt.series || "Your scores")}</span>
      ${opt.target ? `<span><i class="gc-k tgt"></i>Target</span>` : ""}
      ${opt.foot ? `<span class="gc-foot">${esc(opt.foot)}</span>` : ""}
    </div>
  </div>`;
}

/* Horizontal bars from labelled rows — used where a trend would be noise.
   rows: [{ label, value, target, note }] */
function pfBarChart(rows, opt) {
  opt = opt || {};
  const max = opt.max || 100;
  return `<div class="chart">${(rows || [])
    .map((r) => {
      const p = Math.max(0, Math.min(r.value, max));
      const tg = r.target ? (r.target / max) * 100 : 0;
      return `<div class="chart-row"><span class="lab">${esc(r.label)}</span>
      <div class="chart-track"><i style="width:${(p / max) * 100}%"></i>${tg ? `<span class="tgt" style="left:${tg}%"></span>` : ""}</div>
      <span class="val">${r.value ? Math.round(r.value) + (opt.unit || "") : "—"}</span></div>`;
    })
    .join("")}</div>`;
}
