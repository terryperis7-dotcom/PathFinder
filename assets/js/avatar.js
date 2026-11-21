/* Generated avatars — inline SVG, no image files, nothing to license. */
function genAvatar(name, size) {
  const pals = [
    ["#7c5cff", "#a78bfa"],
    ["#0f5c46", "#34d399"],
    ["#b45309", "#fbbf24"],
    ["#ad1457", "#f472b6"],
    ["#0277bd", "#38bdf8"],
    ["#4527a0", "#c084fc"]
  ];
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const p = pals[h % pals.length],
    m = h % 3;
  const motif =
    m === 0
      ? `<circle cx="32" cy="30" r="13" fill="#fff" opacity=".28"/>`
      : m === 1
        ? `<path d="M32 16l15 26H17z" fill="#fff" opacity=".28"/>`
        : `<rect x="20" y="20" width="24" height="24" rx="5" fill="#fff" opacity=".28"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" style="border-radius:50%;display:block"><defs><linearGradient id="g${h}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g${h})"/>${motif}<text x="32" y="40" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="800" font-size="20" fill="#fff">${esc(initials(name))}</text></svg>`;
}

/* Round tutor avatar with the tutor's own gradient. */
function tutorAvatar(t, size = 46) {
  return `<div class="avatar" style="width:${size}px;height:${size}px;flex-basis:${size}px;background:linear-gradient(135deg,${t.c1},${t.c2})">${esc(initials(t.name))}</div>`;
}
