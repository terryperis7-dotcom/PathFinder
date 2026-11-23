/* Shared client state, storage and DOM helpers.
   State lives in localStorage under pf-state-v1 / pf-accounts-v1 / pf-session-v1. */
/* ---------- DOM shortcuts ---------- */
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- State ---------- */
/* Always hand out a fresh copy: the avatar object and the electives list must
   never be shared between two accounts. */
const pfBlankProfile = () => JSON.parse(JSON.stringify(PF_PROFILE_DEFAULTS));
const PF_PROFILE_DEFAULTS = {
  name: "",
  stage: "KCSE Form 3–4",
  county: "Nairobi",
  school: "",
  pathway: "",
  electives: [],
  avatar: { kind: "initials", style: "gradient", colour: "violet" }
};
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
    profile: JSON.parse(JSON.stringify(PF_PROFILE_DEFAULTS)),
    /* Whose picture, county and school S.profile currently holds ("" = a guest). */
    profileOwner: "",
    /* One record per account. A shared phone must never show the last person's
       picture, county or signed safety check, so the live S.profile is copied
       onto this shelf whenever the account changes and read back on sign-in. */
    profiles: {},
    /* Safety onboarding, per account id:
       {step, dob, age, county, school, guardian{...}, docsRead:[], signed{name,ts,version},
        done, completed, legacy, docsSkipped} */
    onboarding: {},
    /* Small UI preferences that should survive a reload. */
    ui: { side: "open" },
    tutorRate: 450,
    tutorHours: 4,
    lang: "en",
    lastSearch: ""
  },
  store.get("pf-state-v1", {})
);
let ACCOUNTS = store.get("pf-accounts-v1", []);
const saveAccounts = () => store.set("pf-accounts-v1", ACCOUNTS);
let SESSION = store.get("pf-session-v1", null);

/* ---------- per-account data ---------- */
const pfUid = () => (SESSION && SESSION.id) || "";
/* Copy the live profile onto the shelf of the account that OWNS it. The owner
   is recorded when the profile is loaded, so a save that fires while somebody
   else is signing in can never write one person's picture onto another's. */
function pfStashProfile() {
  if (!S.profileOwner) return;
  S.profiles = S.profiles || {};
  S.profiles[S.profileOwner] = JSON.parse(JSON.stringify(S.profile));
}
/* Sign out, or hand the device to somebody else: shelve the owner's profile and
   leave a blank one behind, so the next screen never shows their picture. */
function pfReleaseProfile() {
  pfStashProfile();
  S.profile = pfBlankProfile();
  S.profileOwner = "";
}
/* Load the signed-in account's own profile. A brand-new account may keep what a
   guest typed on this device (name, county, school), but never a picture, and
   never anything that belonged to another account. */
function pfHydrateProfile() {
  if (!SESSION) return;
  S.profiles = S.profiles || {};
  if (S.profileOwner && S.profileOwner !== SESSION.id) pfReleaseProfile();
  const saved = S.profiles[SESSION.id];
  if (saved) {
    S.profile = Object.assign(pfBlankProfile(), JSON.parse(JSON.stringify(saved)));
    if (!S.profile.name) S.profile.name = SESSION.name || "";
  } else {
    const guest = S.profileOwner ? {} : S.profile || {};
    const fresh = pfBlankProfile();
    ["name", "stage", "county", "school", "pathway", "electives"].forEach((k) => {
      if (guest[k] != null && guest[k] !== "") fresh[k] = JSON.parse(JSON.stringify(guest[k]));
    });
    fresh.name = fresh.name || SESSION.name || "";
    S.profile = fresh;
  }
  S.profileOwner = SESSION.id;
  pfStashProfile();
}
/* ---------- one account cannot inherit another's work ----------
   The library (institutions, courses, scholarships) is shared reference data.
   A booking is a marketplace record, so it stays shared too — a tutor must see
   the learner's request. Everything below is *this person's own work*, and on a
   shared phone it belongs to the account that typed it:

     grades, answers, the career check result, the shortlist and the compare
     tray, the tracker's assessments and targets, the notification stack.

   Without this a new account opened on a device the demo used would land in
   somebody else's grades, and "new user sees mock data" is exactly the bug. */
