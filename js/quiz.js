// ============================================================
//  KON BANEGA HERO — js/quiz.js
//  Quiz engine: question generation, timer, answer handling
// ============================================================

let _quiz = {
  section: 'easy',
  questions: [],
  current: 0,
  correct: 0,
  pts: 0,
  answered: false,
};
let _timer       = null;
let _timeLeft    = 30;
let _tabViolations = 0;
window.quizActive  = false;

// ── Entry points ──────────────────────────────────────────
function startQuiz() { startQuizSection('easy'); }

async function startQuizSection(section) {
  _tabViolations = 0;
  _quiz = { section, questions: [], current: 0, correct: 0, pts: 0, answered: false };
  showScreen('quiz');
  window.quizActive = true;

  document.getElementById('quiz-loading').style.display  = 'block';
  document.getElementById('quiz-content').style.display  = 'none';

  const msgs = [
    'Generating questions with AI…',
    'Crafting brain-bending challenges…',
    'Almost ready, Hero!',
  ];
  let mi = 0;
  const msgLoop = setInterval(() => {
    mi = (mi + 1) % msgs.length;
    document.getElementById('loading-msg').textContent = msgs[mi];
  }, 1400);

  try {
    _quiz.questions = await _fetchQuestions(section);
  } catch (e) {
    console.warn('[KBH] AI fetch failed — using fallback questions.', e);
    _quiz.questions = _fallbackQuestions(section);
  }

  clearInterval(msgLoop);
  document.getElementById('quiz-loading').style.display = 'none';
  document.getElementById('quiz-content').style.display = 'block';
  _renderQuestion();
}

// ── AI question generation ────────────────────────────────
async function _fetchQuestions(section) {
  const grade =
    section === 'easy'     ? 'Classes 1–5 (ages 6–10)'  :
    section === 'moderate' ? 'Classes 6–8 (ages 11–14)' :
                             'Classes 9–10 (ages 14–16)';

  const prompt = `Generate exactly 5 multiple-choice quiz questions for Indian school students at ${grade} level.
Mix subjects: Mathematics, Science, English, Social Studies, General Knowledge.
Return ONLY a valid JSON array — no markdown, no explanation:
[{"q":"question text","opts":["A","B","C","D"],"ans":0}]
Rules:
- "ans" is the 0-based index of the correct option
- Make questions clear, age-appropriate, and educational
- All 4 options must be plausible`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const raw  = data.content.map(c => c.text || '').join('');
  const clean = raw.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('['), end = clean.lastIndexOf(']');
  if (start === -1) throw new Error('No JSON array found');
  return JSON.parse(clean.slice(start, end + 1));
}

// ── Fallback question bank ────────────────────────────────
function _fallbackQuestions(section) {
  const bank = {
    easy: [
      { q: 'What is the capital of India?',             opts: ['Mumbai','New Delhi','Kolkata','Chennai'],        ans: 1 },
      { q: 'How many days are there in a week?',        opts: ['5','6','7','8'],                                 ans: 2 },
      { q: 'Which planet is called the Red Planet?',    opts: ['Venus','Saturn','Jupiter','Mars'],               ans: 3 },
      { q: 'What is 12 × 12?',                          opts: ['124','144','132','148'],                         ans: 1 },
      { q: 'Which gas do plants absorb from air?',      opts: ['Oxygen','Nitrogen','Carbon Dioxide','Hydrogen'], ans: 2 },
    ],
    moderate: [
      { q: 'What is the chemical symbol for gold?',         opts: ['Go','Gd','Au','Ag'],                                             ans: 2 },
      { q: "Who wrote India's national anthem?",            opts: ['Rabindranath Tagore','Bankim Chandra','Mahatma Gandhi','Nehru'], ans: 0 },
      { q: 'What is √144?',                                 opts: ['11','12','13','14'],                                             ans: 1 },
      { q: 'Which organ purifies blood in the body?',       opts: ['Heart','Lungs','Liver','Kidneys'],                               ans: 3 },
      { q: 'How many bones are in the adult human body?',   opts: ['196','206','216','226'],                                         ans: 1 },
    ],
    hard: [
      { q: 'What is the powerhouse of the cell?',        opts: ['Nucleus','Ribosome','Mitochondria','Golgi Body'], ans: 2 },
      { q: 'Which of these is NOT a prime number?',      opts: ['17','19','23','27'],                               ans: 3 },
      { q: 'Speed of light is approximately:',           opts: ['3×10⁵ km/s','3×10⁸ m/s','3×10⁶ m/s','3×10⁴ km/s'], ans: 1 },
      { q: 'Chemical formula for water?',                opts: ['HO','H₂O','H₃O','H₂O₂'],                         ans: 1 },
      { q: 'Who proposed the theory of relativity?',     opts: ['Newton','Faraday','Einstein','Bohr'],             ans: 2 },
    ],
  };
  return bank[section] || bank.easy;
}

