// The branching adventure. Each node is a place with a character, a challenge and outcomes.
// Outcomes are checked in order: the first whose `min` score ratio is met (and whose `ifNot`
// place has not been visited) wins. `mode` is how the explorer travels to the next place.
export const STORY = {
  start: {
    loc: 'village',
    lines: [
      ['hoot', "Hoo-hoo! {name}, you're here at last! I'm Hoot, the wise owl of Lumina Island."],
      ['hoot', 'Last night, Rascal the Raven swooped down and stole all the Star Crystals!'],
      ['hoot', 'Without them the Clock Tower stopped, the stepping stones sank into Number River, and the words in the library got all jumbled up.'],
      ['hoot', 'Only a clever explorer can win the crystals back. Your answers will choose our path — so think carefully! Where shall we go first?'],
    ],
    choices: [
      { text: '🧁 Merry Market — help with times tables', next: 'market' },
      { text: '📚 Whisper Library — fix the jumbled words', next: 'library' },
    ],
  },
  market: {
    loc: 'market', who: 'bun', title: 'The Muffin Muddle', topics: ['mult', 'mult', 'mult', 'mult', 'mult'],
    lines: [
      ['bun', "Oh, hello! I'm Baker Bun. That rascally raven knocked over all my muffin trays!"],
      ['bun', 'I need to know how many treats I have for the Island Party. Can you count them the quick way — with times tables?'],
    ],
    outcomes: [
      { min: 0.8, text: "You're a times-table superstar! Hop into my hot-air balloon — it will fly you straight over the river to the Clock Tower! 🎈", next: 'clocktower', mode: 'balloon' },
      { min: 0, text: "Thank you, that really helped! My balloon is full of muffins, so you'll have to walk the long way, through the Sharing Forest.", next: 'forest' },
    ],
  },
  library: {
    loc: 'library', who: 'whiskers', title: 'The Jumbled Library', reading: { key: 'library', n: 2 }, topics: ['spell', 'spell', 'grammar'],
    lines: [
      ['whiskers', "Shh… welcome to Whisper Library. I'm Miss Whiskers."],
      ['whiskers', 'Rascal jumbled the letters in all my books! First read my little story, then help me put the words back together.'],
    ],
    outcomes: [
      { min: 0.8, text: "Purr-fect! You found my secret bookcase door. It hides a tunnel that goes all the way under the island to Number River!", next: 'river', mode: 'tunnel' },
      { min: 0, text: 'Thank you! Some of the runaway words escaped to the Word Garden. Let\'s catch them there!', next: 'garden' },
    ],
  },
  garden: {
    loc: 'garden', who: 'petal', title: 'The Wilting Word Garden', reading: { key: 'garden', n: 1 }, topics: ['vocab', 'vocab', 'sentences', 'sentences'],
    lines: [
      ['petal', "Hi! I'm Petal. My flowers only bloom when they hear the right words — and Rascal has made them all droopy."],
      ['petal', 'Can you help me find the right words to wake them up?'],
    ],
    outcomes: [
      { min: 0.8, text: 'Look — every flower is blooming! My butterfly friends will carry you all the way to Crystal Cave! 🦋', next: 'cave', mode: 'fly' },
      { min: 0, text: 'The flowers are perking up — thank you! Follow the stepping stones down to Number River.', next: 'river' },
    ],
  },
  forest: {
    loc: 'forest', who: 'nutty', title: 'The Great Acorn Share', topics: ['div', 'div', 'div', 'div', 'div'],
    lines: [
      ['nutty', "Hiya! I'm Nutty the squirrel. Rascal dropped a huge pile of acorns and berries, and now everyone is arguing!"],
      ['nutty', 'We need to share them out fairly — the same for everyone. That\'s called dividing! Can you help?'],
    ],
    outcomes: [
      { min: 0.8, text: "Wow, everybody got a fair share! I'll show you my secret squirrel shortcut, straight to the Clock Tower!", next: 'clocktower', mode: 'walk' },
      { min: 0, text: 'Thanks for sharing so kindly! The path to Number River is just through those trees.', next: 'river' },
    ],
  },
  clocktower: {
    loc: 'clocktower', who: 'tock', title: 'The Frozen Clock Tower', topics: ['clock', 'clock', 'clock', 'clock', 'clock'],
    lines: [
      ['tock', "I'm Tock, keeper of the Clock Tower. Since Rascal took the crystal, time has stood still!"],
      ['tock', 'To start the clock again, we must read and set the times exactly right. Long hand for minutes, short hand for hours!'],
    ],
    outcomes: [
      { min: 0.8, text: 'Tick-tock, tick-tock! The tower is ticking again, all thanks to your sharp eyes! From up here I can see two paths.' },
      { min: 0, text: 'The clock is ticking again — thank you! Now, which way next?' },
    ],
    choices: [
      { text: '🌊 Number River — bring back the stepping stones', next: 'river', ifNot: 'river' },
      { text: '💎 Crystal Cave — the mysterious glowing cave', next: 'cave' },
    ],
  },
  river: {
    loc: 'river', who: 'freddie', title: 'The Sunken Stepping Stones', topics: ['line', 'line', 'line', 'line', 'line'],
    lines: [
      ['freddie', "Ribbit! I'm Freddie. The stepping stones across Number River sank when Rascal flew over!"],
      ['freddie', 'Every stone has a number. Put the numbers back in the right places on the number line and the stones will float up again!'],
    ],
    outcomes: [
      { min: 0.8, text: 'Splish-splash, every stone is back! Jump on my lily-pad boat — it will take you right up to Crystal Cave!', next: 'cave', mode: 'walk' },
      { min: 0, ifNot: 'clocktower', text: "Ribbit, that's much better! The path to the Clock Tower is over the stones now.", next: 'clocktower' },
      { min: 0, text: 'Ribbit, thank you! Now you can hop across to Crystal Cave.', next: 'cave' },
    ],
  },
  cave: {
    loc: 'cave', who: 'pebble', title: 'The Riddle Gate', reading: { key: 'cave', n: 1 }, topics: ['mult', 'div', 'clock', 'line', 'vocab'], shuffle: true,
    lines: [
      ['pebble', "Who goes there? Oh! An explorer! I'm Pebble. I look after Crystal Cave."],
      ['pebble', "Rascal locked the way to Raven's Roost with a Riddle Gate. It asks a bit of EVERYTHING you've learned. Ready?"],
    ],
    outcomes: [
      { min: 0.8, text: "The gate is wide open — and look, a Golden Feather! It will make Rascal's riddles a little shorter. Good luck!", next: 'castle', mode: 'walk', flag: 'feather' },
      { min: 0, text: 'The gate creaks open! Be brave, explorer — Rascal is waiting at the top of the hill.', next: 'castle', mode: 'walk' },
    ],
  },
  castle: {
    loc: 'castle', who: 'rascal', title: "Rascal's Riddles", boss: true, boost: 1, timer: 45, shuffle: true,
    topics: ['mult', 'div', 'clock', 'line', 'spell', 'grammar', 'vocab', 'sentences'],
    lines: [
      ['rascal', "Caw caw! So YOU'RE the explorer who's been fixing my mischief!"],
      ['rascal', "These crystals are MINE now… unless you can answer my trickiest riddles. Quick answers earn lightning bolts! ⚡"],
    ],
  },
};

