import { rand, pick, chance, numberOptions, options } from './util.js';

// Every generator returns a question:
// { kind: 'choice' | 'clock-set' | 'line-tap' | 'spell', prompt (html), say?, choices?, answer,
//   answerText, hint, explain, visual: { type, ... } }

const helpers = (ctx) => ['Baker Bun', 'Hoot', 'Nutty', 'Petal', ctx.name];

// ---------- multiplication ----------
const ARRAY_THEMES = [
  { item: 'muffin', things: 'muffins', group: 'trays', each: 'on each tray' },
  { item: 'gem', things: 'gems', group: 'boxes', each: 'in each box' },
  { item: 'apple', things: 'apples', group: 'baskets', each: 'in each basket' },
  { item: 'star', things: 'stars', group: 'rows', each: 'in each row' },
];

export function mult(level, ctx) {
  const tables = level === 1 ? [2, 3, 4, 5, 10] : level === 2 ? [2, 3, 4, 5, 6, 7, 8, 9, 10] : [3, 4, 6, 7, 8, 9, 11, 12];
  const a = rand(2, level === 1 ? 6 : level === 2 ? 9 : 12);
  const b = pick(tables);
  const n = a * b;
  const t = pick(ARRAY_THEMES);
  const visual = { type: 'array', rows: a, cols: b, item: t.item };
  const skip = [1, 2, 3].map((k) => k * b).join(', ');

  if (level >= 2 && chance(0.3)) {
    return {
      kind: 'choice',
      prompt: `<b class="eq">${a} × ? = ${n}</b>`,
      say: `${a} times what number equals ${n}?`,
      choices: numberOptions(b, [b + 1, b - 1, b + 2, b - 2, a, n - a]),
      answer: String(b),
      answerText: String(b),
      hint: `There are ${a} rows. How many are in each row? Count by ${a}s up to ${n}.`,
      explain: `${a} × ${b} = ${n}, so the missing number is ${b}.`,
      visual,
    };
  }
  const prompt = chance(0.5)
    ? `${pick(helpers(ctx))} has <b>${a} ${t.group}</b> with <b>${b} ${t.things}</b> ${t.each}. How many ${t.things} are there in all?`
    : `<b class="eq">${a} × ${b} = ?</b>`;
  return {
    kind: 'choice',
    prompt,
    say: prompt.includes('×') ? `What is ${a} times ${b}?` : undefined,
    choices: numberOptions(n, [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, n + 1, n - 1, a + b, n + 10]),
    answer: String(n),
    answerText: String(n),
    hint: `Tap the rows or skip count by ${b}s: ${skip}…`,
    explain: `${a} groups of ${b} make ${n}. So ${a} × ${b} = ${n}.`,
    visual,
  };
}

// ---------- division ----------
const SHARE_THEMES = [
  { item: 'berry', things: 'berries', who: 'bunnies' },
  { item: 'acorn', things: 'acorns', who: 'squirrels' },
  { item: 'cookie', things: 'cookies', who: 'friends' },
];

