# Isha's Star Quest

A 3D story-adventure PWA for learning Grade 3 maths and English.

Rascal the Raven has stolen the Star Crystals of Lumina Island. Each place on the island is a challenge, and how well
you do decides your path: a perfect score at the market earns a hot-air balloon ride, a strong library score opens a
secret tunnel, and so on. The journey ends at Raven's Roost with one of three endings, depending on your overall score.

**Stack:** Vite · Three.js · Web Audio + Web Speech API · vite-plugin-pwa (offline + installable)

## Run

```bash
npm install
npm run dev       # http://localhost:5173 (also exposed on your LAN for tablet/phone testing)
npm run build     # production build in dist/
npm run preview   # serve the production build
npm run check     # generate ~80k questions and check each one is well formed
```

Every push to `main` is built and deployed to GitHub Pages by `.github/workflows/deploy.yml`.
Icons: edit `public/icons/icon.svg`, then run `npm run icons` (needs `rsvg-convert`).

## What it teaches

| Topic | 3D visual | Levels 1 → 3 |
|---|---|---|
| Times tables | Arrays of muffins/gems/apples — tap to count; hint shows skip counting | 2, 3, 4, 5, 10 → 2–10 + missing factor → up to 12 |
| Division | Tap the pile to deal berries into baskets (sharing) or fill bags (grouping) | ÷2–5 → ÷2–9 → fact families, `? ÷ 4 = 6` |
| Telling time | Draggable clock hands (long = minutes, short = hours, geared together) | o'clock/half past → quarter past/to, 5-minute steps → any minute, elapsed time |
| Number lines | Tap to plant a flag, read an arrow, watch Freddie the frog hop | 0–10 / 0–100 → rounding to 10 → rounding to 100, fractions on a line |
| Spelling | Floating letter blocks, word read aloud | 4-letter words → 6-letter words + missing vowels → tricky words |
| Word types | Highlighted word in a sentence | noun/verb → + adjective → + adverb/pronoun |
| Word power | Word cards | synonyms, antonyms, plurals, compound words → past tense → homophones, prefixes |
| Sentences | Word cards | end marks → capitals & proper nouns → contractions |
| Reading | Short stories in the library, garden and cave | comprehension questions |

**How it adapts:** each topic has its own level. Four first-try answers in a row move it up; two misses in a row move
it down. A wrong first answer gives a hint and a visual clue; a second miss reveals the answer with an explanation. A
perfect round in the story offers an optional timed **Super Challenge** for a golden star.

**Practice & Learn** lets you pick any topic directly. **Learn how** runs a short animated lesson with Hoot the owl.
Story lessons are also offered the first time a topic comes up.

## Code map

- `src/story.js` — the story graph: places, dialogue, challenges, branching outcomes, endings
- `src/questions/` — question generators (`math.js`, `english.js`) and topic list (`index.js`)
- `src/puzzles/` — the 3D visual for each question type, rendered on an orthographic "stage" over the world
- `src/world.js` — the island, locations, characters, camera, travel and effects
- `src/critters.js` — characters built from primitives
- `src/main.js` — screens, dialogue, question runner, story/practice flow
- `src/progress.js` — saved progress (localStorage) and adaptive levels
- `src/lessons.js` — the "Learn how" lessons
