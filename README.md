# 🦸 Kon Banega Hero — Quiz Championship

A modern, engaging quiz web app for students up to Class 10. Features AI-generated questions, avatar evolution, a live leaderboard, and a bi-annual lottery system for consistent users.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🤖 AI Questions | 15 fresh questions per session via Claude API |
| 🎯 3 Difficulty Levels | Easy (Class 1–5), Moderate (6–8), Hard (9–10) |
| ⭐ Points System | 1 / 2 / 3 pts per correct answer by level |
| 🦸 Avatar Evolution | 10 tiers from Novice → HERO, evolves with points |
| 🔥 Streak Tracking | Daily login streaks tracked and displayed |
| 🎰 Lottery System | Qualify after 180 active days; draws in Jan & Jul |
| 🚨 Tab-Switch Guard | Quiz locks if user switches tabs |
| 🏆 Leaderboard | Live ranking of all users by total points |
| 💾 Supabase DB | Full cloud persistence (falls back to localStorage) |

---

## 🚀 Quick Deploy (Netlify — Recommended)

### 1. Fork / Clone
```bash
git clone https://github.com/YOUR_USERNAME/kon-banega-hero.git
cd kon-banega-hero
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Copy your **Project URL** and **anon public key** from  
   `Project Settings → API`
3. Open `js/config.js` and paste them:

```js
const SUPABASE_URL  = 'https://xxxx.supabase.co';
const SUPABASE_ANON = 'your-anon-key-here';
```

4. Run the SQL schema below in `Supabase → SQL Editor`

### 3. Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir .
```

Or drag-and-drop your project folder at [app.netlify.com](https://app.netlify.com).

---

## 🗄️ Supabase Database Schema

Run this in your Supabase **SQL Editor** (`supabase/schema.sql` is also included):

```sql
-- Profiles table
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text unique not null,
  first_name   text,
  last_name    text,
  pts          integer default 0,
  streak       integer default 0,
  login_days   text[]  default '{}',
  last_login   text,
  avatar       jsonb   default '{"skin":0,"hair":0,"aura":"purple","heroName":"Hero"}',
  created_at   timestamptz default now()
);

-- Quiz results table
create table quiz_results (
  id         bigserial primary key,
  user_id    uuid references profiles(id) on delete cascade,
  section    text not null,
  score      text not null,
  pts        integer not null,
  created_at timestamptz default now()
);

-- Atomic points increment function
create or replace function increment_pts(uid uuid, amount integer)
returns void language sql as $$
  update profiles set pts = pts + amount where id = uid;
$$;

-- Row Level Security
alter table profiles    enable row level security;
alter table quiz_results enable row level security;

create policy "Users can view all profiles"    on profiles    for select using (true);
create policy "Users manage own profile"       on profiles    for all    using (auth.uid() = id);
create policy "Users view all results"         on quiz_results for select using (true);
create policy "Users insert own results"       on quiz_results for insert with check (auth.uid() = user_id);
```

---

## 📁 Project Structure

```
kon-banega-hero/
├── index.html          ← Main app (single page)
├── css/
│   └── styles.css      ← All styles, fully responsive
├── js/
│   ├── config.js       ← 🔑 Put your keys here
│   ├── db.js           ← Supabase + localStorage fallback
│   ├── avatar.js       ← SVG avatar drawing & evolution
│   ├── quiz.js         ← Quiz engine, timer, tab guard
│   ├── ui.js           ← Nav, dashboard, leaderboard
│   └── app.js          ← Boot, auth, session restore
├── supabase/
│   └── schema.sql      ← Database schema
├── _redirects          ← Netlify SPA routing
├── netlify.toml        ← Netlify config
├── .gitignore
└── README.md
```

---

## 🔑 Environment Variables (Optional — for server-side API key)

If you want to hide the Claude API key, create a Netlify Function:

1. Create `/netlify/functions/generate-questions.js`
2. Set `ANTHROPIC_API_KEY` in Netlify → Site settings → Environment variables
3. Update `CLAUDE_ENDPOINT` in `js/config.js` to `/api/generate-questions`

See `netlify/functions/generate-questions.js` for the ready-made function.

---

## 🎰 Lottery Rules

- Users must log in and complete at least one quiz per day
- After **180 active days** they are marked as qualified
- Two prize draws per year: **January** and **July**
- Qualification resets after each draw

---

## 🧩 Adding Real Money / Prizes

For actual prize distribution, integrate a payment/voucher API  
(e.g. Razorpay Payout, Amazon Gift Cards API) triggered by your backend  
when lottery winners are selected.

---

## 📄 License

MIT — free to use, modify, and deploy.
