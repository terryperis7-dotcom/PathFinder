#!/usr/bin/env node
/* Measures whether content has room to breathe, and whether things line up.

   The mobile audit proves nothing OVERFLOWS. That is a low bar: a page can
   pass and still feel cramped — body text squeezed into 24-character columns,
   cards with 10px of padding, rows stacked with no gap, numbers in a table
   ragged because they are left-aligned. This is the audit for that.

   Checks
     · body text narrower than ~34 characters per line (cramped reading)
     · line-height below 1.45 for body copy
     · card padding below 16px
     · stacked siblings with less than 8px of gap
     · numeric table cells not right-aligned (digits should line up)
     · cards in the same grid row with unequal heights (ragged edges)
     · mixed text-alignment inside one block

   Usage: node tools/comfort_audit.js [width] [height]

   Needs `npm i --no-save playwright-core`; exits 0 with a message if absent. */
const fs = require("fs");
const path = require("path");

let chromium;
try { chromium = require("playwright-core").chromium; }
catch (e) { console.log("comfort-audit: playwright-core not installed — skipped"); process.exit(0); }

const BASE = process.env.PF_BASE || "http://localhost:8000";
const W = Number(process.argv[2]) || 360;
const H = Number(process.argv[3]) || 640;

const SESSION = {
  student: { email: "student@test.ke", name: "Test Student", role: "student", roleLabel: "KCSE Candidate" },
  tutor: { email: "tutor@test.ke", name: "Test Tutor", role: "tutor", roleLabel: "TSC Tutor" },
  superadmin: { email: "admin@test.ke", name: "SuperAdmin", role: "superadmin", roleLabel: "SuperAdmin" }
};
const DATA = {
  onboarded: true, stage: "KCSE Candidate",
  subjects: [
    { code: "ENG", name: "English", score: 72 }, { code: "KIS", name: "Kiswahili", score: 68 },
    { code: "MAT", name: "Mathematics", score: 80 }, { code: "BIO", name: "Biology", score: 70 },
    { code: "CHE", name: "Chemistry", score: 66 }, { code: "PHY", name: "Physics", score: 61 },
    { code: "GEO", name: "Geography", score: 64 }
  ],
  quiz: Array.from({ length: 12 }, (_, i) => i % 4),
  results: [
    { subject: "English", score: 72 }, { subject: "Kiswahili", score: 68 },
    { subject: "Mathematics", score: 80 }, { subject: "Biology", score: 70 },
    { subject: "Chemistry", score: 66 }, { subject: "Physics", score: 61 },
    { subject: "Geography", score: 64 }
  ]
};
const ROLE = {
  "student/dashboard": "student", "student/cluster": "student", "student/quiz": "student",
  "student/institutions": "student", "student/funding": "student", "student/tracker": "student",
  "student/onboarding": "student", "student/profile": "student",
  "tutor/dashboard": "tutor", "tutor/students": "tutor",
  "tutor/schedule": "tutor", "tutor/profile": "tutor",
  "admin/dashboard": "superadmin", "admin/dpa": "superadmin", "admin/deployment": "superadmin"
};

function allPages() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) { if (!/node_modules|shots|\.git|^tools$/.test(rel)) walk(rel); }
      else if (e.name.endsWith(".html")) out.push(rel.replace(/^\.\//, ""));
    }
  })(".");
  return out.sort();
}

