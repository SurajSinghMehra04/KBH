// ============================================================
//  KON BANEGA HERO — js/config.js
//  Replace the two values below with your Supabase project keys.
//  Get them from: https://supabase.com → Project Settings → API
// ============================================================

const SUPABASE_URL  = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';

// Anthropic proxy endpoint — set this to your Netlify / Vercel function URL
// Leave as-is if you are using the built-in Claude API (see README).
const CLAUDE_ENDPOINT = '/api/generate-questions';

// Points awarded per difficulty
const POINTS_MAP = { easy: 1, moderate: 2, hard: 3 };

// Lottery qualification threshold (active days)
const LOTTERY_DAYS_NEEDED = 180;

// Evolution tiers  [label, emoji, minPoints, nextPoints]
const EVO_TIERS = [
  { name: 'Novice',       emoji: '🐣', minPts: 0,    nextPts: 50   },
  { name: 'Learner',      emoji: '📚', minPts: 50,   nextPts: 150  },
  { name: 'Seeker',       emoji: '🔍', minPts: 150,  nextPts: 300  },
  { name: 'Warrior',      emoji: '⚔️', minPts: 300,  nextPts: 500  },
  { name: 'Champion',     emoji: '🛡️', minPts: 500,  nextPts: 750  },
  { name: 'Master',       emoji: '🧠', minPts: 750,  nextPts: 1000 },
  { name: 'Grandmaster',  emoji: '👑', minPts: 1000, nextPts: 1500 },
  { name: 'Legend',       emoji: '🌟', minPts: 1500, nextPts: 2000 },
  { name: 'Mythic',       emoji: '🔱', minPts: 2000, nextPts: 3000 },
  { name: 'HERO',         emoji: '🦸', minPts: 3000, nextPts: Infinity },
];

const LABELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };
const SKINS  = ['#FFDBB4', '#D4956A', '#8B5E3C', '#4A2C17'];
const HAIR_COLORS = ['#2c1810', '#1a0a00', '#0a0a0a', '#c8a000'];
const AURAS  = { purple: '#7c6cff', blue: '#378ADD', green: '#3ddcae', red: '#ff5e7d' };
