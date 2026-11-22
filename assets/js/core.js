/* Shared client state, storage and DOM helpers.
   State lives in localStorage under pf-state-v1 / pf-accounts-v1 / pf-session-v1. */
/* ---------- DOM shortcuts ---------- */
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- State ---------- */
const store = {
  get(k, d) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }
};
let S = Object.assign(
  {
    grades: {},
    answers: [],
    qStep: 0,
    result: null,
    shortlist: [],
    compare: [],
    bookings: [],
    msgs: {},
    tutorApp: null,
    tutTab: "find",
    tsTab: "dash",
    adTab: "dash",
    tutorSlots: {},
    verify: {},
    suspended: {},
    /* Accounts an admin has restricted to read-only while a report is reviewed:
       { [lowercased name]: { name, reason, ts } } */
    restricted: {},
    reports: [],
    safetyLog: [],
    syncQueue: [],
    notes: [],
    notesSeeded: false,
    demoSeeded: false,
    adminLog: [],
    verifySub: {},
    /* Documents a tutor uploads for a verification check.
       { [tutorId]: { tsc|id|conduct|safe: {name,mime,size,data?,ts,status} } }
       Bytes live in the same localStorage record as everything else, so a
       missing `data` means the file was too big to keep — the UI says so. */
    verifyDocs: {},
    /* Admin messaging threads: {id, withRole, name, subject, demo, msgs[]} */
    threads: [],
    threadsSeeded: false,
    reviews: [],
    sessionLog: [],
    adQ: "",
    adFilter: "all",
    targets: {},
    assessments: [],
    profile: {
      name: "",
      stage: "KCSE Form 3–4",
      county: "Nairobi",
      school: "",
      pathway: "",
      electives: [],
      avatar: { kind: "initials", style: "gradient", colour: "violet" }
    },
    tutorRate: 450,
    tutorHours: 4,
    lang: "en",
    lastSearch: ""
  },
  store.get("pf-state-v1", {})
);
const save = () => store.set("pf-state-v1", S);
let ACCOUNTS = store.get("pf-accounts-v1", []);
const saveAccounts = () => store.set("pf-accounts-v1", ACCOUNTS);
let SESSION = store.get("pf-session-v1", null);
(function () {
  const demos = [
    {
      id: "demo-stu",
      name: "Wanjiku Muthoni",
      email: "student@demo.pathfinder.ke",
      role: "student",
      county: "Nakuru",
      demo: true,
      created: Date.now() - 864e5 * 12
    },
    {
      id: "demo-tut",
      name: "Brian Otieno",
      email: "tutor@demo.pathfinder.ke",
      role: "tutor",
      county: "Nairobi",
      tutorId: "t1",
      demo: true,
      created: Date.now() - 864e5 * 40
    },
    {
      id: "demo-adm",
      name: "Terry P.",
      email: "admin@demo.pathfinder.ke",
      role: "admin",
      county: "Nairobi",
      demo: true,
      created: Date.now() - 864e5 * 90
    }
  ];
  let c = false;
  demos.forEach((d) => {
    if (!ACCOUNTS.find((a) => a.id === d.id)) {
      ACCOUNTS.push(d);
      c = true;
    }
  });
  if (c) saveAccounts();
})();

/* ---------- DOM & formatting helpers ---------- */
/* ---------- Helpers ---------- */
const ic = (n, c = "") => `<svg class="ic ${c}"><use href="#${n}"/></svg>`;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
const gradePts = (g) => {
  const f = GRADES.find((x) => x[0] === g);
  return f ? f[1] : 0;
};
const ptsToGrade = (p) => {
  const f = GRADES.find((x) => x[1] === Math.round(p));
  return f ? f[0] : "—";
};
const initials = (n) =>
  String(n || "")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
