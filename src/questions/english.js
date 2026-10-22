import { rand, pick, chance, shuffle, options } from './util.js';

// ---------- spelling ----------
const SPELL = {
  1: [
    ['frog', 'The green frog sat on a lily pad.'], ['jump', 'I can jump over the puddle.'], ['cake', 'We ate birthday cake.'],
    ['rain', 'The rain made the grass wet.'], ['ship', 'The big ship sailed away.'], ['tree', 'A bird lives in that tree.'],
    ['star', 'I saw a bright star.'], ['fish', 'The fish swam in the pond.'], ['milk', 'I drink milk at lunch.'],
    ['book', 'Read me a book, please.'], ['duck', 'The duck said quack.'], ['moon', 'The moon is round tonight.'],
    ['king', 'The king wore a crown.'], ['nest', 'The eggs are in the nest.'], ['snow', 'We built a snowman in the snow.'],
    ['blue', 'The sky is blue.'], ['play', 'Let us play outside.'], ['bell', 'The school bell rang.'],
  ],
  2: [
    ['happy', 'The puppy is so happy.'], ['friend', 'My friend sits next to me.'], ['school', 'We walk to school.'],
    ['garden', 'Flowers grow in the garden.'], ['little', 'A little mouse ran by.'], ['water', 'Plants need water.'],
    ['flower', 'The flower smells sweet.'], ['rabbit', 'The rabbit hopped away.'], ['pencil', 'I write with a pencil.'],
    ['window', 'Look out of the window.'], ['orange', 'I peeled an orange.'], ['yellow', 'The sun is yellow.'],
    ['summer', 'We swim in the summer.'], ['winter', 'It is cold in winter.'], ['basket', 'Put the eggs in the basket.'],
    ['monkey', 'The monkey climbed the tree.'], ['sister', 'My sister likes to sing.'], ['candle', 'Blow out the candle.'],
  ],
  3: [
    ['because', 'I smiled because I was happy.'], ['beautiful', 'What a beautiful rainbow!'], ['different', 'Every snowflake is different.'],
    ['believe', 'I believe you can do it.'], ['through', 'We walked through the forest.'], ['enough', 'Do we have enough cake?'],
    ['island', 'We sailed to an island.'], ['minute', 'Wait one minute, please.'], ['surprise', 'The party was a surprise.'],
    ['library', 'I borrowed a book from the library.'], ['favorite', 'Blue is my favorite colour.'], ['question', 'May I ask a question?'],
    ['tomorrow', 'We will go tomorrow.'], ['thought', 'I thought about my answer.'], ['children', 'The children played tag.'],
    ['special', 'Today is a special day.'], ['bicycle', 'I ride my bicycle to the park.'], ['answer', 'Do you know the answer?'],
  ],
};

const VOWELS = 'aeiou';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function blankWord(sentence, word) {
  return sentence.replace(new RegExp(`\\b${word}\\b`, 'i'), '_____');
}

export function spell(level) {
  const [word, sentence] = pick(SPELL[level]);
  const blanked = blankWord(sentence, word);
  if (level >= 2 && chance(0.3)) {
    const spots = [...word].map((c, i) => (VOWELS.includes(c) ? i : -1)).filter((i) => i >= 0);
    const i = pick(spots);
    const shown = word.slice(0, i) + '_' + word.slice(i + 1);
    return {
      kind: 'choice',
      prompt: `Which letter is missing? <i>“${blanked}”</i>`,
      say: `Which letter is missing from the word ${word}? ${sentence}`,
      choices: options(word[i], [...VOWELS].filter((v) => v !== word[i])),
      answer: word[i],
      answerText: word,
      hint: `Say the word slowly: ${word}. Listen for the vowel sound.`,
      explain: `The word is “${word}”: ${word.toUpperCase().split('').join(' ')}.`,
      visual: { type: 'card', text: shown.split('').join(' '), sub: 'missing letter' },
      speakWord: word,
    };
  }
  const decoys = shuffle([...LETTERS].filter((c) => !word.includes(c))).slice(0, level - 1);
  return {
    kind: 'spell',
    prompt: `Tap the blocks to spell the missing word: <i>“${blanked}”</i>`,
    say: `Spell the word: ${word}. ${sentence} Spell: ${word}.`,
    answer: word,
    answerText: word,
    hint: `It has ${word.length} letters and starts with “${word[0].toUpperCase()}”. The glowing block comes next!`,
    explain: `“${word}” is spelled ${word.toUpperCase().split('').join(' ')}.`,
    visual: { type: 'letters', word, decoys },
    speakWord: word,
  };
}

