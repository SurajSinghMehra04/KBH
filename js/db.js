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
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    console.info('[KBH] Supabase connected.');
  } catch (e) {
    console.warn('[KBH] Supabase init failed — using localStorage fallback.', e);
    _useLocalFallback = true;
  }
}

// ── AUTH ──────────────────────────────────────────────────
async function dbSignUp(email, password, firstName, lastName) {
  if (_useLocalFallback) return _localSignUp(email, password, firstName, lastName);

  // Step 1: Create auth user
  const { data, error } = await _supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      // Skip email confirmation redirect
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) throw new Error(_friendlyError(error.message));
  if (!data.user) throw new Error('Signup failed. Please try again.');

  // Step 2: Upsert profile — retry up to 3x because session
  // may need a moment to propagate after signUp
  const profileData = {
    id:         data.user.id,
    email,
    first_name: firstName,
    last_name:  lastName,
    pts:        0,
    streak:     0,
    login_days: [],
    avatar:     { skin: 0, hair: 0, aura: 'purple', heroName: firstName },
  };

  let profileError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await _sleep(600 * attempt);
    const { error: pe } = await _supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });
    if (!pe) { profileError = null; break; }
    profileError = pe;
    console.warn(`[KBH] Profile upsert attempt ${attempt + 1} failed:`, pe.message);
  }

  // Non-fatal: profile may already exist via DB trigger
  if (profileError) {
    console.warn('[KBH] Profile upsert failed (may be OK if trigger exists):', profileError.message);
  }

  return data.user;
}

async function dbSignIn(email, password) {
  if (_useLocalFallback) return _localSignIn(email, password);

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(_friendlyError(error.message));
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

  // Try fetching — if profile doesn't exist yet, create it
  const { data, error } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();            // returns null instead of error when not found

  if (error) throw error;

  // Profile missing (trigger didn't fire) — create a minimal one
  if (!data) {
    const { data: authUser } = await _supabase.auth.getUser();
    const meta = authUser?.user?.user_metadata || {};
    const newProfile = {
      id:         userId,
      email:      authUser?.user?.email || '',
      first_name: meta.first_name || 'Hero',
      last_name:  meta.last_name  || '',
      pts:        0,
      streak:     0,
      login_days: [],
      avatar:     { skin: 0, hair: 0, aura: 'purple', heroName: meta.first_name || 'Hero' },
    };
    const { data: created, error: ce } = await _supabase
      .from('profiles')
      .upsert(newProfile, { onConflict: 'id' })
      .select()
      .single();
    if (ce) throw ce;
    return created;
  }

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
  if (_useLocalFallback) {
    const user = _localGetUser(userId);
    if (!user) return;
    user.history = [result, ...(user.history || [])].slice(0, 30);
    user.pts = (user.pts || 0) + result.pts;
    _localSaveUser(user);
    return;
  }

  // Insert quiz result
  const { error: re } = await _supabase.from('quiz_results').insert({
    user_id:    userId,
    section:    result.section,
    score:      result.score,
    pts:        result.pts,
    created_at: new Date().toISOString(),
  });
  if (re) console.warn('[KBH] Could not save quiz result:', re.message);

  // Increment pts atomically via RPC
  const { error: pe } = await _supabase.rpc('increment_pts', {
    uid: userId, amount: result.pts
  });
  if (pe) {
    // RPC might not exist yet — fallback to direct update
    console.warn('[KBH] RPC failed, falling back to direct update:', pe.message);
    const { data: prof } = await _supabase
      .from('profiles').select('pts').eq('id', userId).single();
    await _supabase.from('profiles')
      .update({ pts: (prof?.pts || 0) + result.pts })
      .eq('id', userId);
  }
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

  try {
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
  } catch (e) {
    console.warn('[KBH] Could not record active day:', e.message);
    return null;
  }
}

function _calcStreak(loginDays) {
  if (!loginDays?.length) return 0;
  const days = loginDays.map(d => new Date(d)).sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if ((days[i - 1] - days[i]) / 86400000 <= 1.5) streak++;
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

// ── HELPERS ───────────────────────────────────────────────
function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function _friendlyError(msg = '') {
  if (msg.includes('rate limit'))        return 'Too many attempts. Please wait a minute and try again.';
  if (msg.includes('already registered')) return 'This email is already registered. Please sign in instead.';
  if (msg.includes('Invalid login'))     return 'Incorrect email or password.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email first, or disable email confirmation in Supabase.';
  if (msg.includes('network'))           return 'Network error. Please check your connection.';
  return msg;
}

// ── LOCAL STORAGE FALLBACK ────────────────────────────────
function _localSignUp(email, password, firstName, lastName) {
  const users = JSON.parse(localStorage.getItem('kbh_users') || '{}');
  if (users[email]) throw new Error('Account already exists. Please log in.');
  const user = {
    id: email, email,
    first_name: firstName, last_name: lastName,
    pts: 0, streak: 0,
    loginDays: [], lastLogin: null,
    avatar: { skin: 0, hair: 0, aura: 'purple', heroName: firstName },
    history: [], pass: password,
  };
  users[email] = user;
  localStorage.setItem('kbh_users', JSON.stringify(users));
  localStorage.setItem('kbh_session', email);
  return user;
}

function _localSignIn(email, password) {
  const users = JSON.parse(localStorage.getItem('kbh_users') || '{}');
  const user  = users[email];
  if (!user)              throw new Error('No account found. Please sign up.');
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

// ── HOME STATS ────────────────────────────────────────────
async function dbGetHomeStats() {
  if (_useLocalFallback) {
    // Derive from localStorage for offline/dev mode
    const users = JSON.parse(localStorage.getItem('kbh_users') || '{}');
    const allUsers = Object.values(users);
    const today = new Date().toDateString();

    // Count questions answered today across all users
    let questionsToday = 0;
    allUsers.forEach(u => {
      (u.history || []).forEach(h => {
        if (h.date === new Date().toLocaleDateString('en-IN')) questionsToday++;
      });
    });

    // Days to next lottery
    const now = new Date();
    const year = now.getFullYear();
    const candidates = [
      new Date(year,     0, 1),   // Jan 1 this year
      new Date(year,     6, 1),   // Jul 1 this year
      new Date(year + 1, 0, 1),   // Jan 1 next year
      new Date(year + 1, 6, 1),   // Jul 1 next year
    ].filter(d => d > now).sort((a, b) => a - b);
    const daysToLottery = candidates.length
      ? Math.ceil((candidates[0] - now) / 86400000)
      : 180;

    return {
      active_heroes:   allUsers.length,
      questions_today: questionsToday,
      days_to_lottery: daysToLottery,
    };
  }

  // Supabase RPC
  const { data, error } = await _supabase.rpc('get_home_stats');
  if (error) throw error;
  return data;
}
