// ============================================================
//  KON BANEGA HERO — js/quiz.js
//  Quiz engine: question generation, timer, answer handling
// ============================================================

let _quiz = {
  section: 'easy', questions: [], current: 0,
  correct: 0, pts: 0, answered: false,
};
let _timer         = null;
let _timeLeft      = 30;
let _tabViolations = 0;
window.quizActive  = false;

// ── Large question pool (5 subjects × many questions per level)
// Ensures different questions every session via random shuffle
const _QUESTION_POOL = {
  easy: [
    { q:'What is the capital of India?',                  opts:['Mumbai','New Delhi','Kolkata','Chennai'],            ans:1 },
    { q:'How many days are there in a week?',             opts:['5','6','7','8'],                                     ans:2 },
    { q:'Which planet is called the Red Planet?',         opts:['Venus','Saturn','Jupiter','Mars'],                   ans:3 },
    { q:'What is 12 × 12?',                               opts:['124','144','132','148'],                             ans:1 },
    { q:'Which gas do plants absorb from air?',           opts:['Oxygen','Nitrogen','Carbon Dioxide','Hydrogen'],     ans:2 },
    { q:'How many sides does a triangle have?',           opts:['2','3','4','5'],                                     ans:1 },
    { q:'Which is the largest ocean?',                    opts:['Atlantic','Indian','Arctic','Pacific'],              ans:3 },
    { q:'What colour is a ripe banana?',                  opts:['Red','Green','Yellow','Blue'],                       ans:2 },
    { q:'How many months are in a year?',                 opts:['10','11','12','13'],                                 ans:2 },
    { q:'Which animal is called the Ship of the Desert?', opts:['Horse','Camel','Elephant','Donkey'],                 ans:1 },
    { q:'What is 7 × 8?',                                 opts:['54','56','58','64'],                                 ans:1 },
    { q:'In which direction does the Sun rise?',          opts:['West','North','South','East'],                       ans:3 },
    { q:'What is the national bird of India?',            opts:['Sparrow','Eagle','Peacock','Parrot'],                ans:2 },
    { q:'Which is the smallest planet in our solar system?', opts:['Mars','Mercury','Venus','Pluto'],                 ans:1 },
    { q:'How many zeros are in one hundred?',             opts:['1','2','3','4'],                                     ans:1 },
    { q:'Which fruit is known as the King of Fruits?',    opts:['Apple','Mango','Banana','Orange'],                   ans:1 },
    { q:'What is the boiling point of water?',            opts:['50°C','75°C','100°C','120°C'],                       ans:2 },
    { q:'How many continents are there on Earth?',        opts:['5','6','7','8'],                                     ans:2 },
    { q:'Which is the longest river in the world?',       opts:['Amazon','Nile','Ganga','Mississippi'],               ans:1 },
    { q:'What is 15 + 27?',                               opts:['40','42','44','46'],                                 ans:1 },
  ],
  moderate: [
    { q:'What is the chemical symbol for gold?',              opts:['Go','Gd','Au','Ag'],                                              ans:2 },
    { q:"Who wrote India's national anthem?",                 opts:['Rabindranath Tagore','Bankim Chandra','Mahatma Gandhi','Nehru'],  ans:0 },
    { q:'What is √144?',                                      opts:['11','12','13','14'],                                              ans:1 },
    { q:'Which organ purifies blood in the body?',            opts:['Heart','Lungs','Liver','Kidneys'],                                ans:3 },
    { q:'How many bones are in the adult human body?',        opts:['196','206','216','226'],                                          ans:1 },
    { q:'What is the SI unit of force?',                      opts:['Joule','Watt','Newton','Pascal'],                                 ans:2 },
    { q:'Which planet has the most moons?',                   opts:['Jupiter','Saturn','Uranus','Neptune'],                           ans:1 },
    { q:'What is the chemical formula for common salt?',      opts:['NaCl','KCl','CaCl₂','MgCl₂'],                                   ans:0 },
    { q:'Who discovered the laws of motion?',                 opts:['Galileo','Einstein','Newton','Faraday'],                         ans:2 },
    { q:'What is the largest continent by area?',             opts:['Africa','North America','Europe','Asia'],                        ans:3 },
    { q:'Which blood group is called universal donor?',       opts:['A','B','AB','O'],                                                ans:3 },
    { q:'Photosynthesis takes place in which part of plant?', opts:['Root','Stem','Leaf','Flower'],                                   ans:2 },
    { q:'What is the square of 13?',                          opts:['156','169','144','196'],                                         ans:1 },
    { q:'In which year did India gain independence?',         opts:['1945','1946','1947','1948'],                                     ans:2 },
    { q:'What is the chemical symbol for iron?',             opts:['Ir','In','Fe','Fr'],                                              ans:2 },
    { q:'Which is the hardest natural substance?',            opts:['Gold','Iron','Diamond','Quartz'],                                ans:2 },
    { q:'How many players are there in a cricket team?',      opts:['9','10','11','12'],                                              ans:2 },
    { q:'The Tropic of Cancer passes through how many Indian states?', opts:['6','7','8','9'],                                       ans:2 },
    { q:'What is the full form of DNA?',                      opts:['Dioxyribonucleic Acid','Deoxyribonucleic Acid','Diribonucleic Acid','None'], ans:1 },
    { q:'Which instrument is used to measure temperature?',   opts:['Barometer','Thermometer','Hygrometer','Altimeter'],             ans:1 },
  ],
  hard: [
    { q:'What is the powerhouse of the cell?',            opts:['Nucleus','Ribosome','Mitochondria','Golgi Body'],    ans:2 },
    { q:'Which of these is NOT a prime number?',          opts:['17','19','23','27'],                                 ans:3 },
    { q:'Speed of light is approximately:',               opts:['3×10⁵ km/s','3×10⁸ m/s','3×10⁶ m/s','3×10⁴ km/s'], ans:1 },
    { q:'Chemical formula for water?',                    opts:['HO','H₂O','H₃O','H₂O₂'],                           ans:1 },
    { q:'Who proposed the theory of relativity?',         opts:['Newton','Faraday','Einstein','Bohr'],               ans:2 },
    { q:'What is the value of π (pi) to 2 decimal places?', opts:['3.12','3.14','3.16','3.18'],                    ans:1 },
    { q:'Which element has the atomic number 6?',         opts:['Nitrogen','Oxygen','Carbon','Boron'],               ans:2 },
    { q:'What is the SI unit of electric current?',       opts:['Volt','Ohm','Ampere','Watt'],                       ans:2 },
    { q:'Which acid is present in the human stomach?',    opts:['Sulphuric acid','Hydrochloric acid','Nitric acid','Acetic acid'], ans:1 },
    { q:'What is the chemical formula for glucose?',      opts:['C₆H₁₂O₆','C₁₂H₂₂O₁₁','C₆H₁₀O₅','CH₂O'],         ans:0 },
    { q:'Ohm's Law states V =',                           opts:['I/R','IR','I+R','I²R'],                            ans:1 },
    { q:'Which part of the brain controls balance?',      opts:['Cerebrum','Medulla','Cerebellum','Thalamus'],       ans:2 },
    { q:'How many chromosomes does a normal human cell have?', opts:['23','44','46','48'],                         ans:2 },
    { q:'What is the derivative of sin(x)?',              opts:['cos(x)','-cos(x)','sin(x)','-sin(x)'],             ans:0 },
    { q:'Which planet rotates on its side?',              opts:['Neptune','Saturn','Uranus','Venus'],               ans:2 },
    { q:'Newton's second law: F =',                       opts:['mv','ma','m/a','m+a'],                             ans:1 },
    { q:'Which gas is most abundant in Earth's atmosphere?', opts:['Oxygen','Carbon Dioxide','Argon','Nitrogen'],  ans:3 },
    { q:'What is the process by which plants lose water through leaves?', opts:['Osmosis','Transpiration','Absorption','Respiration'], ans:1 },
    { q:'Which of these is a vector quantity?',           opts:['Mass','Temperature','Velocity','Speed'],           ans:2 },
    { q:'The pH of pure water is:',                       opts:['5','6','7','8'],                                   ans:2 },
  ],
};

// ── Shuffle helper ─────────────────────────────────────────
function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick 5 random unique questions from the pool
function _randomQuestions(section) {
  const pool = _QUESTION_POOL[section] || _QUESTION_POOL.easy;
  return _shuffle(pool).slice(0, 5);
}

// ── Entry points ──────────────────────────────────────────
function startQuiz() { startQuizSection('easy'); }

async function startQuizSection(section) {
  _tabViolations = 0;
  _quiz = { section, questions: [], current: 0, correct: 0, pts: 0, answered: false };
  showScreen('quiz');
  window.quizActive = true;

  document.getElementById('quiz-loading').style.display = 'block';
  document.getElementById('quiz-content').style.display = 'none';

  const msgs = ['Generating questions…', 'Mixing subjects…', 'Almost ready, Hero!'];
  let mi = 0;
  const msgLoop = setInterval(() => {
    document.getElementById('loading-msg').textContent = msgs[++mi % msgs.length];
  }, 1200);

  // Try AI questions first; always fall back to randomised local pool
  try {
    _quiz.questions = await _fetchQuestionsViaProxy(section);
  } catch (e) {
    console.info('[KBH] Using local question pool.');
    _quiz.questions = _randomQuestions(section);
  }

  clearInterval(msgLoop);
  document.getElementById('quiz-loading').style.display = 'none';
  document.getElementById('quiz-content').style.display = 'block';
  _renderQuestion();
}

// ── AI via Netlify proxy (keeps API key server-side) ───────
async function _fetchQuestionsViaProxy(section) {
  // Only call proxy if we're on a real domain (not file://)
  if (window.location.protocol === 'file:') throw new Error('local file');

  const res = await fetch('/api/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section }),
    signal: AbortSignal.timeout(12000), // 12s timeout
  });

  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.questions) || data.questions.length < 5) throw new Error('Bad response');
  return data.questions;
}