// ---------- parts of speech ----------
const POS = [
  { s: 'The cat sleeps on the soft mat.', w: { cat: 'noun', sleeps: 'verb', soft: 'adjective' } },
  { s: 'Isha kicked the red ball.', w: { kicked: 'verb', red: 'adjective', ball: 'noun' } },
  { s: 'The tiny bird sang sweetly.', w: { tiny: 'adjective', bird: 'noun', sang: 'verb', sweetly: 'adverb' } },
  { s: 'We ran quickly to the bus.', w: { We: 'pronoun', ran: 'verb', quickly: 'adverb', bus: 'noun' } },
  { s: 'The happy dog wagged its tail.', w: { happy: 'adjective', dog: 'noun', wagged: 'verb' } },
  { s: 'She painted a beautiful picture.', w: { She: 'pronoun', painted: 'verb', beautiful: 'adjective', picture: 'noun' } },
  { s: 'The old turtle walked slowly.', w: { old: 'adjective', turtle: 'noun', walked: 'verb', slowly: 'adverb' } },
  { s: 'They climbed the tall tree.', w: { They: 'pronoun', climbed: 'verb', tall: 'adjective', tree: 'noun' } },
  { s: 'My brother reads loudly.', w: { brother: 'noun', reads: 'verb', loudly: 'adverb' } },
  { s: 'The shiny star twinkled.', w: { shiny: 'adjective', star: 'noun', twinkled: 'verb' } },
  { s: 'He jumped into the cold pool.', w: { He: 'pronoun', jumped: 'verb', cold: 'adjective', pool: 'noun' } },
  { s: 'The baby laughed happily.', w: { baby: 'noun', laughed: 'verb', happily: 'adverb' } },
  { s: 'A big frog swims in the pond.', w: { big: 'adjective', frog: 'noun', swims: 'verb' } },
  { s: 'Grandma baked yummy cookies.', w: { Grandma: 'noun', baked: 'verb', yummy: 'adjective' } },
  { s: 'The children danced gracefully.', w: { children: 'noun', danced: 'verb', gracefully: 'adverb' } },
];
const POS_LABEL = {
  noun: 'Noun — naming word',
  verb: 'Verb — action word',
  adjective: 'Adjective — describing word',
  adverb: 'Adverb — tells how',
  pronoun: 'Pronoun — he, she, we, they',
};
const POS_EXPLAIN = {
  noun: 'a noun — it names a person, place, animal or thing',
  verb: 'a verb — it is an action, something you do',
  adjective: 'an adjective — it describes a noun',
  adverb: 'an adverb — it tells how something is done (lots end in -ly)',
  pronoun: 'a pronoun — it takes the place of a name',
};
const article = (t) => (/^[aeiou]/.test(t) ? 'an' : 'a');

