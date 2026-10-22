import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { World, LOCS, CHARACTERS } from './world.js';
import { createPuzzle } from './puzzles/index.js';
import { TOPICS, makeQuestion, readingQuestions, checkAnswer } from './questions/index.js';
import { shuffle, pick } from './questions/util.js';
import { STORY, ENDINGS, storyEdges } from './story.js';
import { LESSONS } from './lessons.js';
import { dojo, belt, fact, key, NUMS, ALL_FACTS, BOX_COLORS, BOX_NAMES, MASTERED, TRICKS, strategy, factQuestion, trickQuestions, sessionFacts, sprintFact, recordFact } from './tables.js';
import { state, save, newStory, recordAnswer, resetAll, LEVEL_NAMES } from './progress.js';
import { sfx, speak, stopSpeaking, unlockAudio, audioPrefs } from './sound.js';
import { wait } from './tween.js';

registerSW({ immediate: true });

const $ = (id) => document.getElementById(id);
const dock = $('dock'), overlay = $('overlay'), hud = $('hud');

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(c));
  return el;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fill = (text) => text.replaceAll('{name}', esc(state.player.name));
const SHIRTS = ['#ff6b9a', '#4cc9f0', '#80ed99', '#ffd166', '#9b5de5', '#ff924c'];

audioPrefs.sound = state.settings.sound;
audioPrefs.voice = state.settings.voice;

const world = new World($('scene'));
world.buildPaths(storyEdges());
world.setShirt(state.player.shirt);
world.setCrystals(state.story.crystals);
if (import.meta.env.DEV) window.__quest = { world, state, practice: (t) => run(() => practice(t)), teach: (t) => run(() => teach(t)), dojo: () => showDojo() };

// ---------- flow control: every screen change aborts whatever was waiting ----------
class Aborted extends Error {}
let flowId = 0;
const pending = new Set();

function waitUser(setup) {
  const id = flowId;
  return new Promise((resolve, reject) => {
    const entry = { reject };
    pending.add(entry);
    setup((v) => {
      pending.delete(entry);
      if (id === flowId) resolve(v);
    });
  });
}

async function guard(promise) {
  const id = flowId;
  const v = await promise;
  if (id !== flowId) throw new Aborted();
  return v;
}

function abortFlow() {
  flowId++;
  for (const p of pending) p.reject(new Aborted());
  pending.clear();
  stopSpeaking();
  world.clearPuzzle();
  setDock(null);
  overlay.replaceChildren();
}

function run(fn) {
  abortFlow();
  fn().catch((e) => {
    if (!(e instanceof Aborted)) console.error(e);
  });
}

// ---------- layout: tell the 3D stage how much of the screen the panels cover ----------
function measure() {
  const W = window.innerWidth, H = window.innerHeight;
  const insets = { top: hud.hidden ? 8 : hud.getBoundingClientRect().bottom + 4, bottom: 8, left: 8, right: 8 };
  if (!dock.hidden) {
    const r = dock.getBoundingClientRect();
    if (r.left > W * 0.3) insets.right = W - r.left + 8;
    else insets.bottom = H - r.top + 8;
  }
  world.setInsets(insets);
}
new ResizeObserver(measure).observe(dock);
window.addEventListener('resize', measure);

function setDock(content) {
  dock.replaceChildren();
  dock.hidden = !content;
  if (content) dock.append(content);
  measure();
}

function setHud(title, show = true) {
  hud.hidden = !show;
  $('hudTitle').textContent = title || '';
  $('starCount').textContent = state.stars;
  $('dots').replaceChildren();
  measure();
}

function setDots(results, total) {
  const d = $('dots');
  d.replaceChildren(
    ...Array.from({ length: total }, (_, i) => {
      const r = results[i];
      return h('i', { class: r ? (r.points === 2 ? 'ok' : r.points === 1 ? 'half' : 'miss') : i === results.length ? 'now' : '' });
    })
  );
}

function toast(text, ms = 2200) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), ms);
}

function flyStar(icon = '⭐') {
  const s = h('div', { class: 'fly-star' }, icon);
  document.body.append(s);
  const target = $('starCount').getBoundingClientRect();
  requestAnimationFrame(() => {
    s.style.transform = `translate(${target.left - window.innerWidth / 2}px, ${target.top - window.innerHeight * 0.4}px) scale(0.4)`;
    s.style.opacity = '0.3';
  });
  setTimeout(() => {
    s.remove();
    $('starCount').textContent = state.stars;
    $('starCount').parentElement.classList.add('bump');
    setTimeout(() => $('starCount').parentElement.classList.remove('bump'), 300);
  }, 750);
}

// ---------- dialogue & choices ----------
function speakerInfo(who) {
  const c = CHARACTERS[who] || CHARACTERS.narrator;
  return { name: who === 'you' ? state.player.name : c.name, emoji: c.emoji };
}

async function say(lines) {
  for (const [who, raw] of lines) {
    const text = fill(raw);
    const sp = speakerInfo(who);
    world.talk(who, Math.min(6, 1 + text.length / 18));
    speak(text);
    await waitUser((done) => {
      const next = h('button', { class: 'btn primary next', onclick: () => (sfx.tap(), done()) }, 'Next ▶');
      const box = h('div', { class: 'talk', onclick: () => (sfx.tap(), done()) },
        h('div', { class: 'portrait' }, sp.emoji),
        h('div', { class: 'bubble' }, sp.name ? h('b', {}, sp.name) : null, h('p', { html: text })),
      );
      setDock(h('div', { class: 'panel' }, box, h('div', { class: 'actions' }, next)));
    });
  }
}

