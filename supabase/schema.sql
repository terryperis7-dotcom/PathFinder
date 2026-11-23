-- ============================================================
-- PathFinder Kenya — Supabase schema
-- Run this once in the Supabase SQL editor, then `npm run seed`.
-- Model: one row per learner/tutor/admin, everything else keyed to it.
-- Row Level Security is on for every table: a learner can only read
-- and write their own rows, and only admins can read the safety queue.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type public.app_role as enum ('student', 'tutor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum ('Requested', 'Confirmed', 'Declined', 'Completed');
exception when duplicate_object then null; end $$;

-- ---------- people ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null,
  email       text not null,
  role        public.app_role not null default 'student',
  county      text,
  school      text,
  stage       text default 'KCSE Form 3–4',
  demo        boolean not null default false,
  suspended   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.tutor_profiles (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles on delete cascade,
  subjects       text[] not null default '{}',
  area           text,
  mode           text not null default 'both' check (mode in ('online','inperson','both')),
  rate_kes       integer not null default 450 check (rate_kes between 350 and 600),
  bio            text,
  -- nothing is shown as verified until a reviewer records it
  check_tsc      boolean not null default false,
  check_id       boolean not null default false,
  check_conduct  boolean not null default false,
  check_safe     boolean not null default false,
  verified_at    timestamptz,
  verified_by    uuid references public.profiles(id),
  suspended      boolean not null default false,
  suspended_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (profile_id)
);

-- ---------- learner data ----------
create table if not exists public.grades (
  profile_id uuid not null default auth.uid() references public.profiles on delete cascade,
  subject    text not null,
  grade      text not null,
  primary key (profile_id, subject)
);

create table if not exists public.quiz_answers (
  profile_id uuid not null default auth.uid() references public.profiles on delete cascade,
  question   smallint not null check (question between 0 and 5),
  choice     smallint not null check (choice between 0 and 3),
  primary key (profile_id, question)
);

create table if not exists public.pathway_matches (
  profile_id uuid not null default auth.uid() references public.profiles on delete cascade,
  pathway_id text not null,
  match_pct  smallint not null,
  weighted   numeric(4,1) not null,
  computed_at timestamptz not null default now(),
  primary key (profile_id, pathway_id)
);

create table if not exists public.assessments (
  id         bigserial primary key,
  profile_id uuid not null default auth.uid() references public.profiles on delete cascade,
  subject    text not null,
  score      smallint not null check (score between 0 and 100),
  taken_on   date not null default current_date,
  target     text,
  created_at timestamptz not null default now()
);

create table if not exists public.shortlists (
  profile_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  institution_id text not null,
  created_at    timestamptz not null default now(),
  primary key (profile_id, institution_id)
);

-- ---------- tutor sessions ----------
create table if not exists public.bookings (
  id          bigserial primary key,
  learner_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  tutor_id    uuid not null references public.tutor_profiles on delete cascade,
  subject     text not null,
  slot_day    text,
  slot_time   text,
  mode        text,
  note        text,
  status      public.booking_status not null default 'Requested',
  created_at  timestamptz not null default now()
);

create table if not exists public.messages (
  id         bigserial primary key,
  booking_id bigint not null references public.bookings on delete cascade,
  sender_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  body       text not null check (char_length(body) <= 2000),
  blocked    boolean not null default false,
  reason     text,
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  tutor_id uuid not null references public.tutor_profiles on delete cascade,
  day      text not null,
  band     text not null,
  open     boolean not null default true,
  primary key (tutor_id, day, band)
);

-- ---------- safety ----------
create table if not exists public.reports (
  id          bigserial primary key,
  tutor_id    uuid not null references public.tutor_profiles on delete cascade,
  reporter_id uuid default auth.uid() references public.profiles on delete set null,
  reason      text not null,
  details     text,
  status      text not null default 'open' check (status in ('open','suspended','dismissed')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

create table if not exists public.safety_log (
  id         bigserial primary key,
  profile_id uuid default auth.uid() references public.profiles on delete set null,
  tutor_id   uuid references public.tutor_profiles on delete set null,
  excerpt    text,
  reasons    text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- reference data (written only by the seed script) ----------
create table if not exists public.institutions (
  id        text primary key,
  code      text not null,
  name      text not null,
  type      text not null,
  region    text not null,
  field     text not null,
  cut_off   text,
  fees      text,
  funding   text,
  programmes text[] not null default '{}',
  website   text
);

create table if not exists public.scholarships (
  id      bigserial primary key,
  name    text not null,
  audience text,
  covers  text,
  "window"  text,
  url     text not null check (url like 'https://%')
);

create table if not exists public.counties (id bigserial primary key, name text not null unique);
create table if not exists public.clusters (id bigserial primary key, name text not null, subject_slots jsonb not null);
create table if not exists public.funding_bands (id bigserial primary key, band int not null, tagline text, split text, detail text);
create table if not exists public.pathways (id text primary key, name text not null, target_points int, interest_weights jsonb);

-- ---------- helpers ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();


-- ---------- report outcome columns ----------
alter table public.reports add column if not exists resolution text;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolved_by uuid references public.profiles;

-- ---------- notifications ----------
-- One inbox per role. `audience` mirrors the client's student/tutor/admin/all
-- scoping, and `profile_id` is filled when a row is addressed to one person.
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  audience    public.app_role,                     -- null = everyone
  profile_id  uuid references public.profiles on delete cascade,
  kind        text not null default 'system' check (kind in ('message','request','safety','result','funding','system')),
  sender      text not null default 'PathFinder',
  title       text not null,
  body        text not null default '',
  link        text,                                 -- an in-app view key, never a URL
  read_at     timestamptz,
  demo        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- learner targets + reviews ----------
create table if not exists public.targets (
  profile_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  subject     text not null,
  target_grade text not null,
  updated_at  timestamptz not null default now(),
  primary key (profile_id, subject)
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  bigint not null references public.bookings on delete cascade,
  learner_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  tutor_id    uuid not null references public.tutor_profiles on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  body        text not null default '',
  -- a review is private to the learner and the reviewer until moderated
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (booking_id, learner_id)
);

-- ---------- tutor verification evidence + outcome ----------
create table if not exists public.verify_checks (
  tutor_id    uuid not null references public.tutor_profiles on delete cascade,
  check_key   text not null check (check_key in ('tsc','id','conduct','safe')),
  recorded    boolean not null default false,
  recorded_by uuid references public.profiles,
  recorded_at timestamptz,
  primary key (tutor_id, check_key)
);

create table if not exists public.verify_submissions (
  id          uuid primary key default gen_random_uuid(),
  tutor_id    uuid not null references public.tutor_profiles on delete cascade,
  check_key   text not null check (check_key in ('tsc','id','conduct','safe')),
  reference   text not null,
  note        text not null default '',
  reviewed    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- tutor applications ----------
create table if not exists public.tutor_applications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid default auth.uid() references public.profiles on delete set null,
  name        text not null,
  subject     text not null,
  rate_kes    integer not null default 450,
  status      text not null default 'new' check (status in ('new','in_review','approved','rejected')),
  decision    text,
  decided_by  uuid references public.profiles,
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------- suspensions ----------
create table if not exists public.suspensions (
  tutor_id    uuid primary key references public.tutor_profiles on delete cascade,
  report_id   bigint references public.reports on delete set null,
  reason      text,
  active      boolean not null default true,
  created_by  uuid references public.profiles,
  created_at  timestamptz not null default now(),
  lifted_at   timestamptz
);

-- ---------- completed sessions (the tutor's ledger) ----------
create table if not exists public.session_log (
  id          uuid primary key default gen_random_uuid(),
  booking_id  bigint not null references public.bookings on delete cascade,
  tutor_id    uuid not null references public.tutor_profiles on delete cascade,
  learner_id  uuid references public.profiles on delete set null,
  subject     text,
  slot        text,
  fee_kes     integer not null default 0,
  completed_at timestamptz not null default now()
);

-- ---------- admin action trail ----------
-- Append-only. Written by admins on every decision, read back only by admins.
create table if not exists public.admin_actions (
  id          bigserial primary key,
  actor_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  action      text not null,
  target      text not null default '',
  tone        text not null default 'sky',
  created_at  timestamptz not null default now()
);

-- ---------- row level security ----------
-- Re-runnable: drop the policies this file owns before recreating them.
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
alter table public.profiles        enable row level security;
alter table public.tutor_profiles  enable row level security;
alter table public.grades          enable row level security;
alter table public.quiz_answers    enable row level security;
alter table public.pathway_matches enable row level security;
alter table public.assessments     enable row level security;
alter table public.shortlists      enable row level security;
alter table public.bookings        enable row level security;
alter table public.messages        enable row level security;
alter table public.availability    enable row level security;
alter table public.reports         enable row level security;
alter table public.safety_log      enable row level security;
alter table public.institutions    enable row level security;
alter table public.scholarships    enable row level security;
alter table public.counties        enable row level security;
alter table public.clusters        enable row level security;
alter table public.funding_bands   enable row level security;
alter table public.pathways        enable row level security;

-- own profile, admins see all
create policy "profile self read"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profile self write"  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profile admin write" on public.profiles for update using (public.is_admin());

-- tutor profile: public directory read of non-suspended tutors, owner writes
create policy "tutor read" on public.tutor_profiles for select
  using (suspended = false or profile_id = auth.uid() or public.is_admin());
create policy "tutor self write" on public.tutor_profiles for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
-- (verification and suspension columns are locked by guard_tutor_profile below)
create policy "admin tutors" on public.tutor_profiles for all using (public.is_admin());

-- learner-owned tables
create policy "own grades"      on public.grades          for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "own answers"     on public.quiz_answers    for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "own matches"     on public.pathway_matches for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "own assessments" on public.assessments     for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "own shortlist"   on public.shortlists      for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- bookings: either side of the session can read; learner creates
create policy "booking read" on public.bookings for select
  using (learner_id = auth.uid()
         or tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid())
         or public.is_admin());
create policy "booking create" on public.bookings for insert with check (learner_id = auth.uid());
create policy "booking update" on public.bookings for update
  using (learner_id = auth.uid()
         or tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid())
         or public.is_admin());

-- messages: only the two parties on that booking
create policy "message create" on public.messages for insert with check (
  sender_id = auth.uid()
  and booking_id in (select id from public.bookings b
                     where b.learner_id = auth.uid()
                        or b.tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid())));

create policy "availability read"  on public.availability for select using (true);
create policy "availability write" on public.availability for all
  using (tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()));

-- safety: a learner may file a report, only admins read the queue
create policy "report create" on public.reports for insert with check (reporter_id = auth.uid());
create policy "report admin"  on public.reports for select using (public.is_admin() or reporter_id = auth.uid());
create policy "report admin write" on public.reports for update using (public.is_admin());
create policy "safety log admin" on public.safety_log for all using (public.is_admin());

-- reference data is world-readable, written only by the service role / seed script
create policy "reference read" on public.institutions  for select using (true);
create policy "reference read" on public.scholarships  for select using (true);
create policy "reference read" on public.counties      for select using (true);
create policy "reference read" on public.clusters      for select using (true);
create policy "reference read" on public.funding_bands for select using (true);
create policy "reference read" on public.pathways      for select using (true);

-- ---------- row level security: new tables ----------
alter table public.notifications      enable row level security;
alter table public.targets            enable row level security;
alter table public.reviews            enable row level security;
alter table public.verify_checks      enable row level security;
alter table public.verify_submissions enable row level security;
alter table public.tutor_applications enable row level security;
alter table public.suspensions        enable row level security;
alter table public.session_log        enable row level security;
alter table public.admin_actions      enable row level security;

-- notifications: your own rows, or a broadcast aimed at your role
create policy "notification read" on public.notifications for select using (
  public.is_admin()
  or (profile_id = auth.uid())
  or (profile_id is null and (audience is null or audience = (select role from public.profiles where id = auth.uid())))
);
create policy "notification write own" on public.notifications for update using (profile_id = auth.uid());
create policy "notification admin"     on public.notifications for all using (public.is_admin());

-- targets follow the learner
create policy "own targets" on public.targets for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- reviews: the learner who wrote it and the tutor it is about can read it;
-- nobody else can, and only the author may publish it
create policy "review read" on public.reviews for select using (
  learner_id = auth.uid()
  or tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid())
  or public.is_admin()
);
create policy "review write" on public.reviews for insert with check (learner_id = auth.uid() and published = false);
create policy "review update" on public.reviews for update using (learner_id = auth.uid()) with check (learner_id = auth.uid() and published = false);
create policy "review admin" on public.reviews for all using (public.is_admin());

-- verification: the tutor may read their own state and file evidence; only an
-- admin may record a check
create policy "verify read own" on public.verify_checks for select using (
  tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()) or public.is_admin()
);
create policy "verify admin" on public.verify_checks for all using (public.is_admin());
create policy "verify sub own" on public.verify_submissions for all
  using (tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()) or public.is_admin())
  with check (tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()) and reviewed = false);