export function grammar(level) {
  const allowed = level === 1 ? ['noun', 'verb'] : level === 2 ? ['noun', 'verb', 'adjective'] : ['noun', 'verb', 'adjective', 'adverb', 'pronoun'];
  const items = POS.flatMap((p) => Object.entries(p.w).map(([word, type]) => ({ ...p, word, type }))).filter((x) => allowed.includes(x.type));
  const it = pick(items);
  const marked = it.s.replace(new RegExp(`\\b${it.word}\\b`), `<mark>${it.word}</mark>`);

  const typesInSentence = Object.values(it.w).filter((t) => allowed.includes(t));
  const unique = typesInSentence.filter((t) => typesInSentence.indexOf(t) === typesInSentence.lastIndexOf(t));
  if (chance(0.4) && unique.length && Object.keys(it.w).length >= 3) {
    const type = pick(unique);
    const word = Object.keys(it.w).find((w) => it.w[w] === type);
    return {
      kind: 'choice',
      passage: it.s,
      prompt: `Which word in the sentence is ${article(type)} <b>${type}</b>?`,
      choices: options(word, Object.keys(it.w).filter((w) => w !== word)),
      answer: word,
      answerText: word,
      hint: `${type[0].toUpperCase() + type.slice(1)}: ${POS_LABEL[type].split('— ')[1]}.`,
      explain: `“${word}” is ${POS_EXPLAIN[type]}.`,
      visual: { type: 'card', text: '?', sub: `find the ${type}`, emoji: '🔎' },
    };
  }
  let choiceTypes = allowed.length > 4 ? shuffle(allowed.filter((t) => t !== it.type)).slice(0, 3).concat(it.type) : allowed;
  choiceTypes = ['noun', 'verb', 'adjective', 'adverb', 'pronoun'].filter((t) => choiceTypes.includes(t));
  return {
    kind: 'choice',
    passage: marked,
    prompt: `What kind of word is <mark>${it.word}</mark>?`,
    choices: choiceTypes.map((t) => POS_LABEL[t]),
    ordered: true,
    answer: POS_LABEL[it.type],
    answerText: it.type,
    hint: 'Is it a thing (noun), an action (verb), or does it describe something (adjective)?',
    explain: `“${it.word}” is ${POS_EXPLAIN[it.type]}.`,
    visual: { type: 'card', text: it.word, sub: 'what kind of word?' },
  };
}

// ---------- vocabulary ----------
const SYN = [
  ['big', 'large'], ['small', 'tiny'], ['happy', 'glad'], ['fast', 'quick'], ['begin', 'start'], ['shut', 'close'],
  ['smart', 'clever'], ['angry', 'cross'], ['tired', 'sleepy'], ['shout', 'yell'], ['gift', 'present'], ['scared', 'afraid'],
  ['jump', 'leap'], ['pretty', 'lovely'], ['end', 'finish'], ['sad', 'unhappy'], ['easy', 'simple'], ['rock', 'stone'], ['talk', 'speak'],
];
const ANT = [
  ['hot', 'cold'], ['up', 'down'], ['happy', 'sad'], ['big', 'small'], ['fast', 'slow'], ['open', 'closed'], ['early', 'late'],
  ['full', 'empty'], ['light', 'dark'], ['loud', 'quiet'], ['wet', 'dry'], ['hard', 'soft'], ['young', 'old'], ['win', 'lose'],
  ['push', 'pull'], ['above', 'below'], ['laugh', 'cry'], ['day', 'night'], ['first', 'last'], ['always', 'never'],
];
const related = (w) => new Set([w, ...SYN.filter((p) => p.includes(w)).flat()]);

function synonym() {
  const [a, b] = shuffle(pick(SYN));
  const block = related(a);
  const pool = [...SYN.flat(), ...ANT.flat()].filter((w) => !block.has(w));
  return {
    kind: 'choice',
    prompt: `Which word means the <b>same</b> as <b>${a}</b>?`,
    choices: options(b, pool),
    answer: b,
    answerText: b,
    hint: `Synonyms are words that mean the same thing. Try the word in a sentence instead of “${a}”.`,
    explain: `“${a}” and “${b}” are synonyms — they mean the same.`,
    visual: { type: 'card', text: `${a} = ?`, sub: 'same meaning' },
  };
}