function choose(options, prompt) {
  if (prompt) speak(prompt);
  return waitUser((done) => {
    setDock(h('div', { class: 'panel' },
      prompt ? h('p', { class: 'choose-prompt', html: fill(prompt) }) : null,
      h('div', { class: 'choice-list' }, options.map((o) => h('button', { class: 'btn choice', onclick: () => (sfx.tap(), done(o)) }, o.text))),
    ));
  });
}

// ---------- number keypad (typing the answer is stronger recall than picking one) ----------
function keypad(onEnter) {
  let val = '';
  const display = h('div', { class: 'kp-display' }, '?');
  const show = () => (display.textContent = val || '?');
  const press = (k) => {
    if (k === '✓') return val && onEnter(val);
    if (k === '⌫') val = val.slice(0, -1);
    else if (val.length < 3) val += k;
    sfx.tap();
    show();
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((k) =>
    h('button', { class: `btn kp ${k === '✓' ? 'primary' : k === '⌫' ? 'soft' : ''}`, 'aria-label': k === '⌫' ? 'Delete' : k === '✓' ? 'Check' : k, onclick: () => press(k) }, k));
  const onKey = (e) => {
    if (!display.isConnected) return window.removeEventListener('keydown', onKey);
    if (keys[0].disabled) return;
    const k = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? '⌫' : e.key === 'Enter' ? '✓' : null;
    if (!k) return;
    e.preventDefault();
    press(k);
  };
  window.addEventListener('keydown', onKey);
  return {
    el: h('div', { class: 'keypad' }, display, h('div', { class: 'kp-keys' }, keys)),
    clear() {
      val = '';
      show();
      display.classList.remove('wobble');
      void display.offsetWidth;
      display.classList.add('wobble');
    },
    set(v) {
      val = String(v);
      show();
    },
  };
}

// ---------- asking one question ----------
const PRAISE = ['Awesome!', 'Super star!', 'You got it!', 'Brilliant!', 'Fantastic!', 'Great thinking!', 'Nailed it!', 'Wonderful!'];
const PRAISE2 = ['You worked it out!', 'Great fixing!', 'Got it on the second try!'];

function ask(q, { index, total, timer = 0 }) {
  return waitUser((done) => {
    let attempts = 0, finished = false, firstMs = 0, kp = null;
    const startedAt = performance.now();
    const meta = TOPICS[q.topic] || TOPICS.reading;
    const feedback = h('div', { class: 'feedback', hidden: true });
    const answers = h('div', { class: `answers ${q.long || (q.choices || []).some((c) => c.length > 14) ? 'long' : ''}` });
    const actions = h('div', { class: 'actions' });
    let check;

    let puzzle = createPuzzle(q, {
      onChange: () => check && (check.disabled = puzzle.value() == null),
      onComplete: () => submit(puzzle.value()),
    });
    world.setPuzzle(puzzle);

    const hear = () => speak(q.say || `${q.passage && q.topic !== 'reading' ? q.passage + '. ' : ''}${q.prompt}`);
    const finish = (r) => {
      finished = true;
      r.ms = firstMs;
      const lvl = q.noLevel ? null : recordAnswer(q.topic, r.points === 2);
      if (lvl === 'up') toast(`⬆️ Level up! ${meta.name}: ${LEVEL_NAMES[state.skills[q.topic].level]}`);
      save();
      return r;
    };

    function submit(val, btn) {
      if (finished) return;
      if (val == null) return;
      if (!attempts++) firstMs = performance.now() - startedAt;
      const ok = checkAnswer(q, val);
      if (ok) {
        const points = attempts === 1 ? 2 : 1;
        const lightning = timer > 0 && points === 2 && (performance.now() - startedAt) / 1000 <= timer;
        if (points === 2) state.stars++;
        const r = finish({ points, lightning });
        sfx.correct();
        world.burst();
        btn?.classList.add('right');
        feedback.hidden = false;
        feedback.className = 'feedback good';
        feedback.textContent = `${pick(points === 2 ? PRAISE : PRAISE2)} ${lightning ? '⚡ Lightning fast!' : ''}`;
        speak(feedback.textContent);
        if (points === 2) flyStar(lightning ? '⚡' : '⭐');
        if (q.kind !== 'choice') puzzle.locked = true;
        answers.querySelectorAll('button').forEach((b) => (b.disabled = true));
        if (check) check.disabled = true;
        setTimeout(() => done(r), 1500);
        return;
      }
      sfx.wrong();
      world.shake();
      btn?.classList.add('wrong');
      if (btn) btn.disabled = true;
      feedback.hidden = false;
      kp?.clear();
      if (attempts === 1) {
        feedback.className = 'feedback hint';
        feedback.innerHTML = `Not quite — try again! 💡 ${esc(q.hint)}`;
        speak(`Not quite. ${q.hint}`);
        if (q.hintVisual) {
          // swap the plain question card for the picture of the trick
          puzzle = createPuzzle({ ...q, kind: 'demo', visual: q.hintVisual }, {});
          world.setPuzzle(puzzle);
          const p = puzzle;
          setTimeout(() => p.group.parent && p.hint(), 700);
        } else puzzle.hint();
        return;
      }
      const r = finish({ points: 0, lightning: false });
      kp?.set(q.answer);
      puzzle.reveal();
      answers.querySelectorAll('button').forEach((b) => {
        b.disabled = true;
        if (b.dataset.v === String(q.answer)) b.classList.add('right');
      });
      feedback.className = 'feedback show';
      feedback.innerHTML = `The answer is <b>${esc(q.answerText)}</b>. ${esc(q.explain)}`;
      speak(`The answer is ${q.answerText}. ${q.explain}`);
      actions.replaceChildren(h('button', { class: 'btn primary', onclick: () => (sfx.tap(), done(r)) }, 'Next ▶'));
    }

    if (q.kind === 'number') {
      kp = keypad((v) => submit(v));
      answers.className = 'answers pad';
      answers.append(kp.el);
    } else if (q.kind === 'choice') {
      for (const c of q.choices) answers.append(h('button', { class: 'btn answer', 'data-v': c, onclick: (e) => submit(c, e.currentTarget) }, c));
    } else {
      check = h('button', { class: 'btn primary', disabled: puzzle.value() == null, onclick: () => submit(puzzle.value()) }, 'Check ✓');
      if (q.kind === 'spell') {
        actions.append(
          h('button', { class: 'btn soft', onclick: () => speak(q.speakWord) }, '🔊 Word'),
          h('button', { class: 'btn soft', onclick: () => puzzle.clear() }, '↺ Clear'),
        );
      }
      actions.append(check);
    }
    if (q.speakWord && q.kind === 'choice') actions.append(h('button', { class: 'btn soft', onclick: () => speak(q.speakWord) }, '🔊 Word'));

    setDock(h('div', { class: 'panel q' },
      h('div', { class: 'q-head' },
        h('span', { class: 'chip', style: `--c:${meta.color}` }, `${meta.emoji} ${meta.name}`, q.level ? h('small', {}, ` · Lv ${q.level}`) : null),
        h('span', { class: 'q-count' }, `${index + 1} / ${total}`),
        h('button', { class: 'round-btn small', 'aria-label': 'Read aloud', onclick: hear }, '🔊'),
      ),
      timer ? h('div', { class: 'timer' }, h('i', { style: `animation-duration:${timer}s` })) : null,
      q.passage ? h('div', { class: 'passage', html: fill(q.passage) }) : null,
      h('p', { class: 'prompt', html: fill(q.prompt) }),
      answers,
      feedback,
      actions,
    ));
    hear();
  });
}

async function runRound(questions, { title, timer = 0 } = {}) {
  const results = [];
  setHud(title);
  for (let i = 0; i < questions.length; i++) {
    setDots(results, questions.length);
    results.push(await ask(questions[i], { index: i, total: questions.length, timer }));
  }
  setDots(results, questions.length);
  world.clearPuzzle();
  setDock(null);
  const points = results.reduce((a, r) => a + r.points, 0);
  const possible = questions.length * 2;
  return { results, points, possible, ratio: points / possible, perfect: points === possible, lightning: results.filter((r) => r.lightning).length };
}

function summary({ results, ratio, lightning }, { title, extra, button = 'Continue ▶' }) {
  const msg = ratio === 1 ? 'Perfect score! You are amazing!' : ratio >= 0.8 ? 'Brilliant work!' : ratio >= 0.5 ? 'Good job! Keep practising!' : 'Nice try! Every try makes your brain stronger.';
  if (ratio >= 0.8) sfx.fanfare();
  speak(msg);
  return waitUser((done) => {
    overlay.replaceChildren(h('div', { class: 'modal' }, h('div', { class: 'card summary pop' },
      h('h2', {}, title),
      h('div', { class: 'stars-row' }, results.map((r) => h('span', { class: r.points === 2 ? 'ok' : r.points === 1 ? 'half' : 'miss' }, r.points === 2 ? (r.lightning ? '⚡' : '⭐') : r.points === 1 ? '✨' : '○'))),
      h('p', { class: 'big' }, msg),
      lightning ? h('p', {}, `⚡ ${lightning} lightning answer${lightning > 1 ? 's' : ''}!`) : null,
      extra || null,
      h('button', { class: 'btn primary big', onclick: () => { overlay.replaceChildren(); done(); } }, button),
    )));
  });
}

// ---------- lessons ----------
async function teach(topic) {
  await lesson(topic, LESSONS[topic]);
  state.lessons[topic] = true;
  save();
}

async function lesson(topic, steps) {
  for (const step of steps) {
    const puzzle = createPuzzle({ kind: 'demo', topic, visual: step.visual, answerText: '' }, {});
    world.setPuzzle(puzzle);
    if (step.after) setTimeout(() => puzzle.group.parent && puzzle[step.after](), 900);
    await say([['hoot', step.text]]);
    if (step.speak) speak(step.speak);
  }
  world.clearPuzzle();
}

// ---------- story ----------
function nodeQuestions(node) {
  const avoid = new Set();
  const qs = node.reading ? readingQuestions(node.reading.key, node.reading.n).map((q) => ({ ...q, level: state.skills.reading.level })) : [];
  let topics = node.topics;
  if (node.boss) topics = shuffle(topics).slice(0, state.story.flags.feather ? 6 : 8);
  for (const t of topics) qs.push(makeQuestion(t, Math.min(3, state.skills[t].level + (node.boost || 0)), { name: state.player.name }, avoid));
  return node.shuffle ? shuffle(qs) : qs;
}

function crystalBadge(loc) {
  const l = LOCS[loc];
  return h('div', { class: 'crystal-get', style: `--c:${l.color}` }, h('span', {}, '💎'), ` ${l.name} crystal restored!`);
}

async function offerLessons(node) {
  if (node.boss || node.shuffle) return;
  for (const t of new Set(node.topics)) {
    if (state.lessons[t]) continue;
    const c = await choose([{ text: '📖 Yes, show me how!', v: true }, { text: "💪 I'm ready — let's go!", v: false }], `Want me to show you how <b>${TOPICS[t].name}</b> works first?`);
    if (c.v) await teach(t);
    state.lessons[t] = true;
    save();
  }
}

async function bonusRound(node) {
  const c = await choose([{ text: '⚡ Yes! Super Challenge!', v: true }, { text: 'No thanks, keep going', v: false }], 'Perfect score! Want a <b>Super Challenge</b>? 3 extra-hard questions to win a golden star 🌟');
  if (!c.v) return;
  const avoid = new Set();
  const uniq = [...new Set(node.topics)];
  const qs = [0, 1, 2].map((i) => makeQuestion(uniq[i % uniq.length], 3, { name: state.player.name }, avoid));
  const res = await runRound(qs, { title: '⚡ Super Challenge', timer: 30 });
  const won = res.results.filter((r) => r.points === 2).length >= 2;
  if (won) {
    state.golden++;
    state.story.golden++;
    save();
  }
  await summary(res, { title: '⚡ Super Challenge', extra: won ? h('div', { class: 'crystal-get', style: '--c:#ffd60a' }, '🌟 Golden star won!') : h('p', {}, 'So close! Golden stars are tricky.') });
}

async function playStory() {
  const s = state.story;
  if (!STORY[s.node]) Object.assign(s, newStory());
  world.setCrystals(s.crystals);
  hud.hidden = false;
  while (true) {
    const id = s.node;
    const node = STORY[id];
    setHud(LOCS[node.loc].name);
    world.placeParty(node.loc);
    await guard(world.flyTo(node.loc, 2.2));
    await say(node.lines);

    let outcome = null;
    if (node.topics) {
      await offerLessons(node);
      const res = await runRound(nodeQuestions(node), { title: node.title, timer: node.timer || 0 });
      if (!s.visited.includes(id)) s.visited.push(id);
      s.points += res.points;
      s.possible += res.possible;
      if (node.boss) {
        await summary(res, { title: node.title, button: 'See what happens ▶' });
        return ending();
      }
      if (!s.crystals.includes(node.loc)) s.crystals.push(node.loc);
      save();
      world.setCrystals(s.crystals);
      sfx.crystal();
      await summary(res, { title: node.title, extra: crystalBadge(node.loc) });
      if (res.perfect) await bonusRound(node);
      outcome = node.outcomes.find((o) => res.ratio >= o.min && !(o.ifNot && s.visited.includes(o.ifNot)));
      if (outcome.flag) s.flags[outcome.flag] = true;
      await say([[node.who, outcome.text]]);
    } else if (!s.visited.includes(id)) s.visited.push(id);

    if (!outcome?.next && node.choices) {
      const opts = node.choices.filter((c) => !(c.ifNot && s.visited.includes(c.ifNot)));
      outcome = opts.length === 1 ? opts[0] : await choose(opts, 'Where to next?');
    }
    s.node = outcome.next;
    s.path.push(STORY[outcome.next].loc);
    save();
    sfx.whoosh();
    setDock(null);
    setHud(`On the way to ${LOCS[STORY[outcome.next].loc].name}…`);
    await guard(world.travel(node.loc, STORY[outcome.next].loc, outcome.mode || 'walk'));
  }
}

async function ending() {
  const s = state.story;
  const ratio = s.possible ? s.points / s.possible : 0;
  const key = Object.keys(ENDINGS).find((k) => ratio >= ENDINGS[k].min);
  const e = ENDINGS[key];
  if (key === 'friend') world.showRainbow();
  world.setCrystals(Object.keys(LOCS).filter((l) => key !== 'try' || l !== 'castle'));
  await say(e.lines);
  const isNew = !state.endings.includes(key);
  if (isNew) state.endings.push(key);
  state.journeys++;
  const path = [...s.path];
  const golden = s.golden;
  state.story = newStory();
  save();
  setDock(null);
  setHud('', false);
  world.orbit();
  sfx.fanfare();
  await waitUser((done) => {
    overlay.replaceChildren(h('div', { class: 'modal' }, h('div', { class: 'card ending pop' },
      h('div', { class: 'ending-emoji' }, e.emoji),
      h('h2', {}, e.title),
      isNew ? h('p', { class: 'new' }, '✨ New ending discovered!') : null,
      h('p', {}, `Endings found: ${state.endings.length} / ${Object.keys(ENDINGS).length}`),
      h('p', {}, `Your score: ${Math.round(ratio * 100)}%${golden ? ` · 🌟 ${golden} golden` : ''}`),
      h('div', { class: 'path' }, path.map((l, i) => h('span', {}, `${i ? '→ ' : ''}${LOCS[l].name}`))),
      h('button', { class: 'btn primary big', onclick: () => done() }, '🔁 New adventure — try a new path!'),
    )));
  });
  world.resetCrystals();
  showTitle();
}

// ---------- practice ----------
async function practice(topic) {
  const meta = TOPICS[topic];
  setHud(meta.name);
  world.placeParty(meta.loc);
  await guard(world.flyTo(meta.loc, 1.8));
  const results = [];
  const avoid = new Set();
  for (let i = 0; i < 8; i++) {
    setDots(results, 8);
    const q = makeQuestion(topic, state.skills[topic].level, { name: state.player.name }, avoid);
    results.push(await ask(q, { index: i, total: 8 }));
  }
  world.clearPuzzle();
  const points = results.reduce((a, r) => a + r.points, 0);
  await summary({ results, ratio: points / 16, lightning: 0 }, { title: `${meta.emoji} ${meta.name}`, extra: h('p', {}, `Level: ${LEVEL_NAMES[state.skills[topic].level]}`), button: 'Back to topics' });
  showPractice();
}

// ---------- screens ----------
function screen(...kids) {
  abortFlow();
  setHud('', false);
  world.orbit();
  overlay.replaceChildren(h('div', { class: 'screen' }, ...kids));
}

function levelPips(topic) {
  const lv = state.skills[topic].level;
  return h('span', { class: 'pips' }, [1, 2, 3].map((k) => h('i', { class: k <= lv ? 'on' : '' })));
}

let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
});

