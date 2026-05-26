// ============================================================
//  KON BANEGA HERO — js/avatar.js
//  SVG avatar drawing + evolution tier helpers
// ============================================================

function getEvoTier(pts) {
  for (let i = EVO_TIERS.length - 1; i >= 0; i--) {
    if (pts >= EVO_TIERS[i].minPts) return i;
  }
  return 0;
}

function drawHeroSVG({ skin = 0, hair = 0, aura = 'purple', tier = 0, size = 80 }) {
  const sc = SKINS[skin] || SKINS[0];
  const hc = HAIR_COLORS[hair] || HAIR_COLORS[0];
  const ac = AURAS[aura] || AURAS.purple;
  const s  = size / 80;

  const hairShapes = [
    // Short
    `<rect x="${22*s}" y="${10*s}" width="${36*s}" height="${16*s}" rx="${6*s}" fill="${hc}"/>`,
    // Long
    `<path d="M${20*s} ${12*s} Q${40*s} ${2*s} ${60*s} ${12*s} L${62*s} ${46*s} Q${56*s} ${56*s} ${24*s} ${56*s} Q${18*s} ${46*s} ${20*s} ${12*s}Z" fill="${hc}" opacity=".88"/>`,
    // Curly
    `<ellipse cx="${40*s}" cy="${14*s}" rx="${20*s}" ry="${10*s}" fill="${hc}"/>
     <circle cx="${27*s}" cy="${20*s}" r="${7*s}" fill="${hc}"/>
     <circle cx="${53*s}" cy="${20*s}" r="${7*s}" fill="${hc}"/>`,
    // Spiky
    `<polygon points="${40*s},${2*s} ${26*s},${14*s} ${30*s},${14*s} ${22*s},${28*s} ${30*s},${22*s} ${24*s},${34*s} ${56*s},${34*s} ${50*s},${22*s} ${58*s},${28*s} ${50*s},${14*s} ${54*s},${14*s}" fill="${hc}"/>`,
  ];

  const auraRing = tier >= 2
    ? `<circle cx="${40*s}" cy="${40*s}" r="${38*s}" fill="none" stroke="${ac}" stroke-width="${1.5*s}" opacity=".22"/>
       <circle cx="${40*s}" cy="${40*s}" r="${33*s}" fill="none" stroke="${ac}" stroke-width="${s}" opacity=".12"/>`
    : '';

  const crown = tier >= 6
    ? `<text x="${40*s}" y="${9*s}" text-anchor="middle" font-size="${13*s}px">👑</text>`
    : '';

  const tierAccent = tier >= 4
    ? `<path d="M${28*s} ${24*s} Q${40*s} ${17*s} ${52*s} ${24*s}" stroke="${ac}" stroke-width="${2*s}" fill="none" opacity=".65" stroke-linecap="round"/>`
    : '';

  const glow = tier >= 8
    ? `<circle cx="${40*s}" cy="${40*s}" r="${36*s}" fill="${ac}" opacity=".05"/>`
    : '';

  return `<svg viewBox="0 0 ${80*s} ${80*s}" xmlns="http://www.w3.org/2000/svg">
    ${glow}
    ${auraRing}
    ${hairShapes[hair] || hairShapes[0]}
    <ellipse cx="${40*s}" cy="${33*s}" rx="${18*s}" ry="${20*s}" fill="${sc}"/>
    <ellipse cx="${33*s}" cy="${31*s}" rx="${3*s}" ry="${3.5*s}" fill="#1a1028"/>
    <ellipse cx="${47*s}" cy="${31*s}" rx="${3*s}" ry="${3.5*s}" fill="#1a1028"/>
    <ellipse cx="${33.8*s}" cy="${30*s}" rx="${1.2*s}" ry="${1.4*s}" fill="white" opacity=".6"/>
    <ellipse cx="${47.8*s}" cy="${30*s}" rx="${1.2*s}" ry="${1.4*s}" fill="white" opacity=".6"/>
    <path d="M${34*s} ${39*s} Q${40*s} ${44*s} ${46*s} ${39*s}" stroke="#1a1028" stroke-width="${1.5*s}" fill="none" stroke-linecap="round"/>
    ${tierAccent}
    <rect x="${30*s}" y="${51*s}" width="${20*s}" height="${22*s}" rx="${5*s}" fill="${ac}" opacity=".82"/>
    <rect x="${18*s}" y="${52*s}" width="${12*s}" height="${16*s}" rx="${4*s}" fill="${ac}" opacity=".65"/>
    <rect x="${50*s}" y="${52*s}" width="${12*s}" height="${16*s}" rx="${4*s}" fill="${ac}" opacity=".65"/>
    ${crown}
  </svg>`;
}

