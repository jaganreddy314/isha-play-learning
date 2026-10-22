import { mult, div, clock, line } from './math.js';
import { spell, grammar, vocab, sentences, readingQuestions } from './english.js';

export { readingQuestions };

export const TOPICS = {
  mult: { name: 'Times Tables', emoji: '✖️', subject: 'maths', color: '#ff6b6b', loc: 'market', gen: mult },
  div: { name: 'Division', emoji: '➗', subject: 'maths', color: '#f9a03f', loc: 'forest', gen: div },
  clock: { name: 'Telling Time', emoji: '🕒', subject: 'maths', color: '#9b5de5', loc: 'clocktower', gen: clock },
  line: { name: 'Number Lines', emoji: '📏', subject: 'maths', color: '#00a6fb', loc: 'river', gen: line },
  spell: { name: 'Spelling', emoji: '🔤', subject: 'english', color: '#06d6a0', loc: 'library', gen: spell },
  grammar: { name: 'Word Types', emoji: '🏷️', subject: 'english', color: '#ef476f', loc: 'library', gen: grammar },
  vocab: { name: 'Word Power', emoji: '💬', subject: 'english', color: '#f15bb5', loc: 'garden', gen: vocab },
  sentences: { name: 'Sentences', emoji: '✏️', subject: 'english', color: '#4361ee', loc: 'garden', gen: sentences },
  reading: { name: 'Reading', emoji: '📖', subject: 'english', color: '#2a9d8f', loc: 'library', hidden: true },
};

export function makeQuestion(topic, level, ctx, avoid = new Set()) {
  let q;
  for (let tries = 0; tries < 8; tries++) {
    q = TOPICS[topic].gen(level, ctx);
    if (!avoid.has(q.prompt)) break;
  }
  avoid.add(q.prompt);
  return { ...q, topic, level };
}

export function checkAnswer(q, v) {
  if (v == null) return false;
  switch (q.kind) {
    case 'clock-set':
      return v.h % 12 === q.answer.h % 12 && v.m === q.answer.m;
    case 'line-tap':
      return Math.abs(v - q.answer) < 1e-6;
    default:
      return String(v) === String(q.answer);
  }
}