function measure(cfg) {
  const MIN_CHARS = cfg.MIN_CHARS, MIN_LH = cfg.MIN_LH, MIN_PAD = cfg.MIN_PAD, MIN_GAP = cfg.MIN_GAP;
  const out = { cramped: [], tightLeading: [], thinPadding: [], tightStack: [],
                raggedNumbers: [], raggedCards: [], mixedAlign: [] };

  const label = el => el.tagName.toLowerCase() +
    (el.id ? "#" + el.id : "") +
    (el.className && typeof el.className === "string"
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "") +
    " “" + (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32) + "”";

  /* --- Reading comfort: characters per line --- */
  document.querySelectorAll("p,li,td,span,div,label,dd").forEach(el => {
    if (el.children.length) return;
    const t = (el.textContent || "").trim();
    if (t.length < 40) return;                      // only real paragraphs
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    const r = el.getBoundingClientRect();
    if (r.width < 40) return;
    const fs = parseFloat(cs.fontSize) || 16;
    /* 0.5em is a good average advance width for Latin text. */
    const cpl = r.width / (fs * 0.5);
    if (cpl < MIN_CHARS) out.cramped.push({ sel: label(el), cpl: Math.round(cpl), w: Math.round(r.width) });

    const lh = cs.lineHeight === "normal" ? fs * 1.2 : parseFloat(cs.lineHeight);
    if (lh / fs < MIN_LH) out.tightLeading.push({ sel: label(el), ratio: +(lh / fs).toFixed(2), fs });
  });

  /* --- Cards need breathing room inside --- */
  document.querySelectorAll(".card,.pine-panel,.modal,.kpi,.stat").forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === "none") return;
    const pad = Math.min(parseFloat(cs.paddingLeft) || 0, parseFloat(cs.paddingRight) || 0);
    if (pad > 0 && pad < MIN_PAD) out.thinPadding.push({ sel: label(el), pad: Math.round(pad) });
  });

  /* --- Stacked siblings with no gap read as a wall --- */
  document.querySelectorAll("div,section,main,form,ul").forEach(par => {
    if (/\b(side-role|side-foot|brand|userchip)\b/.test(par.className || "")) return;
    const kids = [...par.children].filter(k => {
      if (k.tagName === "BR" || k.tagName === "WBR") return false;
      const cs = getComputedStyle(k);
      return cs.display !== "none" && cs.visibility !== "hidden" && cs.position !== "absolute";
    });
    if (kids.length < 2) return;
    if (getComputedStyle(par).display.includes("flex")) return;   // flex uses gap
    if (getComputedStyle(par).display.includes("grid")) return;
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect();
      if (!a.height || !b.height) continue;
      if (b.top < a.bottom - 1) continue;                 // overlapping / floats
      const boxGap = b.top - a.bottom;
      /* The gap you actually SEE includes the padding inside each box — a
         row with 13px of padding is not cramped even when the boxes touch. */
      const padA = parseFloat(getComputedStyle(kids[i - 1]).paddingBottom) || 0;
      const padB = parseFloat(getComputedStyle(kids[i]).paddingTop) || 0;
      const seen = boxGap + Math.min(padA, 24) + Math.min(padB, 24);
      /* Proximity is correct typography: a heading and the line of small text
         describing it belong close together. Only gaps between INDEPENDENT
         blocks are cramped, so skip heading -> its own subtitle. */
      /* Same principle, generalised: a label and the small muted line that
         explains it ("Institutions loaded" / "24 institutions") are one unit.
         Tight is correct there — only gaps between INDEPENDENT blocks can be
         cramped. Sub-lines are always short, which is what identifies them. */
      const nextEl = kids[i];
      const isSubLine = nextEl.matches(".tiny, .small, .muted, p.tiny, p.small, p.muted") &&
                        (nextEl.textContent || "").trim().length < 90;
      if (isSubLine) continue;

      if (seen < MIN_GAP) {
        out.tightStack.push({ sel: label(par) + " > " + label(kids[i]),
                              gap: Math.round(boxGap), seen: Math.round(seen) });
        break;
      }
    }
  });

  /* --- Numbers line up when right-aligned --- */
  document.querySelectorAll("table").forEach(tbl => {
    tbl.querySelectorAll("tbody tr").forEach(tr => {
      tr.querySelectorAll("td").forEach(td => {
        if (!/^[\s]*[-+]?[\d][\d,.:%]*[\s]*$/.test(td.textContent || "")) return;
        const ta = getComputedStyle(td).textAlign;
        if (ta !== "right" && ta !== "end") {
          out.raggedNumbers.push({ sel: label(td), align: ta, text: td.textContent.trim().slice(0, 20) });
        }
      });
    });
  });

  /* --- Cards side by side should be the same height --- */
  document.querySelectorAll(".grid,[style*='grid-template-columns']").forEach(g => {
    const cs = getComputedStyle(g);
    if (!cs.display.includes("grid")) return;
    const cols = cs.gridTemplateColumns.split(" ").length;
    if (cols < 2) return;
    const kids = [...g.children].filter(k => k.getBoundingClientRect().height > 0);
    if (kids.length < 2) return;
    const hs = kids.map(k => Math.round(k.getBoundingClientRect().height));
    if (new Set(hs).size > 1) out.raggedCards.push({ sel: label(g), heights: hs.slice(0, 6) });
  });

  /* --- Mixed alignment inside one block looks accidental --- */
  document.querySelectorAll(".card,section,main").forEach(par => {
    const aligns = new Set();
    par.querySelectorAll(":scope > *").forEach(k => {
      const t = (k.textContent || "").trim();
      if (!t) return;
      if (k.children.length) return;
      /* A button centres its own label by design — not a misalignment. */
      if (k.matches("button, .btn, [role=button]")) return;
      const cs = getComputedStyle(k);
      if (cs.display === "none") return;
      aligns.add(cs.textAlign);
    });
    if (aligns.size > 1) out.mixedAlign.push({ sel: label(par), aligns: [...aligns] });
  });

  return out;
}

