// {P} = current player, {A} = player A (other 1), {B} = player B (other 2), {ALL} = everyone
export const PROMPTS = [
  // Drink prompts
  { text: `{P}, take 2 sips. No questions asked.`, emoji: '🍺', type: 'drink' },
  { text: `{A} thinks you are too sober, {P}. Down 3 sips.`, emoji: '😬', type: 'drink' },
  { text: `Everyone drink 1 sip. Cheers to bad decisions.`, emoji: '🥂', type: 'drink' },
  { text: `{P}, last to put their finger on their nose drinks 2.`, emoji: '👃', type: 'drink' },
  { text: `{A} and {P} cheers. Whoever finishes last drinks 1 extra.`, emoji: '🍻', type: 'drink' },
  { text: `{P}, if you've been on your phone in the last 5 minutes, drink 2.`, emoji: '📱', type: 'drink' },
  { text: `The tallest person in the room drinks 2. You know who you are.`, emoji: '📏', type: 'drink' },
  { text: `{P}, drink 1 for every person you've kissed tonight. Minimum 1.`, emoji: '💋', type: 'drink' },
  { text: `Everyone point at who they'd least trust with a secret. That person drinks 2.`, emoji: '🤫', type: 'drink' },
  { text: `{B} nominates someone to drink 3. Choose wisely.`, emoji: '🎯', type: 'drink' },
  { text: `{P}, stand up and take a bow, then drink 2.`, emoji: '🎭', type: 'drink' },
  { text: `Whoever last checked their phone drinks 1. Be honest.`, emoji: '😅', type: 'drink' },
  { text: `{ALL} Waterfall! {P} starts — everyone drinks until the person to their left stops.`, emoji: '🌊', type: 'drink' },
  { text: `{P}, if you can't name 3 capital cities right now, drink 3.`, emoji: '🌍', type: 'drink' },
  { text: `Youngest person in the room drinks 2. They need it.`, emoji: '👶', type: 'drink' },

  // Dare / action prompts
  { text: `{P}, do your best impression of {A}. Everyone votes — if majority say it's bad, drink 2.`, emoji: '🎪', type: 'dare' },
  { text: `{P}, text someone from your contacts "I have a confession". Read the reply out loud when it comes.`, emoji: '📲', type: 'dare' },
  { text: `Thumb war — {P} vs {A}. Loser drinks 2.`, emoji: '👍', type: 'dare' },
  { text: `{P}, say something genuinely nice about {B}. If they don't believe it, drink 2.`, emoji: '💛', type: 'dare' },
  { text: `Rock Paper Scissors — {A} vs {B}. Loser drinks 3.`, emoji: '✌️', type: 'dare' },
  { text: `{P}, name 5 songs without using your phone. Miss one, drink 1 per miss.`, emoji: '🎵', type: 'dare' },
  { text: `{P}, do 10 jumping jacks or drink 3. Your call.`, emoji: '🏃', type: 'dare' },
  { text: `Staring contest — {P} vs {A}. First to blink drinks 2.`, emoji: '👀', type: 'dare' },
  { text: `{P}, speak in an accent chosen by {B} for the next 2 rounds or drink 3.`, emoji: '🗣️', type: 'dare' },
  { text: `{P}, show everyone the last photo on your camera roll. Drink 2 if you refuse.`, emoji: '📸', type: 'dare' },
  { text: `Most likely to get lost on a night out? Everyone points. Most fingers = 3 sips.`, emoji: '🗺️', type: 'dare' },
  { text: `{P} and {A}: tell each other your honest first impression. Refuse = 3 sips each.`, emoji: '🪞', type: 'dare' },
  { text: `{P}, without laughing: tell {B} why they're your favourite person. Laugh = 2 sips.`, emoji: '😐', type: 'dare' },
  { text: `Group vote: who here would survive a zombie apocalypse? Last place drinks 3.`, emoji: '🧟', type: 'dare' },
  { text: `{P}, do your best robot dance for 10 seconds. No robot = drink 2.`, emoji: '🤖', type: 'dare' },
  { text: `{P}, whisper something embarrassing about yourself to {A}. {A} decides if the group hears it.`, emoji: '🤐', type: 'dare' },

  // Rule prompts
  { text: `{P} makes a rule. Everyone must follow it for the next 5 rounds or drink 1 per violation.`, emoji: '📜', type: 'rule' },
  { text: `New rule: no one can say "drink" or "sip". Violations = 1 sip each. {P} enforces this.`, emoji: '🚫', type: 'rule' },
  { text: `New rule from {P}: No swearing for the rest of the game. Swear = 1 sip.`, emoji: '🤬', type: 'rule' },
  { text: `From now on, {B} must refer to themselves in the third person. Fail = 1 sip.`, emoji: '👑', type: 'rule' },
  { text: `{P} creates a hand signal. Anyone caught not doing it when {P} does = 1 sip.`, emoji: '🤙', type: 'rule' },

  // Question / Would You Rather
  { text: `{P}, would you rather text your ex or text your boss something embarrassing? Tell the group.`, emoji: '😳', type: 'question' },
  { text: `Hot take from {P}: say something controversial. {A} and {B} vote — if both disagree, {P} drinks 2.`, emoji: '🔥', type: 'question' },
  { text: `{P}, finish this sentence: "The worst thing about {A} is…". {A} decides if that warrants 2 sips for {P}.`, emoji: '💭', type: 'question' },
  { text: `{P}, rank everyone in this room by who you'd call at 3am in a crisis. Last place drinks 2.`, emoji: '🌙', type: 'question' },
  { text: `Everyone secretly votes for who's the most dramatic. Most votes drinks 3.`, emoji: '🎬', type: 'question' },
  { text: `{P}: what's something {B} always does that quietly drives you mad? Be honest or drink 2.`, emoji: '😤', type: 'question' },
  { text: `Speed round: {P} has 10 seconds to name 3 things {A} loves. Miss any = 1 sip each.`, emoji: '⚡', type: 'question' },
  { text: `{P}, on a scale of 1–10, how drunk do you feel right now? If {A} and {B} both disagree with your number, drink 2.`, emoji: '🌡️', type: 'question' },

  // Bonus chaos
  { text: `CHAOS ROUND — everyone swaps seats AND drinks 2. Now carry on.`, emoji: '🌀', type: 'drink' },
  { text: `{P}, you're the quiz master: ask {A} and {B} one trivia question each. Wrong answers = 2 sips.`, emoji: '🎓', type: 'dare' },
  { text: `{A}, you're on a 1-minute ban from talking. Say anything = 1 sip.`, emoji: '🤐', type: 'rule' },
  { text: `First person to check their phone in the next 2 minutes drinks 4. {P} is watching.`, emoji: '📵', type: 'rule' },
  { text: `{P}, call someone not here and convince them you're at a yoga class. Fail = drink 3.`, emoji: '🧘', type: 'dare' },
];

export function buildPrompt(template, players, currentIdx) {
  const others = players.filter((_, i) => i !== currentIdx);
  const [A, B] = others;
  return template
    .replace(/\{P\}/g, players[currentIdx])
    .replace(/\{A\}/g, A || 'Player 2')
    .replace(/\{B\}/g, B || 'Player 3')
    .replace(/\{ALL\}/g, 'Everyone');
}

export function shufflePrompts() {
  const arr = [...PROMPTS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