create policy "verify sub read admin" on public.verify_submissions for select using (public.is_admin());

-- applications: the applicant sees their own row, admins see the queue
create policy "application own" on public.tutor_applications for select using (profile_id = auth.uid() or public.is_admin());
create policy "application create" on public.tutor_applications for insert with check (profile_id = auth.uid() and status = 'new');
create policy "application admin" on public.tutor_applications for all using (public.is_admin());

-- suspensions are admin-only in both directions
create policy "suspension admin" on public.suspensions for all using (public.is_admin());
create policy "suspension self read" on public.suspensions for select
  using (tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()));

-- the ledger: the tutor it belongs to and the learner who attended
create policy "ledger read" on public.session_log for select using (
  learner_id = auth.uid()
  or tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid())
  or public.is_admin()
);
create policy "ledger tutor write" on public.session_log for insert with check (
  tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid())
);

-- the action trail is append-only for admins and readable only by admins
create policy "actions read admin"   on public.admin_actions for select using (public.is_admin());
create policy "actions create admin" on public.admin_actions for insert with check (public.is_admin() and actor_id = auth.uid());

-- ---------- indexes ----------
create index if not exists assessments_profile_idx on public.assessments (profile_id, taken_on desc);
create index if not exists bookings_tutor_idx      on public.bookings (tutor_id, status);
create index if not exists bookings_learner_idx    on public.bookings (learner_id, created_at desc);
create index if not exists messages_booking_idx    on public.messages (booking_id, created_at);
create index if not exists reports_open_idx        on public.reports (status) where status = 'open';
create index if not exists notifications_audience_idx on public.notifications (audience, created_at desc);
create index if not exists notifications_unread_idx  on public.notifications (profile_id) where read_at is null;
create index if not exists reviews_tutor_idx         on public.reviews (tutor_id, created_at desc);
create index if not exists verify_sub_tutor_idx      on public.verify_submissions (tutor_id, reviewed);
create index if not exists session_log_tutor_idx     on public.session_log (tutor_id, completed_at desc);
create index if not exists admin_actions_actor_idx   on public.admin_actions (actor_id, created_at desc);
create index if not exists applications_status_idx   on public.tutor_applications (status);