export function div(level, ctx) {
  const d = level === 1 ? rand(2, 5) : level === 2 ? rand(2, 9) : rand(3, 12);
  const q = level === 1 ? rand(2, 5) : level === 2 ? rand(2, 9) : rand(3, 12);
  const total = d * q;
  const t = pick(SHARE_THEMES);
  const styles = level === 1 ? ['share', 'share', 'plain'] : level === 2 ? ['share', 'group', 'plain'] : ['plain', 'fact', 'missing', 'group'];
  const style = pick(styles);
  const base = {
    kind: 'choice',
    answer: String(q),
    answerText: String(q),
    choices: numberOptions(q, [q + 1, q - 1, q + 2, d === q ? q + 3 : d, total - d]),
    hint: `Share them out one at a time into ${d} equal groups. Or think: ${d} × ? = ${total}.`,
    explain: `${total} ÷ ${d} = ${q}, because ${d} × ${q} = ${total}.`,
    visual: { type: 'share', total, groups: d, mode: 'share', item: t.item },
  };
  switch (style) {
    case 'share':
      return {
        ...base,
        prompt: `${pick(helpers(ctx))} has <b>${total} ${t.things}</b> to share equally between <b>${d} ${t.who}</b>. How many does each one get? <small>Tap the pile to share them out!</small>`,
      };
    case 'group':
      return {
        ...base,
        prompt: `There are <b>${total} ${t.things}</b>. Put <b>${d}</b> in each bag. How many bags do you need? <small>Tap the pile to fill the bags!</small>`,
        hint: `Fill one bag with ${d}, then another… Or think: how many ${d}s make ${total}?`,
        explain: `${total} ÷ ${d} = ${q}, because ${q} bags of ${d} make ${total}.`,
        visual: { type: 'share', total, groups: q, per: d, mode: 'group', item: t.item },
      };
    case 'fact':
      return {
        ...base,
        prompt: `If <b>${d} × ${q} = ${total}</b>, then what is <b class="eq">${total} ÷ ${d}</b>?`,
        say: `If ${d} times ${q} is ${total}, what is ${total} divided by ${d}?`,
        hint: 'Multiplication and division are a family! Look at the numbers you already know.',
      };
    case 'missing':
      return {
        ...base,
        prompt: `<b class="eq">? ÷ ${d} = ${q}</b>`,
        say: `What number divided by ${d} equals ${q}?`,
        answer: String(total),
        answerText: String(total),
        choices: numberOptions(total, [total + d, total - d, total + 1, d + q, total + 10]),
        hint: `Turn it around: ${d} × ${q} = ?`,
        explain: `${d} × ${q} = ${total}, so ${total} ÷ ${d} = ${q}.`,
        visual: { type: 'card', text: `? ÷ ${d} = ${q}`, emoji: '🧺' },
      };
    default:
      return { ...base, prompt: `<b class="eq">${total} ÷ ${d} = ?</b>`, say: `What is ${total} divided by ${d}?` };
  }
}

// ---------- clocks ----------
const HOUR_WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const digital = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
const nextHour = (h) => (h % 12) + 1;

export function clockWords(h, m) {
  if (m === 0) return `${HOUR_WORDS[h]} o'clock`;
  if (m === 15) return `quarter past ${HOUR_WORDS[h]}`;
  if (m === 30) return `half past ${HOUR_WORDS[h]}`;
  if (m === 45) return `quarter to ${HOUR_WORDS[nextHour(h)]}`;
  if (m < 30) return `${m} minute${m === 1 ? '' : 's'} past ${HOUR_WORDS[h]}`;
  return `${60 - m} minute${60 - m === 1 ? '' : 's'} to ${HOUR_WORDS[nextHour(h)]}`;
}

function addMinutes(h, m, add) {
  const t = ((h % 12) * 60 + m + add) % 720;
  return { h: Math.floor(t / 60) || 12, m: t % 60 };
}

function minuteSpot(m) {
  if (m === 0) return 'points to 12 (o\'clock)';
  if (m % 5 === 0) return `points to ${m / 5} — that's ${m} minutes`;
  return `is at ${m} minutes`;
}

function clockExplain(h, m) {
  const hourPart = m === 0 ? `points to ${h}` : m < 30 ? `is just past ${h}` : `is between ${h} and ${nextHour(h)}`;
  return `The short hand ${hourPart} and the long hand ${minuteSpot(m)}. That's ${digital(h, m)} — ${clockWords(h, m)}.`;
}