function showTitle() {
  if (!state.player.setup) return showSetup();
  const inProgress = state.story.node !== 'start' || state.story.visited.length;
  screen(h('div', { class: 'title-card pop' },
    h('div', { class: 'logo' }, '⭐'),
    h('h1', {}, `${state.player.name}'s Star Quest`),
    h('p', { class: 'tag' }, 'A maths & words adventure on Lumina Island'),
    h('div', { class: 'menu' },
      h('button', { class: 'btn primary big', onclick: () => { unlockAudio(); run(playStory); } }, inProgress ? '▶ Continue Adventure' : '▶ Start Adventure'),
      inProgress ? h('button', { class: 'btn soft', onclick: () => { state.story = newStory(); world.resetCrystals(); save(); run(playStory); } }, '✨ Start a new adventure') : null,
      h('button', { class: 'btn blue big', onclick: () => (unlockAudio(), showPractice()) }, '🎯 Practice & Learn'),
      h('button', { class: 'btn purple big', onclick: () => (unlockAudio(), showDojo()) }, '🥋 Times Table Dojo'),
      h('button', { class: 'btn green big', onclick: showProgress }, '🏆 My Stars'),
    ),
    h('div', { class: 'row-links' },
      h('button', { class: 'link', onclick: showSetup }, '✏️ Name & colour'),
      h('button', { class: 'link', onclick: toggleVoice }, state.settings.voice ? '🗣️ Read aloud: on' : '🗣️ Read aloud: off'),
      installEvent ? h('button', { class: 'link', onclick: async () => { installEvent.prompt(); installEvent = null; } }, '📲 Install app') : null,
    ),
  ));
}