-- ---------- triggers ----------
-- Decisions on a booking reach the learner's bell without the client having to
-- remember to write it. Runs as the definer so the learner cannot be blocked by
-- RLS when the row is created on their behalf.
create or replace function public.notify_booking_decision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('Confirmed','Declined','Completed') then
    insert into public.notifications (profile_id, kind, sender, title, body, link)
    values (
      new.learner_id, 'request', 'PathFinder',
      case new.status
        when 'Confirmed' then 'Match approved'
        when 'Declined'  then 'Request declined'
        else 'Session completed'
      end,
      coalesce(new.subject, 'Session') || ' · ' || trim(coalesce(new.slot_day, '') || ' ' || coalesce(new.slot_time, '')) || ' is ' || lower(new.status::text) || '.',
      'tutors'
    );
  end if;
  return new;
end $$;

drop trigger if exists booking_decision_notify on public.bookings;
create trigger booking_decision_notify
  after update on public.bookings
  for each row execute function public.notify_booking_decision();

-- One funnel: a new report always reaches the safety queue as a notification.
create or replace function public.notify_new_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (audience, kind, sender, title, body, link)
  values ('admin', 'safety', 'Learner report', 'New safety report', coalesce(new.reason, 'Reported'), 'admin-safety');
  return new;
end $$;