function antonym() {
  const [a, b] = shuffle(pick(ANT));
  const block = new Set([...related(a), ...related(b)]);
  const pool = [...SYN.flat(), ...ANT.flat()].filter((w) => !block.has(w));
  return {
    kind: 'choice',
    prompt: `What is the <b>opposite</b> of <b>${a}</b>?`,
    choices: options(b, pool),
    answer: b,
    answerText: b,
    hint: 'Antonyms are opposites, like up and down.',
    explain: `“${a}” and “${b}” are antonyms — they are opposites.`,
    visual: { type: 'card', text: `${a} ↔ ?`, sub: 'opposite' },
  };
}

const PLURALS = {
  1: [['cat', 'cats'], ['dog', 'dogs'], ['book', 'books'], ['tree', 'trees'], ['box', 'boxes'], ['bus', 'buses'], ['dish', 'dishes'], ['fox', 'foxes'], ['bench', 'benches'], ['glass', 'glasses']],
  2: [['baby', 'babies'], ['city', 'cities'], ['puppy', 'puppies'], ['berry', 'berries'], ['story', 'stories'], ['leaf', 'leaves'], ['wolf', 'wolves'], ['knife', 'knives'], ['box', 'boxes'], ['brush', 'brushes']],
  3: [['child', 'children'], ['mouse', 'mice'], ['foot', 'feet'], ['tooth', 'teeth'], ['man', 'men'], ['goose', 'geese'], ['person', 'people'], ['sheep', 'sheep'], ['fish', 'fish'], ['woman', 'women']],
};

function plural(level) {
  const [w, p] = pick(PLURALS[level]);
  const wrong = [w + 's', w + 'es', w.replace(/y$/, 'ies'), w.replace(/fe?$/, 'ves'), w + 'en', w.replace(/y$/, 'ys')];
  if (level === 3) wrong.push(p + 's', w);
  return {
    kind: 'choice',
    prompt: `What is the plural of <b>${w}</b>? <small>(more than one)</small>`,
    choices: options(p, wrong.filter((x) => x !== p)),
    answer: p,
    answerText: p,
    hint: level === 1 ? 'Words ending in s, x, sh or ch add -es.' : level === 2 ? 'Consonant + y changes to -ies. Words ending in f or fe often change to -ves.' : 'Some words change in a special way. One mouse, two…?',
    explain: `One ${w}, two ${p}.`,
    visual: { type: 'card', text: `${w} → ?`, sub: 'more than one' },
  };
}

const PAST = {
  1: [['walk', 'walked'], ['jump', 'jumped'], ['play', 'played'], ['help', 'helped'], ['look', 'looked'], ['call', 'called'], ['paint', 'painted']],
  2: [['hop', 'hopped'], ['stop', 'stopped'], ['cry', 'cried'], ['try', 'tried'], ['bake', 'baked'], ['smile', 'smiled'], ['run', 'ran'], ['eat', 'ate'], ['go', 'went'], ['see', 'saw']],
  3: [['swim', 'swam'], ['write', 'wrote'], ['sing', 'sang'], ['take', 'took'], ['find', 'found'], ['think', 'thought'], ['make', 'made'], ['come', 'came'], ['fly', 'flew'], ['drink', 'drank'], ['bring', 'brought']],
};

function pastTense(level) {
  const lv = Math.min(level, 3);
  const [w, p] = pick(PAST[lv]);
  const wrong = [w + 'ed', w + 'd', w + w.at(-1) + 'ed', w.replace(/y$/, 'ied'), w + 's', w + 'ing', w];
  return {
    kind: 'choice',
    prompt: `Yesterday I… What is the past tense of <b>${w}</b>?`,
    choices: options(p, wrong.filter((x) => x !== p)),
    answer: p,
    answerText: p,
    hint: lv === 1 ? 'Most action words add -ed for the past.' : 'Some words change their spelling or change completely. Say “Yesterday I…” out loud.',
    explain: `Today I ${w}. Yesterday I ${p}.`,
    visual: { type: 'card', text: `${w} → ?`, sub: 'yesterday', emoji: '⏪' },
  };
}

