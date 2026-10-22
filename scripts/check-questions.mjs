// Generates thousands of questions per topic and level and checks they are well formed.
import { TOPICS, makeQuestion, readingQuestions, checkAnswer } from '../src/questions/index.js';
import { PASSAGES } from '../src/questions/english.js';

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

console.log(problems ? `${problems} problems` : 'all questions OK');
process.exit(problems ? 1 : 0);