function toggleVoice() {
  state.settings.voice = audioPrefs.voice = !state.settings.voice;
  save();
  showTitle();
}

function showSetup() {
  let shirt = state.player.shirt;
  const input = h('input', { class: 'name-input', maxlength: 14, value: state.player.name, 'aria-label': 'Your name' });
  const swatches = h('div', { class: 'swatches' }, SHIRTS.map((c) => h('button', {
    class: `swatch ${c === shirt ? 'on' : ''}`, style: `--c:${c}`, 'aria-label': 'Shirt colour',
    onclick: (e) => {
      shirt = c;
      world.setShirt(c);
      swatches.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s === e.currentTarget));
      sfx.tap();
    },
  })));
  screen(h('div', { class: 'card setup pop' },
    h('h2', {}, '👋 Hello, explorer!'),
    h('label', {}, 'What is your name?', input),
    h('p', {}, 'Pick your explorer colour:'),
    swatches,
    h('button', { class: 'btn primary big', onclick: () => {
      state.player.name = input.value.trim().slice(0, 14) || 'Explorer';
      state.player.shirt = shirt;
      state.player.setup = true;
      save();
      unlockAudio();
      sfx.correct();
      showTitle();
    } }, "Let's go! 🚀"),
  ));
  world.placeParty('village');
}

