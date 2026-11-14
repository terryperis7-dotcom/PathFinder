/* ============================================================
   PathFinder Kenya — avatar / persona generator
   © 2026 PathFinder Kenya. All rights reserved. See /LICENSE.

   WHY THIS EXISTS
   The previous persona set shipped 10 anime illustrations and 2
   photographs of real people. Their licensing was unknown, which is
   a copyright and personality-rights risk — and the photographs of a
   real boy and girl were especially inappropriate on a product used
   by children.

   These avatars are generated from geometry in this file. Nothing is
   copied, traced or derived from any existing artwork or photograph.
   No external image files, no network requests, no emoji. They scale
   to any size, work offline, and add ~0 KB of payload.

   Twelve personas, each an abstract motif on a two-colour gradient.
   Pure functions — the same input always produces the same avatar,
   and the module runs in Node for tests.

   Usage:
     avatarSVG(3)                     -> inline <svg> markup
     avatarSVG(3, {size: 92})         -> sized
     avatarForName("Amina O.")        -> a stable index from a name
     avatarInitialsSVG("Amina O.")    -> initials on a matched colour
   ============================================================ */

/* ---------- Palettes ----------
   Two stops per persona. Every pair is checked for contrast against
   the white motif drawn on top of it. */
const PF_PERSONAS = [
  { id: "sun",     name: "Savanna Sun",    sw: "Jua la Savanna",   from: "#f7c04a", to: "#e07b39", motif: "sun" },
  { id: "rift",    name: "Rift Valley",    sw: "Bonde la Ufa",     from: "#8b6dff", to: "#5b3fd6", motif: "rift" },
  { id: "acacia",  name: "Acacia",         sw: "Mti wa Migunga",   from: "#34d399", to: "#047857", motif: "acacia" },
  { id: "wave",    name: "Coast Wave",     sw: "Wimbi la Pwani",   from: "#4fc3f7", to: "#0277bd", motif: "wave" },
  { id: "star",    name: "Night Sky",      sw: "Anga la Usiku",    from: "#4c3bb8", to: "#2e1065", motif: "star" },
  { id: "bloom",   name: "Bloom",          sw: "Ua",               from: "#f9a8d4", to: "#db2777", motif: "bloom" },
  { id: "compass", name: "Compass",        sw: "Dira",             from: "#ff8f6b", to: "#c2410c", motif: "compass" },
  { id: "flask",   name: "Laboratory",     sw: "Maabara",          from: "#a78bfa", to: "#6d28d9", motif: "flask" },
  { id: "circuit", name: "Circuit",        sw: "Saketi",           from: "#38bdf8", to: "#1e40af", motif: "circuit" },
  { id: "book",    name: "Scholar",        sw: "Msomi",            from: "#fbbf24", to: "#b45309", motif: "book" },
  { id: "bolt",    name: "Energy",         sw: "Nishati",          from: "#fcd34d", to: "#d97706", motif: "bolt" },
  { id: "peak",    name: "Summit",         sw: "Kilele",           from: "#7c8ba1", to: "#334155", motif: "peak" }
];

/* ---------- Geometry helpers ---------- */

/* Rays radiating from a centre point (used by the sun). */
function rays(cx, cy, r1, r2, count) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    out += '<line x1="' + r(cx + Math.sin(a) * r1) + '" y1="' + r(cy - Math.cos(a) * r1) +
           '" x2="' + r(cx + Math.sin(a) * r2) + '" y2="' + r(cy - Math.cos(a) * r2) + '"/>';
  }
  return out;
}

/* Petals arranged in a ring (used by the flower). */
function ring(cx, cy, radius, count, dotR) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    out += '<circle cx="' + r(cx + Math.sin(a) * radius) + '" cy="' + r(cy - Math.cos(a) * radius) +
           '" r="' + dotR + '"/>';
  }
  return out;
}

/* Round to 2dp so the markup stays small. */
function r(n) { return Math.round(n * 100) / 100; }

/* ---------- Motifs ----------
   Each returns markup drawn on a 64 × 64 canvas, in white. The
   background gradient shows through; opacity creates depth without a
   second colour. */