const COMPOUNDS = [
  ['butter', 'fly'], ['rain', 'bow'], ['foot', 'ball'], ['star', 'fish'], ['snow', 'man'], ['cup', 'cake'], ['tooth', 'brush'],
  ['bed', 'room'], ['fire', 'fly'], ['pan', 'cake'], ['sea', 'shell'], ['play', 'ground'], ['rain', 'coat'], ['moon', 'light'],
  ['sun', 'flower'], ['pop', 'corn'], ['back', 'pack'], ['gold', 'fish'], ['lady', 'bug'], ['door', 'bell'],
];

function compound() {
  const [a, b] = pick(COMPOUNDS);
  const word = a + b;
  const split = (k) => `${word.slice(0, k)} + ${word.slice(k)}`;
  const k = a.length;
  const wrong = [k - 1, k + 1, k - 2, k + 2].filter((x) => x > 0 && x < word.length).map(split);
  return {
    kind: 'choice',
    prompt: `Which two words make the compound word <b>${word}</b>?`,
    choices: options(split(k), wrong),
    answer: split(k),
    answerText: split(k),
    hint: 'A compound word is two real words stuck together. Look for two words you know!',
    explain: `${a} + ${b} = ${word}.`,
    visual: { type: 'card', text: word, sub: 'compound word', emoji: '🧩' },
  };
}

const HOMOPHONES = [
  ['I can ___ the birds singing.', 'hear', 'here'], ['Come over ___ and sit with me.', 'here', 'hear'],
  ['We saw a whale in the ___.', 'sea', 'see'], ['I can ___ the moon tonight.', 'see', 'sea'],
  ['Please ___ your name on the card.', 'write', 'right'], ['Turn ___ at the big tree.', 'right', 'write'],
  ['I have ___ cookies left.', 'two', 'to'], ['We walked ___ the park.', 'to', 'two'],
  ['The wind ___ my hat away.', 'blew', 'blue'], ['The sky is bright ___.', 'blue', 'blew'],
  ['I ate a juicy ___.', 'pear', 'pair'], ['I need a new ___ of socks.', 'pair', 'pear'],
  ['Our team ___ the game!', 'won', 'one'], ['I ___ the answer!', 'know', 'no'],
  ['There are ___ eggs in the box.', 'eight', 'ate'], ['Mum baked bread with ___.', 'flour', 'flower'],
];

function homophone() {
  const [s, a, b] = pick(HOMOPHONES);
  return {
    kind: 'choice',
    passage: s.replace('___', '<span class="blank">____</span>'),
    prompt: 'Choose the right word for the sentence.',
    say: `Choose the right word: ${s.replace('___', 'blank')}`,
    choices: options(a, [b]),
    answer: a,
    answerText: a,
    hint: `“${a}” and “${b}” sound the same but mean different things.`,
    explain: s.replace('___', a),
    visual: { type: 'card', text: `${a} / ${b}`, sub: 'sound the same', emoji: '👂' },
  };
}

const PREFIXES = [
  ['un', 'happy', 'not happy'], ['un', 'kind', 'not kind'], ['un', 'safe', 'not safe'], ['un', 'fair', 'not fair'],
  ['re', 'do', 'do again'], ['re', 'write', 'write again'], ['re', 'fill', 'fill again'], ['re', 'play', 'play again'],
  ['pre', 'heat', 'heat before'], ['dis', 'like', 'not like'], ['dis', 'agree', 'not agree'],
];

function prefix() {
  const [p, base, meaning] = pick(PREFIXES);
  return {
    kind: 'choice',
    prompt: `The prefix <b>${p}-</b> changes a word. What does <b>${p}${base}</b> mean?`,
    choices: options(meaning, [`not ${base}`, `${base} again`, `${base} before`, `very ${base}`]),
    answer: meaning,
    answerText: meaning,
    hint: 'un- and dis- mean “not”. re- means “again”. pre- means “before”.',
    explain: `${p}${base} means “${meaning}”.`,
    visual: { type: 'card', text: `${p} + ${base}`, sub: 'prefix', emoji: '🔧' },
  };
}

