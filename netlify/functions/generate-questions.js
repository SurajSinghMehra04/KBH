// ============================================================
//  KON BANEGA HERO — netlify/functions/generate-questions.js
//  Serverless proxy so the Anthropic API key stays server-side.
//  Set ANTHROPIC_API_KEY in Netlify → Site → Environment Variables
// ============================================================

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { section } = body;
  if (!['easy', 'moderate', 'hard'].includes(section)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid section' }) };
  }

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
- All questions must be clear, age-appropriate, and educational
- All 4 options must be plausible`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: err }) };
    }

    const data  = await response.json();
    const text  = data.content.map(c => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const start = clean.indexOf('[');
    const end   = clean.lastIndexOf(']');
    const questions = JSON.parse(clean.slice(start, end + 1));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
