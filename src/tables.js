// Times Table Dojo: a trick ("strategy") for every fact, spaced-repetition boxes, and the trick lessons.
// Ideas borrowed from fast mental calculators: split hard facts into easy ones (distributive law),
// doubling chains, Trachtenberg-style rules for 9 and 11, the Vedic "cross" for 6–9, and the 9s finger trick.
import { state, save } from './progress.js';
import { rand, pick, shuffle } from './questions/util.js';

export const MIN = 2, MAX = 12;
export const NUMS = Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN);
export const key = (a, b) => (a <= b ? `${a}x${b}` : `${b}x${a}`);
export const ALL_FACTS = NUMS.flatMap((a) => NUMS.filter((b) => b >= a).map((b) => [a, b]));

// Easiest table first: when a fact has two tables, we use the trick of the easier one.
const EASE = [10, 2, 5, 11, 9, 4, 3, 6, 8, 12, 7];
const rank = (t) => EASE.indexOf(t);

// Spaced repetition (Leitner boxes). Box 0 = not met yet, 1 = learning … 5 = mastered.
// A fact in box k comes back after INTERVAL[k] practice sessions.
const INTERVAL = [0, 0, 1, 2, 4, 7];
export const MASTERED = 4;
export const BOX_COLORS = ['#e9e6f5', '#ff8fa3', '#ffb703', '#ffe066', '#a7e8a0', '#2fbf71'];
export const BOX_NAMES = ['Not met yet', 'Learning', 'Getting there', 'Good', 'Strong', 'Mastered'];

export const BELTS = [
  { at: 0, name: 'White belt', color: '#f4f4f4' },
  { at: 8, name: 'Yellow belt', color: '#ffd60a' },
  { at: 18, name: 'Orange belt', color: '#ff9f1c' },
  { at: 30, name: 'Green belt', color: '#2fbf71' },
  { at: 42, name: 'Blue belt', color: '#3a86ff' },
  { at: 56, name: 'Brown belt', color: '#8d5524' },
  { at: ALL_FACTS.length, name: 'Black belt', color: '#222222' },
];

export function dojo() {
  state.dojo ??= { facts: {}, sessions: 0, best: 0, sprints: 0, tricks: {} };
  return state.dojo;
}
export const fact = (a, b) => dojo().facts[key(a, b)] || { box: 0, last: -99, right: 0, seen: 0 };
export const mastered = () => ALL_FACTS.filter(([a, b]) => fact(a, b).box >= MASTERED).length;
export function belt() {
  const m = mastered();
  const i = BELTS.findLastIndex((b) => m >= b.at);
  return { ...BELTS[i], next: BELTS[i + 1], mastered: m };
}

// Fast + first try → up a box. Correct but slow → stays. Wrong → back to box 1.
export function recordFact(a, b, firstTry, ms) {
  const d = dojo();
  const f = { ...fact(a, b) };
  f.seen++;
  f.last = d.sessions;
  if (firstTry) {
    f.right++;
    if (ms < 6000 || f.box === 0) f.box = Math.min(5, f.box + 1);
  } else f.box = 1;
  d.facts[key(a, b)] = f;
  save();
  return f;
}

// Learning order grows outward from the easy tables: a fact is new only when its harder number is,
// so the tables mix (10×2, 2×2, 5×10, 2×5 …) instead of drilling one table at a time.
const difficulty = ([a, b]) => Math.max(rank(a), rank(b)) + Math.min(rank(a), rank(b)) * 0.5 - (a === b ? 1 : 0) + Math.random() * 0.3;
const LEARN_ORDER = [...ALL_FACTS].sort((x, y) => difficulty(x) - difficulty(y));

// A practice session: due facts (weakest first) plus up to 3 new ones, mixed together (interleaving).
export function sessionFacts(n = 10) {
  const d = dojo();
  const due = ALL_FACTS.filter(([a, b]) => {
    const f = fact(a, b);
    return f.box > 0 && d.sessions - f.last >= INTERVAL[f.box];
  }).sort((x, y) => fact(...x).box - fact(...y).box || fact(...x).last - fact(...y).last);
  const fresh = LEARN_ORDER.filter(([a, b]) => fact(a, b).box === 0);
  const picked = due.slice(0, n - Math.min(3, fresh.length));
  picked.push(...fresh.slice(0, n - picked.length));
  if (picked.length < n) {
    const rest = ALL_FACTS.filter((f) => !picked.includes(f)).sort((x, y) => fact(...x).last - fact(...y).last);
    picked.push(...rest.slice(0, n - picked.length));
  }
  return shuffle(picked).map(([a, b]) => (Math.random() < 0.5 ? [a, b] : [b, a]));
}

