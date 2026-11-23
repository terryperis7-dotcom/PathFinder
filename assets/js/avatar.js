/* ============================================================
   Avatars — an illustrated face, a coloured monogram, or your own photo.

   Three kinds, all stored in S.profile.avatar so they survive a reload:
     { kind: "art",      art: "a4", colour: "lilac", frame: "" | "ring" | "glow" }
     { kind: "initials", colour: "violet", style: "gradient" | "solid" | "soft" |
                         "ring" | "mesh" | "aurora" | "dots" | "sunset" }
     { kind: "upload",   data: "data:image/jpeg;base64,…" }   (resized to 160px)

   The illustrated faces are ten small JPEGs in assets/avatars (41 KB for the
   whole set, so the offline cache can hold them). They replaced the emoji
   picker: an emoji reads differently on every phone and cannot be styled.
   An old emoji preference is mapped to a face on the way in, so nobody's
   picture silently disappears.

   An upload never leaves the device in demo mode, and it is only ever shown
   back to the person who set it (plus the profile card).
   ============================================================ */

const AVATAR_COLOURS = [
  { id: "violet", c1: "#7c5cff", c2: "#a78bfa", ink: "#3f2fa8" },
  { id: "green", c1: "#0f5c46", c2: "#34d399", ink: "#0b4636" },
  { id: "amber", c1: "#b45309", c2: "#fbbf24", ink: "#7c3d07" },
  { id: "rose", c1: "#ad1457", c2: "#f472b6", ink: "#7d0f40" },
  { id: "sky", c1: "#0277bd", c2: "#38bdf8", ink: "#025a8f" },
  { id: "violet2", c1: "#4527a0", c2: "#c084fc", ink: "#311b76" },
  { id: "teal", c1: "#00695c", c2: "#5eead4", ink: "#014e44" },
  { id: "plum", c1: "#6a1b9a", c2: "#f0abfc", ink: "#4c1271" },
  /* the second row: warmer and calmer, so a mentor and a learner on the same
     phone do not end up looking like the same person */
  { id: "indigo", c1: "#3730a3", c2: "#818cf8", ink: "#26227a" },
  { id: "coral", c1: "#c2410c", c2: "#fb923c", ink: "#8a2c07" },
  { id: "lime", c1: "#4d7c0f", c2: "#bef264", ink: "#3a5c0b" },
  { id: "ocean", c1: "#0e7490", c2: "#67e8f9", ink: "#0a566c" },
  { id: "berry", c1: "#9d174d", c2: "#fda4af", ink: "#77103a" },
  { id: "sand", c1: "#92400e", c2: "#fcd9a8", ink: "#6d300a" }
];
/* Ten faces. The label is for screen readers and for the picker's title text. */
const AVATAR_ART = [
  { id: "a1", bg: "#7fa6b8", label: "Navy hoodie" },
  { id: "a2", bg: "#e8c9a0", label: "Bun, cream top" },
  { id: "a3", bg: "#c8e3cd", label: "Glasses, sage hoodie" },
  { id: "a4", bg: "#d3c6ef", label: "Lilac hijab" },
  { id: "a5", bg: "#f7c9a3", label: "Charcoal hoodie" },
  { id: "a6", bg: "#bcd7ea", label: "Long hair, blue top" },
  { id: "a7", bg: "#dcae6d", label: "Dreadlocks, brown hoodie" },
  { id: "a8", bg: "#bfe0d3", label: "Auburn hair, teal top" },
  { id: "a9", bg: "#dcdfe3", label: "Grey hoodie" },
  { id: "a10", bg: "#d8cdf1", label: "Braids, purple blouse" }
];
const AVATAR_STYLES = [
  { id: "gradient", label: "Gradient" },
  { id: "mesh", label: "Mesh" },
  { id: "aurora", label: "Aurora" },
  { id: "dots", label: "Dots" },
  { id: "sunset", label: "Sunset" },
  { id: "solid", label: "Solid" },
  { id: "soft", label: "Soft" },
  { id: "ring", label: "Ring" }
];
/* Where the images live, from any page depth. */
function avatarRoot() {
  try {
    return (document.body && document.body.dataset.root) || "";
  } catch (e) {
    return "";
  }
}
function avatarArtId(pref) {
  const id = pref && pref.art;
  return AVATAR_ART.some((a) => a.id === id) ? id : "a1";
}
/* An emoji preference from before this version becomes a face, deterministically,
   so the same person keeps the same picture on every device. */
