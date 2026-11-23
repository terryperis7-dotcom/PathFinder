#!/usr/bin/env node
/* Regenerates supabase/seed.sql from assets/js/data.js so the shipped
   reference data and the database can never drift apart.

   Usage:  node tools/gen_seed.mjs   (or: npm run seed) */

import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const sandbox = {
  document: { querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} },
  console
};
vm.createContext(sandbox);

const dataSource = readFileSync(new URL("../assets/js/data.js", import.meta.url), "utf8");
vm.runInContext(
  dataSource + ";globalThis.__data={PF_INST,PF_SCH,PF_FUNDS,PF_CLUSTERS,PF_PATHS,COUNTIES};",
  sandbox
);
const { PF_INST, PF_SCH, PF_FUNDS, PF_CLUSTERS, PF_PATHS, COUNTIES } = sandbox.__data;

const q = v => (v === null || v === undefined ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
const arr = a => (a.length ? "array[" + a.map(q).join(",") + "]" : "'{}'::text[]");

const lines = [];
lines.push("-- ---------------------------------------------------------------");
lines.push("-- PathFinder Kenya — reference data seed");
lines.push("-- GENERATED FILE. Do not edit by hand: run `npm run seed`,");
lines.push("-- which rewrites this file from assets/js/data.js.");
lines.push("-- Regenerate with: npm run seed   (no timestamp: keeps the file stable in git)");
lines.push("-- Rows: " + PF_INST.length + " institutions · " + PF_SCH.length +
           " scholarships · " + COUNTIES.length + " counties · " + PF_CLUSTERS.length + " clusters");
lines.push("-- ---------------------------------------------------------------");
lines.push("");
lines.push("truncate table public.institutions restart identity cascade;");
lines.push("truncate table public.scholarships restart identity cascade;");
lines.push("truncate table public.counties restart identity cascade;");
lines.push("truncate table public.clusters  restart identity cascade;");
lines.push("truncate table public.funding_bands restart identity cascade;");
lines.push("truncate table public.pathways      cascade;");
lines.push("");
lines.push("insert into public.institutions (id, code, name, type, region, field, cut_off, fees, funding, programmes, website) values");

lines.push(PF_INST.map(i => "  (" + [
  q(i.id), q(i.code), q(i.name), q(i.type), q(i.region), q(i.field),
  q(i.cutoff), q(i.fees), q(i.funding), arr(i.progs), q(i.site || null)
].join(", ") + ")").join(",\n") + ";");
lines.push("");

lines.push("insert into public.scholarships (name, audience, covers, \"window\", url) values");
lines.push(PF_SCH.map(s => "  (" + [q(s.name), q(s.who), q(s.covers), q(s.window), q(s.url)].join(", ") + ")").join(",\n") + ";");
lines.push("");

lines.push("insert into public.counties (name) values");
lines.push(COUNTIES.map(c => "  (" + q(c) + ")").join(",\n") + ";");
lines.push("");

lines.push("insert into public.clusters (name, subject_slots) values");
lines.push(PF_CLUSTERS.map(c => "  (" + q(c.n) + ", to_jsonb(" + arr(c.slots.flat()) + "::text[]))").join(",\n") + ";");
lines.push("");

lines.push("insert into public.funding_bands (band, tagline, split, detail) values");
lines.push(PF_FUNDS.map((b, idx) => "  (" + [String(idx + 1), q(b.tag), q(b.split), q(b.d)].join(", ") + ")").join(",\n") + ";");
lines.push("");
lines.push("-- career pathways: interest weights drive the recommender");
lines.push("insert into public.pathways (id, name, target_points, interest_weights) values");
lines.push(PF_PATHS.map(p => "  (" + [q(p.id), q(p.name), String(p.target), q(JSON.stringify(p.letters)) + "::jsonb"].join(", ") + ")").join(",\n") + ";");
lines.push("");

const out = new URL("../supabase/seed.sql", import.meta.url);
writeFileSync(out, lines.join("\n"));
console.log("seed.sql written — " + PF_INST.length + " institutions, " + PF_SCH.length + " scholarships, " +
            COUNTIES.length + " counties, " + PF_CLUSTERS.length + " clusters.");