drop trigger if exists report_notify on public.reports;
create trigger report_notify
  after insert on public.reports
  for each row execute function public.notify_new_report();

-- ---------- accounts ----------
-- The profile row is created here, from the sign-up metadata, never by the
-- browser. Only student and tutor can be asked for; admin is granted by hand.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role', 'student');
begin
  insert into public.profiles (id, name, email, role, county)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case when r = 'tutor' then 'tutor'::public.app_role else 'student'::public.app_role end,
    nullif(new.raw_user_meta_data->>'county', '')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- guards ----------
-- RLS decides which rows you can touch; these decide which columns.
-- The owner account is the one admin that can grant admin to others. Change the
-- address here (and in the update below) to hand the project to someone else.
create or replace function public.is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid()
                 and lower(p.email) = 'terryperis7@gmail.com' and p.role = 'admin');
$$;

-- Owner can never be demoted or suspended through the app; other admins cannot
-- create or remove admins; nobody but an admin can touch role, email or suspended.
create or replace function public.guard_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if lower(old.email) = 'terryperis7@gmail.com' then
    new.role := old.role; new.suspended := old.suspended; new.email := old.email;
  end if;
  if not public.is_admin() then
    new.role := old.role; new.email := old.email; new.demo := old.demo; new.suspended := old.suspended;
  elsif not public.is_owner() then
    new.email := old.email;
    if old.role = 'admin' or new.role = 'admin' then new.role := old.role; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

create or replace function public.guard_tutor_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.check_tsc := false; new.check_id := false; new.check_conduct := false; new.check_safe := false;
      new.verified_at := null; new.verified_by := null; new.suspended := false; new.suspended_at := null;
    else
      new.check_tsc := old.check_tsc; new.check_id := old.check_id;
      new.check_conduct := old.check_conduct; new.check_safe := old.check_safe;
      new.verified_at := old.verified_at; new.verified_by := old.verified_by;
      new.suspended := old.suspended; new.suspended_at := old.suspended_at;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists tutor_profiles_guard on public.tutor_profiles;
create trigger tutor_profiles_guard before insert or update on public.tutor_profiles
  for each row execute function public.guard_tutor_profile();

-- A learner can edit the note on a request but cannot approve it or re-route it.
create or replace function public.guard_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.learner_id := old.learner_id; new.tutor_id := old.tutor_id;
    if not exists (select 1 from public.tutor_profiles t where t.id = old.tutor_id and t.profile_id = auth.uid()) then
      new.status := old.status;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists bookings_guard on public.bookings;
create trigger bookings_guard before update on public.bookings
  for each row execute function public.guard_booking();

-- ---------- promote your admin ----------
-- update public.profiles set role = 'admin' where email = 'you@example.com';

-- Reviews stay private until an admin publishes them.
create or replace function public.guard_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then new.published := false; end if;
  return new;
end $$;
drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.guard_review();

-- =====================================================================
-- Safeguarding: who may chat, what may be said, and what happens next.
--
-- The browser runs the same checks for instant feedback, but this is the
-- copy that counts: a message sent straight to the API goes through
-- screen_message() too. Order of events for every message:
--   1. chat_gate     consent signed? age ok? muted/locked? quiet hours? rate?
--   2. safety_scan   what is in it (contact details, abuse, grooming, threats)
--   3. safety_intake strike ladder, warning to the sender, report to admins
-- =====================================================================

-- Consent record (the onboarding "safety check"). Guardian details are only
-- readable by the learner and by admins handling a safeguarding concern.
create table if not exists public.safety_consents (
  profile_id        uuid primary key default auth.uid() references public.profiles on delete cascade,
  dob               date,
  county            text,
  school            text,
  guardian_name     text,
  guardian_relation text,
  guardian_phone    text,
  guardian_knows    boolean not null default false,
  docs_read         text[] not null default '{}',
  signed_name       text not null,
  version           text not null,
  signed_at         timestamptz not null default now()
);
alter table public.safety_consents enable row level security;
create policy "consent own" on public.safety_consents for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "consent admin read" on public.safety_consents for select using (public.is_admin());

-- Every flagged message. Admin-only: the original text is kept here (300 chars)
-- so a reviewer can act; the recipient only ever sees the masked version.
alter table public.safety_log
  add column if not exists booking_id bigint,
  add column if not exists context    text not null default 'chat',
  add column if not exists severity   text not null default 'low' check (severity in ('low','medium','high','critical')),
  add column if not exists categories text[] not null default '{}',
  add column if not exists masked     text,
  add column if not exists counted    boolean not null default true,
  add column if not exists strikes    int not null default 0,
  add column if not exists status     text not null default 'open'
    check (status in ('open','warned','muted','locked','suspended','dismissed')),
  add column if not exists actioned_by uuid references public.profiles,
  add column if not exists action_note text,
  add column if not exists actioned_at timestamptz;
create index if not exists safety_log_queue_idx   on public.safety_log (status, created_at desc);
create index if not exists safety_log_profile_idx on public.safety_log (profile_id, created_at desc);

