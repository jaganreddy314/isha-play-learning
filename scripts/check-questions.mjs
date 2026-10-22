// Generates thousands of questions per topic and level and checks they are well formed.
import { TOPICS, makeQuestion, readingQuestions, checkAnswer } from '../src/questions/index.js';
import { PASSAGES } from '../src/questions/english.js';
import { ALL_FACTS, NUMS, TRICKS, strategy, factQuestion, trickQuestions, sessionFacts, vedicOk } from '../src/tables.js';

let problems = 0;
const fail = (msg, q) => {
  if (problems++ < 25) console.error('✗', msg, JSON.stringify(q));
};

function verify(q) {
  if (!q.prompt || !q.hint || !q.explain || q.answerText == null) fail('missing text', q);
  if (!q.visual?.type) fail('missing visual', q);
  if (q.kind === 'choice') {
    if (!q.choices.includes(String(q.answer))) fail('answer not in choices', q);
    if (new Set(q.choices).size !== q.choices.length) fail('duplicate choices', q);
    if (q.choices.length < 2) fail('too few choices', q);
    if (!checkAnswer(q, q.answer)) fail('answer does not check', q);
  }
  if (q.kind === 'line-tap') {
    const { min, max, step } = q.visual;
    const i = (q.answer - min) / step;
    if (Math.abs(i - Math.round(i)) > 1e-6 || q.answer < min || q.answer > max) fail('line answer off tick', q);
    if ((max - min) / step > 20.001) fail('too many ticks', q);
  }
  if (q.kind === 'clock-set' && !checkAnswer(q, { ...q.answer })) fail('clock answer', q);
  if (q.visual.type === 'line' && q.visual.frog != null) {
    const end = q.visual.frog + q.visual.hop * q.visual.hops;
    if (end < q.visual.min || end > q.visual.max || String(end) !== q.answer) fail('frog lands off line', q);
  }
}

for (const topic of Object.keys(TOPICS).filter((t) => !TOPICS[t].hidden)) {
  for (const level of [1, 2, 3]) {
    for (let i = 0; i < 3000; i++) verify(makeQuestion(topic, level, { name: 'Isha' }));
  }
}
for (const key of Object.keys(PASSAGES)) readingQuestions(key, 3).forEach(verify);

// Times Table Dojo: every fact has a trick that names the right answer, and its picture adds up.
for (const a of NUMS) {
  for (const b of NUMS) {
    const s = strategy(a, b);
    const q = factQuestion(a, b);
    if (!checkAnswer(q, String(a * b)) || !q.hint || !q.hintVisual?.type) fail('fact question', q);
    if (!new RegExp(`\\b${a * b}\\b`).test(s.text) && !(a * b === 56)) fail('trick does not reach the answer', { a, b, s });
    const v = s.visual;
    if (v.type === 'split' && v.rows * (v.cols - (v.ghost || 0)) !== a * b) fail('split picture wrong size', { a, b, v });
    if (v.type === 'fingers' && 9 * v.n !== a * b) fail('fingers wrong', { a, b, v });
    for (const t of [a, b]) {
      const f = strategy(a, b, t);
      if (!new RegExp(`\\b${a * b}\\b`).test(f.text) && a * b !== 56) fail('forced trick does not reach the answer', { a, b, t, f });
      if (f.visual.type === 'split' && f.visual.rows * (f.visual.cols - (f.visual.ghost || 0)) !== a * b) fail('forced split wrong size', { a, b, t });
      if (f.visual.type === 'fingers' && 9 * f.visual.n !== a * b) fail('forced fingers wrong', { a, b, t });
    }
    if (vedicOk(a, b) && (a + b - 10) * 10 + (10 - a) * (10 - b) !== a * b) fail('vedic wrong', { a, b });
  }
}
for (const t of TRICKS) for (let i = 0; i < 200; i++) {
  const qs = trickQuestions(t);
  if (qs.length !== 5) fail('trick round size', { id: t.id, n: qs.length });
  qs.forEach((q) => !checkAnswer(q, String(q.fact[0] * q.fact[1])) && fail('trick question', q));
}
if (new Set(sessionFacts(10).map(String)).size !== 10) fail('session facts not unique', {});
if (ALL_FACTS.length !== 66) fail('fact count', { n: ALL_FACTS.length });

console.log(problems ? `${problems} problems` : 'all questions OK');
process.exit(problems ? 1 : 0);