function showPractice() {
  const card = (id) => {
    const t = TOPICS[id];
    return h('button', { class: 'topic', style: `--c:${t.color}`, onclick: () => topicMenu(id) },
      h('span', { class: 'emoji' }, t.emoji), h('span', { class: 'name' }, t.name), levelPips(id));
  };
  screen(h('div', { class: 'card wide pop' },
    h('div', { class: 'card-head' }, h('button', { class: 'round-btn', onclick: showTitle, 'aria-label': 'Back' }, '←'), h('h2', {}, '🎯 Practice & Learn')),
    h('h3', {}, '🔢 Maths'),
    h('div', { class: 'topics' }, ['mult', 'div', 'clock', 'line'].map(card),
      h('button', { class: 'topic', style: '--c:#ff9f1c', onclick: showDojo }, h('span', { class: 'emoji' }, '🥋'), h('span', { class: 'name' }, 'Times Table Dojo'), h('small', {}, 'tricks & speed'))),
    h('h3', {}, '📚 English'),
    h('div', { class: 'topics' }, ['spell', 'grammar', 'vocab', 'sentences'].map(card)),
  ));
}

function topicMenu(id) {
  const t = TOPICS[id];
  overlay.append(h('div', { class: 'modal', onclick: (e) => e.target === e.currentTarget && e.currentTarget.remove() }, h('div', { class: 'card pop', style: `--c:${t.color}` },
    h('div', { class: 'big-emoji' }, t.emoji),
    h('h2', {}, t.name),
    h('p', {}, `Level: ${LEVEL_NAMES[state.skills[id].level]}`),
    h('div', { class: 'menu' },
      h('button', { class: 'btn soft big', onclick: () => run(async () => {
        setHud(`📖 ${t.name}`);
        world.placeParty(t.loc);
        await guard(world.flyTo(t.loc, 1.6));
        await teach(id);
        const c = await choose([{ text: '🎯 Practise now!', v: true }, { text: '← Back to topics', v: false }], 'Ready to practise?');
        if (c.v) await practice(id);
        else showPractice();
      }) }, '📖 Learn how'),
      h('button', { class: 'btn primary big', onclick: () => run(() => practice(id)) }, '🎯 Practise (8 questions)'),
    ),
  )));
}

