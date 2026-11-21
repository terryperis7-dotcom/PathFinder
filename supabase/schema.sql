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
  profile_id uuid not null references public.profiles on delete cascade,
  subject    text not null,
  grade      text not null,
  primary key (profile_id, subject)
);

create table if not exists public.quiz_answers (
  profile_id uuid not null references public.profiles on delete cascade,
  question   smallint not null check (question between 0 and 5),
  choice     smallint not null check (choice between 0 and 3),
  primary key (profile_id, question)
);

create table if not exists public.pathway_matches (
  profile_id uuid not null references public.profiles on delete cascade,
  pathway_id text not null,
  match_pct  smallint not null,
  weighted   numeric(4,1) not null,
  computed_at timestamptz not null default now(),
  primary key (profile_id, pathway_id)
);

create table if not exists public.assessments (
  id         bigserial primary key,
  profile_id uuid not null references public.profiles on delete cascade,
  subject    text not null,
  score      smallint not null check (score between 0 and 100),
  taken_on   date not null default current_date,
  target     text,
  created_at timestamptz not null default now()
);

create table if not exists public.shortlists (
  profile_id    uuid not null references public.profiles on delete cascade,
  institution_id text not null,
  created_at    timestamptz not null default now(),
  primary key (profile_id, institution_id)
);

-- ---------- tutor sessions ----------
create table if not exists public.bookings (
  id          bigserial primary key,
  learner_id  uuid not null references public.profiles on delete cascade,
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
  sender_id  uuid not null references public.profiles on delete cascade,
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
  reporter_id uuid references public.profiles on delete set null,
  reason      text not null,
  details     text,
  status      text not null default 'open' check (status in ('open','suspended','dismissed')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

create table if not exists public.safety_log (
  id         bigserial primary key,
  profile_id uuid references public.profiles on delete set null,
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
  window  text,
  url     text not null check (url like 'https://%')
);

create table if not exists public.counties (id bigserial primary key, name text not null unique);
create table if not exists public.clusters (id bigserial primary key, name text not null, subject_slots jsonb not null);
create table if not exists public.funding_bands (id bigserial primary key, band int not null, tagline text, split text, detail text);
create table if not exists public.pathways (id text primary key, name text not null, target_points int, interest_weights jsonb);

-- ---------- helpers ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
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
  profile_id  uuid not null references public.profiles on delete cascade,
  subject     text not null,
  target_grade text not null,
  updated_at  timestamptz not null default now(),
  primary key (profile_id, subject)
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings on delete cascade,
  learner_id  uuid not null references public.profiles on delete cascade,
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
  profile_id  uuid references public.profiles on delete set null,
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
  report_id   uuid references public.reports on delete set null,
  reason      text,
  active      boolean not null default true,
  created_by  uuid references public.profiles,
  created_at  timestamptz not null default now(),
  lifted_at   timestamptz
);

-- ---------- completed sessions (the tutor's ledger) ----------
create table if not exists public.session_log (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings on delete cascade,
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
  actor_id    uuid not null references public.profiles on delete cascade,
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
create policy "profile self write"  on public.profiles for update using (id = auth.uid());
create policy "profile self insert" on public.profiles for insert with check (id = auth.uid());

-- tutor profile: public directory read of non-suspended tutors, owner writes
create policy "tutor read" on public.tutor_profiles for select
  using (suspended = false or profile_id = auth.uid() or public.is_admin());
create policy "tutor self write" on public.tutor_profiles for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
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
         or tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()));

-- messages: only the two parties on that booking
create policy "message read" on public.messages for select using (
  booking_id in (select id from public.bookings b
                 where b.learner_id = auth.uid()
                    or b.tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()))
  or public.is_admin());
create policy "message create" on public.messages for insert with check (sender_id = auth.uid());

create policy "availability read"  on public.availability for select using (true);
create policy "availability write" on public.availability for all
  using (tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()));

-- safety: a learner may file a report, only admins read the queue
create policy "report create" on public.reports for insert with check (reporter_id = auth.uid());
create policy "report admin"  on public.reports for select using (public.is_admin() or reporter_id = auth.uid());
create policy "report admin write" on public.reports for update using (public.is_admin());
create policy "safety log admin" on public.safety_log for all using (public.is_admin());
create policy "safety log append" on public.safety_log for insert with check (profile_id = auth.uid());

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
  or (profile_id is null and audience = (select role from public.profiles where id = auth.uid()))
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
create policy "review write" on public.reviews for insert with check (learner_id = auth.uid());
create policy "review update" on public.reviews for update using (learner_id = auth.uid());
create policy "review admin" on public.reviews for all using (public.is_admin());

-- verification: the tutor may read their own state and file evidence; only an
-- admin may record a check
create policy "verify read own" on public.verify_checks for select using (
  tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()) or public.is_admin()
);
create policy "verify admin" on public.verify_checks for all using (public.is_admin());
create policy "verify sub own" on public.verify_submissions for all
  using (tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()) or public.is_admin())
  with check (tutor_id in (select id from public.tutor_profiles where profile_id = auth.uid()));
create policy "verify sub read admin" on public.verify_submissions for select using (public.is_admin());

-- applications: the applicant sees their own row, admins see the queue
create policy "application own" on public.tutor_applications for select using (profile_id = auth.uid() or public.is_admin());
create policy "application create" on public.tutor_applications for insert with check (profile_id = auth.uid());
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
language plpgsql security definer as $$
begin
  if new.status is distinct from old.status and new.status in ('Confirmed','Declined','Completed') then
    insert into public.notifications (profile_id, kind, sender, title, body, link)
    values (
      new.learner_id, 'request', 'Administrator · decisions',
      case new.status
        when 'Confirmed' then 'Match approved'
        when 'Declined'  then 'Request declined'
        else 'Session completed'
      end,
      coalesce(new.subject, 'Session') || ' · ' || coalesce(new.slot, '') || ' is ' || lower(new.status) || '.',
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
language plpgsql security definer as $$
begin
  insert into public.notifications (audience, kind, sender, title, body, link)
  values ('admin', 'safety', 'Learner report', 'New safety report', coalesce(new.reason, 'Reported'), 'admin-safety');
  return new;
end $$;

drop trigger if exists report_notify on public.reports;
create trigger report_notify
  after insert on public.reports
  for each row execute function public.notify_new_report();

-- ---------- promote your admin ----------
-- update public.profiles set role = 'admin' where email = 'you@example.com';
