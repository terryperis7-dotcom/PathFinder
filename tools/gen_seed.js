#!/usr/bin/env node
/* ============================================================
   PathFinder Kenya — supabase/seed.sql generator
   © 2026 PathFinder Kenya. All rights reserved. See /LICENSE.

   Reads assets/js/data.js (the single source of truth) and
   rewrites supabase/seed.sql, so the database can never drift
   from what the app actually shows.

   Usage:  node tools/gen_seed.js        (or: npm run seed)
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

/* data.js assigns to `window.*`; give it a browser-ish global. */
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(ROOT, "assets/js/data.js"), "utf8"), { filename: "data.js" });

const INSTITUTIONS = globalThis.PF_INSTITUTIONS || [];
const SCHOLARSHIPS = globalThis.PF_SCHOLARSHIPS || [];

if (!INSTITUTIONS.length) { console.error("No institutions loaded from data.js"); process.exit(1); }
if (!SCHOLARSHIPS.length) { console.error("No scholarships loaded from data.js"); process.exit(1); }

/* Escape a value for a Postgres single-quoted literal. */
function lit(v) {
  if (v === null || v === undefined) return "null";
  return "'" + String(v).replace(/'/g, "''") + "'";
}
/* Escape a JSON array as a jsonb literal. */
function jsonb(arr) {
  return lit(JSON.stringify(arr || [])) + "::jsonb";
}

const rows = INSTITUTIONS.map(i =>
  "(" + [
    lit(i.id), lit(i.code), lit(i.name), lit(i.type), lit(i.region), lit(i.field),
    jsonb(i.progs), lit(i.funding), lit(i.cutoff), lit(i.fees)
  ].join(",") + ")"
).join(",\n");

const srows = SCHOLARSHIPS.map(s =>
  "(" + [
    lit(s.name), lit(s.type), lit(s.cov), lit(s.amt), lit(s.deadline), lit(s.url)
  ].join(",") + ")"
).join(",\n");

const sql = `-- PathFinder Kenya — seed data (reference data)
-- Run AFTER schema.sql.
--
-- GENERATED FILE — do not edit by hand.
-- Regenerate with:  npm run seed        (node tools/gen_seed.js)
-- Source of truth:  assets/js/data.js
--
-- Re-runnable: rows are upserted on conflict.
-- Cut-offs, fees and deadlines change every year — verify on kuccps.ac.ke,
-- helb.co.ke and each institution's own website before relying on them.
-- Generated ${new Date().toISOString().slice(0, 10)} from ${INSTITUTIONS.length} institutions and ${SCHOLARSHIPS.length} scholarships.

insert into public.institutions (id, code, name, type, region, field, programs, funding, cutoff, fees) values
${rows}
on conflict (id) do update set code=excluded.code, name=excluded.name, type=excluded.type, region=excluded.region, field=excluded.field,
  programs=excluded.programs, funding=excluded.funding, cutoff=excluded.cutoff, fees=excluded.fees, updated_at=now();

insert into public.scholarships (name, type, coverage, amount, deadline, url) values
${srows}
on conflict (name) do update set type=excluded.type, coverage=excluded.coverage, amount=excluded.amount, deadline=excluded.deadline, url=excluded.url;
`;

const out = path.join(ROOT, "supabase/seed.sql");
fs.writeFileSync(out, sql, "utf8");
console.log(`Wrote ${path.relative(ROOT, out)} — ${INSTITUTIONS.length} institutions, ${SCHOLARSHIPS.length} scholarships.`);