// ── Render question ───────────────────────────────────────
function _renderQuestion() {
  const q   = _quiz.questions[_quiz.current];
  const sec = _quiz.section;

  const badge = document.getElementById('qsec-badge');
  badge.textContent = LABELS[sec];
  badge.className   = `sec-badge ${sec === 'moderate' ? 'mod' : sec}`;

  const pct = ((_quiz.current + 1) / 5) * 100;
  document.getElementById('q-progress').style.width = pct + '%';
  document.getElementById('q-prog-text').textContent = `Question ${_quiz.current + 1} of 5`;
  document.getElementById('q-number').textContent    = `Question ${_quiz.current + 1}`;
  document.getElementById('q-text').textContent      = q.q;

  const grid = document.getElementById('options-grid');
  grid.innerHTML = ['A','B','C','D'].map((letter, i) => `
    <button class="option-btn" id="opt-${i}" onclick="selectOption(${i})" aria-label="Option ${letter}: ${q.opts[i]}">
      <span class="opt-letter">${letter}</span>
      ${q.opts[i]}
    </button>
  `).join('');

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
  el.textContent = _timeLeft;
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
  const correct = _quiz.questions[_quiz.current].ans;
  document.getElementById(`opt-${correct}`).classList.add('correct');
  document.querySelectorAll('.option-btn').forEach(b => (b.disabled = true));
  _showFeedback(false, `⏰ Time's up! Answer: ${_quiz.questions[_quiz.current].opts[correct]}`);
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
  document.querySelectorAll('.option-btn').forEach(b => (b.disabled = true));

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

// ── Finish section ────────────────────────────────────────
async function _finishSection() {
  clearInterval(_timer);
  window.quizActive = false;

  const prevTier = currentUser ? getEvoTier(currentUser.pts || 0) : -1;

  // Update UI
  const emoji = _quiz.correct === 5 ? '🏆' : _quiz.correct >= 3 ? '🎉' : '💪';
  document.getElementById('res-emoji').textContent  = emoji;
  document.getElementById('res-title').textContent  = _quiz.correct === 5 ? 'Perfect Score!' : _quiz.correct >= 3 ? 'Great Work!' : 'Keep Practicing!';
  document.getElementById('res-pts').textContent    = `+${_quiz.pts} pts`;
  document.getElementById('res-sub').textContent    = `You got ${_quiz.correct}/5 correct!`;
  document.getElementById('rb-correct').textContent = _quiz.correct;
  document.getElementById('rb-wrong').textContent   = 5 - _quiz.correct;
  document.getElementById('rb-earned').textContent  = _quiz.pts;

  // Save to DB
  if (currentUser) {
    const result = {
      section: _quiz.section,
      score:   `${_quiz.correct}/5`,
      pts:     _quiz.pts,
      date:    new Date().toLocaleDateString('en-IN'),
    };
    await dbSaveQuizResult(currentUser.id || currentUser.email, result);
    currentUser.pts = (currentUser.pts || 0) + _quiz.pts;

    const newTier = getEvoTier(currentUser.pts);
    if (newTier > prevTier) {
      showToast(`🦸 Avatar evolved to ${EVO_TIERS[newTier].name} ${EVO_TIERS[newTier].emoji}!`, 'success');
    } else {
      showToast(`+${_quiz.pts} points saved! ⭐`, 'success');
    }
    updateNav();
  }

  showScreen('result');
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
