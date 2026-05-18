export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const CARD_RULES = {
  A: {
    name: 'Waterfall',
    icon: '🌊',
    type: 'special',
    description: 'Both players drink simultaneously. Drawer stops whenever they want — other player can ONLY stop when drawer stops.',
    drawerSips: 0,
    otherSips: 0,
    interaction: 'waterfall',
  },
  '2': {
    name: 'Just You',
    icon: '👆',
    type: 'drink',
    description: 'Drawer drinks 2 sips.',
    drawerSips: 2,
    otherSips: 0,
  },
  '3': {
    name: 'Lucky Three',
    icon: '🍀',
    type: 'drink',
    description: 'Other player drinks 3 sips.',
    drawerSips: 0,
    otherSips: 3,
  },
  '4': {
    name: 'Give or Take',
    icon: '⚖️',
    type: 'choice',
    description: 'Give 4 sips to the other player OR take 4 sips yourself. Choose wisely.',
    drawerSips: 0,
    otherSips: 0,
    interaction: 'give_or_take',
    sips: 4,
  },
  '5': {
    name: 'Both In',
    icon: '🤝',
    type: 'both',
    description: 'Both players drink 5 sips. Cheers!',
    drawerSips: 5,
    otherSips: 5,
  },
  '6': {
    name: 'Hex',
    icon: '🔮',
    type: 'drink',
    description: 'Drawer is hexed — drink 6 sips.',
    drawerSips: 6,
    otherSips: 0,
  },
  '7': {
    name: 'Heaven',
    icon: '☁️',
    type: 'reflex',
    description: 'Both players point to the sky! Last one to do it drinks 7 sips.',
    drawerSips: 0,
    otherSips: 0,
    interaction: 'reflex',
    loserSips: 7,
  },
  '8': {
    name: 'Enchanted Mate',
    icon: '🔗',
    type: 'mate',
    description: 'Pick a mate! Whenever YOU drink for the rest of the game, your mate drinks too. Replaces any previous mate.',
    drawerSips: 0,
    otherSips: 0,
    interaction: 'mate',
  },
  '9': {
    name: 'Rhyme Time',
    icon: '🎵',
    type: 'challenge',
    description: 'Drawer says a word. Other player must rhyme with it. Can\'t repeat or take too long — loser drinks 4 sips.',
    drawerSips: 0,
    otherSips: 0,
    interaction: 'rhyme',
    loserSips: 4,
  },
  '10': {
    name: 'Dark Categories',
    icon: '📜',
    type: 'challenge',
    description: 'Drawer names a category. Alternate naming things in it. First to fail or repeat drinks 4 sips.',
    drawerSips: 0,
    otherSips: 0,
    interaction: 'categories',
    loserSips: 4,
  },
  J: {
    name: 'Never Have I Ever',
    icon: '🤫',
    type: 'challenge',
    description: 'Three fingers each. Take turns saying "Never have I ever...". If you HAVE done it, put a finger down. First to fold all three fingers drinks.',
    drawerSips: 0,
    otherSips: 0,
    interaction: 'never',
    loserSips: 5,
  },
  Q: {
    name: 'Know Your Person',
    icon: '💘',
    type: 'challenge',
    description: 'A relationship question is drawn for the other player to answer. Get it wrong — drink 3 sips. Drawer is the judge.',
    drawerSips: 0,
    otherSips: 0,
    interaction: 'relationship_question',
    loserSips: 3,
  },
  K: {
    name: 'The Enchanted Chalice',
    icon: '🏺',
    type: 'chalice',
    description: 'Pour some of your drink into the Enchanted Chalice. Whoever draws the LAST King must drink the entire chalice.',
    drawerSips: 0,
    otherSips: 0,
    interaction: 'chalice',
  },
};

export function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getRuleForCard(rank) {
  return CARD_RULES[rank] || null;
}

export function isRedSuit(suit) {
  return suit === '♥' || suit === '♦';
}
