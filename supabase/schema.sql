-- ============================================================
-- PathFinder Kenya — Supabase schema (PostgreSQL 15)
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Row-Level Security is enabled on every table.
--
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- ============================================================

-- 1. Profiles (one row per auth user) -----------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text not null,
  role        text not null default 'student' check (role in ('student','tutor','superadmin')),
  phone       text,
  county      text,
  stage       text,
  school      text,
  tsc_number  text,
  onboarded   boolean not null default false,
  suspended   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 2. Student results (marks entered by the student) ----------
create table if not exists public.results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  subject    text not null,
  score      numeric not null check (score >= 0 and score <= 100),
  target     numeric check (target >= 0 and target <= 100),
  exam_type  text,
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Quiz answers (RIASEC) ----------------------------------
create table if not exists public.quiz_answers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  question_idx  smallint not null check (question_idx between 0 and 11),
  option_idx    smallint not null check (option_idx between 0 and 5),
  answer_letter text not null check (answer_letter in ('R','I','A','S','E','C','N')),
  created_at    timestamptz not null default now(),
  unique (user_id, question_idx)
);

-- 4. Shortlists ---------------------------------------------
create table if not exists public.shortlists (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  institution_id text not null,
  created_at     timestamptz not null default now(),
  primary key (user_id, institution_id)
);

-- 5. Assessments (exam log) ---------------------------------
create table if not exists public.assessments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  subject    text,
  raw_score  text,
  points     numeric,
  exam_date  date,
  created_at timestamptz not null default now()
);

-- 6. Institutions (public reference data) -------------------
create table if not exists public.institutions (
  id         text primary key,
  code       text not null,
  name       text not null,
  type       text not null,
  region     text not null,
  field      text,
  programs   jsonb not null default '[]',
  funding    text,
  cutoff     text,
  fees       text,
  source     text default 'CUE / KUCCPS / TVETA',
  updated_at timestamptz not null default now()
);

-- 7. Scholarships (public reference data) -------------------
create table if not exists public.scholarships (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  type     text not null,
  coverage text,
  amount   text,
  deadline text,
  url      text
);

-- 8. Tutors (verified directory) ----------------------------
create table if not exists public.tutors (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  tsc_number text,
  subject    text,
  county     text,
  rating     numeric default 5.0,
  reviews    int default 0,
  verified   boolean not null default false
);

-- 9. Audit log (append-only) --------------------------------
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  action     text not null,
  details    jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helper: is the caller a SuperAdmin? (SECURITY DEFINER avoids RLS recursion)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin');
$$;

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.results      enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.shortlists   enable row level security;
alter table public.assessments  enable row level security;
alter table public.institutions enable row level security;
alter table public.scholarships enable row level security;
alter table public.tutors       enable row level security;
alter table public.audit_logs   enable row level security;

-- Profiles: a user can READ and UPDATE only their own row; admins can read all.
-- (The old policy used FOR ALL, which let any user set their own role to 'superadmin'.)
drop policy if exists "own profile"        on public.profiles;
drop policy if exists "profile select"     on public.profiles;
drop policy if exists "profile update own" on public.profiles;
create policy "profile select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profile update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Column-level privileges: clients may only change harmless columns.
-- role, email, suspended, tsc_number can only be changed from the SQL editor / service role.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant  update (full_name, phone, county, stage, school, onboarded) on public.profiles to authenticated;

-- Private student data: owner only
drop policy if exists "own results"     on public.results;
drop policy if exists "own quiz"        on public.quiz_answers;
drop policy if exists "own shortlists"  on public.shortlists;
drop policy if exists "own assessments" on public.assessments;
create policy "own results"     on public.results      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own quiz"        on public.quiz_answers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own shortlists"  on public.shortlists   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own assessments" on public.assessments  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reference data: readable by signed-in users, writable only via SQL editor / service role
drop policy if exists "public read institutions" on public.institutions;
drop policy if exists "public read scholarships" on public.scholarships;
drop policy if exists "public read tutors"       on public.tutors;
create policy "public read institutions" on public.institutions for select using (auth.role() = 'authenticated');
create policy "public read scholarships" on public.scholarships for select using (auth.role() = 'authenticated');
create policy "public read tutors"       on public.tutors       for select using (auth.role() = 'authenticated');

-- Audit log: users may only append rows for themselves; only admins can read.
drop policy if exists "insert audit"     on public.audit_logs;
drop policy if exists "admin read audit" on public.audit_logs;
create policy "insert audit"     on public.audit_logs for insert with check (auth.uid() = user_id);
create policy "admin read audit" on public.audit_logs for select using (public.is_admin());

-- ============================================================
-- Auto-create a profile on signup.
-- SECURITY: the role is whitelisted. Anyone can self-register as 'student' or 'tutor';
-- 'superadmin' can NEVER be requested from the browser. Promote an admin manually:
--   update public.profiles set role = 'superadmin' where email = 'you@example.com';
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested text := new.raw_user_meta_data->>'role';
  safe_role text := case when requested = 'tutor' then 'tutor' else 'student' end;
begin
  insert into public.profiles (id, email, full_name, role, phone, county, stage, school, tsc_number)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    safe_role,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'county',
    new.raw_user_meta_data->>'stage',
    new.raw_user_meta_data->>'school',
    case when safe_role = 'tutor' then new.raw_user_meta_data->>'tsc_number' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