// Speed Sprint pool: everything already met, plus the easy tables. Weaker facts come up more.
export function sprintFact(prev) {
  const met = ALL_FACTS.filter(([a, b]) => fact(a, b).box > 0 || [2, 5, 10].includes(a));
  const pool = met.flatMap((f) => Array(6 - Math.min(5, fact(...f).box)).fill(f));
  let f;
  do f = pick(pool);
  while (prev && f === prev && pool.length > 6);
  return f;
}

// ---------- the trick for each fact ----------
const ARR = (rows, cols, o = {}) => ({ type: 'split', rows, cols, ...o });

// `table` forces which table's trick to use (in Trick School); otherwise the easier table wins.
export function strategy(a, b, table) {
  const [n, t] = table ? (a === table ? [b, a] : [a, b]) : rank(a) <= rank(b) ? [b, a] : [a, b]; // t = the table, n = the other number
  const p = n * t;
  if (t === 10) return { name: 'Add a zero', text: `${n} × 10: just put a 0 on the end of ${n} → ${p}.`, visual: { type: 'card', text: `${n} × 10 = ${p}`, sub: 'add a zero', emoji: '🔟' } };
  if (t === 2) return { name: 'Doubles', text: `Times 2 is a double: ${n} + ${n} = ${p}.`, visual: ARR(n, 2, { split: 1, labels: [`${n}`, `+ ${n}`] }) };
  if (t === 5) return { name: 'Half of ten', text: `${n} × 10 = ${n * 10}. Half of ${n * 10} is ${p}.`, visual: ARR(n, 10, { ghost: 5, labels: [`${n} × 10 = ${n * 10}`, `half → ${p}`] }) };
  if (t === 11 && n <= 9) return { name: 'Twin digits', text: `11 × ${n}: write ${n} twice → ${p}.`, visual: { type: 'card', text: `11 × ${n} = ${p}`, sub: 'twin digits', emoji: '👯' } };
  if (t === 11) return { name: 'Ten and one more', text: `${n} × 10 = ${n * 10}, plus one more ${n} = ${p}.`, visual: ARR(n, 11, { split: 10, labels: [`${n * 10}`, `+ ${n}`] }) };
  if (t === 9 && n <= 10) return { name: 'Ten minus one', text: `${n} × 10 = ${n * 10}, take away one ${n} → ${p}. (Check: ${String(p).split('').join(' + ')} = 9!)`, visual: { type: 'fingers', n } };
  if (t === 9) return { name: 'Ten minus one', text: `${n} × 10 = ${n * 10}, take away one ${n} → ${p}.`, visual: ARR(n, 10, { ghost: 1, labels: [`${n} × 10 = ${n * 10}`, `− ${n} → ${p}`] }) };
  if (t === 4) return { name: 'Double double', text: `Double ${n} is ${2 * n}, double again is ${p}.`, visual: ARR(n, 4, { split: 2, labels: [`${2 * n}`, `+ ${2 * n}`] }) };
  if (t === 3) return { name: 'Double + one more', text: `Double ${n} is ${2 * n}, plus one more ${n} = ${p}.`, visual: ARR(n, 3, { split: 2, labels: [`${2 * n}`, `+ ${n}`] }) };
  if (t === 6 && n % 2 === 0 && n <= 8) return { name: 'Even sixes', text: `6 × an even number ends in that number: 6 × ${n} = ${p}. Or 5 × ${n} = ${5 * n}, plus ${n}.`, visual: ARR(n, 6, { split: 5, labels: [`${5 * n}`, `+ ${n}`] }) };
  if (t === 6) return { name: 'Five + one more', text: `5 × ${n} = ${5 * n}, plus one more ${n} = ${p}.`, visual: ARR(n, 6, { split: 5, labels: [`${5 * n}`, `+ ${n}`] }) };
  if (t === 8) return { name: 'Double, double, double', text: `Double ${n} three times: ${2 * n} → ${4 * n} → ${p}.`, visual: ARR(n, 8, { split: 4, labels: [`${4 * n}`, `+ ${4 * n}`] }) };
  if (t === 12) return { name: 'Ten + two', text: `${n} × 10 = ${n * 10}, plus ${n} × 2 = ${2 * n}. Together ${p}.`, visual: ARR(n, 12, { split: 10, labels: [`${n * 10}`, `+ ${2 * n}`] }) };
  if (t === 7 && n === 8) return { name: '5, 6, 7, 8', text: 'Count 5, 6, 7, 8 → 56 = 7 × 8! Or 5 × 8 = 40, plus 2 × 8 = 16.', visual: ARR(8, 7, { split: 5, labels: ['40', '+ 16'] }) };
  return { name: 'Five + two', text: `5 × ${n} = ${5 * n}, plus 2 × ${n} = ${2 * n}. Together ${p}.`, visual: ARR(n, 7, { split: 5, labels: [`${5 * n}`, `+ ${2 * n}`] }) };
}