export function vocab(level) {
  const kinds = [synonym, antonym, () => plural(1), compound];
  if (level >= 2) kinds.push(() => plural(2), () => pastTense(1), () => pastTense(2));
  if (level >= 3) kinds.push(() => plural(3), () => pastTense(3), homophone, homophone, prefix);
  return pick(kinds)();
}

// ---------- sentences & punctuation ----------
const END_MARKS = [
  ['Where is my blue pencil', '?'], ['I love to read books', '.'], ['Watch out for the bee', '!'], ['What time is lunch', '?'],
  ['The sun is very bright today', '.'], ['Wow, that was amazing', '!'], ['Can we go to the beach', '?'], ['My cat likes to nap', '.'],
  ['Hooray, we won', '!'], ['Do you like apples', '?'], ['We planted a tree', '.'], ['Help, the milk is spilling', '!'],
  ['How many legs does a spider have', '?'], ['Dad made pancakes for breakfast', '.'],
];
const MARK_LABEL = { '.': 'Full stop  .', '?': 'Question mark  ?', '!': 'Exclamation mark  !' };
const MARK_WHY = { '.': 'it is a telling sentence', '?': 'it asks a question', '!': 'it shows strong feeling or excitement' };

function endMark() {
  const [s, m] = pick(END_MARKS);
  return {
    kind: 'choice',
    passage: `${s}<span class="blank">__</span>`,
    prompt: 'Which mark should end this sentence?',
    say: `Which mark should end this sentence? ${s}`,
    choices: ['.', '?', '!'].map((x) => MARK_LABEL[x]),
    ordered: true,
    answer: MARK_LABEL[m],
    answerText: m,
    hint: 'Is it telling something, asking something, or showing excitement?',
    explain: `It ends with “${m}” because ${MARK_WHY[m]}.`,
    visual: { type: 'card', text: '.   ?   !', sub: 'end marks', emoji: '✏️' },
  };
}

const CORRECT = [
  'My friend Maya lives in London.', 'On Monday we went to the zoo.', 'Can you help me find my hat?', 'Isha and Sam played in the park.',
  'We will visit Grandma in July.', 'Is it raining in Paris today?', 'Our class read a book about Mars.', 'Tom has a red bike.',
  'I like to swim in the summer.', 'Do you want to come to my party on Friday?', 'Ben and I went to the library.',
];

function mutations(s) {
  const out = new Set();
  out.add(s[0].toLowerCase() + s.slice(1));
  out.add(s.slice(0, -1));
  out.add(s.slice(0, -1) + (s.endsWith('?') ? '.' : '?'));
  const words = s.split(' ');
  words.forEach((w, i) => {
    if (i > 0 && /^[A-Z]/.test(w)) {
      const copy = [...words];
      copy[i] = w[0].toLowerCase() + w.slice(1);
      out.add(copy.join(' '));
    }
    if (i > 0 && /^[a-z]{3,}$/.test(w) && chance(0.3)) {
      const copy = [...words];
      copy[i] = w[0].toUpperCase() + w.slice(1);
      out.add(copy.join(' '));
    }
  });
  out.delete(s);
  return [...out];
}

function correctSentence() {
  const s = pick(CORRECT);
  return {
    kind: 'choice',
    prompt: 'Which sentence is written correctly?',
    choices: options(s, mutations(s)),
    long: true,
    answer: s,
    answerText: s,
    hint: 'Check for a capital letter at the start, capitals for names, places, days and months, and the right end mark.',
    explain: `“${s}” — capital letters in the right places and the right end mark.`,
    visual: { type: 'card', text: 'Aa  .  ?', sub: 'capitals & marks', emoji: '🔍' },
  };
}

