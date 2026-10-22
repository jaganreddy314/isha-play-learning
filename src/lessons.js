// Short "show me how" lessons. Each step shows a visual while Hoot explains;
// `after` triggers the visual's hint/reveal animation to demonstrate the idea.
const card = (text, sub, emoji) => ({ type: 'card', text, sub, emoji });

export const LESSONS = {
  mult: [
    { text: 'Multiplication is a quick way to add equal groups. Here are 3 rows of apples.', visual: { type: 'array', rows: 3, cols: 4, item: 'apple' } },
    { text: 'Each row has 4 apples. So we have 3 groups of 4. Watch me skip count by 4s…', visual: { type: 'array', rows: 3, cols: 4, item: 'apple' }, after: 'hint' },
    { text: '4, 8, 12! So 3 × 4 = 12. The × sign means "groups of".', visual: { type: 'array', rows: 3, cols: 4, item: 'apple' }, after: 'reveal' },
    { text: 'Here is a secret: 4 × 3 is the same as 3 × 4! Turn the rows around and the total stays 12.', visual: { type: 'array', rows: 4, cols: 3, item: 'gem' }, after: 'reveal' },
    { text: 'Tip: you can tap the items to count them, one by one, whenever you are stuck.', visual: { type: 'array', rows: 2, cols: 5, item: 'star' } },
  ],
  div: [
    { text: 'Division means sharing into equal groups, so everyone gets the same.', visual: { type: 'share', total: 12, groups: 3, item: 'berry' } },
    { text: 'Let\'s share 12 berries into 3 baskets — one at a time, like dealing cards.', visual: { type: 'share', total: 12, groups: 3, item: 'berry' }, after: 'hint' },
    { text: 'Every basket got 4 berries. So 12 ÷ 3 = 4.', visual: { type: 'share', total: 12, groups: 3, item: 'berry' }, after: 'reveal' },
    { text: 'Division is multiplication backwards! 3 × 4 = 12, so 12 ÷ 3 = 4.', visual: card('3 × 4 = 12', '12 ÷ 3 = 4', '🔁') },
  ],
  clock: [
    { text: 'A clock has two hands. The short red hand shows the hour. Here it points to 3.', visual: { type: 'clock', h: 3, m: 0 } },
    { text: 'The long blue hand shows the minutes. When it points straight up to 12, it is "o\'clock". This says 3 o\'clock.', visual: { type: 'clock', h: 3, m: 0, digital: true } },
    { text: 'Each number is 5 minutes for the long hand: 5, 10, 15, 20… all the way to 60.', visual: { type: 'clock', h: 3, m: 15 }, after: 'hint' },
    { text: 'When the long hand points to 3, that\'s 15 minutes: "quarter past 3", or 3:15.', visual: { type: 'clock', h: 3, m: 15, digital: true }, after: 'hint' },
    { text: 'When it points to 6, it\'s 30 minutes: "half past 3". See how the short hand has moved halfway to 4?', visual: { type: 'clock', h: 3, m: 30, digital: true }, after: 'hint' },
    { text: 'At 45 minutes it\'s "quarter to 4" — only 15 minutes until 4 o\'clock!', visual: { type: 'clock', h: 3, m: 45, digital: true }, after: 'hint' },
  ],
  line: [
    { text: 'A number line shows numbers in order, with equal spaces between them.', visual: { type: 'line', min: 0, max: 10, step: 1, labelEvery: 5 }, after: 'hint' },
    { text: 'To add, hop forward! Freddie is on 3. Watch him hop 4 times…', visual: { type: 'line', min: 0, max: 10, step: 1, labelEvery: 5, frog: 3, hop: 1, hops: 4, hintMode: 'hop' }, after: 'hint' },
    { text: '3 + 4 = 7! To take away, hop backwards instead.', visual: { type: 'line', min: 0, max: 10, step: 1, labelEvery: 5, frog: 7, hop: -1, hops: 4, hintMode: 'hop' }, after: 'hint' },
    { text: 'To round to the nearest ten, look at the halfway number. 47 is past 45, so it rounds up to 50.', visual: { type: 'line', min: 40, max: 50, step: 1, labelEvery: 10, mark: 47, hintMode: 'half' }, after: 'hint' },
    { text: 'Fractions live on number lines too! Cut 0 to 1 into 4 equal parts. Each part is one quarter: 1/4.', visual: { type: 'line', min: 0, max: 1, step: 0.25, labelEvery: 4, fmt: 'frac', den: 4, hintMode: 'frac' }, after: 'hint' },
  ],
  spell: [
    { text: 'Listen to the word. Then tap the letter blocks in the right order to spell it. Watch!', visual: { type: 'letters', word: 'frog', decoys: [] }, after: 'reveal', speak: 'frog' },
    { text: 'Tip: say the word slowly and listen for each sound. F… r… o… g. Tap a block in a slot to take it back.', visual: card('f - r - o - g', 'sound it out', '👂') },
    { text: 'You can press the speaker button to hear the word again, as many times as you like.', visual: card('🔊', 'hear it again') },
  ],
  grammar: [
    { text: 'A noun is a naming word: a person, place, animal or thing — like cat, school or Isha.', visual: card('cat  school  Isha', 'nouns', '🏷️') },
    { text: 'A verb is an action word — something you do, like jump, read or swim.', visual: card('jump  read  swim', 'verbs', '🏃') },
    { text: 'An adjective describes a noun — like big, red or happy.', visual: card('big  red  happy', 'adjectives', '🎨') },
    { text: 'An adverb tells HOW something is done — like quickly or softly. Lots of adverbs end in -ly.', visual: card('quickly  softly', 'adverbs', '💨') },
  ],
  vocab: [
    { text: 'Synonyms are words that mean the same thing, like big and large.', visual: card('big = large', 'synonyms', '🤝') },
    { text: 'Antonyms are opposites, like hot and cold.', visual: card('hot ↔ cold', 'antonyms', '🔄') },
    { text: 'Plural means more than one. Most words add -s: cat → cats. Some change: mouse → mice!', visual: card('mouse → mice', 'plurals', '🐭') },
    { text: 'Past tense tells what already happened: walk → walked, but run → ran!', visual: card('run → ran', 'past tense', '⏪') },
    { text: 'Compound words are two words joined together: sun + flower = sunflower.', visual: card('sun + flower', 'compound words', '🌻') },
  ],
  sentences: [
    { text: 'Every sentence starts with a capital letter.', visual: card('The dog ran.', 'capital letter first', '🔠') },
    { text: 'A telling sentence ends with a full stop.', visual: card('I like cake.', 'full stop', '⏺️') },
    { text: 'An asking sentence ends with a question mark.', visual: card('Do you like cake?', 'question mark', '❓') },
    { text: 'An exciting sentence ends with an exclamation mark!', visual: card('I love cake!', 'exclamation mark', '❗') },
    { text: 'Names of people, places, days and months always start with capitals: Isha, London, Monday, July.', visual: card('Isha  London  Monday', 'proper nouns', '📛') },
  ],
};
