#!/usr/bin/env node
/* Clicks every button and checks every link.

   Rendering a page proves it loads. It does not prove the UI works. This tool
   drives the app: for each page it

     · resolves every <a href>            — internal links must hit a real file,
                                            in-page #anchors must find their target
     · checks every onclick / handler     — the named function must actually exist
     · clicks every button and link       — and records any JavaScript error
     · flags buttons that do nothing      — no error, but also no visible change

   Usage: node tools/interaction_audit.js [filter]

   Needs `npm i --no-save playwright-core`; exits 0 with a message if absent. */
const fs = require("fs");
const path = require("path");

let chromium;
try { chromium = require("playwright-core").chromium; }
catch (e) { console.log("interaction-audit: playwright-core not installed — skipped"); process.exit(0); }

const BASE = process.env.PF_BASE || "http://localhost:8000";
const FILTER = process.argv[2] || "";

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
  ],
  assessments: [{ name: "Opener", date: "2026-02-10", subject: "English", raw: "72/100", pts: 9 }]
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

/* Everything we need to know about a page's controls, gathered in the page. */
function inventory() {
  const links = [];
  document.querySelectorAll("a[href]").forEach(a => {
    const href = a.getAttribute("href");
    links.push({
      href,
      text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34),
      external: /^(https?:)?\/\//i.test(href) || /^(mailto|tel):/i.test(href),
      hash: href.startsWith("#"),
      target: a.getAttribute("target")
    });
  });

  const buttons = [];
  document.querySelectorAll("button,[role=button]").forEach((b, i) => {
    const onclick = b.getAttribute("onclick") || "";
    /* Pull GLOBAL function names out of the handler. A name preceded by a dot
       is a method call (document.getElementById, .classList.remove), not a
       global we can look up, so require a non-dot, non-word character before. */
    const calls = [...onclick.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[2]);
    buttons.push({
      idx: i,
      text: (b.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34) ||
            (b.getAttribute("aria-label") || "").slice(0, 34),
      onclick: onclick.slice(0, 90),
      calls: calls.filter(c => !["if", "return", "function", "alert", "confirm"].includes(c)),
      type: b.getAttribute("type") || "",
      disabled: b.disabled === true
    });
  });

  return { links, buttons };
}