const PF_MOTIFS = {
  sun: function () {
    return '<g stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".95">' + rays(32, 30, 14, 19, 8) + '</g>' +
      '<circle cx="32" cy="30" r="10.5" fill="#fff"/>';
  },
  rift: function () {
    return '<circle cx="45" cy="19" r="5.5" fill="#fff" opacity=".85"/>' +
      '<path d="M2 54 L20 30 L34 54 Z" fill="#fff" opacity=".55"/>' +
      '<path d="M18 54 L36 26 L52 54 Z" fill="#fff" opacity=".78"/>' +
      '<path d="M34 54 L50 34 L64 54 Z" fill="#fff" opacity=".95"/>';
  },
  acacia: function () {
    return '<rect x="30" y="33" width="4.5" height="19" rx="2.2" fill="#fff" opacity=".95"/>' +
      '<path d="M22 33 q10 -4 20 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>' +
      '<ellipse cx="32" cy="25" rx="19" ry="7.5" fill="#fff" opacity=".95"/>' +
      '<ellipse cx="22" cy="30" rx="9" ry="4" fill="#fff" opacity=".7"/>' +
      '<ellipse cx="43" cy="30" rx="8" ry="3.6" fill="#fff" opacity=".7"/>';
  },
  wave: function () {
    return '<g stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round">' +
      '<path d="M6 24 q7 -6 13 0 t13 0 t13 0" opacity=".7"/>' +
      '<path d="M6 36 q7 -6 13 0 t13 0 t13 0" opacity=".88"/>' +
      '<path d="M6 48 q7 -6 13 0 t13 0 t13 0"/>' +
      '</g>';
  },
  star: function () {
    return '<path d="M32 12 L36.5 27 L52 31.5 L36.5 36 L32 51 L27.5 36 L12 31.5 L27.5 27 Z" fill="#fff"/>' +
      '<circle cx="49" cy="16" r="3" fill="#fff" opacity=".85"/>' +
      '<circle cx="15" cy="47" r="2.4" fill="#fff" opacity=".7"/>' +
      '<circle cx="50" cy="46" r="2" fill="#fff" opacity=".6"/>';
  },
  bloom: function () {
    return '<g fill="#fff" opacity=".92">' + ring(32, 32, 12, 6, 6.4) + '</g>' +
      '<circle cx="32" cy="32" r="5.4" fill="#fff"/>';
  },
  compass: function () {
    return '<circle cx="32" cy="32" r="19" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>' +
      '<path d="M32 13 L39 32 L32 51 L25 32 Z" fill="#fff"/>' +
      '<circle cx="32" cy="32" r="2.6" fill="#fff" opacity=".55"/>';
  },
  flask: function () {
    return '<path d="M25.5 12 h13 v11.5 l8.5 17.5 a5.5 5.5 0 0 1 -5 8.5 h-20.6 a5.5 5.5 0 0 1 -5 -8.5 l8.9 -17.5 z" fill="#fff" opacity=".92"/>' +
      '<rect x="23" y="8" width="18" height="5" rx="2.5" fill="#fff"/>' +
      '<circle cx="27" cy="39" r="2.6" fill="#fff" opacity=".55"/>' +
      '<circle cx="35" cy="44" r="2" fill="#fff" opacity=".45"/>';
  },
  circuit: function () {
    return '<g stroke="#fff" stroke-width="2.8" fill="none" opacity=".9">' +
      '<path d="M20 20 h10 v10 h14"/><path d="M20 44 h10 v-6"/><path d="M44 20 v10 h-6"/>' +
      '</g>' +
      '<g fill="#fff">' +
      '<circle cx="20" cy="20" r="4.2"/><circle cx="44" cy="44" r="4.2"/>' +
      '<circle cx="30" cy="30" r="5.4" opacity=".95"/><circle cx="44" cy="20" r="3.4" opacity=".8"/>' +
      '<circle cx="30" cy="44" r="3.4" opacity=".8"/>' +
      '</g>';
  },
  book: function () {
    return '<path d="M32 18 C25 12 16 12 9 15 v30 c7 -3 16 -3 23 3 z" fill="#fff" opacity=".92"/>' +
      '<path d="M32 18 c7 -6 16 -6 23 -3 v30 c-7 -3 -16 -3 -23 3 z" fill="#fff" opacity=".72"/>' +
      '<rect x="29.5" y="16" width="5" height="34" rx="2.5" fill="#fff"/>';
  },
  bolt: function () {
    return '<path d="M37 8 L17 36 h11 l-4 21 L48 27 H36 l5 -19 z" fill="#fff"/>';
  },
  peak: function () {
    return '<path d="M4 54 L32 14 L60 54 Z" fill="#fff" opacity=".95"/>' +
      '<path d="M24.5 31 L32 14 L39.5 31 L35 28.5 L31 32.5 L27 29 Z" fill="#fff" opacity=".45"/>' +
      '<circle cx="49" cy="18" r="4.5" fill="#fff" opacity=".8"/>';
  }
};