// ── Render question ───────────────────────────────────────
function _renderQuestion() {
  const q   = _quiz.questions[_quiz.current];
  const sec = _quiz.section;

  const badge = document.getElementById('qsec-badge');
  badge.textContent = LABELS[sec];
  badge.className   = `sec-badge ${sec === 'moderate' ? 'mod' : sec}`;

  document.getElementById('q-progress').style.width   = ((_quiz.current + 1) / 5 * 100) + '%';
  document.getElementById('q-prog-text').textContent  = `Question ${_quiz.current + 1} of 5`;
  document.getElementById('q-number').textContent     = `Question ${_quiz.current + 1}`;
  document.getElementById('q-text').textContent       = q.q;

  const grid = document.getElementById('options-grid');
  grid.innerHTML = ['A','B','C','D'].map((letter, i) => `
    <button class="option-btn" id="opt-${i}" onclick="selectOption(${i})">
      <span class="opt-letter">${letter}</span>${q.opts[i]}
    </button>`).join('');

  document.getElementById('quiz-feedback').className  = 'quiz-feedback';
  document.getElementById('quiz-feedback').textContent = '';
  document.getElementById('next-btn-wrap').style.display = 'none';
  _quiz.answered = false;
  _startTimer();
}

// ── Timer ─────────────────────────────────────────────────
function _startTimer() {
  clearInterval(_timer);
  _timeLeft = 30;
  const el  = document.getElementById('q-timer');
  el.textContent = 30;
  el.className   = 'q-timer';

  _timer = setInterval(() => {
    _timeLeft--;
    el.textContent = _timeLeft;
    if (_timeLeft <= 10) el.className = 'q-timer warn';
    if (_timeLeft <= 0)  { clearInterval(_timer); if (!_quiz.answered) _autoFail(); }
  }, 1000);
}

