// ============================================================
//  KON BANEGA HERO — js/db.js
//  Supabase database layer.
//  Falls back to localStorage when Supabase is not configured.
// ============================================================

let _supabase = null;
let _useLocalFallback = false;

function initDB() {
  try {
    if (
      SUPABASE_URL.includes('YOUR_PROJECT') ||
      SUPABASE_ANON.includes('YOUR_ANON')
    ) {
      console.warn('[KBH] Supabase not configured — using localStorage fallback.');
      _useLocalFallback = true;
      return;
    }
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.info('[KBH] Supabase connected.');
  } catch (e) {
    console.warn('[KBH] Supabase init failed — using localStorage fallback.', e);
    _useLocalFallback = true;
  }
}

// ── AUTH ──────────────────────────────────────────────────
async function dbSignUp(email, password, firstName, lastName) {
  if (_useLocalFallback) return _localSignUp(email, password, firstName, lastName);

  const { data, error } = await _supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  });
  if (error) throw error;

  // Insert profile row
  await _supabase.from('profiles').upsert({
    id: data.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    pts: 0,
    streak: 0,
    login_days: [],
    avatar: { skin: 0, hair: 0, aura: 'purple', heroName: firstName },
    history: [],
  });

  return data.user;
}

async function dbSignIn(email, password) {
  if (_useLocalFallback) return _localSignIn(email, password);

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

async function dbSignOut() {
  if (_useLocalFallback) { localStorage.removeItem('kbh_session'); return; }
  await _supabase.auth.signOut();
}

async function dbGetSession() {
  if (_useLocalFallback) {
    const s = localStorage.getItem('kbh_session');
    return s ? _localGetUser(s) : null;
  }
  const { data } = await _supabase.auth.getSession();
  return data.session?.user ?? null;
}

// ── PROFILE ───────────────────────────────────────────────
async function dbGetProfile(userId) {
  if (_useLocalFallback) return _localGetUser(userId);

  const { data, error } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdateProfile(userId, updates) {
  if (_useLocalFallback) return _localUpdateUser(userId, updates);

  const { error } = await _supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
}

// ── QUIZ HISTORY ──────────────────────────────────────────
async function dbSaveQuizResult(userId, result) {
  // result: { section, score, pts, date }
  if (_useLocalFallback) {
    const user = _localGetUser(userId);
    if (!user) return;
    user.history = [result, ...(user.history || [])].slice(0, 30);
    user.pts = (user.pts || 0) + result.pts;
    _localSaveUser(user);
    return;
  }

  // 1. Insert into quiz_results table
  await _supabase.from('quiz_results').insert({
    user_id: userId,
    section: result.section,
    score: result.score,
    pts: result.pts,
    created_at: new Date().toISOString(),
  });

  // 2. Increment pts on profile (use rpc for atomicity)
  await _supabase.rpc('increment_pts', { uid: userId, amount: result.pts });
}

async function dbGetHistory(userId, limit = 10) {
  if (_useLocalFallback) {
    const user = _localGetUser(userId);
    return (user?.history || []).slice(0, limit);
  }

  const { data } = await _supabase
    .from('quiz_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── LEADERBOARD ───────────────────────────────────────────
async function dbGetLeaderboard(limit = 10) {
  if (_useLocalFallback) {
    const users = JSON.parse(localStorage.getItem('kbh_users') || '{}');
    return Object.values(users)
      .sort((a, b) => (b.pts || 0) - (a.pts || 0))
      .slice(0, limit);
  }

  const { data } = await _supabase
    .from('profiles')
    .select('id, first_name, last_name, pts, streak, login_days, avatar')
    .order('pts', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── ACTIVE-DAY TRACKING ───────────────────────────────────
async function dbRecordActiveDay(userId) {
  const today = new Date().toDateString();

  if (_useLocalFallback) {
    const user = _localGetUser(userId);
    if (!user) return;
    if (!user.loginDays) user.loginDays = [];
    if (!user.loginDays.includes(today)) {
      user.loginDays.push(today);
      user.streak = _calcStreak(user.loginDays);
    }
    user.lastLogin = today;
    _localSaveUser(user);
    return user;
  }

  const profile = await dbGetProfile(userId);
  const loginDays = profile.login_days || [];
  if (!loginDays.includes(today)) {
    loginDays.push(today);
    const streak = _calcStreak(loginDays);
    await dbUpdateProfile(userId, { login_days: loginDays, streak, last_login: today });
    profile.login_days = loginDays;
    profile.streak = streak;
  }
  return profile;
}

function _calcStreak(loginDays) {
  if (!loginDays || loginDays.length === 0) return 0;
  const days = loginDays.map(d => new Date(d)).sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (days[i - 1] - days[i]) / 86400000;
    if (diff <= 1.5) streak++;
    else break;
  }
  return streak;
}

// ── AVATAR ────────────────────────────────────────────────
async function dbSaveAvatar(userId, avatar) {
  if (_useLocalFallback) {
    const user = _localGetUser(userId);
    if (!user) return;
    user.avatar = avatar;
    _localSaveUser(user);
    return;
  }
  await dbUpdateProfile(userId, { avatar });
}

// ── LOCAL STORAGE FALLBACK ────────────────────────────────
function _localSignUp(email, password, firstName, lastName) {
  const users = JSON.parse(localStorage.getItem('kbh_users') || '{}');
  if (users[email]) throw new Error('Account already exists. Please log in.');
  const user = {
    id: email,
    email,
    first_name: firstName,
    last_name: lastName,
    pts: 0,
    streak: 0,
    loginDays: [],
    lastLogin: null,
    avatar: { skin: 0, hair: 0, aura: 'purple', heroName: firstName },
    history: [],
    pass: password,
  };
  users[email] = user;
  localStorage.setItem('kbh_users', JSON.stringify(users));
  localStorage.setItem('kbh_session', email);
  return user;
}

function _localSignIn(email, password) {
  const users = JSON.parse(localStorage.getItem('kbh_users') || '{}');
  const user = users[email];
  if (!user) throw new Error('No account found. Please sign up.');
  if (user.pass !== password) throw new Error('Incorrect password.');
  localStorage.setItem('kbh_session', email);
  return user;
}

function _localGetUser(id) {
  const users = JSON.parse(localStorage.getItem('kbh_users') || '{}');
  return users[id] || null;
}

function _localUpdateUser(id, updates) {
  const users = JSON.parse(localStorage.getItem('kbh_users') || '{}');
  if (!users[id]) return;
  users[id] = { ...users[id], ...updates };
  localStorage.setItem('kbh_users', JSON.stringify(users));
}

function _localSaveUser(user) {
  const users = JSON.parse(localStorage.getItem('kbh_users') || '{}');
  users[user.id || user.email] = user;
  localStorage.setItem('kbh_users', JSON.stringify(users));
}