function showProgress() {
  const rows = Object.entries(TOPICS).filter(([, t]) => !t.hidden).map(([id, t]) => {
    const s = state.skills[id];
    const pct = s.total ? Math.round((s.right / s.total) * 100) : 0;
    return h('div', { class: 'skill' },
      h('span', { class: 'emoji' }, t.emoji),
      h('div', { class: 'skill-main' },
        h('div', { class: 'skill-top' }, h('b', {}, t.name), h('span', {}, LEVEL_NAMES[s.level]), levelPips(id)),
        h('div', { class: 'bar' }, h('i', { style: `width:${pct}%;--c:${t.color}` })),
        h('small', {}, s.total ? `${pct}% first-try correct · ${s.total} answered` : 'Not tried yet'),
      ),
    );
  });
  const confirmReset = h('button', { class: 'link danger', onclick: (e) => {
    if (e.currentTarget.dataset.armed) {
      resetAll();
      world.resetCrystals();
      showProgress();
    } else {
      e.currentTarget.dataset.armed = '1';
      e.currentTarget.textContent = 'Tap again to erase all progress';
    }
  } }, 'Reset progress');
  screen(h('div', { class: 'card wide pop' },
    h('div', { class: 'card-head' }, h('button', { class: 'round-btn', onclick: showTitle, 'aria-label': 'Back' }, '←'), h('h2', {}, '🏆 My Stars')),
    h('div', { class: 'totals' },
      h('div', {}, h('b', {}, state.stars), h('span', {}, '⭐ stars')),
      h('div', {}, h('b', {}, state.golden), h('span', {}, '🌟 golden')),
      h('div', {}, h('b', {}, `${state.endings.length}/3`), h('span', {}, '📜 endings')),
      h('div', {}, h('b', {}, state.journeys), h('span', {}, '🗺️ journeys')),
      h('div', {}, h('b', {}, `${belt().mastered}/${ALL_FACTS.length}`), h('span', {}, `🥋 ${belt().name}`)),
    ),
    h('div', { class: 'endings' }, Object.entries(ENDINGS).map(([k, e]) => h('span', { class: state.endings.includes(k) ? 'on' : '' }, state.endings.includes(k) ? `${e.emoji} ${e.title}` : '❔ ???'))),
    h('div', { class: 'skills' }, rows),
    confirmReset,
  ));
}

// ---------- Times Table Dojo ----------
function beltBadge() {
  const b = belt();
  const pct = b.next ? Math.round(((b.mastered - b.at) / (b.next.at - b.at)) * 100) : 100;
  return h('div', { class: 'belt-row' },
    h('div', { class: 'belt', style: `--c:${b.color}` }, h('i')),
    h('div', { class: 'skill-main' },
      h('div', { class: 'skill-top' }, h('b', {}, b.name), h('span', {}, `${b.mastered} / ${ALL_FACTS.length} facts mastered`)),
      h('div', { class: 'bar' }, h('i', { style: `width:${pct}%;--c:${b.next?.color || b.color}` })),
      h('small', {}, b.next ? `${b.next.at - b.mastered} more for ${b.next.name}` : 'You know every fact. Grand master!'),
    ),
  );
}

function dojoTile(emoji, name, sub, onclick, color) {
  return h('button', { class: 'topic', style: `--c:${color}`, onclick }, h('span', { class: 'emoji' }, emoji), h('span', { class: 'name' }, name), h('small', {}, sub));
}

function showDojo() {
  const d = dojo();
  screen(h('div', { class: 'card wide pop' },
    h('div', { class: 'card-head' }, h('button', { class: 'round-btn', onclick: showTitle, 'aria-label': 'Back' }, '←'), h('h2', {}, '🥋 Times Table Dojo')),
    beltBadge(),
    h('div', { class: 'topics' },
      dojoTile('🧠', 'Smart Practice', '10 facts picked for you', () => run(smartPractice), '#ff6b6b'),
      dojoTile('🪄', 'Trick School', 'learn the fast tricks', showTricks, '#9b5de5'),
      dojoTile('⚡', 'Speed Sprint', d.best ? `60 seconds · best ${d.best}` : '60 seconds', () => run(sprint), '#ff9f1c'),
      dojoTile('🗺️', 'Fact Map', 'see what you know', showFactMap, '#00a6fb'),
    ),
    h('p', { class: 'tip' }, '💡 Fast mathematicians don\'t memorise 144 facts — they learn a few tricks and practise a little every day. 10 minutes a day beats an hour once a week!'),
  ));
}

function showTricks() {
  const d = dojo();
  screen(h('div', { class: 'card wide pop' },
    h('div', { class: 'card-head' }, h('button', { class: 'round-btn', onclick: showDojo, 'aria-label': 'Back' }, '←'), h('h2', {}, '🪄 Trick School')),
    h('p', {}, 'Each trick turns a hard fact into easy ones. Watch Hoot, then try 5 questions.'),
    h('div', { class: 'topics' }, TRICKS.map((t) => h('button', { class: `topic ${d.tricks[t.id] ? 'done' : ''}`, style: '--c:#9b5de5', onclick: () => run(() => trickLesson(t)) },
      h('span', { class: 'emoji' }, t.emoji), h('span', { class: 'name' }, t.name), d.tricks[t.id] ? h('small', {}, '✓ learned') : null))),
  ));
}