function toast(msg, icon = "i-spark", warn = false) {
  const w = $("#toastWrap");
  const t = document.createElement("div");
  t.className = "toast" + (warn ? " warn" : "");
  t.innerHTML = ic(icon) + `<span>${esc(msg)}</span>`;
  w.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transition = "opacity .3s";
    setTimeout(() => t.remove(), 320);
  }, 3600);
}
function openModal(html) {
  $("#modalBox").innerHTML = html;
  $("#modalBg").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  $("#modalBg").classList.remove("open");
  document.body.style.overflow = "";
}
const _mb = $("#modalBg");
if (_mb)
  _mb.addEventListener("click", (e) => {
    if (e.target.id === "modalBg") closeModal();
  });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeDrawer();
  }
});
async function hashPw(pw, salt) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: enc.encode(salt), iterations: 60000, hash: "SHA-256" },
      key,
      256
    );
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    let h = 0;
    const s = pw + "::" + salt;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return "fallback_" + h;
  }
}
const activeTutors = () => PF_TUTORS.filter((t) => !S.suspended[t.id]);
function checksOf(t) {
  const base = t.checks || {},
    ov = S.verify[t.id] || {};
  return ["tsc", "id", "conduct", "safe"].map((k) => (ov[k] !== undefined ? ov[k] : !!base[k]));
}
function vBadges(t) {
  const ov = S.verify[t.id] || {},
    base = t.checks || {};
  return [
    ["i-shield", "TSC", "tsc"],
    ["i-file", "Conduct", "conduct"],
    ["i-check", "Safeguarding", "safe"]
  ]
    .map(([i2, l, k]) => {
      const v = ov[k] !== undefined ? ov[k] : !!base[k];
      return `<span class="vbadge${v ? "" : " pending"}">${ic(i2)} ${l}${v ? " ✓" : " pending"}</span>`;
    })
    .join(" ");
}

/* ---------- downloads ----------
   One helper for every export in the app. A Blob + object URL is the normal
   path; if the environment refuses it (older WebViews, a locked-down preview),
   fall back to a data: URI so the file still lands, and never throw inside a
   click handler. */
function saveFile(filename, text, mime) {
  const type = mime || "text/csv;charset=utf-8";
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }, 1500);
    return true;
  } catch (e) {
    try {
      const a = document.createElement("a");
      a.href = "data:" + type + "," + encodeURIComponent(text);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (e2) {
      toast("This browser blocked the download", "i-info", true);
      return false;
    }
  }
}

/* rows -> CSV text, quoting every cell so a comma in a name cannot break it */
/* Read a tutor's verification document. Images are shrunk to a readable
   1200 px JPEG (a phone photo of a certificate is 4–6 MB and the whole state
   must fit in localStorage); PDFs are kept as-is up to a hard cap. Anything
   that cannot be kept still records its name, type and size so the reviewer
   knows a file exists, and the UI says the bytes were not stored. */
const DOC_MAX_BYTES = 1200 * 1024;
function docOf(tid, key) {
  return ((S.verifyDocs || {})[tid] || {})[key] || null;
}
function allDocs() {
  const out = [];
  const by = S.verifyDocs || {};
  Object.keys(by).forEach((tid) =>
    Object.keys(by[tid] || {}).forEach((k) => out.push(Object.assign({ tutorId: tid, key: k }, by[tid][k])))
  );
  return out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
}
function docSize(n) {
  const b = Number(n) || 0;
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return Math.round(b / 1024) + " KB";
  return (b / 1024 / 1024).toFixed(1) + " MB";
}
function readDocFile(file, done) {
  if (!file) return;
  const meta = { name: file.name || "document", mime: file.type || "application/octet-stream", size: file.size || 0 };
  const isPdf = /pdf$/i.test(meta.mime) || /\.pdf$/i.test(meta.name);
  const isImg = /^image\//.test(meta.mime);
  if (!isPdf && !isImg) {
    toast("Attach a photo or a PDF", "i-info");
    return;
  }
  if (meta.size > 12 * 1024 * 1024) {
    toast("That file is over 12 MB — pick a smaller one", "i-info");
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => {
    toast("Could not read that file", "i-info", true);
    done(Object.assign({}, meta, { data: "", note: "unreadable" }));
  };
  reader.onload = () => {
    if (isPdf) {
      if (meta.size <= DOC_MAX_BYTES) done(Object.assign({}, meta, { data: reader.result }));
      else done(Object.assign({}, meta, { data: "", note: "over the device limit — details saved, file not kept" }));
      return;
    }
    /* image: downscale on a canvas, fall back to the raw data URL */
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          const url = c.toDataURL("image/jpeg", 0.75);
          done(
            Object.assign({}, meta, {
              name: meta.name,
              mime: "image/jpeg",
              size: Math.round((url.length * 3) / 4),
              data: url
            })
          );
        } catch (e) {
          done(Object.assign({}, meta, { data: reader.result }));
        }
      };
      img.onerror = () => done(Object.assign({}, meta, { data: "", note: "could not be opened" }));
      img.src = reader.result;
    } catch (e) {
      done(Object.assign({}, meta, { data: reader.result }));
    }
  };
  reader.readAsDataURL(file);
}
function toCSV(rows) {
  return rows
    .map((r) => r.map((c) => '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"').join(","))
    .join("\r\n");
}