const CONTRACTIONS = [
  ['do not', "don't"], ['cannot', "can't"], ['I am', "I'm"], ['it is', "it's"], ['we will', "we'll"], ['they are', "they're"],
  ['you are', "you're"], ['is not', "isn't"], ['she is', "she's"], ['I have', "I've"],
];

function contraction() {
  const [full, short] = pick(CONTRACTIONS);
  return {
    kind: 'choice',
    prompt: `Which contraction means <b>${full}</b>?`,
    choices: options(short, CONTRACTIONS.map((c) => c[1]).filter((c) => c !== short)),
    answer: short,
    answerText: short,
    hint: 'A contraction squeezes two words together. The apostrophe ( \' ) takes the place of missing letters.',
    explain: `${full} → ${short}.`,
    visual: { type: 'card', text: `${full} → ?`, sub: 'squeeze it!', emoji: '🤏' },
  };
}

export function sentences(level) {
  const kinds = level === 1 ? [endMark] : level === 2 ? [endMark, correctSentence, correctSentence] : [endMark, correctSentence, contraction, contraction];
  return pick(kinds)();
}

// ---------- reading ----------
export const PASSAGES = {
  library: {
    title: "Miss Whiskers' Lost Book",
    text: "Every morning, Miss Whiskers opens the library at eight o'clock. Today, she could not find her favourite book, <i>The Moon Garden</i>. She looked under the desk and behind the big chair. At last, she found it in her basket of yarn! Her kitten, Mittens, had been sleeping on it all night.",
    questions: [
      ['Where did Miss Whiskers find her book?', 'In her basket of yarn', ['Under the desk', 'Behind the big chair', 'On a high shelf']],
      ['Who was sleeping on the book?', 'Mittens the kitten', ['Miss Whiskers', 'Hoot the owl', 'A little mouse']],
      ['What time does the library open?', "Eight o'clock", ["Two o'clock", "Six o'clock", 'Half past nine']],
    ],
  },
  garden: {
    title: "Petal's Sunflowers",
    text: "In spring, Petal planted five tiny seeds. She watered them every day and sang them happy songs. Soon, little green shoots popped up. By summer, the sunflowers were taller than Petal's house! Bees buzzed around the big yellow flowers, and Petal smiled from ear to ear.",
    questions: [
      ['How many seeds did Petal plant?', 'Five', ['Two', 'Ten', 'Seven']],
      ['What did Petal do every day?', 'Watered the seeds', ['Picked the flowers', 'Ate the seeds', 'Painted the house']],
      ['Which word best describes the sunflowers in summer?', 'Tall', ['Tiny', 'Blue', 'Sleepy']],
    ],
  },
  cave: {
    title: 'The Glowing Cave',
    text: "Deep inside Crystal Cave, the walls glow pink, blue and gold. Pebble the hamster keeps a map so that nobody gets lost. \"Always follow the blue crystals,\" Pebble says, \"and they will lead you safely out.\"",
    questions: [
      ['What does Pebble keep so nobody gets lost?', 'A map', ['A lamp', 'A key', 'A song']],
      ['Which crystals lead you safely out?', 'The blue crystals', ['The pink crystals', 'The gold crystals', 'The green crystals']],
      ['What colours do the cave walls glow?', 'Pink, blue and gold', ['Red and green', 'Only blue', 'Black and white']],
    ],
  },
};

export function readingQuestions(key, n) {
  const p = PASSAGES[key];
  return shuffle(p.questions).slice(0, n).map(([q, a, wrong]) => ({
    kind: 'choice',
    topic: 'reading',
    passage: `<b>${p.title}</b><br>${p.text}`,
    prompt: q,
    say: `${p.title}. ${p.text.replace(/<[^>]+>/g, '')} ${q}`,
    choices: options(a, wrong),
    long: true,
    answer: a,
    answerText: a,
    hint: 'Look back at the story. The answer is hiding in the words!',
    explain: `The story tells us: ${a.toLowerCase()}.`,
    visual: { type: 'card', text: p.title, sub: 'read the story', emoji: '📖' },
  }));
}