async function trickLesson(t) {
  setHud(`🪄 ${t.name}`);
  world.placeParty('market');
  await guard(world.flyTo('market', 1.4));
  await lesson('mult', t.steps);
  dojo().tricks[t.id] = true;
  save();
  const c = await choose([{ text: '🎯 Try the trick — 5 questions', v: true }, { text: '← Back to Trick School', v: false }], `Ready to use the <b>${t.name}</b> trick?`);
  if (!c.v) return showTricks();
  const qs = trickQuestions(t);
  const res = await runRound(qs, { title: `🪄 ${t.name}` });
  res.results.forEach((r, i) => recordFact(...qs[i].fact, r.points === 2, r.ms));
  await summary(res, { title: `🪄 ${t.name}`, button: 'Back to Trick School' });
  showTricks();
}

async function smartPractice() {
  const d = dojo();
  setHud('🧠 Smart Practice');
  world.placeParty('market');
  await guard(world.flyTo('market', 1.4));
  const before = Object.fromEntries(ALL_FACTS.map(([a, b]) => [key(a, b), fact(a, b).box]));
  const queue = sessionFacts(10).map(([a, b]) => factQuestion(a, b));
  const results = [];
  for (let i = 0; i < queue.length; i++) {
    setDots(results, queue.length);
    const q = queue[i];
    const r = await ask(q, { index: i, total: queue.length });
    results.push(r);
    const [a, b] = q.fact;
    recordFact(a, b, r.points === 2, r.ms);
    // a missed fact comes back a little later in the same session (retrieval after a short gap)
    if (r.points < 2 && !q.again) queue.splice(Math.min(queue.length, i + 3), 0, factQuestion(b, a, { again: true, prompt: `<b class="eq">${b} × ${a} = ?</b><small>Again — use the trick!</small>` }));
  }
  setDots(results, queue.length);
  world.clearPuzzle();
  setDock(null);
  d.sessions++;
  save();
  const up = ALL_FACTS.filter(([a, b]) => fact(a, b).box > before[key(a, b)]);
  const newlyMastered = up.filter(([a, b]) => fact(a, b).box >= MASTERED && before[key(a, b)] < MASTERED);
  const points = results.reduce((a, r) => a + r.points, 0);
  await summary({ results, ratio: points / (results.length * 2), lightning: 0 }, {
    title: '🧠 Smart Practice',
    extra: h('div', { class: 'dojo-extra' },
      h('p', {}, `⬆️ ${up.length} fact${up.length === 1 ? '' : 's'} got stronger`),
      newlyMastered.length ? h('p', {}, `🏅 Mastered: ${newlyMastered.map(([a, b]) => `${a}×${b}`).join(', ')}`) : null,
      beltBadge(),
    ),
    button: 'Back to the Dojo',
  });
  showDojo();
}

async function sprint() {
  const d = dojo();
  setHud('⚡ Speed Sprint');
  world.placeParty('market');
  await guard(world.flyTo('market', 1.4));
  await say([['hoot', d.best ? `60 seconds! Your best is ${d.best}. Can you beat yourself?` : '60 seconds! Answer as many as you can. Type the answer and press ✓.']]);
  for (const n of ['3', '2', '1', 'Go!']) {
    world.setPuzzle(createPuzzle({ kind: 'demo', visual: { type: 'card', text: n, color: '#ff9f1c' } }, {}));
    sfx.tick();
    await guard(wait(0.75));
  }
  const LEN = 60000, end = performance.now() + LEN;
  let score = 0, prev = null;
  const missed = [];
  while (performance.now() < end) {
    const f = (prev = sprintFact(prev));
    const [a, b] = Math.random() < 0.5 ? f : [f[1], f[0]];
    world.setPuzzle(createPuzzle({ kind: 'demo', visual: { type: 'card', text: `${a} × ${b}`, emoji: '⚡', color: '#ff9f1c' } }, {}));
    const ok = await waitUser((done) => {
      const left = end - performance.now();
      const timeout = setTimeout(() => done(null), left);
      const kp = keypad((v) => {
        clearTimeout(timeout);
        done(v === String(a * b));
      });
      setDock(h('div', { class: 'panel q' },
        h('div', { class: 'q-head' },
          h('span', { class: 'chip', style: '--c:#ff9f1c' }, `⚡ ${score} correct`),
          h('span', { class: 'q-count' }, d.best ? `best ${d.best}` : ''),
        ),
        h('div', { class: 'timer' }, h('i', { style: `animation-duration:${LEN / 1000}s;animation-delay:-${(LEN - left) / 1000}s` })),
        h('p', { class: 'prompt' }, h('b', { class: 'eq' }, `${a} × ${b} = ?`)),
        h('div', { class: 'answers pad' }, kp.el),
      ));
    });
    if (ok === null) break;
    if (ok) {
      score++;
      sfx.correct();
      world.burst(30);
    } else {
      sfx.wrong();
      world.shake();
      toast(`${a} × ${b} = ${a * b}`, 1400);
      missed.push([a, b]);
      recordFact(a, b, false, 0);
    }
  }
  world.clearPuzzle();
  setDock(null);
  const isBest = score > d.best;
  if (isBest) d.best = score;
  d.sprints++;
  state.stars += Math.floor(score / 5);
  $('starCount').textContent = state.stars;
  save();
  if (isBest) sfx.fanfare();
  const msg = isBest ? `New record: ${score}! Your brain got faster!` : `${score} correct! Keep going — speed grows with practice.`;
  speak(msg);
  const again = await waitUser((done) => {
    overlay.replaceChildren(h('div', { class: 'modal' }, h('div', { class: 'card summary pop' },
      h('h2', {}, '⚡ Speed Sprint'),
      h('div', { class: 'sprint-score' }, score),
      h('p', { class: 'big' }, msg),
      h('p', {}, `🏆 Personal best: ${d.best}${score >= 5 ? ` · ⭐ +${Math.floor(score / 5)}` : ''}`),
      missed.length ? h('p', {}, `Practise these: ${[...new Set(missed.map(([a, b]) => `${a} × ${b} = ${a * b}`))].join(' · ')}`) : null,
      h('div', { class: 'menu' },
        h('button', { class: 'btn primary big', onclick: () => done(true) }, '🔁 Sprint again'),
        h('button', { class: 'btn soft', onclick: () => done(false) }, 'Back to the Dojo'),
      ),
    )));
  });
  overlay.replaceChildren();
  if (again) run(sprint);
  else showDojo();
}

