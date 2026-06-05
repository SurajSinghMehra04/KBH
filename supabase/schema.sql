-- ============================================================
--  KON BANEGA HERO — supabase/schema.sql
--  Run this ENTIRE script in Supabase → SQL Editor
-- ============================================================

-- ── 1. Profiles table ─────────────────────────────────────
create table if not exists profiles (
  id           uuid        primary key references auth.users on delete cascade,
  email        text        unique not null,
  first_name   text        default 'Hero',
  last_name    text        default '',
  pts          integer     default 0,
  streak       integer     default 0,
  login_days   text[]      default '{}',
  last_login   text,
  avatar       jsonb       default '{"skin":0,"hair":0,"aura":"purple","heroName":"Hero"}',
  created_at   timestamptz default now()
);

-- ── 2. Quiz results table ─────────────────────────────────
create table if not exists quiz_results (
  id         bigserial   primary key,
  user_id    uuid        references profiles(id) on delete cascade,
  section    text        not null,
  score      text        not null,
  pts        integer     not null default 0,
  created_at timestamptz default now()
);

create index if not exists quiz_results_user_id_idx on quiz_results(user_id);
create index if not exists quiz_results_created_at_idx on quiz_results(created_at desc);

-- ── 3. Atomic points increment ────────────────────────────
create or replace function increment_pts(uid uuid, amount integer)
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set pts = pts + amount where id = uid;
$$;

-- ── 4. Row Level Security ─────────────────────────────────
alter table profiles     enable row level security;
alter table quiz_results enable row level security;

-- Drop existing policies before recreating
drop policy if exists "Public read profiles"       on profiles;
drop policy if exists "Owner can update profile"   on profiles;
drop policy if exists "Owner can insert profile"   on profiles;
drop policy if exists "Service can insert profile" on profiles;
drop policy if exists "Public read quiz results"   on quiz_results;
drop policy if exists "Owner can insert results"   on quiz_results;

-- PROFILES policies
-- Anyone can read profiles (needed for leaderboard)
create policy "Public read profiles"
  on profiles for select
  using (true);

-- Authenticated users can insert their OWN profile
create policy "Owner can insert profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Authenticated users can update their OWN profile
create policy "Owner can update profile"
  on profiles for update
  using (auth.uid() = id);

-- QUIZ RESULTS policies
-- Anyone can read results (leaderboard stats)
create policy "Public read quiz results"
  on quiz_results for select
  using (true);

-- Users can only insert their own results
create policy "Owner can insert results"
  on quiz_results for insert
  with check (auth.uid() = user_id);

-- ── 5. Auto-create profile trigger ───────────────────────
-- This fires when a new user signs up via Supabase Auth
-- Acts as a safety net if the client-side insert fails
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'Hero'),
    coalesce(new.raw_user_meta_data->>'last_name',  '')
  )
  on conflict (id) do nothing;   -- safe to run multiple times
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Done ─────────────────────────────────────────────────
-- After running this:
-- 1. Go to Authentication → Providers → Email → turn OFF "Confirm email"
-- 2. Save
-- Now signups will work without email verification

-- ── 6. Live homepage stats function ──────────────────────
-- Returns: total registered users, questions answered today,
--          and days remaining until the next lottery draw.
-- Call via: supabase.rpc('get_home_stats')

create or replace function get_home_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_users      bigint;
  v_questions_today  bigint;
  v_days_to_lottery  integer;
  v_today            date := current_date;
  v_next_lottery     date;
begin
  -- Total registered users (profiles count)
  select count(*) into v_total_users from profiles;

  -- Quiz attempts submitted today
  select count(*) into v_questions_today
  from quiz_results
  where created_at::date = v_today;

  -- Next lottery: 1 Jan or 1 Jul, whichever is closer in the future
  declare
    v_next_jan date := make_date(extract(year from v_today)::int,     1, 1);
    v_next_jul date := make_date(extract(year from v_today)::int,     7, 1);
    v_jan_next date := make_date(extract(year from v_today)::int + 1, 1, 1);
    v_jul_next date := make_date(extract(year from v_today)::int + 1, 7, 1);
  begin
    -- Advance past dates to next occurrence
    if v_next_jan <= v_today then v_next_jan := v_jan_next; end if;
    if v_next_jul <= v_today then v_next_jul := v_jul_next; end if;

    v_next_lottery := least(v_next_jan, v_next_jul);
  end;

  v_days_to_lottery := (v_next_lottery - v_today)::integer;

  return json_build_object(
    'active_heroes',      v_total_users,
    'questions_today',    v_questions_today,
    'days_to_lottery',    v_days_to_lottery,
    'next_lottery_date',  v_next_lottery::text
  );
end;
$$;

-- Grant execute to anon (public homepage, no auth needed)
grant execute on function get_home_stats() to anon;
grant execute on function get_home_stats() to authenticated;
