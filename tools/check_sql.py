#!/usr/bin/env python3
"""Static audit of the Supabase schema. No database needed.

Checks that the SQL we ship is safe to run and hard to get wrong:

  * every table has Row Level Security enabled
  * every table has at least one policy (a table with RLS and no policy is dead)
  * every policy, index, trigger and foreign key points at a table that exists
  * personal tables never use `using (true)` — only reference data may be world-readable
  * seed.sql only writes to tables the schema creates
  * `$$` blocks are balanced

Run:  python3 tools/check_sql.py      (part of `npm test`)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "supabase" / "schema.sql"
SEED = ROOT / "supabase" / "seed.sql"

# Tables that are public reference data: world-readable by design.
REFERENCE = {"institutions", "scholarships", "counties", "clusters", "funding_bands", "pathways", "availability"}
AUTH_TABLES = {"auth.users"}

problems = []


def bad(msg):
    problems.append(msg)


def strip_comments(sql):
    return re.sub(r"--[^\n]*", "", sql)


def check_file(path):
    if not path.exists():
        bad(f"missing {path.relative_to(ROOT)}")
        return ""
    sql = path.read_text(encoding="utf-8")
    if sql.count("$$") % 2:
        bad(f"{path.name}: unbalanced $$ block ({sql.count('$$')} markers)")
    return strip_comments(sql)


schema = check_file(SCHEMA)
seed = check_file(SEED)

tables = set(re.findall(r"create table if not exists public\.(\w+)", schema))
if not tables:
    bad("schema.sql creates no tables")

# --- RLS enabled
rls = set(re.findall(r"alter table public\.(\w+)\s+enable row level security", schema))
for t in sorted(tables - rls):
    bad(f"table public.{t} exists without `enable row level security`")

# --- at least one policy per table
policies = re.findall(r"create policy\s+\"([^\"]+)\"\s+on public\.(\w+)", schema)
covered = {t for _, t in policies}
for t in sorted(tables - covered):
    bad(f"table public.{t} has RLS but no policy")

# --- policies only reference real tables
for name, t in policies:
    if t not in tables:
        bad(f'policy "{name}" targets unknown table public.{t}')

# --- world-readable only for reference data
for name, t in policies:
    body = re.search(r'create policy\s+"' + re.escape(name) + r'".*?;', schema, re.S)
    if body and re.search(r"using\s*\(\s*true\s*\)", body.group(0)) and t not in REFERENCE:
        bad(f'policy "{name}" on public.{t} is world-readable; only reference data may be')

# --- indexes on real tables
for t in set(re.findall(r"create index if not exists \w+\s+on public\.(\w+)", schema)):
    if t not in tables:
        bad(f"index targets unknown table public.{t}")

# --- foreign keys point at real tables
for t in set(re.findall(r"references public\.(\w+)", schema)):
    if t not in tables:
        bad(f"foreign key references unknown table public.{t}")

# --- triggers exist and are attached to real tables
for fn in set(re.findall(r"execute function public\.(\w+)\(\)", schema)):
    if f"function public.{fn}()" not in schema:
        bad(f"trigger calls missing function public.{fn}()")
for t in set(re.findall(r"create trigger[\s\S]{0,120}?on public\.(\w+)", schema)):
    if t not in tables:
        bad(f"trigger attached to unknown table public.{t}")

# --- seed writes only to known tables
for t in set(re.findall(r"insert into public\.(\w+)", seed)):
    if t not in tables:
        bad(f"seed.sql writes to public.{t}, which schema.sql never creates")
for t in set(re.findall(r"truncate table public\.(\w+)", seed)):
    if t not in tables:
        bad(f"seed.sql truncates public.{t}, which schema.sql never creates")
if seed and "on conflict" not in seed and "truncate table" not in seed:
    bad("seed.sql is not idempotent (neither `truncate` nor `on conflict`)")
# a seed that writes to a table without clearing it will duplicate rows on re-run
for t in set(re.findall(r"insert into public\.(\w+)", seed)):
    if f"truncate table public.{t}" not in seed and "on conflict" not in seed:
        bad(f"seed.sql inserts into public.{t} without truncate or on conflict")

# --- report
if problems:
    print(f"\n{len(problems)} SQL problem(s):")
    for p in problems:
        print("  ✗ " + p)
    sys.exit(1)

print(f"checked {len(tables)} tables, {len(policies)} policies, {len(rls)} RLS switches — all SQL checks passed")