// Why tables are smaller than they look: knock out the easy tables and the turnarounds.
const SHRINK = [
  [(a, b) => a === 10 || b === 10, '× 10: just add a zero!'],
  [(a, b) => a === 2 || b === 2, '× 2: doubles!'],
  [(a, b) => a === 5 || b === 5, '× 5: half of ten!'],
  [(a, b) => a === 11 || b === 11, '× 11: twin digits!'],
  [(a, b) => a > b, 'Turnarounds: 7 × 3 is the same as 3 × 7!'],
  [(a, b) => a === 9 || b === 9, '× 9: finger magic!'],
];

function showFactMap() {
  const cells = [];
  const grid = h('div', { class: 'factmap', style: `--n:${NUMS.length + 1}` },
    h('span', { class: 'fm-head' }, '×'),
    NUMS.map((n) => h('span', { class: 'fm-head' }, n)),
    NUMS.flatMap((a) => [
      h('span', { class: 'fm-head' }, a),
      NUMS.map((b) => {
        const box = fact(a, b).box;
        const c = h('button', { class: `fm-cell ${box >= MASTERED ? 'star' : ''}`, style: `--c:${BOX_COLORS[box]}`, title: `${a} × ${b} = ${a * b} · ${BOX_NAMES[box]}`, onclick: () => factInfo(a, b) }, a * b);
        cells.push({ a, b, c });
        return c;
      }),
    ].flat()),
  );
  const counter = h('p', { class: 'fm-count' }, `${cells.length} facts on the map`);
  const shrinkBtn = h('button', { class: 'btn orange', onclick: async () => {
    shrinkBtn.disabled = true;
    let left = cells.length;
    for (const [test, text] of SHRINK) {
      if (!grid.isConnected) return;
      for (const x of cells) {
        if (!x.c.classList.contains('gone') && test(x.a, x.b)) {
          x.c.classList.add('gone');
          left--;
        }
      }
      counter.textContent = `${text} → ${left} left`;
      speak(text);
      sfx.pop();
      await new Promise((r) => setTimeout(r, 2400));
    }
    if (!grid.isConnected) return;
    counter.textContent = `Only ${left} facts to really learn — and each one has a trick! 💪`;
    speak(counter.textContent);
    sfx.fanfare();
    shrinkBtn.textContent = '↺ Show all facts';
    shrinkBtn.disabled = false;
    shrinkBtn.onclick = showFactMap;
  } }, '✨ The shrinking secret');
  screen(h('div', { class: 'card wide pop' },
    h('div', { class: 'card-head' }, h('button', { class: 'round-btn', onclick: showDojo, 'aria-label': 'Back' }, '←'), h('h2', {}, '🗺️ Fact Map')),
    beltBadge(),
    grid,
    h('div', { class: 'fm-legend' }, BOX_NAMES.map((n, i) => h('span', {}, h('i', { style: `--c:${BOX_COLORS[i]}` }), n))),
    counter,
    h('div', { class: 'actions' }, shrinkBtn),
    h('p', { class: 'tip' }, 'Tap any fact to see its trick.'),
  ));
}

function factInfo(a, b) {
  const s = strategy(a, b);
  const f = fact(a, b);
  overlay.append(h('div', { class: 'modal', onclick: (e) => e.target === e.currentTarget && e.currentTarget.remove() }, h('div', { class: 'card pop' },
    h('h2', { class: 'eq' }, `${a} × ${b} = ${a * b}`),
    h('p', {}, h('span', { class: 'chip', style: `--c:${BOX_COLORS[f.box] === BOX_COLORS[0] ? '#9b5de5' : BOX_COLORS[f.box]}` }, BOX_NAMES[f.box])),
    h('p', { class: 'big' }, `🪄 ${s.name}`),
    h('p', {}, s.text),
    h('div', { class: 'menu' },
      h('button', { class: 'btn primary big', onclick: () => run(async () => {
        setHud(`${a} × ${b}`);
        const p = createPuzzle({ kind: 'demo', visual: s.visual, answerText: '' }, {});
        world.setPuzzle(p);
        setTimeout(() => p.group.parent && p.hint(), 900);
        await say([['hoot', `${a} × ${b}: the ${s.name} trick! ${s.text}`]]);
        p.reveal();
        await say([['hoot', `${a} × ${b} = ${a * b}. And ${b} × ${a} is the same!`]]);
        world.clearPuzzle();
        showFactMap();
      }) }, '👀 Show me'),
    ),
  )));
}

$('homeBtn').onclick = () => {
  sfx.tap();
  showTitle();
};
$('soundBtn').onclick = () => {
  state.settings.sound = audioPrefs.sound = !state.settings.sound;
  $('soundBtn').textContent = state.settings.sound ? '🔊' : '🔇';
  save();
};
$('soundBtn').textContent = state.settings.sound ? '🔊' : '🔇';

document.fonts?.load('600 64px Fredoka').finally(() => showTitle());