function _autoFail() {
  _quiz.answered = true;
  const ans = _quiz.questions[_quiz.current].ans;
  document.getElementById(`opt-${ans}`).classList.add('correct');
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  _showFeedback(false, `⏰ Time's up! Answer: ${_quiz.questions[_quiz.current].opts[ans]}`);
  document.getElementById('next-btn-wrap').style.display = 'block';
}

// ── Answer selection ──────────────────────────────────────
function selectOption(idx) {
  if (_quiz.answered) return;
  clearInterval(_timer);
  _quiz.answered = true;

  const q  = _quiz.questions[_quiz.current];
  const ok = idx === q.ans;

  document.getElementById(`opt-${idx}`).classList.add(ok ? 'correct' : 'wrong');
  if (!ok) document.getElementById(`opt-${q.ans}`).classList.add('correct');
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

  if (ok) {
    _quiz.correct++;
    _quiz.pts += POINTS_MAP[_quiz.section] || 1;
    _showFeedback(true, `✅ Correct! +${POINTS_MAP[_quiz.section]} pt${POINTS_MAP[_quiz.section] > 1 ? 's' : ''}`);
  } else {
    _showFeedback(false, `❌ Wrong! Correct answer: ${q.opts[q.ans]}`);
  }
  document.getElementById('next-btn-wrap').style.display = 'block';
}

