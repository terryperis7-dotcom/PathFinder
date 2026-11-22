/* ============================================================
   Avatars — inline SVG by default, an uploaded photo if the person wants one.

   Three kinds, all stored in S.profile.avatar so they survive a reload:
     { kind: "initials", colour: "violet", style: "gradient" | "solid" | "soft" | "ring" }
     { kind: "emoji",    emoji: "🦁", colour: "green" }
     { kind: "upload",   data: "data:image/jpeg;base64,…" }   (resized to 160px)

   An upload never leaves the device in demo mode, and it is only ever shown
   back to the person who set it (plus their own account sheet).
   ============================================================ */

const AVATAR_COLOURS = [
  { id: "violet", c1: "#7c5cff", c2: "#a78bfa", ink: "#3f2fa8" },
  { id: "green", c1: "#0f5c46", c2: "#34d399", ink: "#0b4636" },
  { id: "amber", c1: "#b45309", c2: "#fbbf24", ink: "#7c3d07" },
  { id: "rose", c1: "#ad1457", c2: "#f472b6", ink: "#7d0f40" },
  { id: "sky", c1: "#0277bd", c2: "#38bdf8", ink: "#025a8f" },
  { id: "violet2", c1: "#4527a0", c2: "#c084fc", ink: "#311b76" },
  { id: "teal", c1: "#00695c", c2: "#5eead4", ink: "#014e44" },
  { id: "plum", c1: "#6a1b9a", c2: "#f0abfc", ink: "#4c1271" }
];
const AVATAR_EMOJI = ["🦁", "🐘", "🦓", "🦒", "🦅", "🌿", "📚", "🎓", "⚽", "🎨", "🎧", "🚀", "🌟", "🧪", "💡", "🛠️"];
const AVATAR_STYLES = [
  { id: "gradient", label: "Gradient" },
  { id: "solid", label: "Solid" },
  { id: "soft", label: "Soft" },
  { id: "ring", label: "Ring" }
];

function avatarPref() {
  try {
    return (typeof S !== "undefined" && S && S.profile && S.profile.avatar) || { kind: "initials" };
  } catch (e) {
    return { kind: "initials" };
  }
}
function sessionName() {
  return typeof SESSION !== "undefined" && SESSION && SESSION.name ? SESSION.name : "";
}
function avatarColour(id) {
  return AVATAR_COLOURS.find((c) => c.id === id) || AVATAR_COLOURS[0];
}

/* One function, used by the top bar, the account sheet, the profile page and
   every list that shows the signed-in person. */
function genAvatar(name, size) {
  const pref = avatarPref();
  const who = String(name || sessionName() || "Guest");
  const px = Number(size) || 40;
  const round = `width:${px}px;height:${px};border-radius:50%;display:block;object-fit:cover`;

  if (pref.kind === "upload" && pref.data) {
    return `<img src="${pref.data}" alt="${esc(who)}" width="${px}" height="${px}" style="${round}">`;
  }

  const c = avatarColour(pref.colour);
  let h = 0;
  for (const ch of who) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const style = pref.style || "gradient";

  if (pref.kind === "emoji" && pref.emoji) {
    return `<svg width="${px}" height="${px}" viewBox="0 0 64 64" style="${round}" role="img" aria-label="${esc(who)}">
      <defs><linearGradient id="av${h}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/></linearGradient></defs>
      <rect width="64" height="64" fill="url(#av${h})"/>
      <text x="32" y="44" text-anchor="middle" font-size="30">${esc(pref.emoji)}</text>
    </svg>`;
  }

  const bg = style === "solid" ? c.c1 : style === "soft" ? "#f1edff" : `url(#av${h})`;
  const ink = style === "soft" ? c.ink : "#fff";
  const motif =
    style === "ring"
      ? `<circle cx="32" cy="32" r="27" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.5"/>`
      : style === "gradient"
        ? `<circle cx="26" cy="24" r="14" fill="#fff" opacity=".16"/>`
        : "";
  const defs =
    style === "gradient"
      ? `<defs><linearGradient id="av${h}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/></linearGradient></defs>`
      : "";
  return `<svg width="${px}" height="${px}" viewBox="0 0 64 64" style="${round}" role="img" aria-label="${esc(who)}">
    ${defs}<rect width="64" height="64" fill="${bg}"/>${motif}
    <text x="32" y="40" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="800" font-size="20" fill="${ink}">${esc(initials(who))}</text>
  </svg>`;
}

/* Round tutor avatar with the tutor's own gradient. */
function tutorAvatar(t, size = 46) {
  return `<div class="avatar" style="width:${size}px;height:${size}px;flex-basis:${size}px;background:linear-gradient(135deg,${t.c1},${t.c2})">${esc(initials(t.name))}</div>`;
}