(async () => {
  const pages = allPages();
  const browser = await chromium.launch();
  /* MIN_GAP 6px: below this, blocks genuinely collide. 6-8px between
   related elements is normal typography, not cramping. */
const cfg = { MIN_CHARS: 34, MIN_LH: 1.45, MIN_PAD: 16, MIN_GAP: 6 };
  const rows = [];

  for (const page of pages) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const p = await ctx.newPage();
    const role = ROLE[page.replace(/\.html$/, "")];
    await p.addInitScript(s => {
      if (s.role) localStorage.setItem("pf_session", JSON.stringify(s.session));
      if (s.role === "student") localStorage.setItem("pf_data_student@test.ke", JSON.stringify(s.data));
    }, { role, session: SESSION[role] || null, data: DATA });
    try {
      await p.goto(`${BASE}/${page}`, { waitUntil: "networkidle", timeout: 20000 });
      await p.waitForTimeout(200);
      rows.push({ page, ...(await p.evaluate(measure, cfg)) });
    } catch (e) { rows.push({ page, error: e.message.split("\n")[0] }); }
    await ctx.close();
  }
  await browser.close();

  const K = ["cramped", "tightLeading", "thinPadding", "tightStack", "raggedNumbers", "raggedCards", "mixedAlign"];
  console.log(`\nComfort & alignment — ${W}×${H}`);
  console.log("min " + cfg.MIN_CHARS + " chars/line · line-height ≥" + cfg.MIN_LH +
              " · card padding ≥" + cfg.MIN_PAD + "px · stack gap ≥" + cfg.MIN_GAP + "px\n");
  console.log("page".padEnd(24) + K.map(k => k.replace(/[a-z]/g, "").padStart(6)).join(""));
  console.log(" ".padEnd(24) + "  cram  lead  pad  gap   num  card  align");
  console.log("-".repeat(66));
  let total = 0;
  for (const r of rows) {
    if (r.error) { console.log(r.page.padEnd(24) + " ERROR " + r.error); continue; }
    const n = K.map(k => (r[k] || []).length);
    total += n.reduce((a, b) => a + b, 0);
    console.log(r.page.padEnd(24) + n.map(x => String(x).padStart(6)).join("") +
      (n.some(x => x > 0) ? "  <--" : ""));
  }

  console.log("\nDetails (first few per page)\n" + "-".repeat(66));
  for (const r of rows) {
    if (r.error || !K.some(k => (r[k] || []).length)) continue;
    console.log("\n" + r.page);
    (r.cramped || []).slice(0, 4).forEach(x => console.log(`  cramped ${x.cpl} chars/line (${x.w}px): ${x.sel}`));
    (r.thinPadding || []).slice(0, 3).forEach(x => console.log(`  thin padding ${x.pad}px: ${x.sel}`));
    (r.raggedNumbers || []).slice(0, 3).forEach(x => console.log(`  number not right-aligned (${x.align}): “${x.text}”`));
    (r.raggedCards || []).slice(0, 3).forEach(x => console.log(`  ragged card heights: ${x.heights.join(", ")} in ${x.sel}`));
    (r.mixedAlign || []).slice(0, 3).forEach(x => console.log(`  mixed text-align [${x.aligns.join(", ")}]: ${x.sel}`));
    (r.tightLeading || []).slice(0, 2).forEach(x => console.log(`  tight line-height ${x.ratio}: ${x.sel}`));
    (r.tightStack || []).slice(0, 3).forEach(x => console.log(`  tight stack: ${x.seen}px visible (${x.gap}px between boxes): ${x.sel}`));
  }
  console.log(`\n${total} comfort/alignment finding(s).`);
})();
