#!/usr/bin/env node
/* Renders every page in jsdom with each local <script src> inlined, so the test
   never depends on network timing. Fails on any runtime error, and on any page
   whose main container came back empty.

   Setup:  npm install --no-save jsdom
   Run:    npm run test:render   (or: node tools/render_check.js) */
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs"),
  path = require("path");
const ROOT = require("path").resolve(__dirname, "..");
// every HTML file in the repo, discovered at run time so a new page is never skipped
const pages = (function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    if (e.name === "node_modules" || e.name.startsWith(".")) return;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".html")) out.push(path.relative(ROOT, full).split(path.sep).join("/"));
  });
  return out.sort();
})(ROOT, []);

function build(page) {
  const dir = path.dirname(path.join(ROOT, page));
  let html = fs.readFileSync(path.join(ROOT, page), "utf8");
  html = html.replace(/<link[^>]*fonts\.(googleapis|gstatic)[^>]*>/g, "");
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const f = path.resolve(dir, src);
    return "<script>" + fs.readFileSync(f, "utf8").replace(/<\/script>/g, "<\\/script>") + "</script>";
  });
  return html;
}

function run(page) {
  return new Promise((resolve) => {
    const errs = [];
    const notes = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", (e) => {
      const m = e.message || String(e);
      if (!/Not implemented/.test(m)) errs.push("jsdomError: " + m.slice(0, 400));
    });
    vc.on("error", (...a) => errs.push("console.error: " + a.map(String).join(" ").slice(0, 400)));
    let dom;
    try {
      dom = new JSDOM(build(page), {
        runScripts: "dangerously",
        pretendToBeVisual: true,
        virtualConsole: vc,
        url: "http://localhost/" + page
      });
    } catch (e) {
      console.log("FAIL " + page + " — parse: " + e.message);
      return resolve(1);
    }
    const w = dom.window;
    w.addEventListener("error", (e) => errs.push("window.error: " + (e.message || "").slice(0, 300)));
    setTimeout(() => {
      const d = w.document;
      const need = (sel, label) => {
        const el = d.querySelector(sel);
        if (el && !el.innerHTML.trim()) notes.push(label + " empty");
      };
      if (!d.getElementById("pf-icons")) notes.push("icon sprite missing");
      if (d.querySelector("#snav")) need("#snav", "sidebar nav");
      if (d.querySelector("#userChip")) need("#userChip", "user chip");
      if (d.querySelector("#crumb")) need("#crumb", "crumb");
      if (d.querySelector("#viewBody")) need("#viewBody", "view body");
      need("#dashBox", "dashBox");
      need("#faqList", "faq");
      need("#bandList", "bands");
      need("#schList", "scholarships");
      need("#instList", "institutions");
      need("#clusterBox", "cluster");
      need("#trackerBox", "tracker");
      need("#profileBox", "profile");
      need("#tutorBox", "tutors");
      need("#quizBox", "quizBox");
      if (d.querySelector("#tsBox")) need("#tsBox", "tsBox");
      if (d.querySelector("#adBox")) need("#adBox", "adBox");
      const row = (errs.length || notes.length ? "FAIL " : "ok   ") + page;
      console.log(
        row + (errs.length ? "\n   " + errs.join("\n   ") : "") + (notes.length ? "\n   -> " + notes.join(", ") : "")
      );
      resolve(errs.length || notes.length ? 1 : 0);
    }, 350);
  });
}
(async () => {
  let bad = 0;
  for (const p of pages) bad += (await run(p)) ? 1 : 0;
  console.log("\n" + (bad ? bad + " page(s) need work" : "ALL " + pages.length + " PAGES CLEAN"));
  process.exit(0);
})();