(async () => {
  const pages = allPages().filter(p => !FILTER || p.includes(FILTER));
  const browser = await chromium.launch();
  const problems = [];
  let linkTotal = 0, buttonTotal = 0, clicked = 0;

  for (const page of pages) {
    const role = ROLE[page.replace(/\.html$/, "")];
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", e => errors.push(e.message.split("\n")[0]));

    await p.addInitScript(s => {
      if (s.role) localStorage.setItem("pf_session", JSON.stringify(s.session));
      if (s.role === "student") localStorage.setItem("pf_data_student@test.ke", JSON.stringify(s.data));
    }, { role, session: SESSION[role] || null, data: DATA });

    let inv;
    try {
      await p.goto(`${BASE}/${page}`, { waitUntil: "networkidle", timeout: 20000 });
      await p.waitForTimeout(250);
      inv = await p.evaluate(inventory);
    } catch (e) {
      problems.push({ page, kind: "load", detail: e.message.split("\n")[0] });
      await ctx.close();
      continue;
    }

    /* ---- Links ---- */
    for (const l of inv.links) {
      linkTotal++;
      if (l.external) {
        if (/^javascript:/i.test(l.href)) problems.push({ page, kind: "link", detail: `javascript: URL — “${l.text}”` });
        continue;
      }
      if (l.hash) {
        if (l.href === "#") continue;                       // placeholder, not a target
        const id = l.href.slice(1);
        const found = await p.evaluate(i => !!document.getElementById(i), id);
        if (!found) problems.push({ page, kind: "link", detail: `#${id} has no matching element — “${l.text}”` });
        continue;
      }
      /* Internal link: does the file exist? */
      const clean = l.href.split("?")[0].split("#")[0];
      const target = path.normalize(path.join(path.dirname(page), clean));
      if (!fs.existsSync(target)) {
        problems.push({ page, kind: "link", detail: `missing file ${l.href} → ${target} — “${l.text}”` });
      } else if (l.href.includes("#")) {
        const id = l.href.split("#")[1];
        const found = await p.evaluate(i => !!document.getElementById(i), id).catch(() => true);
        if (!found) problems.push({ page, kind: "link", detail: `anchor #${id} missing in ${l.href}` });
      }
    }

    /* ---- Handlers that call a function which does not exist ---- */
    for (const b of inv.buttons) {
      buttonTotal++;
      if (!b.calls.length) continue;
      const missing = await p.evaluate(
        names => names.filter(n => typeof window[n] !== "function"), b.calls);
      if (missing.length) {
        problems.push({ page, kind: "handler",
          detail: `button “${b.text}” calls missing function(s): ${missing.join(", ")}` });
      }
    }

    /* ---- Click every button, watch for errors ---- */
    const count = await p.evaluate(() => document.querySelectorAll("button,[role=button]").length);
    for (let i = 0; i < count; i++) {
      const info = await p.evaluate(idx => {
        const b = document.querySelectorAll("button,[role=button]")[idx];
        if (!b) return null;
        const r = b.getBoundingClientRect();
        const oc = b.getAttribute("onclick") || "";
        return {
          ok: r.width > 0 && r.height > 0, disabled: b.disabled === true,
          text: (b.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30),
          /* Already the selected option: clicking again correctly does nothing. */
          alreadyOn: b.classList.contains("on") || b.classList.contains("sel") ||
                     b.classList.contains("active") || b.getAttribute("aria-pressed") === "true" ||
                     /* Some lists mark the current choice with an inline style
                        rather than a class (the cluster picker does). */
                     /border-color:\s*var\(--pine\)/.test(b.getAttribute("style") || ""),
          /* Opens an external site in a new tab — a real response we cannot observe. */
          opensExternal: /window\.open\s*\(/.test(oc),
          /* Triggers a hidden <input type=file>: a real action, but headless
             has no file dialog, so nothing observable happens. Verify instead
             that the input it targets really exists and is a file input. */
          filePicker: (() => {
            const m = /getElementById\(['"]([^'"]+)['"]\)\.click\(\)/.exec(oc);
            if (!m) return null;
            const target = document.getElementById(m[1]);
            if (!target) return { ok: false, id: m[1] };
            return { ok: target.tagName === "INPUT" && target.type === "file", id: m[1] };
          })(),
          submit: (b.getAttribute("type") || "").toLowerCase() === "submit" || !!b.closest("form")
        };
      }, i);
      if (!info || !info.ok || info.disabled) continue;

      const snap = () => ({
        url: location.href,
        html: document.body.innerHTML,
        text: document.body.innerText,
        open: (document.querySelectorAll(".open,.on,.sel,.active,[aria-expanded=true]") || []).length
      });
      const before = await p.evaluate(snap);
      errors.length = 0;
      if (info.submit) {
        await p.evaluate(idx => {
          const b = document.querySelectorAll("button,[role=button]")[idx];
          const form = b.closest("form") || document.querySelector("form");
          if (!form) return;
          form.querySelectorAll("input,select,textarea").forEach(f => {
            if (f.type === "hidden" || f.disabled) return;
            /* Checkboxes always carry a default value of "on", so they must be
               handled before the "already filled" guard, not after it. */
            if (f.type === "checkbox" || f.type === "radio") { f.checked = true; }
            else if (f.value) return;
            else if (f.type === "email") f.value = "student@test.ke";
            else if (f.type === "password") f.value = "Testpass123";
            else if (f.type === "tel") f.value = "+254712345678";
            else if (f.type === "number") f.value = "50";
            else if (f.tagName === "SELECT") { if (f.options.length > 1) f.selectedIndex = 1; }
            else f.value = "Test entry";
            f.dispatchEvent(new Event("input", { bubbles: true }));
            f.dispatchEvent(new Event("change", { bubbles: true }));
          });
        }, i);
      }
      try {
        await p.evaluate(idx => {
          const b = document.querySelectorAll("button,[role=button]")[idx];
          b.scrollIntoView({ block: "center", behavior: "instant" });
          b.click();
        }, i);
        await p.waitForTimeout(info.submit ? 1400 : 180);
        clicked++;
      } catch (e) {
        problems.push({ page, kind: "click", detail: `“${info.text}” threw: ${e.message.split("\n")[0]}` });
        continue;
      }
      if (errors.length) {
        problems.push({ page, kind: "click", detail: `“${info.text}” → ${errors[0]}` });
        continue;
      }
      /* Did the click do anything at all? */
      const after = await p.evaluate(snap);
      const navigated = after.url !== before.url;
      const changed = after.html !== before.html || after.text !== before.text ||
                      after.open !== before.open;
      if (!navigated && !changed) {
        if (info.opensExternal) { /* opens a new tab — nothing to observe here */ }
        else if (info.filePicker) {
          if (!info.filePicker.ok) problems.push({ page, kind: "handler",
            detail: `“${info.text}” triggers #${info.filePicker.id}, which is not a file input` });
        }
        else if (info.alreadyOn) { /* already the active choice: correctly a no-op */ }
        else problems.push({ page, kind: "inert",
          detail: `“${info.text}” — clicked, nothing happened (no error, no change)` });
      }
      /* If it navigated away, come back and rebuild state. */
      if (navigated) {
        await p.goto(`${BASE}/${page}`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
        await p.waitForTimeout(150);
      }
    }

    console.log(`${page.padEnd(28)} ${inv.links.length} links, ${inv.buttons.length} buttons`);
    await ctx.close();
  }

  await browser.close();
  console.log(`\nChecked ${linkTotal} links and ${buttonTotal} buttons across ${pages.length} pages (${clicked} clicks).`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):\n`);
    const by = {};
    problems.forEach(x => { (by[x.kind] = by[x.kind] || []).push(x); });
    for (const k of Object.keys(by)) {
      console.log(`  ${k.toUpperCase()} (${by[k].length})`);
      by[k].slice(0, 40).forEach(x => console.log(`    ${x.page}: ${x.detail}`));
      if (by[k].length > 40) console.log(`    …and ${by[k].length - 40} more`);
    }
    process.exitCode = 1;
  } else {
    console.log("Every link resolves and every button responds.");
  }
})();