export const ENDINGS = {
  friend: {
    min: 0.85, title: 'The Friendship Rainbow', emoji: '🌈',
    lines: [
      ['rascal', "Caw… you solved them ALL! You're the cleverest explorer I have ever met."],
      ['rascal', 'The truth is… I only took the crystals because nobody ever played puzzle games with me.'],
      ['you', "You can play with us any time, Rascal! That's what friends do."],
      ['rascal', 'Really?! Then here — every single crystal, back where it belongs!'],
      ['hoot', 'Look, {name}! A rainbow over Lumina Island! You found the very best ending!'],
    ],
  },
  good: {
    min: 0.6, title: 'The Crystals Come Home', emoji: '💎',
    lines: [
      ['rascal', 'Caw! Fine, fine — you win! Take your shiny crystals back.'],
      ['rascal', "But I'll be back with even trickier riddles. Practise hard, explorer!"],
      ['hoot', "Hooray! Lumina Island is saved, {name}! There might be an even happier ending if you try a different path…"],
    ],
  },
  try: {
    min: 0, title: "The Raven's Rematch", emoji: '🪶',
    lines: [
      ['rascal', 'Caw-caw-caw! Not quite good enough! I will keep the biggest crystal for now.'],
      ['hoot', "Don't worry, {name}. Every explorer learns by trying. Let's practise and come back stronger!"],
      ['hoot', 'Next time, try a different path — your answers will open new doors!'],
    ],
  },
};

export function storyEdges() {
  const edges = [];
  for (const node of Object.values(STORY)) {
    for (const o of [...(node.outcomes || []), ...(node.choices || [])]) {
      if (!o.next) continue;
      const mode = o.mode || 'walk';
      edges.push({ from: node.loc, to: STORY[o.next].loc, air: mode !== 'walk' });
    }
  }
  return edges;
}