-- A muted or locked chat. Written only by the functions below.
create table if not exists public.chat_restrictions (
  profile_id uuid primary key references public.profiles on delete cascade,
  level      text not null check (level in ('muted','locked')),
  until      timestamptz,
  reason     text,
  log_id     bigint references public.safety_log on delete set null,
  set_by     uuid references public.profiles,
  created_at timestamptz not null default now()
);
alter table public.chat_restrictions enable row level security;
create policy "restriction read" on public.chat_restrictions for select
  using (profile_id = auth.uid() or public.is_admin());

-- ---------- detection ----------
create or replace function public.safety_scan(p_text text) returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  src    text := coalesce(p_text, '');
  n      text := lower(coalesce(p_text, ''));
  leet   text := translate(lower(coalesce(p_text, '')), '01345$@!', 'oieassai');
  masked text := coalesce(p_text, '');
  toks   text[];
  w      text;
  s      text;
  i      int;
  rx     record;
  cats   text[] := '{}';
  why    text[] := '{}';
  sev    int := 0;
  blk    boolean := false;
  numw   text[][] := array[['zero','0'],['one','1'],['two','2'],['three','3'],['four','4'],['five','5'],
    ['six','6'],['seven','7'],['eight','8'],['nine','9'],['sifuri','0'],['moja','1'],['mbili','2'],
    ['tatu','3'],['nne','4'],['tano','5'],['sita','6'],['saba','7'],['nane','8'],['tisa','9']];
  strong text[] := array['fuck','shit','bitch','asshole','bastard','pussy','whore','slut','nigga','nigger','cunt','malaya','kuma'];
  mild   text[] := array['damn','stupid','idiot','moron','dumb','dick','hate you','mjinga','mpumbavu','pumbavu','ushenzi','fala'];
