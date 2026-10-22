// Synthesised sound effects (no audio files) and read-aloud via the Web Speech API.
export const audioPrefs = { sound: true, voice: true };

let ctx = null, master = null;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function note(freq, start, dur, { type = 'sine', vol = 0.3, slide = 0 } = {}) {
  if (!audioPrefs.sound) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  tap: () => note(660, 0, 0.08, { type: 'triangle', vol: 0.18 }),
  pop: () => note(520, 0, 0.12, { vol: 0.22, slide: 1.8 }),
  tick: () => note(1500, 0, 0.03, { type: 'square', vol: 0.04 }),
  hop: () => note(300, 0, 0.2, { vol: 0.22, slide: 2.4 }),
  correct: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.08, 0.28, { type: 'triangle', vol: 0.22 })),
  wrong: () => {
    note(330, 0, 0.16, { type: 'triangle', vol: 0.16 });
    note(247, 0.14, 0.3, { type: 'triangle', vol: 0.16 });
  },
  star: () => [1318.5, 1568, 2093].forEach((f, i) => note(f, i * 0.06, 0.22, { vol: 0.1 })),
  whoosh: () => note(200, 0, 0.5, { type: 'sine', vol: 0.12, slide: 3 }),
  crystal: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => note(f, i * 0.09, 0.5, { vol: 0.12 })),
  fanfare: () => [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.68], [1047, 0.82]].forEach(([f, t]) => note(f, t, 0.38, { type: 'triangle', vol: 0.2 })),
};

export function unlockAudio() {
  ac();
}

let voice;
function pickVoice() {
  const vs = window.speechSynthesis?.getVoices() || [];
  const prefs = ['Samantha', 'Karen', 'Moira', 'Google UK English Female', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny'];
  for (const p of prefs) {
    const v = vs.find((x) => x.name.includes(p));
    if (v) return v;
  }
  return vs.find((v) => v.lang?.startsWith('en')) || null;
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => (voice = pickVoice());
}

export function speak(text, { rate = 0.92, pitch = 1.08 } = {}) {
  stopSpeaking();
  if (!audioPrefs.voice || !window.speechSynthesis || !text) return;
  const clean = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/_{2,}/g, ' blank ')
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/↔|→/g, ' to ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return;
  const u = new SpeechSynthesisUtterance(clean);
  u.rate = rate;
  u.pitch = pitch;
  voice ??= pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang || 'en-GB';
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