function _showFeedback(ok, msg) {
  const fb = document.getElementById('quiz-feedback');
  fb.textContent = msg;
  fb.className   = `quiz-feedback show ${ok ? 'correct' : 'wrong'}`;
}

function nextQuestion() {
  _quiz.current++;
  if (_quiz.current >= 5) _finishSection();
  else _renderQuestion();
}

// ── Finish & save ─────────────────────────────────────────
async function _finishSection() {
  clearInterval(_timer);
  window.quizActive = false;

  const prevTier = currentUser ? getEvoTier(currentUser.pts || 0) : -1;

  document.getElementById('res-emoji').textContent  = _quiz.correct === 5 ? '🏆' : _quiz.correct >= 3 ? '🎉' : '💪';
  document.getElementById('res-title').textContent  = _quiz.correct === 5 ? 'Perfect Score!' : _quiz.correct >= 3 ? 'Great Work!' : 'Keep Practicing!';
  document.getElementById('res-pts').textContent    = `+${_quiz.pts} pts`;
  document.getElementById('res-sub').textContent    = `You got ${_quiz.correct}/5 correct!`;
  document.getElementById('rb-correct').textContent = _quiz.correct;
  document.getElementById('rb-wrong').textContent   = 5 - _quiz.correct;
  document.getElementById('rb-earned').textContent  = _quiz.pts;

  if (currentUser && _quiz.pts > 0) {
    const uid = currentUser.id || currentUser.email;
    const result = {
      section: _quiz.section,
      score:   `${_quiz.correct}/5`,
      pts:     _quiz.pts,
      date:    new Date().toLocaleDateString('en-IN'),
    };

    // Save to DB (handles both Supabase and localStorage)
    await dbSaveQuizResult(uid, result);

    // Re-fetch fresh pts from DB to ensure nav shows correct number
    try {
      const fresh = await dbGetProfile(uid);
      currentUser.pts = fresh.pts ?? ((currentUser.pts || 0) + _quiz.pts);
    } catch {
      // fallback: just add locally
      currentUser.pts = (currentUser.pts || 0) + _quiz.pts;
    }

    const newTier = getEvoTier(currentUser.pts);
    if (newTier > prevTier) {
      showToast(`🦸 Avatar evolved to ${EVO_TIERS[newTier].name} ${EVO_TIERS[newTier].emoji}!`, 'success');
    } else {
      showToast(`+${_quiz.pts} points saved! ⭐ Total: ${currentUser.pts}`, 'success');
    }
    updateNav();
  }

  showScreen('result');
  loadHomeStats(); // refresh live stats after quiz
}

// ── Tab-switch protection ─────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden && window.quizActive) _flagTabSwitch();
});
window.addEventListener('blur', () => {
  if (window.quizActive) _flagTabSwitch();
});

function _flagTabSwitch() {
  _tabViolations++;
  clearInterval(_timer);
  document.getElementById('tw-count').textContent = `Violations this session: ${_tabViolations}`;
  document.getElementById('tab-warning').classList.add('active');
}

function dismissTabWarning() {
  document.getElementById('tab-warning').classList.remove('active');
  if (window.quizActive && !_quiz.answered) _startTimer();
}

function forfeitQuiz() {
  document.getElementById('tab-warning').classList.remove('active');
  window.quizActive = false;
  _tabViolations    = 0;
  clearInterval(_timer);
  showScreen('home');
  showToast('Quiz forfeited. Better luck next time!', 'error');
}
