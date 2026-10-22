const KEY = 'isha-star-quest-v1';
export const SKILL_IDS = ['mult', 'div', 'clock', 'line', 'spell', 'grammar', 'vocab', 'sentences', 'reading'];
export const LEVEL_NAMES = ['', 'Explorer', 'Adventurer', 'Champion'];

export const newStory = () => ({ node: 'start', visited: [], path: ['village'], points: 0, possible: 0, crystals: [], flags: {}, golden: 0 });

function fresh() {
  return {
    player: { name: 'Isha', shirt: '#ff6b9a', setup: false },
    settings: { sound: true, voice: true },
    stars: 0,
    golden: 0,
    skills: Object.fromEntries(SKILL_IDS.map((t) => [t, { level: 1, streak: 0, miss: 0, right: 0, total: 0 }])),
    lessons: {},
    endings: [],
    journeys: 0,
    story: newStory(),
  };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved) return fresh();
    const base = fresh();
    return { ...base, ...saved, skills: { ...base.skills, ...saved.skills }, story: { ...base.story, ...saved.story } };
  } catch {
    return fresh();
  }
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

export function resetAll() {
  const f = fresh();
  f.player = { ...state.player };
  f.settings = { ...state.settings };
  Object.assign(state, f);
  save();
}

// Adaptive difficulty: 4 first-try answers in a row → level up; 2 misses in a row → level down.
export function recordAnswer(topic, firstTry) {
  const s = state.skills[topic];
  if (!s) return null;
  s.total++;
  if (firstTry) {
    s.right++;
    s.miss = 0;
    if (++s.streak >= 4 && s.level < 3) {
      s.level++;
      s.streak = 0;
      return 'up';
    }
  } else {
    s.streak = 0;
    if (++s.miss >= 2 && s.level > 1) {
      s.level--;
      s.miss = 0;
      return 'down';
    }
  }
  return null;
}
