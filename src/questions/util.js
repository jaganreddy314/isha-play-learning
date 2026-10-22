export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Answer plus up to n-1 distinct distractors, shuffled. Everything is compared as strings.
export function options(answer, distractors, n = 4) {
  const out = [String(answer)];
  for (const d of shuffle(distractors)) {
    const s = String(d);
    if (out.length >= n) break;
    if (s && !out.includes(s)) out.push(s);
  }
  return shuffle(out);
}

export const numberOptions = (answer, distractors, n = 4) =>
  options(answer, distractors.filter((d) => Number.isInteger(d) && d >= 0), n);