const PF_PERSONAL = [
  "grades",
  "answers",
  "qStep",
  "result",
  "shortlist",
  "compare",
  "assessments",
  "targets",
  "sessionLog",
  "notes",
  "notesSeeded",
  "lastSearch",
  "tutorApp",
  "tutorSlots",
  "tutTab",
  "tsTab"
];
function pfPersonalNow() {
  const out = {};
  PF_PERSONAL.forEach((k) => {
    out[k] = S[k];
  });
  return out;
}
/* What a brand-new account starts from: nothing entered, nothing claimed. */
function pfPersonalBlank() {
  return {
    grades: {},
    answers: [],
    qStep: 0,
    result: null,
    shortlist: [],
    compare: [],
    assessments: [],
    targets: {},
    sessionLog: [],
    notes: [],
    notesSeeded: false,
    lastSearch: "",
    tutorApp: null,
    tutorSlots: {},
    tutTab: "find",
    tsTab: "dash"
  };
}
/* Shelf the person who is leaving, hand the arriving account its own work.

   `prevId` is the account that was signed in a moment ago and `acc` the one
   arriving. A demo account keeps its showcase; a real account with no record on
   this device starts blank, and any demo rows another session left in the shared
   slices are cleared out of its way. */
/* The demo account's own sample: clearly a sample, one click away for anybody
   else, automatic only here so the showcase is never an empty page. */
function pfSeedDemoGrades() {
  if (typeof stageSubjects !== "function" || typeof isCBC !== "function") return;
  const subs = stageSubjects();
  const set = isCBC()
    ? ["ME", "ME", "ME", "AE", "AE", "EE"]
    : ["B+", "B", "B", "B+", "B", "B-", "A-", "B", "B-", "C+", "B+", "A-"];
  S.grades = {};
  subs.forEach((s2, i) => {
    S.grades[s2] = set[i % set.length];
  });
}
function pfSwitchAccount(prevId, acc) {
  S.acctWork = S.acctWork || {};
  if (prevId && prevId !== (acc && acc.id)) S.acctWork[prevId] = pfPersonalNow();
  if (!acc) return;
  const stored = S.acctWork[acc.id];
  const blank = pfPersonalBlank();
  if (stored) {
    PF_PERSONAL.forEach((k) => {
      S[k] = k in stored ? stored[k] : blank[k];
    });
  } else if (acc.demo) {
    /* The demo account never shows the last person's work either: it starts
       blank and gets its own sample back, which is what makes it a demo. */
    PF_PERSONAL.forEach((k) => {
      S[k] = blank[k];
    });
    if (typeof pfSeedDemoGrades === "function") pfSeedDemoGrades();
    S.acctWork[acc.id] = pfPersonalNow();
    return;
  } else {
    PF_PERSONAL.forEach((k) => {
      S[k] = blank[k];
    });
    /* a demo request or note must not appear in a real person's list */
    S.bookings = (S.bookings || []).filter((b) => !b.demoSeed);
    Object.keys(S.msgs || {}).forEach((id) => {
      if (!(S.bookings || []).some((b) => String(b.id) === String(id))) delete S.msgs[id];
    });
    S.notes = (S.notes || []).filter((n) => !n.demo);
    S.demoSeeded = false;
  }
  S.acctWork[acc.id] = pfPersonalNow();
}

/* Writing the whole state to localStorage is the slowest thing this app does
   once it holds a verification photo or two, so a save that would write exactly
   what is already there is skipped. */
let _lastSaved = "";
const save = () => {
  pfStashProfile();
  let str = "";
  try {
    str = JSON.stringify(S);
  } catch (e) {
    return;
  }
  if (str === _lastSaved) return;
  _lastSaved = str;
  try {
    localStorage.setItem("pf-state-v1", str);
  } catch (e) {
    /* quota: keep the app alive, the caller decides what to drop */
  }
};
/* Two quick keystrokes should not each write 2 MB. `saveSoon` coalesces them;
   anything that decides something (notify, restrict, book) still uses save(). */
let _saveSoonT = null;
function saveSoon(ms) {
  clearTimeout(_saveSoonT);
  _saveSoonT = setTimeout(() => save(), ms || 350);
}
if (typeof window !== "undefined" && window.addEventListener)
  window.addEventListener("pagehide", () => {
    clearTimeout(_saveSoonT);
    save();
  });
/* Sidebar open/closed is a preference, not part of the shared state blob. */
function pfSideState() {
  try {
    return store.get("pf-ui-v1", {}).side === "closed" ? "closed" : "open";
  } catch (e) {
    return "open";
  }
}
const pfHasDOM = typeof document !== "undefined" && !!document.documentElement;
function pfSetSideState(v) {
  store.set("pf-ui-v1", { side: v === "closed" ? "closed" : "open" });
  if (pfHasDOM) document.documentElement.setAttribute("data-side", v === "closed" ? "closed" : "open");
}
if (pfHasDOM) document.documentElement.setAttribute("data-side", pfSideState());
/* hydrate before anything can save, or the first save would copy the default
   profile over the shelf and wipe the picture that was already stored */
