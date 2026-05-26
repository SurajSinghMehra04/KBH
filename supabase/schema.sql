-- ============================================================
--  KON BANEGA HERO — supabase/schema.sql
--  Run this in Supabase → SQL Editor to set up your database.
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text unique not null,
  first_name   text        default 'Hero',
  last_name    text        default '',
  pts          integer     default 0,
  streak       integer     default 0,
  login_days   text[]      default '{}',
  last_login   text,
  avatar       jsonb       default '{"skin":0,"hair":0,"aura":"purple","heroName":"Hero"}',
  created_at   timestamptz default now()
);

-- ── Quiz results ──────────────────────────────────────────
create table if not exists quiz_results (
  id         bigserial   primary key,
  user_id    uuid        references profiles(id) on delete cascade,
  section    text        not null check (section in ('easy','moderate','hard')),
  score      text        not null,
  pts        integer     not null check (pts >= 0),
  created_at timestamptz default now()
);

-- Index for fast user history lookup
create index if not exists quiz_results_user_id_idx on quiz_results(user_id);

-- ── Atomic points increment ───────────────────────────────
create or replace function increment_pts(uid uuid, amount integer)
returns void
language sql
security definer
as $$
  update profiles set pts = pts + amount where id = uid;
$$;

-- ── Row Level Security ────────────────────────────────────
alter table profiles     enable row level security;
alter table quiz_results enable row level security;

-- Profiles: anyone can read (for leaderboard), only owner can write
create policy "Public read profiles"
  on profiles for select using (true);

create policy "Owner can update profile"
  on profiles for update using (auth.uid() = id);

create policy "Owner can insert profile"
  on profiles for insert with check (auth.uid() = id);

-- Quiz results: anyone can read (leaderboard stats), only owner inserts
create policy "Public read quiz results"
  on quiz_results for select using (true);

create policy "Owner can insert results"
  on quiz_results for insert with check (auth.uid() = user_id);

-- ── Auto-create profile on signup ─────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'Hero'),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger: fires after new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