/* ---------- the picker ---------- */
function avatarPickerHTML() {
  const pref = avatarPref();
  const kind = pref.kind || "initials";
  return `<div class="avpick">
    <div class="avpick-preview">
      <div id="avPreview">${genAvatar(sessionName() || S.profile.name || "You", 92)}</div>
      <div>
        <b style="font-family:var(--font-d);font-size:16px;color:var(--pine3);display:block">Your picture</b>
        <p class="tiny muted" style="margin:4px 0 0">Shown in the top bar and on your account. No photo ever leaves this device in demo mode.</p>
      </div>
    </div>
    <div class="avpick-tabs" role="tablist">
      <button type="button" class="avpick-tab${kind === "initials" ? " on" : ""}" data-avkind="initials" role="tab">Initials</button>
      <button type="button" class="avpick-tab${kind === "emoji" ? " on" : ""}" data-avkind="emoji" role="tab">Icon</button>
      <button type="button" class="avpick-tab${kind === "upload" ? " on" : ""}" data-avkind="upload" role="tab">Photo</button>
    </div>
    <div class="avpick-pane" data-pane="initials"${kind === "initials" ? "" : " hidden"}>
      <label class="flab">Style</label>
      <div class="avpick-row">${AVATAR_STYLES.map((s) => `<button type="button" class="avstyle${(pref.style || "gradient") === s.id ? " on" : ""}" data-avstyle="${s.id}">${s.label}</button>`).join("")}</div>
    </div>
    <div class="avpick-pane" data-pane="emoji"${kind === "emoji" ? "" : " hidden"}>
      <label class="flab">Pick an icon</label>
      <div class="avpick-row wrap">${AVATAR_EMOJI.map((e) => `<button type="button" class="avemoji${pref.emoji === e ? " on" : ""}" data-avemoji="${e}" aria-label="Icon ${e}">${e}</button>`).join("")}</div>
    </div>
    <div class="avpick-pane" data-pane="upload"${kind === "upload" ? "" : " hidden"}>
      <label class="flab" for="avFile">Choose a photo</label>
      <input class="input" type="file" id="avFile" accept="image/*">
      <p class="tiny muted" style="margin-top:8px">Square photos look best. We shrink whatever you pick to 160 × 160 and keep it on this device.</p>
    </div>
    <label class="flab" style="margin-top:14px">Colour</label>
    <div class="avpick-row wrap">${AVATAR_COLOURS.map((c) => `<button type="button" class="avcolour${(pref.colour || "violet") === c.id ? " on" : ""}" data-avcolour="${c.id}" aria-label="${c.id}" style="background:linear-gradient(135deg,${c.c1},${c.c2})"></button>`).join("")}</div>
    <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
      <button type="button" class="btn btn-ghost btn-sm" id="avReset">Reset</button>
      <button type="button" class="btn btn-lime" id="avSave" style="margin-left:auto">${ic("i-check", "sm")} Save picture</button>
    </div>
  </div>`;
}

function openAvatarPicker() {
  const draft = Object.assign({ kind: "initials", style: "gradient", colour: "violet" }, avatarPref());
  openModal(avatarPickerHTML());
  const repaint = () => {
    const keep = S.profile.avatar;
    S.profile.avatar = draft;
    const host = $("#avPreview");
    if (host) host.innerHTML = genAvatar(sessionName() || S.profile.name || "You", 92);
    S.profile.avatar = keep;
    $$(".avpick [data-avkind]").forEach((b) => b.classList.toggle("on", b.dataset.avkind === draft.kind));
    $$(".avpick [data-pane]").forEach((p) => {
      p.hidden = p.dataset.pane !== draft.kind;
    });
    $$(".avpick [data-avstyle]").forEach((b) =>
      b.classList.toggle("on", b.dataset.avstyle === (draft.style || "gradient"))
    );
    $$(".avpick [data-avemoji]").forEach((b) => b.classList.toggle("on", b.dataset.avemoji === draft.emoji));
    $$(".avpick [data-avcolour]").forEach((b) => b.classList.toggle("on", b.dataset.avcolour === draft.colour));
  };
  $$(".avpick [data-avkind]").forEach((b) =>
    b.addEventListener("click", () => {
      draft.kind = b.dataset.avkind;
      repaint();
    })
  );
  $$(".avpick [data-avstyle]").forEach((b) =>
    b.addEventListener("click", () => {
      draft.style = b.dataset.avstyle;
      draft.kind = "initials";
      repaint();
    })
  );
  $$(".avpick [data-avemoji]").forEach((b) =>
    b.addEventListener("click", () => {
      draft.emoji = b.dataset.avemoji;
      draft.kind = "emoji";
      repaint();
    })
  );
  $$(".avpick [data-avcolour]").forEach((b) =>
    b.addEventListener("click", () => {
      draft.colour = b.dataset.avcolour;
      repaint();
    })
  );
  const file = $("#avFile");
  if (file)
    file.addEventListener("change", () =>
      readAvatarFile(file.files && file.files[0], (data) => {
        draft.kind = "upload";
        draft.data = data;
        repaint();
      })
    );
  $("#avReset").addEventListener("click", () => {
    delete S.profile.avatar;
    save();
    closeModal();
    if (typeof renderShell === "function") renderShell();
    if (typeof renderProfile === "function") renderProfile();
    toast("Picture reset to your initials", "i-user");
  });
  $("#avSave").addEventListener("click", () => {
    S.profile.avatar = draft;
    save();
    closeModal();
    if (typeof renderShell === "function") renderShell();
    if (typeof renderProfile === "function") renderProfile();
    toast("Picture updated", "i-check");
  });
}

/* Shrink to 160 × 160 (cover crop) so a 4 MB phone photo cannot blow the
   localStorage budget. Falls back to reading the file inline if canvas is
   unavailable, and refuses anything that is not an image. */
function readAvatarFile(file, done) {
  if (!file) return;
  if (!/^image\//.test(file.type)) {
    toast("Pick an image file", "i-info");
    return;
  }
  if (file.size > 6 * 1024 * 1024) {
    toast("That photo is over 6 MB — pick a smaller one", "i-info");
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => toast("Could not read that file", "i-info", true);
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2,
          sy = (img.height - side) / 2;
        const c = document.createElement("canvas");
        c.width = 160;
        c.height = 160;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 160, 160);
        done(c.toDataURL("image/jpeg", 0.82));
      } catch (e) {
        done(reader.result);
      }
    };
    img.onerror = () => toast("That image could not be opened", "i-info", true);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
