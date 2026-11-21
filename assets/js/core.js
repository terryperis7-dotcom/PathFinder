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
    reports: [],
    safetyLog: [],
    syncQueue: [],
    notes: [],
    notesSeeded: false,
    demoSeeded: false,
    adminLog: [],
    verifySub: {},
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
function toCSV(rows) {
  return rows
    .map((r) => r.map((c) => '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"').join(","))
    .join("\r\n");
}