// ── Avatar Builder state ──────────────────────────────────
let _avatarState = { skin: 0, hair: 0, aura: 'purple', heroName: '' };

function openAvatarBuilder() {
  if (!window.currentUser) { openAuthModal('login'); return; }
  const av = currentUser.avatar || {};
  _avatarState = {
    skin: av.skin ?? 0,
    hair: av.hair ?? 0,
    aura: av.aura ?? 'purple',
    heroName: av.heroName || currentUser.first_name || 'Hero',
  };
  document.getElementById('hero-name').value = _avatarState.heroName;
  _refreshSkinUI();
  _refreshHairUI();
  _refreshAuraUI();
  _updateAvatarPreview();
  document.getElementById('avatar-modal').classList.add('show');
}

function setSkin(n) {
  _avatarState.skin = n;
  _refreshSkinUI();
  _updateAvatarPreview();
}
function setHair(n) {
  _avatarState.hair = n;
  _refreshHairUI();
  _updateAvatarPreview();
}
function setAura(c) {
  _avatarState.aura = c;
  _refreshAuraUI();
  _updateAvatarPreview();
}

function _refreshSkinUI() {
  document.querySelectorAll('.skin-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.skin) === _avatarState.skin);
  });
}
function _refreshHairUI() {
  document.querySelectorAll('[data-hair]').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.hair) === _avatarState.hair);
  });
}
function _refreshAuraUI() {
  document.querySelectorAll('[data-aura]').forEach(b => {
    b.classList.toggle('active', b.dataset.aura === _avatarState.aura);
  });
}

function _updateAvatarPreview() {
  const tier = getEvoTier(currentUser?.pts || 0);
  document.getElementById('ava-preview-big').innerHTML =
    drawHeroSVG({ ..._avatarState, tier, size: 120 });
  document.getElementById('ava-evo-tag').textContent =
    `${EVO_TIERS[tier].emoji} ${EVO_TIERS[tier].name} Hero`;
}

async function saveAvatar() {
  if (!currentUser) return;
  _avatarState.heroName = (document.getElementById('hero-name').value.trim()
    || currentUser.first_name || 'Hero').slice(0, 20);
  currentUser.avatar = { ..._avatarState };
  await dbSaveAvatar(currentUser.id || currentUser.email, currentUser.avatar);
  closeModal('avatar-modal');
  updateNav();
  showToast('Hero avatar saved! 🦸', 'success');
}

// ── Build evolution path HTML ─────────────────────────────
function buildEvoPath(pts) {
  const tierIdx = getEvoTier(pts);
  return EVO_TIERS.map((t, i) => {
    const reached  = i <= tierIdx;
    const isCurrent = i === tierIdx;
    const classes  = ['evo-step-icon', reached ? 'reached' : '', isCurrent ? 'current' : ''].filter(Boolean).join(' ');
    const arrow    = i < EVO_TIERS.length - 1
      ? `<div class="evo-arrow">${i <= tierIdx ? '→' : '·'}</div>` : '';
    return `<div class="evo-step">
      <div class="${classes}" title="${t.name} (${t.minPts}+ pts)">${t.emoji}</div>
      <div class="evo-step-name">${t.name}</div>
    </div>${arrow}`;
  }).join('');
}

// ── Small avatar for nav / leaderboard ───────────────────
function miniAvatarHTML(user, size = 32) {
  const av    = user.avatar || {};
  const tier  = getEvoTier(user.pts || 0);
  const svg   = drawHeroSVG({ skin: av.skin ?? 0, hair: av.hair ?? 0, aura: av.aura ?? 'purple', tier, size });
  return `<div class="av-wrap" style="width:${size}px;height:${size}px" onclick="openAvatarBuilder()" title="My Hero">${svg}</div>`;
}