// Vedic "cross" works neatly for 6–9 when the two gaps from 10 multiply to less than 10.
export const vedicOk = (a, b) => a >= 6 && a <= 9 && b >= 6 && b <= 9 && (10 - a) * (10 - b) < 10;

// A keypad question for one fact, with the trick as the hint and its picture shown after a miss.
export function factQuestion(a, b, extra = {}, table) {
  const s = strategy(a, b, table);
  const p = a * b;
  return {
    kind: 'number',
    topic: 'mult',
    fact: [a, b],
    noLevel: true,
    prompt: `<b class="eq">${a} × ${b} = ?</b>`,
    say: `What is ${a} times ${b}?`,
    answer: String(p),
    answerText: String(p),
    hint: `${s.name} trick: ${s.text}`,
    explain: `${s.text}`,
    visual: { type: 'card', text: `${a} × ${b}`, emoji: '🥋', color: '#ff6b6b' },
    hintVisual: s.visual,
    ...extra,
  };
}

// ---------- trick lessons ----------
const card = (text, sub, emoji) => ({ type: 'card', text, sub, emoji });
const skip = (t, hops = 10) => ({ type: 'line', min: 0, max: t * hops, step: t, labelEvery: 1, frog: 0, hop: t, hops, hintMode: 'hop' });