export function clock(level) {
  const h = rand(1, 12);
  let m;
  if (level === 1) m = pick([0, 30]);
  else if (level === 2) m = chance(0.5) ? pick([0, 15, 30, 45]) : rand(1, 11) * 5;
  else m = chance(0.5) ? rand(0, 11) * 5 : rand(0, 59);
  const step = level === 3 ? 1 : 5;

  if (level === 3 && chance(0.4)) {
    const sm = rand(0, 11) * 5;
    const dur = pick([15, 20, 30, 40, 45, 60, 90]);
    const end = addMinutes(h, sm, dur);
    const durText = dur === 60 ? '1 hour' : dur === 90 ? '1 hour and 30 minutes' : `${dur} minutes`;
    const event = pick(['puppet show', 'football match', 'swimming lesson', 'movie', 'birthday party']);
    return {
      kind: 'clock-set',
      prompt: `The ${event} starts at <b>${digital(h, sm)}</b> and lasts <b>${durText}</b>. Move the hands to show when it ends.`,
      answer: end,
      answerText: digital(end.h, end.m),
      hint: `Move the long hand forward ${durText}. Each number on the clock is 5 minutes.`,
      explain: `${digital(h, sm)} + ${durText} = ${digital(end.h, end.m)}.`,
      visual: { type: 'clock', h, m: sm, step: 5 },
    };
  }

  if (chance(0.5)) {
    const asWords = level > 1 && chance(0.5);
    const target = asWords ? clockWords(h, m) : digital(h, m);
    return {
      kind: 'clock-set',
      prompt: `Move the hands to show <b>${target}</b>. <small>Long blue hand = minutes · short red hand = hours</small>`,
      answer: { h, m },
      answerText: digital(h, m),
      hint: 'The short hand points to the hour. The long hand counts minutes — each number is 5 more: 5, 10, 15…',
      explain: clockExplain(h, m),
      visual: { type: 'clock', h: 12, m: 0, step, digital: level === 1 },
    };
  }

  const wrongs = [
    addMinutes(h, m, 60), addMinutes(h, m, -60), addMinutes(h, m, level === 1 ? 30 : 5), addMinutes(h, m, level === 1 ? -30 : -15),
  ];
  if (m % 5 === 0 && m > 0) wrongs.push({ h: m / 5, m: (h * 5) % 60 }); // mixing up the two hands
  const asWords = level > 1 && chance(0.4);
  const fmt = (t) => (asWords ? clockWords(t.h, t.m) : digital(t.h, t.m));
  return {
    kind: 'choice',
    prompt: asWords ? 'Which words match the clock?' : 'What time does the clock show?',
    choices: options(fmt({ h, m }), wrongs.map(fmt)),
    answer: fmt({ h, m }),
    answerText: fmt({ h, m }),
    hint: 'Look at the short hand first for the hour. Then count by 5s with the long hand.',
    explain: clockExplain(h, m),
    visual: { type: 'clock', h, m },
  };
}

// ---------- number lines ----------
function lineQuestion(level) {
  const types = level === 1 ? ['place', 'read', 'jump'] : level === 2 ? ['place', 'read', 'jump', 'round10', 'fracPlace'] : ['place', 'round10', 'round100', 'fracPlace', 'fracRead', 'jump'];
  return pick(types);
}

function lineRange(level) {
  if (level === 1) return chance(0.5) ? { min: 0, max: 10, step: 1, labelEvery: 5 } : { min: 0, max: 100, step: 10, labelEvery: 5 };
  if (level === 2) {
    const a = rand(0, 8) * 10;
    return { min: a, max: a + 20, step: 1, labelEvery: 10 };
  }
  return { min: 0, max: 1000, step: 50, labelEvery: 4 };
}

const frac = (n, d) => (n === 0 ? '0' : n === d ? '1' : `${n}/${d}`);