begin
  if length(trim(src)) = 0 then
    return jsonb_build_object('severity','none','blocked',false,'categories','[]'::jsonb,'reasons','[]'::jsonb,'masked',src);
  end if;

  -- phone numbers, including spelled-out ones ("zero seven one two ...")
  for i in 1..array_length(numw, 1) loop
    n := regexp_replace(n, '\m' || numw[i][1] || '\M', numw[i][2], 'g');
  end loop;
  if n ~ '\+?\d([\s.()-]?\d){8,}' then
    cats := array_append(cats, 'phone'::text); why := array_append(why, 'a phone number'::text); sev := greatest(sev, 2); blk := true;
    masked := regexp_replace(masked, '\+?\d([\s.()-]?\d){6,}', '####', 'g');
    masked := regexp_replace(masked, '\m(zero|one|two|three|four|five|six|seven|eight|nine|sifuri|moja|mbili|tatu|nne|tano|sita|saba|nane|tisa)\M', '####', 'gi');
  end if;

  -- everything else: category, severity (1 low .. 4 critical), pattern, reason
  for rx in select * from (values
    ('handle',   2, '\m(ig|insta|snap|tt|wa|fb)\s*[:=-]\s*\S+', 'a social handle'),
    ('handle',   2, '\m(dm|inbox|pm|add)\s+(me|my)\M', 'an invitation to chat elsewhere'),
    ('platform', 2, '\m(instagram|insta|whatsapp|whatsap|watsapp|snapchat|tiktok|tik\s*tok|facebook|telegram|discord|twitter|wechat|botim|x\.com)\M', 'another app'),
    ('email',    2, '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}', 'an email address'),
    ('email',    2, '\m(gmail|yahoo|hotmail|outlook)\M', 'an email address'),
    ('handle',   2, '@[a-z0-9_.]{3,}', 'a social handle'),
    ('link',     2, '(https?://|www\.)\S+', 'a web link'),
    ('link',     2, '\m[a-z0-9-]+\.(com|co\.ke|ke|net|org|io|me|ly|link|tk)\M', 'a web link'),
    ('payment',  2, '\m(send|pay)\s+(me\s+)?(money|cash|mpesa|m-pesa|airtime)\M', 'payment outside PathFinder'),
    ('payment',  2, '\m(paybill|pay\s*bill|till\s+(number|no))\M', 'payment outside PathFinder'),
    ('payment',  2, '\m(pay|paid)\s+(me\s+)?directly\M', 'payment outside PathFinder'),
    ('threat',   3, '\m(kill|murder|stab|beat|hurt)\s+(you|u|yourself|him|her|them)\M', 'a threat'),
    ('threat',   3, '\m(kys|go\s+die)\M', 'a threat'),
    ('threat',   3, '\mi(\s*will|.?ll|\s*am going to)\s+find\s+you\M', 'a threat'),
    ('grooming', 4, '\mdon.?t\s+tell\s+(your\s+)?(mom|mum|mother|dad|father|parents?|teacher|anyone|anybody|school)\M', 'asking to keep a secret'),
    ('grooming', 4, '\m(keep|our)\s+(this|it|little)?\s*(a\s+)?secret\M', 'asking to keep a secret'),
    ('grooming', 4, '\mbetween\s+(us|you\s+and\s+me)\M', 'asking to keep a secret'),
    ('grooming', 4, '\mno\s+one\s+(needs|has)\s+to\s+know\M', 'asking to keep a secret'),
    ('grooming', 4, '\mdelete\s+(this|these|the|our)\s+(chat|chats|messages?|conversation)\M', 'asking to delete messages'),
    ('grooming', 4, '\m(send|share|show)\s+(me\s+)?(a\s+|your\s+|ur\s+)?(pic|pics|photo|photos|picture|pictures|selfie|selfies|video|nudes?)\M', 'asking for a photo or video'),
    ('grooming', 4, '\m(nude|nudes|naked|sexy|horny|undress)\M', 'sexual content'),
    ('grooming', 4, '\m(have|having)\s+sex\M|\msex\s+(with|chat|video|pics?)\M', 'sexual content'),
    ('grooming', 3, '\m(be\s+)?my\s+(girlfriend|boyfriend|babe|baby|sweetheart)\M', 'a romantic approach'),
    ('grooming', 3, '\mi\s+love\s+you\M', 'a romantic approach'),
    ('grooming', 4, '\mare\s+you\s+(alone|home\s+alone)\M', 'asking if you are alone'),
    ('grooming', 4, '\m(come|meet)\s+(me\s+)?(alone|at\s+my|to\s+my|outside|secretly|privately)\M', 'asking to meet alone'),
    ('grooming', 3, '\m(my|your)\s+(place|room|hotel|lodging)\M', 'asking to meet somewhere private'),
    ('grooming', 3, '\mwhere\s+do\s+you\s+(live|stay)\M', 'asking where you live'),
    ('grooming', 2, '\mhow\s+old\s+are\s+you\M', 'asking your age'),
    ('grooming', 3, '\mi.?ll\s+(give|buy|send)\s+you\s+(money|airtime|a\s+gift|gifts|presents?)\M', 'offering gifts or money'),
    ('welfare',  3, '\m(kill\s+myself|want\s+to\s+die|end\s+my\s+life|suicide|suicidal|hurt\s+myself)\M', 'a message about hurting yourself')
  ) as v(cat, sv, pat, why)
  loop
    if src ~* rx.pat then
      if not (rx.cat::text = any(cats)) then cats := array_append(cats, rx.cat::text); end if;
      if not (rx.why::text = any(why)) then why := array_append(why, rx.why::text); end if;
      sev := greatest(sev, rx.sv);
      if rx.cat <> 'welfare' then
        blk := true;
        masked := regexp_replace(masked, rx.pat, '####', 'gi');
      end if;
    end if;
  end loop;

  -- bad language: whole words for mild ones, inside any word (or spaced-out
  -- letters like "f u c k", or "sh1t") for the strong ones
  toks := regexp_split_to_array(leet, '[^a-z]+');
  for w in select m[1] from regexp_matches(leet, '(\m(?:[a-z][^a-z0-9]){3,}[a-z]\M)', 'g') as m loop
    toks := array_append(toks, regexp_replace(w, '[^a-z]', '', 'g'));
  end loop;
  foreach s in array strong loop
    if exists (select 1 from unnest(toks) t where position(s in t) > 0) then
      if not ('profanity' = any(cats)) then cats := array_append(cats, 'profanity'::text); why := array_append(why, 'offensive language'::text); end if;
      sev := greatest(sev, 2); blk := true;
      masked := regexp_replace(masked, regexp_replace(s, '(.)', '\1[^a-z0-9]{0,2}', 'g'), '####', 'gi');
    end if;
  end loop;
  foreach s in array mild loop
    if leet ~ ('\m' || s || '\M') then
      if not ('profanity' = any(cats)) then cats := array_append(cats, 'profanity'::text); why := array_append(why, 'offensive language'::text); end if;
      sev := greatest(sev, 1); blk := true;
      masked := regexp_replace(masked, '\m' || s || '\M', '####', 'gi');
    end if;
  end loop;

  if sev = 0 then
    return jsonb_build_object('severity','none','blocked',false,'categories','[]'::jsonb,'reasons','[]'::jsonb,'masked',src);
  end if;
  if blk and masked = src then masked := '#### (message hidden)'; end if;
  return jsonb_build_object(
    'severity', (array['none','low','medium','high','critical'])[sev + 1],
    'blocked', blk, 'categories', to_jsonb(cats), 'reasons', to_jsonb(why), 'masked', masked);
end $$;