export const TRICKS = [
  { id: 'turn', emoji: '🔄', name: 'Turnaround', tables: [], steps: [
    { text: 'The first secret of fast mathematicians: 3 × 7 is the same as 7 × 3. Turn the picture and nothing changes!', visual: ARR(3, 7), after: 'reveal' },
    { text: 'See? 7 rows of 3 is still 21. So every fact you learn gives you a second one free.', visual: ARR(7, 3), after: 'reveal' },
    { text: 'Always flip to the easier table. 7 × 2 is hard? Think 2 × 7: just double 7!', visual: card('7 × 2 = 2 × 7', 'flip it!', '🔄') },
  ] },
  { id: 't2', emoji: '👯', name: '× 2 Doubles', tables: [2], steps: [
    { text: 'Times 2 means doubling: a number plus itself. Here are 7 rows of 2.', visual: ARR(7, 2, { split: 1, labels: ['7', '+ 7'] }) },
    { text: 'One column is 7, the other column is 7. 7 + 7 = 14, so 7 × 2 = 14.', visual: ARR(7, 2, { split: 1, labels: ['7', '+ 7'] }), after: 'reveal' },
    { text: 'Doubles are the superpower behind 4s and 8s too. Let\'s hop in 2s!', visual: skip(2), after: 'hint' },
  ] },
  { id: 't10', emoji: '🔟', name: '× 10 Add a zero', tables: [10], steps: [
    { text: 'Times 10 makes every digit slide one place to the left, and a zero fills the gap.', visual: card('6 → 60', 'slide left, add 0', '🔟') },
    { text: 'So 6 × 10 = 60 and 12 × 10 = 120. Ten is the easiest table of all!', visual: card('12 × 10 = 120', 'add a zero', '✨') },
  ] },
  { id: 't5', emoji: '🖐️', name: '× 5 Half of ten', tables: [5], steps: [
    { text: 'Fives are half of tens! Here is 6 × 10 = 60.', visual: ARR(6, 10, { ghost: 5, labels: ['6 × 10 = 60', 'half → 30'] }) },
    { text: 'Cover half of them… 6 × 5 is half of 60, which is 30.', visual: ARR(6, 10, { ghost: 5, labels: ['6 × 10 = 60', 'half → 30'] }), after: 'reveal' },
    { text: 'Fives always end in 5 or 0 — just like the minutes on a clock: 5, 10, 15, 20…', visual: { type: 'clock', h: 12, m: 20 }, after: 'hint' },
  ] },
  { id: 't11', emoji: '🪞', name: '× 11 Twin digits', tables: [11], steps: [
    { text: 'Elevens up to 9 are twins: write the number twice! 11 × 4 = 44, 11 × 7 = 77.', visual: card('11 × 7 = 77', 'twin digits', '🪞') },
    { text: 'For bigger ones, do ten and one more: 11 × 12 = 120 + 12 = 132.', visual: ARR(12, 11, { split: 10, labels: ['120', '+ 12'] }), after: 'reveal' },
  ] },
  { id: 't9', emoji: '✋', name: '× 9 Finger magic', tables: [9], steps: [
    { text: 'Hold up 10 fingers. To do 9 × 4, fold down finger number 4.', visual: { type: 'fingers', n: 4 }, after: 'hint' },
    { text: 'Fingers before the fold are tens: 3. Fingers after are ones: 6. So 9 × 4 = 36! Tap any finger to try it.', visual: { type: 'fingers', n: 4, open: true }, after: 'reveal' },
    { text: 'Another way: 9 is 10 minus 1. 7 × 10 = 70, take away one 7 → 63.', visual: ARR(7, 10, { ghost: 1, labels: ['7 × 10 = 70', '− 7 → 63'] }), after: 'reveal' },
    { text: 'Check your 9s: the digits always add up to 9. 63 → 6 + 3 = 9. And the tens digit is one less than the number: 9 × 7 → 6_.', visual: card('18 27 36 45 54', 'digits add to 9', '🔍') },
  ] },
  { id: 't4', emoji: '🧱', name: '× 4 Double double', tables: [4], steps: [
    { text: 'Fours are doubles of doubles. 6 × 4: double 6 is 12…', visual: ARR(6, 4, { split: 2, labels: ['12', '+ 12'] }) },
    { text: '…and double 12 is 24. So 6 × 4 = 24.', visual: ARR(6, 4, { split: 2, labels: ['12', '+ 12'] }), after: 'reveal' },
  ] },
  { id: 't3', emoji: '🍀', name: '× 3 Double + one', tables: [3], steps: [
    { text: 'Threes are a double plus one more group. 7 × 3: double 7 is 14…', visual: ARR(7, 3, { split: 2, labels: ['14', '+ 7'] }) },
    { text: '…plus one more 7 makes 21!', visual: ARR(7, 3, { split: 2, labels: ['14', '+ 7'] }), after: 'reveal' },
    { text: 'Let\'s hop in 3s to hear the pattern: 3, 6, 9, 12…', visual: skip(3), after: 'hint' },
  ] },
  { id: 't6', emoji: '🎲', name: '× 6 Five + one', tables: [6], steps: [
    { text: 'Sixes are fives plus one more group. 7 × 6: 5 × 7 = 35…', visual: ARR(7, 6, { split: 5, labels: ['35', '+ 7'] }) },
    { text: '…plus one more 7 = 42!', visual: ARR(7, 6, { split: 5, labels: ['35', '+ 7'] }), after: 'reveal' },
    { text: 'Secret pattern: 6 times an even number ends with that number. 6 × 2 = 12, 6 × 4 = 24, 6 × 6 = 36, 6 × 8 = 48!', visual: card('6×4=24  6×8=48', 'even sixes', '🎲') },
  ] },
  { id: 't8', emoji: '🐙', name: '× 8 Triple double', tables: [8], steps: [
    { text: 'Eights are double, double, double! 7 × 8: 7 → 14 → 28 → 56.', visual: card('7 → 14 → 28 → 56', 'double 3 times', '🐙') },
    { text: 'In the picture: 7 × 4 = 28 on each side. 28 + 28 = 56.', visual: ARR(7, 8, { split: 4, labels: ['28', '+ 28'] }), after: 'reveal' },
    { text: 'And a rhyme fast counters love: 5, 6, 7, 8 → 56 = 7 × 8!', visual: card('56 = 7 × 8', '5, 6, 7, 8', '🎵') },
  ] },
  { id: 't7', emoji: '🌈', name: '× 7 Five + two', tables: [7], steps: [
    { text: 'Sevens are tricky, so we split them: 7 = 5 + 2. For 6 × 7, do 6 × 5 = 30…', visual: ARR(6, 7, { split: 5, labels: ['30', '+ 12'] }) },
    { text: '…and 6 × 2 = 12. Add them: 30 + 12 = 42. Splitting makes any fact easy!', visual: ARR(6, 7, { split: 5, labels: ['30', '+ 12'] }), after: 'reveal' },
  ] },
  { id: 't12', emoji: '🕛', name: '× 12 Ten + two', tables: [12], steps: [
    { text: 'Twelves are tens plus twos. 6 × 12: 6 × 10 = 60…', visual: ARR(6, 12, { split: 10, labels: ['60', '+ 12'] }) },
    { text: '…plus 6 × 2 = 12. So 6 × 12 = 72.', visual: ARR(6, 12, { split: 10, labels: ['60', '+ 12'] }), after: 'reveal' },
  ] },
  { id: 'vedic', emoji: '⚡', name: 'Vedic cross (6–9)', tables: [6, 7, 8, 9], vedic: true, steps: [
    { text: 'An ancient Indian trick for big times tables! Let\'s do 8 × 7. First, how far is each number from 10?', visual: { type: 'vedic', a: 8, b: 7, stage: 1 }, after: 'hint' },
    { text: '8 is 2 away, 7 is 3 away. Now cross over: 8 − 3 = 5. That is the tens digit.', visual: { type: 'vedic', a: 8, b: 7, stage: 2 }, after: 'hint' },
    { text: 'Multiply the gaps: 2 × 3 = 6. That is the ones digit. So 8 × 7 = 56!', visual: { type: 'vedic', a: 8, b: 7, stage: 3 }, after: 'hint' },
    { text: 'Try it with 9 × 6: gaps 1 and 4. Cross: 9 − 4 = 5. Gaps: 1 × 4 = 4. Answer 54!', visual: { type: 'vedic', a: 9, b: 6, stage: 3 }, after: 'hint' },
  ] },
];

