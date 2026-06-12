export const RHYME_WORDS = [
  'Moon', 'Fire', 'Night', 'Wine', 'Dark', 'Gold', 'Storm', 'Stone',
  'Flame', 'Spell', 'Brew', 'Star', 'Mist', 'Hex', 'Gloom', 'Fate',
];

export const CATEGORIES = [
  { name: 'Types of Beer', examples: ['IPA', 'Stout', 'Lager'] },
  { name: 'Cocktails', examples: ['Mojito', 'Negroni', 'Martini'] },
  { name: 'Things in a Haunted House', examples: ['Ghost', 'Cobwebs', 'Candles'] },
  { name: 'Disney Movies', examples: ['Frozen', 'Aladdin', 'Mulan'] },
  { name: 'Board Games', examples: ['Chess', 'Scrabble', 'Risk'] },
  { name: 'Dog Breeds', examples: ['Poodle', 'Boxer', 'Husky'] },
  { name: 'Pizza Toppings', examples: ['Pepperoni', 'Mushroom', 'Olives'] },
  { name: 'Countries in Europe', examples: ['France', 'Spain', 'Italy'] },
  { name: 'Things That Are Purple', examples: ['Grape', 'Lavender', 'Eggplant'] },
  { name: 'Superpowers', examples: ['Flight', 'Telekinesis', 'Invisibility'] },
];

export const NEVER_HAVE_I_EVER_PROMPTS = [
  'Drunk texted an ex',
  'Stayed up all night',
  'Eaten food off the floor',
  'Pretended to be sick to skip something',
  'Sang karaoke',
  'Cried at a commercial',
  'Lied about watching a movie/show',
  'Accidentally liked an old social media post',
  'Sleepwalked',
  'Sent an email to the wrong person',
];

export function getRandomRhymeWord() {
  return RHYME_WORDS[Math.floor(Math.random() * RHYME_WORDS.length)];
}

export function getRandomCategory() {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

export function getRandomNeverPrompt() {
  const used = [];
  return () => {
    const unused = NEVER_HAVE_I_EVER_PROMPTS.filter(p => !used.includes(p));
    if (unused.length === 0) used.length = 0;
    const pick = unused[Math.floor(Math.random() * unused.length)];
    used.push(pick);
    return pick;
  };
}

export const COMPOSURE_CHALLENGES = [
  {
    id: 'tongue_twister',
    prompt: 'Say 3 times fast:',
    items: [
      'Unique New York',
      'Red Lorry Yellow Lorry',
      'She sells seashells',
      'Freshly fried fish',
      'Six slick slim slender saplings',
      'Toy boat toy boat',
    ],
  },
  {
    id: 'math',
    prompt: 'Quick! What is:',
    items: ['17 + 38', '56 - 19', '8 × 7', '144 ÷ 12', '23 + 47', '81 - 36', '6 × 9', '72 ÷ 8'],
  },
  {
    id: 'spell',
    prompt: 'Spell this backwards:',
    items: ['DRUNK', 'MAGIC', 'NIGHT', 'SPELL', 'POTION', 'WAND', 'RAVEN', 'GHOST'],
  },
];

// Relationship questions — [drawer] is replaced with the drawer's name at render time
export const RELATIONSHIP_QUESTIONS = [
  'What is [drawer]\'s favorite meal?',
  'What did [drawer] want to be when they grew up?',
  'What is [drawer]\'s biggest pet peeve?',
  'What is [drawer]\'s go-to comfort food?',
  'What is [drawer]\'s most-used phrase?',
  'What is [drawer]\'s biggest fear?',
  'What would [drawer] order at a restaurant without looking at the menu?',
  'What is [drawer]\'s favorite way to spend a Sunday?',
  'What habit of [drawer]\'s secretly annoys you the most?',
  'What is [drawer]\'s love language?',
  'What song always makes [drawer] think of you two?',
  'What\'s [drawer]\'s most embarrassing moment you know about?',
  'What is [drawer]\'s hidden talent?',
  'What would [drawer] do with a surprise free day alone?',
  'What was [drawer]\'s childhood nickname?',
  'What is [drawer]\'s favourite TV show?',
  'Who is [drawer]\'s celebrity crush?',
  'What does [drawer] always forget to do?',
  'What is [drawer]\'s most used emoji?',
  'Where does [drawer] want to travel most?',
];

export function getRandomRelationshipQuestion(drawerName) {
  const template = RELATIONSHIP_QUESTIONS[Math.floor(Math.random() * RELATIONSHIP_QUESTIONS.length)];
  return template.replace(/\[drawer\]/g, drawerName);
}

export function getRandomComposureChallenge() {
  const category = COMPOSURE_CHALLENGES[Math.floor(Math.random() * COMPOSURE_CHALLENGES.length)];
  const item = category.items[Math.floor(Math.random() * category.items.length)];
  return { prompt: category.prompt, item };
}