function emojiToArt(emoji) {
  let h = 0;
  for (const ch of String(emoji || "x")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_ART[h % AVATAR_ART.length].id;
}

/* The picture belongs to the signed-in account: S.profile is hydrated from
   S.profiles[uid] on sign-in (see core.js), so signing out and in as somebody
   else can never show the previous person's photo. */
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

/* One function, used by the top bar, the profile card, the profile page and
   every list that shows the signed-in person. */
function genAvatar(name, size) {
  const who = String(name || sessionName() || "Guest");
  /* The saved picture is the signed-in person's own. Anyone else's name gets
     their initials, so a list that shows other people can never borrow it. */
  const mine = !name || !sessionName() || who === sessionName() || who === (S.profile && S.profile.name);
  const pref = mine ? avatarPref() : { kind: "initials" };
  const px = Number(size) || 40;
  const round = `width:${px}px;height:${px};border-radius:50%;display:block;object-fit:cover`;

  if (pref.kind === "upload" && pref.data) {
    return `<img src="${pref.data}" alt="${esc(who)}" width="${px}" height="${px}" style="${round}">`;
  }

  /* an illustrated face — the old emoji preference lands here too */
  if (pref.kind === "art" || (pref.kind === "emoji" && pref.emoji)) {
    const id = pref.kind === "art" ? avatarArtId(pref) : emojiToArt(pref.emoji);
    const frame = pref.frame === "ring" || pref.frame === "glow" ? " av-" + pref.frame : "";
    return `<img src="${avatarRoot()}assets/avatars/${id}.jpg" alt="${esc(who)}" width="${px}" height="${px}"
      class="av-img${frame}" style="${round};${px >= 48 ? "box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.5)" : ""}"
      loading="lazy" decoding="async">`;
  }

  const c = avatarColour(pref.colour);
  let h = 0;
  for (const ch of who) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const style = pref.style || "gradient";
  const ink = style === "soft" ? c.ink : "#fff";
  /* gradient and pattern ids must differ per style *and* per colour, or two
     monograms on one page would share the first one's paint */
  const gid = "av" + h + "-" + style + "-" + c.id;

  /* Eight backgrounds, all built from the same two colours, so a new swatch
     adds every style at once without a new asset. */
  let defs = "";
  let bgRect = "";
  let motif = "";
  if (style === "soft") {
    bgRect = `<rect width="64" height="64" fill="${c.c2}" opacity=".22"/><rect width="64" height="64" fill="#fff" opacity=".35"/>`;
    motif = `<circle cx="32" cy="32" r="27" fill="none" stroke="${c.c1}" stroke-opacity=".25" stroke-width="2"/>`;
  } else if (style === "solid") {
    bgRect = `<rect width="64" height="64" fill="${c.c1}"/>`;
    motif = `<circle cx="50" cy="12" r="16" fill="#fff" opacity=".08"/>`;
  } else if (style === "ring") {
    defs = `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/></linearGradient>`;
    bgRect = `<rect width="64" height="64" fill="url(#${gid})"/>`;
    motif = `<circle cx="32" cy="32" r="27" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="21" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.5"/>`;
  } else if (style === "mesh") {
    bgRect = `<rect width="64" height="64" fill="${c.c1}"/>`;
    motif = `<circle cx="14" cy="16" r="26" fill="${c.c2}" opacity=".85"/>
      <circle cx="54" cy="52" r="24" fill="#fff" opacity=".16"/>
      <circle cx="52" cy="8" r="16" fill="${c.c2}" opacity=".45"/>`;
  } else if (style === "aurora") {
    defs = `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.c2}"/><stop offset="1" stop-color="${c.c1}"/></linearGradient>`;
    bgRect = `<rect width="64" height="64" fill="${c.c1}"/>`;
    motif = `<path d="M0 44 Q16 24 32 36 T64 28 V64 H0 Z" fill="${c.c2}" opacity=".8"/>
      <path d="M0 55 Q18 40 34 50 T64 44 V64 H0 Z" fill="#fff" opacity=".22"/>
      <rect width="64" height="64" fill="url(#${gid})" opacity=".22"/>`;
  } else if (style === "dots") {
    defs = `<pattern id="${gid}" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="${c.c1}"/><circle cx="3" cy="3" r="2.2" fill="${c.c2}" opacity=".9"/>
      <circle cx="9" cy="9" r="1.6" fill="#fff" opacity=".35"/></pattern>`;
    bgRect = `<rect width="64" height="64" fill="url(#${gid})"/>`;
    motif = `<circle cx="32" cy="32" r="23" fill="${c.c1}" opacity=".55"/>`;
  } else if (style === "sunset") {
    defs = `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.c2}"/><stop offset=".55" stop-color="#ffd9a8"/><stop offset="1" stop-color="${c.c1}"/></linearGradient>`;
    bgRect = `<rect width="64" height="64" fill="url(#${gid})"/>`;
    motif = `<circle cx="32" cy="46" r="13" fill="#fff" opacity=".28"/><circle cx="46" cy="16" r="7" fill="#fff" opacity=".35"/>`;
  } else {
    /* gradient, the default */
    defs = `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/></linearGradient>`;
    bgRect = `<rect width="64" height="64" fill="url(#${gid})"/>`;
    motif = `<circle cx="26" cy="24" r="14" fill="#fff" opacity=".16"/>`;
  }

  return `<svg width="${px}" height="${px}" viewBox="0 0 64 64" style="${round}" role="img" aria-label="${esc(who)}">
    <defs>${defs}</defs>${bgRect}${motif}
    <text x="32" y="40" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="800" font-size="20" fill="${ink}"${style === "dots" ? ' stroke="#000" stroke-opacity=".12" stroke-width=".6"' : ""}>${esc(initials(who))}</text>
  </svg>`;
}

/* Round tutor avatar with the tutor's own gradient. */
function tutorAvatar(t, size = 46) {
  return `<div class="avatar" style="width:${size}px;height:${size}px;flex-basis:${size}px;background:linear-gradient(135deg,${t.c1},${t.c2})">${esc(initials(t.name))}</div>`;
}

/* ---------- the picker ---------- */
function avatarPickerHTML() {
  const pref = avatarPref();
  const kind = pref.kind === "emoji" ? "art" : pref.kind || "initials";
  const art = avatarArtId(pref);
  const style = pref.style || "gradient";
  return `<div class="avpick">
    <div class="avpick-preview">
      <div id="avPreview">${genAvatar(sessionName() || S.profile.name || "You", 92)}</div>
      <div>
        <b style="font-family:var(--font-d);font-size:16px;color:var(--pine3);display:block">Your picture</b>
        <p class="tiny muted" style="margin:4px 0 0">Pick a face, a coloured monogram, or a photo of yourself. ${
          typeof sb !== "undefined" && sb.live() ? "" : "Nothing here leaves this device."
        }</p>
      </div>
    </div>
    <div class="avpick-tabs" role="tablist">
      <button type="button" class="avpick-tab${kind === "art" ? " on" : ""}" data-avkind="art" role="tab">Faces</button>
      <button type="button" class="avpick-tab${kind === "initials" ? " on" : ""}" data-avkind="initials" role="tab">Initials</button>
      <button type="button" class="avpick-tab${kind === "upload" ? " on" : ""}" data-avkind="upload" role="tab">Photo</button>
    </div>
    <div class="avpick-pane" data-pane="art"${kind === "art" ? "" : " hidden"}>
      <label class="flab">Choose a face</label>
      <div class="avart-grid">${AVATAR_ART.map(
        (a) =>
          `<button type="button" class="avart${art === a.id ? " on" : ""}" data-avart="${a.id}" aria-label="${esc(
            a.label
          )}" title="${esc(a.label)}"><img src="${avatarRoot()}assets/avatars/${a.id}.jpg" alt="" width="64" height="64" loading="lazy"></button>`
      ).join("")}</div>
      <label class="flab" style="margin-top:14px">Edge</label>
      <div class="avpick-row">
        ${[
          ["", "Plain"],
          ["ring", "Ring"],
          ["glow", "Glow"]
        ]
          .map(
            ([id, label]) =>
              `<button type="button" class="avstyle${(pref.frame || "") === id ? " on" : ""}" data-avframe="${id}">${label}</button>`
          )
          .join("")}
      </div>
      <p class="tiny muted" style="margin-top:8px">Illustrations, not photos of real people — nobody's face is borrowed.</p>
    </div>
    <div class="avpick-pane" data-pane="initials"${kind === "initials" ? "" : " hidden"}>
      <label class="flab">Background</label>
      <div class="avpick-row wrap">${AVATAR_STYLES.map(
        (s) =>
          `<button type="button" class="avstyle${style === s.id ? " on" : ""}" data-avstyle="${s.id}">${s.label}</button>`
      ).join("")}</div>
    </div>
    <div class="avpick-pane" data-pane="upload"${kind === "upload" ? "" : " hidden"}>
      <label class="flab">A photo of you</label>
      <div class="avpick-acts">
        <button type="button" class="btn btn-line btn-sm" id="avCamBtn">${ic("i-camera", "sm")} Take a photo</button>
        <input type="file" id="avCam" accept="image/*" capture="user" hidden>
        <label class="btn btn-ghost btn-sm" for="avFile">${ic("i-upload", "sm")} Choose a file</label>
        <input type="file" id="avFile" accept="image/*" hidden>
      </div>
      <p class="tiny muted" style="margin-top:8px">On a phone, "Take a photo" opens the front camera. Square photos look best — whatever you pick is shrunk to 160 × 160 and kept on this device only.</p>
    </div>
    <label class="flab" style="margin-top:14px">Colour</label>
    <div class="avpick-row wrap">${AVATAR_COLOURS.map(
      (c) =>
        `<button type="button" class="avcolour${(pref.colour || "violet") === c.id ? " on" : ""}" data-avcolour="${
          c.id
        }" aria-label="${c.id}" title="${c.id}" style="background:linear-gradient(135deg,${c.c1},${c.c2})"></button>`
    ).join("")}</div>
    <p class="tiny muted" style="margin-top:6px">The colour tints your monogram. A face keeps its own background.</p>
    <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
      <button type="button" class="btn btn-ghost btn-sm" id="avReset">Reset</button>
      <button type="button" class="btn btn-lime" id="avSave" style="margin-left:auto">${ic("i-check", "sm")} Save picture</button>
    </div>
  </div>`;
}

function openAvatarPicker() {
  const draft = Object.assign({ kind: "art", art: "a1", style: "gradient", colour: "violet", frame: "" }, avatarPref());
  if (draft.kind === "emoji") {
    draft.art = emojiToArt(draft.emoji);
    draft.kind = "art";
  }
  if (draft.kind === "art") draft.art = avatarArtId(draft);
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
    $$(".avpick [data-avart]").forEach((b) => b.classList.toggle("on", b.dataset.avart === draft.art));
    $$(".avpick [data-avframe]").forEach((b) => b.classList.toggle("on", (draft.frame || "") === b.dataset.avframe));
    $$(".avpick [data-avstyle]").forEach((b) =>
      b.classList.toggle("on", b.dataset.avstyle === (draft.style || "gradient"))
    );
    $$(".avpick [data-avcolour]").forEach((b) => b.classList.toggle("on", b.dataset.avcolour === draft.colour));
  };
  $$(".avpick [data-avkind]").forEach((b) =>
    b.addEventListener("click", () => {
      draft.kind = b.dataset.avkind;
      repaint();
    })
  );
  $$(".avpick [data-avart]").forEach((b) =>
    b.addEventListener("click", () => {
      draft.art = b.dataset.avart;
      draft.kind = "art";
      repaint();
    })
  );
  $$(".avpick [data-avframe]").forEach((b) =>
    b.addEventListener("click", () => {
      draft.frame = b.dataset.avframe;
      draft.kind = "art";
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
  $$(".avpick [data-avcolour]").forEach((b) =>
    b.addEventListener("click", () => {
      draft.colour = b.dataset.avcolour;
      repaint();
    })
  );
  /* Take a photo opens the real camera where the browser has one. Where it does
     not — or where permission is refused — the same button falls back to the
     file input, which on a phone opens the camera app anyway. Nothing about the
     save path changes: both routes end in a 160 px square. */
  const takeShot = (data) => {
    draft.kind = "upload";
    draft.data = data;
    repaint();
  };
  const camBtn = $("#avCamBtn");
  if (camBtn)
    camBtn.addEventListener("click", async () => {
      if (typeof pfCameraSupported !== "function" || !pfCameraSupported()) {
        $("#avCam").click();
        return;
      }
      const opened = await pfOpenCamera({
        facing: "user",
        square: true,
        maxSide: 320,
        title: "Take your picture",
        hint: "Line your face up inside the circle. Nothing is saved until you press Save picture.",
        onShot: (url) => pfShrinkImage(url, 160, 0.85, true, takeShot)
      });
      if (!opened) $("#avCam").click();
    });
  ["#avFile", "#avCam"].forEach((sel) => {
    const input = $(sel);
    if (!input) return;
    input.addEventListener("change", () => readAvatarFile(input.files && input.files[0], takeShot));
  });
  $("#avReset").addEventListener("click", () => {
    delete S.profile.avatar;
    save();
    closeModal();
    if (typeof renderShell === "function") renderShell();
    if (typeof renderProfile === "function") renderProfile();
    toast("Picture reset to your initials", "i-user");
  });
  $("#avSave").addEventListener("click", () => {
    const next = { kind: draft.kind };
    if (draft.kind === "art") {
      next.art = draft.art || "a1";
      next.frame = draft.frame || "";
      next.colour = draft.colour;
    } else if (draft.kind === "upload") {
      next.data = draft.data;
    } else {
      next.style = draft.style || "gradient";
      next.colour = draft.colour;
    }
    S.profile.avatar = next;
    save();
    closeModal();
    if (typeof renderShell === "function") renderShell();
    if (typeof renderProfile === "function") renderProfile();
    if (typeof pfCardRefresh === "function") pfCardRefresh();
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
