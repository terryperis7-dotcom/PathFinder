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
  const padL = 40,
    padR = 16,
    padT = 18,
    padB = 30;
  const iw = W - padL - padR,
    ih = H - padT - padB;
  const max = opt.max || Math.max(100, ...rows.map((p) => p.value));
  const unit = opt.unit || "%";
  const uid = "pfg-" + (opt.id || Math.random().toString(36).slice(2, 7));
  const cx = (i) => (rows.length === 1 ? padL + iw / 2 : padL + (i * iw) / (rows.length - 1));
  const cy = (v) => padT + (1 - Math.max(0, Math.min(v, max)) / max) * ih;

  /* a light cubic curve reads better than straight joins on a phone */
  const smooth = (() => {
    if (rows.length < 3) return null;
    let d = `M${cx(0).toFixed(1)} ${cy(rows[0].value).toFixed(1)}`;
    for (let i = 1; i < rows.length; i++) {
      const x0 = cx(i - 1),
        y0 = cy(rows[i - 1].value),
        x1 = cx(i),
        y1 = cy(rows[i].value);
      const mx = (x0 + x1) / 2;
      d += ` C${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    return d;
  })();
  const line = rows.map((p, i) => (i ? "L" : "M") + cx(i).toFixed(1) + " " + cy(p.value).toFixed(1)).join(" ");
  const area =
    rows.length > 1
      ? `${smooth || line} L${cx(rows.length - 1).toFixed(1)} ${padT + ih} L${cx(0).toFixed(1)} ${padT + ih} Z`
      : "";

  const tickCount = opt.ticks || 4;
  const grid = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = (max * i) / tickCount,
      y = cy(v);
    return `<line class="gc-grid${i === 0 ? " base" : ""}" x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"/>
      <text class="gc-ax" x="${padL - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end">${Math.round(v)}${i === tickCount || i === 0 ? unit : ""}</text>`;
  }).join("");

  const tgt = opt.target
    ? `<line class="gc-tgt" x1="${padL}" y1="${cy(opt.target).toFixed(1)}" x2="${W - padR}" y2="${cy(opt.target).toFixed(1)}"/>
       <rect class="gc-tag" x="${W - padR - 62}" y="${(cy(opt.target) - 15).toFixed(1)}" width="62" height="13" rx="6"/>
       <text class="gc-tagt" x="${W - padR - 31}" y="${(cy(opt.target) - 5.5).toFixed(1)}" text-anchor="middle">target ${Math.round(opt.target)}${unit}</text>`
    : "";

  const dots = rows
    .map(
      (
        p,
        i
      ) => `<g class="gc-dot"><circle class="gc-halo" cx="${cx(i).toFixed(1)}" cy="${cy(p.value).toFixed(1)}" r="9"/>
      <circle cx="${cx(i).toFixed(1)}" cy="${cy(p.value).toFixed(1)}" r="4.5"/>
      <title>${esc(p.label)}: ${Math.round(p.value)}${unit}${p.note ? " · " + esc(p.note) : ""}</title></g>`
    )
    .join("");

  const step = rows.length > 8 ? Math.ceil(rows.length / 7) : 1;
  const xlab = rows
    .map((p, i) =>
      i % step === 0 || i === rows.length - 1
        ? `<text class="gc-ax" x="${cx(i).toFixed(1)}" y="${H - 8}" text-anchor="${rows.length === 1 ? "middle" : i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle"}">${esc(p.label)}</text>`
        : ""
    )
    .join("");

  return `<div class="gchart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.alt || "Progress chart")}" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${opt.colour || "#7c5cff"}" stop-opacity=".42"/>
        <stop offset="70%" stop-color="${opt.colour || "#7c5cff"}" stop-opacity=".08"/>
        <stop offset="100%" stop-color="${opt.colour || "#7c5cff"}" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}${tgt}
      ${area ? `<path class="gc-area" d="${area}" fill="url(#${uid})"/>` : ""}
      ${rows.length > 1 ? `<path class="gc-line" d="${smooth || line}"/>` : ""}
      ${dots}${xlab}
    </svg>
    <div class="gc-legend">
      <span><i class="gc-k"></i>${esc(opt.series || "Your scores")}</span>
      ${opt.target ? `<span><i class="gc-k tgt"></i>Target</span>` : ""}
      ${opt.foot ? `<span class="gc-foot">${esc(opt.foot)}</span>` : ""}
    </div>
  </div>`;
}

/* ---------- donut ----------
   segments: [{ label, value, colour }] — values need no normalising.
   Centre shows a headline the caller controls, so the ring always has meaning
   even when every segment is zero. */
function pfDonut(segments, opt) {
  opt = opt || {};
  const rows = (segments || []).filter((s) => s && isFinite(s.value) && s.value >= 0);
  const total = rows.reduce((a, s) => a + s.value, 0);
  const R = 62,
    C = 2 * Math.PI * R;
  const palette = ["#7c5cff", "#22c58b", "#ffb020", "#5aa9ff", "#f472b6", "#a78bfa"];
  let offset = 0;
  const arcs = rows
    .map((s, i) => {
      const share = total ? s.value / total : 0;
      const len = share * C;
      const arc = `<circle class="dn-seg" cx="80" cy="80" r="${R}" fill="none" stroke="${s.colour || palette[i % palette.length]}"
        stroke-width="16" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 80 80)">
        <title>${esc(s.label)}: ${Math.round(s.value)}${opt.unit || ""}</title></circle>`;
      offset += len;
      return arc;
    })
    .join("");
  return `<div class="gdonut">
    <svg viewBox="0 0 160 160" role="img" aria-label="${esc(opt.alt || "Breakdown")}">
      <circle class="dn-track" cx="80" cy="80" r="${R}" fill="none" stroke-width="16"/>
      ${arcs}
      ${
        opt.centre
          ? `<text class="dn-big" x="80" y="78" text-anchor="middle">${esc(opt.centre)}</text>
      <text class="dn-sub" x="80" y="96" text-anchor="middle">${esc(opt.centreLabel || "")}</text>`
          : ""
      }
    </svg>
    <div class="dn-legend">${rows
      .map(
        (s, i) =>
          `<span class="dn-li"><i style="background:${s.colour || palette[i % palette.length]}"></i>${esc(s.label)}<b>${total ? Math.round((s.value / total) * 100) : 0}%</b></span>`
      )
      .join("")}</div>
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
