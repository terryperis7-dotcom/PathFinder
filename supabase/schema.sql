-- ============================================================
-- PathFinder Kenya — Supabase Schema (PostgreSQL 15)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- DPA 2019 compliant · Row-Level Security on every table
-- ============================================================

-- 1. Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Profiles (one row per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('student','tutor','superadmin')),
  phone text,
  county text,
  stage text,
  school text,
  tsc_number text,
  onboarded boolean default false,
  created_at timestamptz default now()
);

-- 3. Student results (real marks entered by the student)
create table if not exists public.results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  score numeric not null check (score >= 0 and score <= 100),
  target numeric check (target >= 0 and target <= 100),
  exam_type text,
  created_at timestamptz default now()
);

-- 4. Quiz answers (RIASEC personality)
create table if not exists public.quiz_answers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_idx int not null,
  answer_letter text not null check (answer_letter in ('R','I','A','S','E','C','N')),
  created_at timestamptz default now(),
  unique (user_id, question_idx)
);

-- 5. Shortlists
create table if not exists public.shortlists (
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, institution_id)
);

-- 6. Assessments (exam log)
create table if not exists public.assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  subject text,
  raw_score text,
  points numeric,
  exam_date date,
  created_at timestamptz default now()
);

-- 7. Institutions (public reference data — REAL CUE/KUCCPS/TVETA)
create table if not exists public.institutions (
  id text primary key,
  code text not null,
  name text not null,
  type text not null,
  region text not null,
  field text,
  programs jsonb default '[]',
  funding text,
  cutoff text,
  fees text,
  source text default 'CUE / KUCCPS / TVETA',
  updated_at timestamptz default now()
);

-- 8. Scholarships (public reference data)
create table if not exists public.scholarships (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null,
  coverage text,
  amount text,
  deadline text,
  url text
);

-- 9. Tutors (verified directory)
create table if not exists public.tutors (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  tsc_number text,
  subject text,
  county text,
  rating numeric default 5.0,
  reviews int default 0,
  verified boolean default false
);

-- 10. Audit log (append-only, DPA 2019 Sec 28)
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.results enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.shortlists enable row level security;
alter table public.assessments enable row level security;
alter table public.institutions enable row level security;
alter table public.scholarships enable row level security;
alter table public.tutors enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users see/edit only their own row
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Private student data: owner only
create policy "own results" on public.results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own quiz" on public.quiz_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own shortlists" on public.shortlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own assessments" on public.assessments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reference data: public read for authenticated users
create policy "public read institutions" on public.institutions
  for select using (auth.role() = 'authenticated');
create policy "public read scholarships" on public.scholarships
  for select using (auth.role() = 'authenticated');
create policy "public read tutors" on public.tutors
  for select using (auth.role() = 'authenticated');

-- Audit: insert-only for users, read for admins (via service role in app)
create policy "insert audit" on public.audit_logs
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "admin read audit" on public.audit_logs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin')
  );

-- ============================================================
-- Helper: auto-create profile on signup (trigger)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role','student'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
