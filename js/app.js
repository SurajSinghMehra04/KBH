// ============================================================
//  KON BANEGA HERO — js/app.js
//  App entry point: auth, session restore, keyboard nav
// ============================================================

window.currentUser = null;

// ── Boot ──────────────────────────────────────────────────
(async function boot() {
  initDB();

  try {
    const sessionUser = await dbGetSession();
    if (sessionUser) {
      await _hydrateUser(sessionUser.id || sessionUser.email || sessionUser);
    }
  } catch (e) {
    console.warn('[KBH] Session restore failed.', e);
  }

  updateNav();
})();

// ── Hydrate user from DB ──────────────────────────────────
async function _hydrateUser(userId) {
  try {
    const profile = await dbGetProfile(userId);
    window.currentUser = profile;
    // Record today as active day
    const updated = await dbRecordActiveDay(userId);
    if (updated) window.currentUser = { ...currentUser, ...updated };
  } catch (e) {
    console.warn('[KBH] Could not hydrate user profile.', e);
  }
}

// ── Auth form submit ──────────────────────────────────────
async function submitAuth() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    _showAuthError('Please fill in all fields.');
    return;
  }
  if (password.length < 6) {
    _showAuthError('Password must be at least 6 characters.');
    return;
  }

  const btn = document.getElementById('auth-submit-btn');
  btn.textContent = 'Please wait…';
  btn.disabled    = true;

  try {
    if (_authMode === 'signup') {
      const firstName = document.getElementById('fname')?.value.trim() || 'Hero';
      const lastName  = document.getElementById('lname')?.value.trim() || '';
      const user      = await dbSignUp(email, password, firstName, lastName);
      window.currentUser = await dbGetProfile(user.id || user.email || email);
      await dbRecordActiveDay(currentUser.id || currentUser.email);
      showToast('Welcome to Kon Banega Hero! 🎉', 'success');
    } else {
      const user = await dbSignIn(email, password);
      await _hydrateUser(user.id || user.email || email);
      showToast('Welcome back, Hero! 🔥', 'success');
    }

    closeModal('auth-modal');
    updateNav();
  } catch (err) {
    _showAuthError(err.message || 'Something went wrong. Please try again.');
  } finally {
    btn.textContent = _authMode === 'signup' ? 'Create Account →' : 'Sign In →';
    btn.disabled    = false;
  }
}

// ── Logout ────────────────────────────────────────────────
async function doLogout() {
  try { await dbSignOut(); } catch (e) { /* ignore */ }
  window.currentUser = null;
  window.quizActive  = false;
  updateNav();
  showScreen('home');
  showToast('See you tomorrow, Hero! 👋', 'success');
}

// ── Keyboard accessibility ────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
  }
  if (e.key === 'Enter') {
    const active = document.activeElement;
    if (active?.classList.contains('section-card')) active.click();
    if (active?.id === 'auth-submit-btn') submitAuth();
  }
});

// Make logo keyboard-focusable
document.querySelector('.nav-logo')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') showScreen('home');
});