-- ---------- who may chat right now ----------
create or replace function public.chat_gate(p_uid uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare p record; c record; r record; hr int;
begin
  select role, suspended into p from public.profiles where id = p_uid;
  if not found then return 'Sign in to send messages.'; end if;
  if p.suspended then return 'Your account is suspended.'; end if;
  if p.role = 'admin' then return null; end if;

  select * into c from public.safety_consents where profile_id = p_uid;
  if not found then return 'Finish the safety check before you send messages.'; end if;
  if c.dob is not null and age(c.dob) < interval '13 years' then
    return 'Tutoring chat is for learners aged 13 and over.';
  end if;
  if c.dob is not null and age(c.dob) < interval '18 years' and not c.guardian_knows then
    return 'A parent or guardian must confirm they know you are here before you can chat.';
  end if;

  select * into r from public.chat_restrictions where profile_id = p_uid and (until is null or until > now());
  if found then
    if r.level = 'locked' then
      return 'Your chat is paused while the PathFinder safeguarding team reviews a message. You will hear from us soon.';
    end if;
    return 'Your chat is muted until ' || to_char(r.until at time zone 'Africa/Nairobi', 'DD Mon HH24:MI') ||
           ' (Nairobi time) because a message broke the chat rules.';
  end if;

  hr := extract(hour from (now() at time zone 'Africa/Nairobi'))::int;
  if p.role = 'student' and (hr >= 21 or hr < 6) then
    return 'Chat is closed between 9 pm and 6 am. Come back in the morning.';
  end if;
  if (select count(*) from public.messages where sender_id = p_uid and created_at > now() - interval '1 minute') >= 15 then
    return 'You are sending messages too fast. Wait a minute and try again.';
  end if;
  return null;
end $$;
revoke execute on function public.chat_gate(uuid) from public, anon, authenticated;

-- ---------- the strike ladder ----------
-- low (mild language)   warning, no strike
-- medium / high         warning and a strike; 2nd strike mutes 24 h; 3rd locks the chat
-- critical (grooming)   blocked, chat locked at once, admins alerted as urgent
-- welfare (self-harm)   not blocked, no strike: the sender is pointed to help
--                       and an admin is told
create or replace function public.safety_intake(p_text text, p_booking bigint default null, p_context text default 'chat')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  gate text; sc jsonb; sev text; blk boolean; cnt boolean;
  cats text[]; why text[]; prior int; strikes int;
  lvl text; untl timestamptz; lid bigint; warn text; who text; rl text; tid uuid;
begin
  if uid is null then raise exception 'sign in required'; end if;
  gate := public.chat_gate(uid);
  if gate is not null then
    return jsonb_build_object('blocked', true, 'restricted', true, 'severity', 'none', 'warning', gate);
  end if;

  sc := public.safety_scan(left(coalesce(p_text, ''), 2000));
  sev := sc->>'severity';
  if sev = 'none' then return jsonb_build_object('blocked', false, 'severity', 'none'); end if;
  blk  := (sc->>'blocked')::boolean;
  cnt  := blk and sev <> 'low';
  cats := array(select jsonb_array_elements_text(sc->'categories'));
  why  := array(select jsonb_array_elements_text(sc->'reasons'));

  select count(*) into prior from public.safety_log
   where profile_id = uid and counted and created_at > now() - interval '30 days';
  strikes := prior + case when cnt then 1 else 0 end;

  if blk and sev = 'critical' then lvl := 'locked';
  elsif cnt and strikes >= 3 then lvl := 'locked';
  elsif cnt and strikes = 2 then lvl := 'muted'; untl := now() + interval '24 hours';
  end if;

  warn := case
    when not blk then 'If things feel heavy, please talk to a parent, a teacher you trust, or call Childline Kenya on 116 (free). A PathFinder reviewer has been told you may need support.'
    when lvl = 'locked' then 'This message was blocked and your chat is paused while our safeguarding team reviews it.'
    when lvl = 'muted' then 'Blocked again. Your chat is muted for 24 hours. A third block pauses it until a reviewer looks.'
    when sev = 'low' then 'Message blocked: please keep the language respectful.'
    else 'Message blocked: it contained ' || array_to_string(why, ', ') ||
         '. Keep chats on PathFinder - no phone numbers, social handles, links or bad language. Warning ' || strikes || ' of 3.'
  end;

  if p_booking is not null then select tutor_id into tid from public.bookings where id = p_booking; end if;
  insert into public.safety_log (profile_id, tutor_id, booking_id, context, severity, categories, reasons,
                                 excerpt, masked, counted, strikes, status)
  values (uid, tid, p_booking, coalesce(p_context, 'chat'), sev, cats, why, left(p_text, 300), sc->>'masked', cnt, strikes,
          case lvl when 'locked' then 'locked' when 'muted' then 'muted' else 'open' end)
  returning id into lid;

  if lvl is not null then
    insert into public.chat_restrictions (profile_id, level, until, reason, log_id)
    values (uid, lvl, untl, 'automatic: ' || sev, lid)
    on conflict (profile_id) do update
      set level = excluded.level, until = excluded.until, reason = excluded.reason,
          log_id = excluded.log_id, created_at = now();
  end if;

  select name, role::text into who, rl from public.profiles where id = uid;
  insert into public.notifications (profile_id, kind, sender, title, body)
  values (uid, 'safety', 'Safeguarding', case when blk then 'Message blocked' else 'You are not alone' end, warn);
  insert into public.notifications (audience, kind, sender, title, body, link)
  values ('admin', 'safety', 'Safeguarding',
          case when sev = 'critical' then 'URGENT: safeguarding flag' else 'Message flagged' end,
          coalesce(who, 'A user') || ' (' || coalesce(rl, '?') || '): ' || array_to_string(why, ', '),
          'admin-safety');

  return jsonb_build_object('blocked', blk, 'severity', sev, 'categories', cats, 'reasons', why,
    'masked', sc->>'masked', 'strikes', strikes, 'level', lvl, 'until', untl, 'warning', warn, 'log_id', lid);
end $$;
revoke execute on function public.safety_intake(text, bigint, text) from public, anon;
grant execute on function public.safety_intake(text, bigint, text) to authenticated;

-- Messages that reach the table by any route are screened here.
create or replace function public.screen_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if auth.uid() is null then return new; end if;
  if not exists (select 1 from public.bookings where id = new.booking_id and status in ('Requested','Confirmed')) then
    raise exception 'This session is closed, so its chat is closed too.' using errcode = 'P0001';
  end if;
  r := public.safety_intake(new.body, new.booking_id, 'chat');
  if coalesce((r->>'restricted')::boolean, false) then
    raise exception '%', r->>'warning' using errcode = 'P0001';
  end if;
  if (r->>'blocked')::boolean then
    new.blocked := true;
    new.body := r->>'masked';
    new.reason := left(array_to_string(array(select jsonb_array_elements_text(r->'reasons')), ', '), 120);
  end if;
  return new;
end $$;
drop trigger if exists messages_screen on public.messages;
create trigger messages_screen before insert on public.messages
  for each row execute function public.screen_message();

-- ---------- what an admin can do about a flag ----------
create or replace function public.safety_action(p_log bigint, p_action text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare l record; tgt record; st text;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select * into l from public.safety_log where id = p_log;
  if not found then raise exception 'no such flag'; end if;
  select id, name, role into tgt from public.profiles where id = l.profile_id;
  if tgt.role = 'admin' then raise exception 'admins cannot be actioned here'; end if;

  if p_action = 'dismiss' then
    st := 'dismissed';
    update public.safety_log set counted = false where id = p_log;
    delete from public.chat_restrictions where log_id = p_log;
  elsif p_action = 'warn' then
    st := 'warned';
    insert into public.notifications (profile_id, kind, sender, title, body)
    values (l.profile_id, 'safety', 'Safeguarding team', 'A warning from PathFinder',
      coalesce(nullif(trim(p_note), ''), 'A reviewer looked at a message you sent and it broke our chat rules. Please keep chats on PathFinder and be respectful.'));
  elsif p_action in ('mute', 'lock') then
    st := case p_action when 'mute' then 'muted' else 'locked' end;
    insert into public.chat_restrictions (profile_id, level, until, reason, log_id, set_by)
    values (l.profile_id, st, case p_action when 'mute' then now() + interval '24 hours' end, 'admin', p_log, auth.uid())
    on conflict (profile_id) do update
      set level = excluded.level, until = excluded.until, reason = excluded.reason,
          log_id = excluded.log_id, set_by = excluded.set_by, created_at = now();
  elsif p_action = 'unlock' then
    st := 'warned';
    delete from public.chat_restrictions where profile_id = l.profile_id;
  elsif p_action = 'suspend' then
    st := 'suspended';
    update public.profiles set suspended = true where id = l.profile_id;
    update public.tutor_profiles set suspended = true, suspended_at = now() where profile_id = l.profile_id;
  else
    raise exception 'unknown action';
  end if;

  update public.safety_log set status = st, actioned_by = auth.uid(), actioned_at = now(), action_note = p_note where id = p_log;
  insert into public.admin_actions (action, target, tone)
  values ('Safeguarding: ' || p_action, coalesce(tgt.name, 'unknown') || ' · flag #' || p_log,
          case p_action when 'dismiss' then 'green' when 'warn' then 'sky' else 'rose' end);
end $$;
revoke execute on function public.safety_action(bigint, text, text) from public, anon;
grant execute on function public.safety_action(bigint, text, text) to authenticated;

-- Blocked messages are only visible to the sender (and admins), never the recipient.
drop policy if exists "message read" on public.messages;
create policy "message read" on public.messages for select using (
  public.is_admin()
  or (booking_id in (select id from public.bookings b
        where b.learner_id = auth.uid()
           or b.tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()))
      and (not blocked or sender_id = auth.uid())));

-- =====================================================================
-- Tutor directory and retention
-- =====================================================================
-- Learners may list tutors an admin has verified, and nothing else about them:
-- no email, no profile id, no documents. The view runs with its owner's rights
-- so it can read names; only verified, unsuspended tutors come out.
create or replace view public.tutor_directory as
  select t.id, p.name, t.subjects, t.area, t.mode, t.rate_kes, t.bio,
         coalesce((select jsonb_agg(jsonb_build_object('day', a.day, 'band', a.band))
                     from public.availability a where a.tutor_id = t.id and a.open), '[]'::jsonb) as slots
    from public.tutor_profiles t
    join public.profiles p on p.id = t.profile_id
   where t.suspended = false and not p.suspended
     and t.check_tsc and t.check_id and t.check_conduct and t.check_safe
     and t.verified_at is not null;
revoke all on public.tutor_directory from public, anon;
grant select on public.tutor_directory to authenticated;

-- Retention: resolved flags after 12 months, lapsed mutes, old read notifications.
-- Open or still-restricted cases are never touched.
create or replace function public.purge_old_safeguarding() returns jsonb
language plpgsql security definer set search_path = public as $$
declare f int; r int; n int;
begin
  delete from public.safety_log
   where created_at < now() - interval '12 months'
     and status in ('dismissed', 'warned')
     and not exists (select 1 from public.chat_restrictions c where c.log_id = safety_log.id);
  get diagnostics f = row_count;
  delete from public.chat_restrictions where level = 'muted' and until is not null and until < now() - interval '7 days';
  get diagnostics r = row_count;
  delete from public.notifications where read_at is not null and created_at < now() - interval '6 months';
  get diagnostics n = row_count;
  return jsonb_build_object('flags', f, 'restrictions', r, 'notifications', n);
end $$;
revoke execute on function public.purge_old_safeguarding() from public, anon, authenticated;

-- Nightly at 02:00 UTC when pg_cron is available; otherwise run
-- select public.purge_old_safeguarding(); by hand each month.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('pathfinder-purge', '0 2 * * *', 'select public.purge_old_safeguarding()');
exception when others then
  raise notice 'pg_cron not available (%). Run purge_old_safeguarding() by hand.', sqlerrm;
end $$;