/* ---------- Rendering ---------- */

/* Unique gradient ids — several avatars can share one page. */
let _uid = 0;
function nextId() { _uid += 1; return "pfav" + _uid; }

/* Build the <svg> for a persona index. Sizing is the container's job —
   the SVG simply fills whatever box it is placed in.
   opts: { title }  (overrides the accessible label) */
function avatarSVG(index, opts) {
  const o = opts || {};
  const list = PF_PERSONAS;
  const n = Number(index);
  const i = isFinite(n) ? ((n % list.length) + list.length) % list.length : 0;  // wrap, tolerate junk
  const p = list[i];
  const motif = PF_MOTIFS[p.motif];
  const gid = nextId();
  const title = o.title || p.name;
  return '<svg class="pf-avatar" viewBox="0 0 64 64" role="img" aria-label="' +
    escAttr(title) + '" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + p.from + '"/><stop offset="1" stop-color="' + p.to + '"/>' +
    '</linearGradient></defs>' +
    '<rect width="64" height="64" fill="url(#' + gid + ')"/>' +
    (motif ? motif() : "") +
    '</svg>';
}

/* A stable persona index derived from a name, so two people rarely
   land on the same avatar and one person always gets the same one. */
function avatarForName(name) {
  const s = String(name || "").trim().toLowerCase();
  if (!s) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h % PF_PERSONAS.length;
}

/* Initials ("Amina Odhiambo" -> "AO") on that persona's colours.
   Used for the small chips where a motif would be unreadable. */
function avatarInitialsSVG(name, index) {
  const words = String(name || "?").replace(/\(Demo\)/i, "").trim().split(/\s+/).filter(Boolean);
  let initials = words.length
    ? words.slice(0, 2).map(w => w[0]).join("")
    : "?";
  initials = initials.toUpperCase().slice(0, 2);
  const n = Number(index);
  const i = (index == null || !isFinite(n)) ? avatarForName(name) : n;
  const p = PF_PERSONAS[((i % PF_PERSONAS.length) + PF_PERSONAS.length) % PF_PERSONAS.length];
  const gid = nextId();
  return '<svg class="pf-avatar" viewBox="0 0 64 64" role="img" aria-label="' +
    escAttr(String(name || "Profile")) + '" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + p.from + '"/><stop offset="1" stop-color="' + p.to + '"/>' +
    '</linearGradient></defs>' +
    '<rect width="64" height="64" fill="url(#' + gid + ')"/>' +
    '<text x="32" y="33" text-anchor="middle" dominant-baseline="central" ' +
    'font-family="Manrope, system-ui, sans-serif" font-size="26" font-weight="800" ' +
    'fill="#fff">' + escText(initials) + '</text></svg>';
}

/* The persona currently chosen by a user, read from storage. */
function avatarPersonaIndex(storageKey) {
  try {
    const v = Number(localStorage.getItem("pf_persona_" + (storageKey || "guest")));
    if (isFinite(v) && v >= 0 && v < PF_PERSONAS.length) return v;
  } catch (e) { /* storage blocked — fall through to the default */ }
  return null;
}

/* ---------- escaping ----------
   Local copies so this module also runs in Node, without app.js. */
function escText(s) {
  return String(s == null ? "" : s).replace(/[&<>]/g, c => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}
function escAttr(s) {
  return escText(s).replace(/["']/g, c => (c === '"' ? "&quot;" : "&#39;"));
}

if (typeof window !== "undefined") {
  window.PF_PERSONAS = PF_PERSONAS;
  window.PF_MOTIFS = PF_MOTIFS;
  window.avatarSVG = avatarSVG;
  window.avatarForName = avatarForName;
  window.avatarInitialsSVG = avatarInitialsSVG;
  window.avatarPersonaIndex = avatarPersonaIndex;
}
