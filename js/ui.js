// ============================================================
//  KON BANEGA HERO — js/ui.js
//  All UI rendering helpers: nav, screens, modals, toast
// ============================================================

// ── Screen routing ────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${id}`);
  if (el) el.classList.add('active');

  if (id !== 'quiz') window.quizActive = false;
  if (id === 'dashboard')   renderDashboard();
  if (id === 'leaderboard') renderLeaderboard();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Navbar ────────────────────────────────────────────────
function updateNav() {
  const nr = document.getElementById('nav-right');
  if (!currentUser) {
    nr.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="openAuthModal('login')">Log in</button>
      <button class="btn btn-primary btn-sm" onclick="openAuthModal('signup')">Sign up free</button>`;
    document.getElementById('dash-btn').style.display = 'none';
    return;
  }

  const name  = currentUser.first_name || currentUser.name?.split(' ')[0] || 'Hero';
  const avHtml = miniAvatarHTML(currentUser, 30);
  nr.innerHTML = `
    ${avHtml}
    <div class="user-badge"><span>${name}</span></div>
    <div class="points-pill">⭐ ${currentUser.pts || 0}</div>
    <button class="btn btn-ghost btn-sm" onclick="showScreen('dashboard')">Dashboard</button>
    <button class="btn btn-danger btn-sm"  onclick="doLogout()">Logout</button>`;
  document.getElementById('dash-btn').style.display = 'inline-flex';
}

// ── Auth modal ────────────────────────────────────────────
let _authMode = 'login';

function openAuthModal(mode) {
  _authMode = mode;
  _refreshAuthModal();
  document.getElementById('auth-modal').classList.add('show');
  setTimeout(() => document.getElementById('email').focus(), 100);
}

function toggleAuth() {
  _authMode = _authMode === 'login' ? 'signup' : 'login';
  _refreshAuthModal();
}

function _refreshAuthModal() {
  const s = _authMode === 'signup';
  document.getElementById('modal-title').textContent    = s ? 'Create your account' : 'Welcome back!';
  document.getElementById('modal-sub').textContent      = s ? 'Join thousands of Heroes today' : 'Sign in to save your points';
  document.getElementById('signup-fields').style.display = s ? 'block' : 'none';
  document.getElementById('auth-submit-btn').textContent = s ? 'Create Account →' : 'Sign In →';
  document.getElementById('auth-switch').innerHTML       = s
    ? 'Already have an account? <a onclick="toggleAuth()">Sign in</a>'
    : "Don't have an account? <a onclick=\"toggleAuth()\">Sign up free</a>";
  _hideAuthError();
}

function _showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}
function _hideAuthError() {
  document.getElementById('auth-error').style.display = 'none';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
});

// ── Dashboard ─────────────────────────────────────────────
async function renderDashboard() {
  if (!currentUser) { showScreen('home'); openAuthModal('login'); return; }

  const name   = currentUser.avatar?.heroName || currentUser.first_name || 'Hero';
  const pts    = currentUser.pts || 0;
  const streak = currentUser.streak || currentUser.loginDays?.length && _calcStreakLocal(currentUser.loginDays) || 1;
  const days   = (currentUser.login_days || currentUser.loginDays || []).length;

  document.getElementById('dash-welcome').textContent = `Hey ${name} 👋`;
  document.getElementById('total-pts-dash').textContent = pts;
  document.getElementById('streak-count').textContent   = streak;
  document.getElementById('total-days').textContent      = days;

  // Streak banner
  document.getElementById('streak-title').textContent =
    streak >= 30 ? `${streak}-Day Streak! Legendary! 🔥🔥` :
    streak >= 7  ? `${streak}-Day Streak! You're on fire!`  :
    `${streak}-Day Streak! Keep going!`;
  document.getElementById('streak-desc').textContent =
    streak >= LOTTERY_DAYS_NEEDED
      ? 'You are qualified for the lottery! 🎰'
      : `${LOTTERY_DAYS_NEEDED - streak} more days to reach lottery qualification!`;

  // Big avatar
  const bigSVG = drawHeroSVG({
    skin: currentUser.avatar?.skin ?? 0,
    hair: currentUser.avatar?.hair ?? 0,
    aura: currentUser.avatar?.aura ?? 'purple',
    tier: getEvoTier(pts),
    size: 80,
  });
  const tier = EVO_TIERS[getEvoTier(pts)];
  document.getElementById('dash-avatar-wrap').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer" onclick="openAvatarBuilder()">
      <div style="width:80px;height:80px">${bigSVG}</div>
      <div class="evo-tag">${tier.emoji} ${tier.name}</div>
      <div style="font-size:11px;color:var(--text3)">Tap to customize</div>
    </div>`;

  // Evolution path
  document.getElementById('evo-path-display').innerHTML = buildEvoPath(pts);
  const tierIdx = getEvoTier(pts);
  document.getElementById('evo-tier-name').textContent  = `${EVO_TIERS[tierIdx].emoji} ${EVO_TIERS[tierIdx].name}`;
  if (tierIdx < EVO_TIERS.length - 1) {
    const nxt    = EVO_TIERS[tierIdx + 1];
    const cur    = EVO_TIERS[tierIdx];
    const needed = nxt.minPts - pts;
    const barPct = Math.min(100, Math.round(((pts - cur.minPts) / (nxt.minPts - cur.minPts)) * 100));
    document.getElementById('evo-next-info').textContent = `${needed} pts → ${nxt.name} ${nxt.emoji}`;
    document.getElementById('evo-bar').style.width        = barPct + '%';
  } else {
    document.getElementById('evo-next-info').textContent = '🏆 Max Evolution Reached!';
    document.getElementById('evo-bar').style.width        = '100%';
  }

  // Lottery progress
  const lotPct = Math.min(100, Math.round((days / LOTTERY_DAYS_NEEDED) * 100));
  document.getElementById('lot-pct').textContent        = lotPct + '%';
  document.getElementById('lot-bar-fill').style.width   = lotPct + '%';
  document.getElementById('lot-label').textContent      =
    lotPct >= 100 ? '🎉 QUALIFIED for the lottery!' : `${days}/${LOTTERY_DAYS_NEEDED} active days completed`;
  document.getElementById('lottery-desc').textContent   =
    lotPct >= 100
      ? 'Congratulations! You are fully qualified for the next Grand Hero Lottery draw!'
      : `Stay active! ${Math.max(0, LOTTERY_DAYS_NEEDED - days)} more active days to qualify.`;

  // Quiz count + history
  let history = [];
  try { history = await dbGetHistory(currentUser.id || currentUser.email, 10); }
  catch (e) { history = currentUser.history || []; }

  document.getElementById('total-quizzes').textContent = history.length;

  const tbody = document.getElementById('history-body');
  if (!history.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No quizzes yet — start playing!</td></tr>';
    return;
  }
  tbody.innerHTML = history.map(h => {
    const sec = h.section;
    const cls = sec === 'moderate' ? 'mod' : sec;
    return `<tr>
      <td>${h.date || h.created_at?.slice(0,10) || '—'}</td>
      <td><span class="badge b-${cls}">${LABELS[sec] || sec}</span></td>
      <td>${h.score}</td>
      <td style="color:var(--amber);font-weight:600">+${h.pts} pts</td>
    </tr>`;
  }).join('');
}

function _calcStreakLocal(loginDays) {
  if (!loginDays?.length) return 0;
  const days = loginDays.map(d => new Date(d)).sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if ((days[i - 1] - days[i]) / 86400000 <= 1.5) streak++;
    else break;
  }
  return streak;
}

// ── Leaderboard ───────────────────────────────────────────
async function renderLeaderboard() {
  const list = document.getElementById('lb-list');
  list.innerHTML = '<div class="loading-box"><div class="spinner"></div><p>Loading heroes…</p></div>';

  let players = [];
  try { players = await dbGetLeaderboard(10); }
  catch (e) { list.innerHTML = '<p style="color:var(--text2);text-align:center;padding:40px">Could not load leaderboard.</p>'; return; }

  if (!players.length) {
    list.innerHTML = '<p style="color:var(--text2);text-align:center;padding:60px">No heroes yet — be the first!</p>';
    return;
  }

  const medals = ['🥇','🥈','🥉'];
  list.innerHTML = players.map((u, i) => {
    const name   = u.avatar?.heroName || u.first_name || u.name || 'Hero';
    const tierIdx = getEvoTier(u.pts || 0);
    const svg    = drawHeroSVG({ skin: u.avatar?.skin ?? 0, hair: u.avatar?.hair ?? 0, aura: u.avatar?.aura ?? 'purple', tier: tierIdx, size: 38 });
    const activeDays = (u.login_days || u.loginDays || []).length;
    return `<div class="lb-row">
      <div class="lb-rank">${medals[i] || '#' + (i + 1)}</div>
      <div style="width:38px;height:38px;flex-shrink:0">${svg}</div>
      <div class="lb-name">
        ${name}
        <div class="lb-sub">${activeDays} active days · ${EVO_TIERS[tierIdx].emoji} ${EVO_TIERS[tierIdx].name}</div>
      </div>
      <div class="lb-pts">⭐ ${u.pts || 0}</div>
    </div>`;
  }).join('');
}

// ── Toast ─────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => (t.className = 'toast'), 3200);
}