// Five keypad questions that use one trick.
export function trickQuestions(trick, n = 5) {
  const out = [];
  const seen = new Set();
  for (let tries = 0; out.length < n && tries < 80; tries++) {
    let a, b;
    if (trick.vedic) [a, b] = [rand(6, 9), rand(6, 9)];
    else if (!trick.tables.length) [a, b] = [rand(2, 9), rand(2, 9)];
    else [a, b] = [pick(trick.tables), rand(2, 12)];
    if (trick.vedic && !vedicOk(a, b)) continue;
    if (seen.has(key(a, b)) && tries < 40) continue;
    seen.add(key(a, b));
    const t = trick.tables.length === 1 ? a : undefined;
    const q = Math.random() < 0.5 ? factQuestion(b, a, {}, t) : factQuestion(a, b, {}, t);
    if (trick.vedic) {
      q.hint = `Vedic cross: gaps from 10 are ${10 - a} and ${10 - b}. ${a} − ${10 - b} = ${a - 10 + b}, ${10 - a} × ${10 - b} = ${(10 - a) * (10 - b)}.`;
      q.explain = `Cross: ${a} − ${10 - b} = ${a + b - 10} tens. Gaps: ${10 - a} × ${10 - b} = ${(10 - a) * (10 - b)} ones. So ${a * b}.`;
      q.hintVisual = { type: 'vedic', a, b, stage: 3 };
    }
    out.push(q);
  }
  return out;
}