pfHydrateProfile();
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

/* Accounts that existed before the safety check shipped are not forced through
   it — a demo account has already "signed". Accounts created from now on carry
   needsOnboarding:true and must finish the flow before they can use the app. */
(function seedSafetyRecords() {
  S.onboarding = S.onboarding || {};
  let c = false;
  ACCOUNTS.forEach((a) => {
    if (!S.onboarding[a.id] && !a.needsOnboarding) {
      S.onboarding[a.id] = { completed: true, legacy: true, ts: a.created || Date.now() };
      c = true;
    }
  });
  if (c) save();
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
  /* a viewfinder that stays live after its sheet closes is a privacy bug */
  if (typeof pfStopCamera === "function") pfStopCamera();
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
const DOC_MAX_BYTES = 1600 * 1024;
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
/* ---------- a date you can actually type ----------
   A native date input is not typable on a phone: it moves in segments, refuses
   dd/mm/yyyy in most locales, and backspace jumps between parts. These helpers
   turn a plain text box into a dd/mm/yyyy field that formats itself as you type
   and still hands the state an ISO date, so nothing downstream changes. */
function pfDateDigits(v) {
  return String(v == null ? "" : v)
    .replace(/\D/g, "")
    .slice(0, 8);
}
function pfDateMask(v) {
  const d = pfDateDigits(v);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + "/" + d.slice(2);
  return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
}
/* "" while the date is incomplete or impossible — the caller decides what to say */
function pfDateToISO(v) {
  const d = pfDateDigits(v);
  if (d.length !== 8) return "";
  const dd = +d.slice(0, 2),
    mm = +d.slice(2, 4),
    yyyy = +d.slice(4);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2200) return "";
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return "";
  if (dt.getTime() > Date.now() + 864e5) return "";
  return dt.toISOString().slice(0, 10);
}
function pfDateFromISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
}
/* Wire a text box as a dd/mm/yyyy field. onDone gets the ISO date, or "" when
   the digits do not yet make a real date. */
function pfDateWire(el, onDone) {
  if (!el) return;
  const report = () => {
    if (typeof onDone === "function") onDone(pfDateToISO(el.value));
  };
  const reformat = () => {
    const start = el.selectionStart == null ? el.value.length : el.selectionStart;
    const typedBefore = pfDateDigits(el.value.slice(0, start)).length;
    const out = pfDateMask(el.value);
    if (out !== el.value) {
      el.value = out;
      let pos = 0,
        seen = 0;
      while (pos < out.length && seen < typedBefore) {
        if (/\d/.test(out[pos])) seen++;
        pos++;
      }
      try {
        el.setSelectionRange(pos, pos);
      } catch (e) {}
    }
    report();
  };
  el.addEventListener("input", reformat);
  /* backspace with the caret just after a slash should eat the digit before it,
     not sit there doing nothing */
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Backspace" || e.ctrlKey || e.metaKey || e.altKey) return;
    const a = el.selectionStart,
      b = el.selectionEnd;
    if (a == null || a !== b || a === 0) return;
    if (el.value[a - 1] !== "/") return;
    e.preventDefault();
    const keep = el.value.slice(0, a - 2) + el.value.slice(a);
    el.value = pfDateMask(keep);
    const pos = Math.max(0, a - 2);
    try {
      el.setSelectionRange(pos, pos);
    } catch (e2) {}
    report();
  });
  /* deleting in the middle of "12/03/2010" should not leave stray slashes */
  el.addEventListener("change", reformat);
}
function docSize(n) {
  const b = Number(n) || 0;
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return Math.round(b / 1024) + " KB";
  return (b / 1024 / 1024).toFixed(1) + " MB";
}
/* A camera frame in the same shape readDocFile hands back, so every upload path
   treats "a photo I just took" and "a file I chose" identically. */
function photoToDoc(url, label) {
  const name = label || "photo-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "") + ".jpg";
  return { name, mime: "image/jpeg", size: Math.round(((url || "").length * 3) / 4), data: url };
}
function readDocFile(file, done) {
  if (!file) return;
  const meta = { name: file.name || "document", mime: file.type || "application/octet-stream", size: file.size || 0 };
  /* Some Android file pickers hand over a photo with an empty MIME type, which
     used to look like "not a photo" and refuse a perfectly good upload. The
     extension is the fallback. */
  const isPdf = /pdf$/i.test(meta.mime) || /\.pdf$/i.test(meta.name);
  const isImg = /^image\//.test(meta.mime) || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(meta.name);
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