export function line(level) {
  const type = lineQuestion(level);

  if (type === 'place' || type === 'read') {
    const r = lineRange(level);
    const steps = Math.round((r.max - r.min) / r.step);
    let i;
    do i = rand(1, steps - 1); while (i % r.labelEvery === 0);
    const value = r.min + i * r.step;
    const base = r.min + Math.floor(i / r.labelEvery) * r.labelEvery * r.step;
    const k = (value - base) / r.step;
    const explain = `Start at ${base} and count ${k} little jump${k > 1 ? 's' : ''} of ${r.step}: you reach ${value}.`;
    if (type === 'place') {
      return {
        kind: 'line-tap',
        prompt: `Tap the number line to show where <b>${value}</b> goes.`,
        answer: value,
        answerText: String(value),
        hint: `Each little line is a jump of ${r.step}. Start at ${base} and count up.`,
        explain,
        visual: { type: 'line', ...r, hintMode: 'labels' },
      };
    }
    const near = [value + r.step, value - r.step, value + 2 * r.step, value - 2 * r.step, i];
    return {
      kind: 'choice',
      prompt: 'What number is the arrow pointing to?',
      choices: numberOptions(value, near.filter((v) => v >= r.min && v <= r.max)),
      answer: String(value),
      answerText: String(value),
      hint: `Each little line is a jump of ${r.step}. Count from ${base}.`,
      explain,
      visual: { type: 'line', ...r, arrow: value, hintMode: 'labels' },
    };
  }

  if (type === 'jump') {
    let r, start, hop, count;
    if (level === 1) {
      r = { min: 0, max: 20, step: 1, labelEvery: 5 };
      hop = 1;
      count = rand(2, 8);
      start = rand(0, 12);
    } else if (level === 2) {
      r = { min: 0, max: 100, step: 10, labelEvery: 1 };
      hop = 10;
      count = rand(2, 4);
      start = rand(1, 5) * 10 + rand(1, 9);
    } else {
      r = { min: 0, max: 1000, step: 100, labelEvery: 1 };
      hop = 100;
      count = rand(2, 4);
      start = rand(1, 4) * 100 + rand(1, 9) * 10;
    }
    const back = start - hop * count >= r.min && chance(0.4);
    if (!back && start + hop * count > r.max) start = r.max - hop * count - rand(0, 3) * (hop === 1 ? 1 : hop / 10);
    const sign = back ? -1 : 1;
    const end = start + sign * hop * count;
    const amount = hop * count;
    return {
      kind: 'choice',
      prompt: `Freddie the frog is on <b>${start}</b>. He hops <b>${back ? 'back' : 'forward'} ${amount}</b>${hop > 1 ? ` (${count} jumps of ${hop})` : ''}. Where does he land?`,
      choices: numberOptions(end, [end + hop, end - hop, start - sign * amount, end + 1, end - 1, start + sign * count]),
      answer: String(end),
      answerText: String(end),
      hint: `Watch Freddie hop ${count} times, ${hop} each time${back ? ' — going back means take away' : ''}!`,
      explain: `${start} ${back ? '−' : '+'} ${amount} = ${end}.`,
      visual: { type: 'line', ...r, frog: start, hop: sign * hop, hops: count, hintMode: 'hop' },
    };
  }

  if (type === 'round10' || type === 'round100') {
    const big = type === 'round100';
    const unit = big ? 100 : 10;
    const lo = big ? rand(1, 8) * 100 : level === 3 ? rand(10, 99) * 10 : rand(1, 9) * 10;
    let off;
    do off = big ? rand(1, 99) : rand(1, 9); while (level === 2 && off === 5);
    const v = lo + off;
    const ans = off >= unit / 2 ? lo + unit : lo;
    return {
      kind: 'choice',
      prompt: `Round <b>${v}</b> to the nearest ${big ? 'hundred' : 'ten'}.`,
      choices: options(ans, [lo, lo + unit, lo + unit / 2]),
      answer: String(ans),
      answerText: String(ans),
      hint: `Find the halfway number, ${lo + unit / 2}. Is ${v} before or after it? (Halfway rounds up!)`,
      explain: `${v} is closer to ${ans}${off === unit / 2 ? ' — it is exactly halfway, and halfway rounds up' : ''}. So ${v} rounds to ${ans}.`,
      visual: { type: 'line', min: lo, max: lo + unit, step: unit / 10, labelEvery: 10, mark: v, hintMode: 'half' },
    };
  }

  const d = level === 2 ? pick([2, 4]) : pick([2, 3, 4, 6, 8]);
  const n = rand(1, d - 1);
  const visual = { type: 'line', min: 0, max: 1, step: 1 / d, labelEvery: d, fmt: 'frac', den: d, hintMode: 'frac' };
  if (type === 'fracPlace') {
    return {
      kind: 'line-tap',
      prompt: `Tap where <b>${frac(n, d)}</b> goes on the number line.`,
      say: `Tap where ${n} over ${d} goes on the number line.`,
      answer: n / d,
      answerText: frac(n, d),
      hint: `The line from 0 to 1 is cut into ${d} equal parts. Count ${n} part${n > 1 ? 's' : ''} from 0.`,
      explain: `${frac(n, d)} means ${n} of ${d} equal parts. Count ${n} jump${n > 1 ? 's' : ''} from 0.`,
      visual,
    };
  }
  return {
    kind: 'choice',
    prompt: 'What fraction is the arrow pointing to?',
    choices: options(frac(n, d), [frac(Math.min(n + 1, d - 1), d), frac(Math.max(n - 1, 1), d), `${n}/${d + 1}`, `${d - n}/${d}`, `${d}/${n}`]),
    answer: frac(n, d),
    answerText: frac(n, d),
    hint: `Count the equal parts between 0 and 1 — that's the bottom number. Then count jumps to the arrow.`,
    explain: `There are ${d} equal parts and the arrow is ${n} part${n > 1 ? 's' : ''} from 0, so it is ${frac(n, d)}.`,
    visual: { ...visual, arrow: n / d },
  };
}
