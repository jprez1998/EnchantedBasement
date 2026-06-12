// General knowledge question bank, grouped by difficulty.
// Each question: { category, question, options: [4], correct: index }
//
// Penalty model (set in game logic):
//   easy wrong   -> shot of soju  (you should've known it!)
//   medium wrong -> large sip
//   hard wrong   -> one normal sip (it was tough, small mercy)

export const EASY_QUESTIONS = [
  { category: 'Geography', question: 'What is the capital of France?', options: ['Paris', 'Rome', 'Madrid', 'Berlin'], correct: 0 },
  { category: 'Science', question: 'What planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct: 1 },
  { category: 'Animals', question: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], correct: 1 },
  { category: 'Math', question: 'What is 7 × 8?', options: ['54', '56', '64', '48'], correct: 1 },
  { category: 'Food', question: 'What fruit is traditionally used to make wine?', options: ['Apple', 'Grape', 'Orange', 'Peach'], correct: 1 },
  { category: 'Colors', question: 'What two colors make green?', options: ['Red + Blue', 'Blue + Yellow', 'Red + Yellow', 'Black + White'], correct: 1 },
  { category: 'Geography', question: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correct: 3 },
  { category: 'Body', question: 'How many bones are in the adult human body?', options: ['206', '198', '250', '180'], correct: 0 },
  { category: 'Music', question: 'How many strings does a standard guitar have?', options: ['4', '5', '6', '7'], correct: 2 },
  { category: 'Nature', question: 'What gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], correct: 2 },
  { category: 'Geography', question: 'What is the largest country by area?', options: ['China', 'USA', 'Canada', 'Russia'], correct: 3 },
  { category: 'Animals', question: 'What is the fastest land animal?', options: ['Lion', 'Cheetah', 'Horse', 'Gazelle'], correct: 1 },
  { category: 'Sports', question: 'How many players are on a soccer team on the field?', options: ['9', '10', '11', '12'], correct: 2 },
  { category: 'Pop Culture', question: 'What color is associated with Coca-Cola?', options: ['Blue', 'Green', 'Red', 'Yellow'], correct: 2 },
  { category: 'Science', question: 'What is H₂O commonly known as?', options: ['Salt', 'Water', 'Sugar', 'Oxygen'], correct: 1 },
  { category: 'Geography', question: 'On which continent is Egypt?', options: ['Asia', 'Europe', 'Africa', 'South America'], correct: 2 },
  { category: 'Math', question: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], correct: 1 },
  { category: 'Food', question: 'Which of these is a citrus fruit?', options: ['Banana', 'Lemon', 'Apple', 'Strawberry'], correct: 1 },
  { category: 'Time', question: 'How many days are in a leap year?', options: ['364', '365', '366', '367'], correct: 2 },
  { category: 'Animals', question: 'What do bees produce?', options: ['Milk', 'Honey', 'Silk', 'Wax only'], correct: 1 },
  { category: 'Pop Culture', question: 'What is the name of the toy cowboy in Toy Story?', options: ['Buzz', 'Woody', 'Rex', 'Hamm'], correct: 1 },
  { category: 'Geography', question: 'Which country is shaped like a boot?', options: ['Spain', 'Greece', 'Italy', 'Portugal'], correct: 2 },
];

export const MEDIUM_QUESTIONS = [
  { category: 'History', question: 'In what year did World War II end?', options: ['1943', '1945', '1947', '1950'], correct: 1 },
  { category: 'Science', question: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correct: 2 },
  { category: 'Geography', question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correct: 2 },
  { category: 'Literature', question: 'Who wrote "Romeo and Juliet"?', options: ['Dickens', 'Shakespeare', 'Austen', 'Tolstoy'], correct: 1 },
  { category: 'Science', question: 'How many planets are in our solar system?', options: ['7', '8', '9', '10'], correct: 1 },
  { category: 'Art', question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'], correct: 2 },
  { category: 'Geography', question: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correct: 1 },
  { category: 'Music', question: 'Which band released "Bohemian Rhapsody"?', options: ['The Beatles', 'Queen', 'Led Zeppelin', 'Pink Floyd'], correct: 1 },
  { category: 'Science', question: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], correct: 2 },
  { category: 'Geography', question: 'Which country has the most natural lakes?', options: ['USA', 'Russia', 'Canada', 'Finland'], correct: 2 },
  { category: 'History', question: 'Who was the first President of the United States?', options: ['Lincoln', 'Washington', 'Jefferson', 'Adams'], correct: 1 },
  { category: 'Body', question: 'What is the largest organ in the human body?', options: ['Liver', 'Brain', 'Skin', 'Lungs'], correct: 2 },
  { category: 'Science', question: 'What planet has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], correct: 1 },
  { category: 'Geography', question: 'In which country would you find Machu Picchu?', options: ['Mexico', 'Peru', 'Chile', 'Bolivia'], correct: 1 },
  { category: 'Language', question: 'How many letters are in the English alphabet?', options: ['24', '25', '26', '27'], correct: 2 },
  { category: 'Film', question: 'Who directed "Jaws" and "E.T."?', options: ['Scorsese', 'Spielberg', 'Lucas', 'Cameron'], correct: 1 },
  { category: 'Science', question: 'What is the speed of light approximately?', options: ['300,000 km/s', '150,000 km/s', '1,000 km/s', '3,000 km/s'], correct: 0 },
  { category: 'Geography', question: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Malta'], correct: 1 },
  { category: 'Sports', question: 'How often are the Summer Olympics held?', options: ['Every 2 years', 'Every 3 years', 'Every 4 years', 'Every 5 years'], correct: 2 },
  { category: 'History', question: 'Which ancient wonder was located in Egypt?', options: ['Hanging Gardens', 'Great Pyramid', 'Colossus', 'Lighthouse only'], correct: 1 },
  { category: 'Science', question: 'What blood type is the universal donor?', options: ['A+', 'AB+', 'O-', 'B-'], correct: 2 },
  { category: 'Geography', question: 'Mount Kilimanjaro is located in which country?', options: ['Kenya', 'Tanzania', 'Uganda', 'Ethiopia'], correct: 1 },
];

export const HARD_QUESTIONS = [
  { category: 'Science', question: 'What is the most abundant element in the universe?', options: ['Oxygen', 'Carbon', 'Hydrogen', 'Helium'], correct: 2 },
  { category: 'History', question: 'In what year did the Berlin Wall fall?', options: ['1987', '1989', '1991', '1993'], correct: 1 },
  { category: 'Geography', question: 'What is the capital of Mongolia?', options: ['Astana', 'Ulaanbaatar', 'Bishkek', 'Tashkent'], correct: 1 },
  { category: 'Science', question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correct: 2 },
  { category: 'Literature', question: 'Who wrote "One Hundred Years of Solitude"?', options: ['Borges', 'García Márquez', 'Neruda', 'Allende'], correct: 1 },
  { category: 'Math', question: 'What is the value of pi to two decimal places?', options: ['3.14', '3.16', '3.12', '3.18'], correct: 0 },
  { category: 'Science', question: 'What particle has no electric charge?', options: ['Proton', 'Electron', 'Neutron', 'Positron'], correct: 2 },
  { category: 'History', question: 'Who was the first man to step on the Moon?', options: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'John Glenn'], correct: 2 },
  { category: 'Geography', question: 'Which African country was formerly known as Abyssinia?', options: ['Sudan', 'Ethiopia', 'Somalia', 'Eritrea'], correct: 1 },
  { category: 'Art', question: 'Which artist cut off part of his own ear?', options: ['Monet', 'Van Gogh', 'Cézanne', 'Gauguin'], correct: 1 },
  { category: 'Science', question: 'What is the atomic number of carbon?', options: ['4', '6', '8', '12'], correct: 1 },
  { category: 'Music', question: 'How many symphonies did Beethoven compose?', options: ['5', '7', '9', '12'], correct: 2 },
  { category: 'History', question: 'The Magna Carta was signed in which year?', options: ['1066', '1215', '1492', '1588'], correct: 1 },
  { category: 'Geography', question: 'What is the deepest point in the ocean?', options: ['Java Trench', 'Mariana Trench', 'Puerto Rico Trench', 'Tonga Trench'], correct: 1 },
  { category: 'Science', question: 'Who developed the theory of general relativity?', options: ['Newton', 'Bohr', 'Einstein', 'Hawking'], correct: 2 },
  { category: 'Language', question: 'What does "et cetera" (etc.) literally mean?', options: ['And so on', 'And the rest', 'For example', 'That is'], correct: 1 },
  { category: 'Biology', question: 'How many chambers does a human heart have?', options: ['2', '3', '4', '5'], correct: 2 },
  { category: 'History', question: 'Which empire was ruled by Genghis Khan?', options: ['Ottoman', 'Mongol', 'Roman', 'Persian'], correct: 1 },
  { category: 'Science', question: 'What is the rarest blood type?', options: ['O-', 'AB-', 'B-', 'A-'], correct: 1 },
  { category: 'Geography', question: 'Which country has three capital cities?', options: ['South Africa', 'Bolivia', 'Sri Lanka', 'Malaysia'], correct: 0 },
  { category: 'Chemistry', question: 'What is the chemical symbol for potassium?', options: ['P', 'Po', 'K', 'Pt'], correct: 2 },
  { category: 'Astronomy', question: 'How long does light from the Sun take to reach Earth?', options: ['8 seconds', '8 minutes', '8 hours', '8 days'], correct: 1 },
];

// Mystery rounds — a surprise category. Correct = assign shots to a rival, wrong = no penalty.
export const MYSTERY_QUESTIONS = [
  { category: '🎬 Movie Quotes', question: '"I\'ll be back" is a famous line from which franchise?', options: ['Rambo', 'Terminator', 'Die Hard', 'Rocky'], correct: 1 },
  { category: '🎵 Song Lyrics', question: '"Is this the real life? Is this just fantasy?" opens which song?', options: ['Hotel California', 'Bohemian Rhapsody', 'Imagine', 'Stairway to Heaven'], correct: 1 },
  { category: '🌍 Flags', question: 'Which country\'s flag features a red maple leaf?', options: ['USA', 'Canada', 'Switzerland', 'Lebanon'], correct: 1 },
  { category: '🍔 Food Origins', question: 'Sushi originally comes from which country?', options: ['China', 'Korea', 'Japan', 'Thailand'], correct: 2 },
  { category: '🧠 Brain Teaser', question: 'A farmer has 17 sheep, all but 9 run away. How many are left?', options: ['8', '9', '17', '0'], correct: 1 },
  { category: '🎮 Video Games', question: 'What is the best-selling video game of all time?', options: ['Tetris', 'Minecraft', 'GTA V', 'Wii Sports'], correct: 1 },
  { category: '🦸 Superheroes', question: 'What is Spider-Man\'s real name?', options: ['Peter Parker', 'Bruce Wayne', 'Clark Kent', 'Tony Stark'], correct: 0 },
  { category: '🍷 Drinks', question: 'Soju originates from which country?', options: ['Japan', 'China', 'South Korea', 'Vietnam'], correct: 2 },
  { category: '🐉 Mythology', question: 'Who is the Greek god of the sea?', options: ['Zeus', 'Hades', 'Apollo', 'Poseidon'], correct: 3 },
  { category: '🎲 Random', question: 'What is the only mammal capable of true flight?', options: ['Flying squirrel', 'Bat', 'Sugar glider', 'Colugo'], correct: 1 },
  { category: '🎬 Movie Quotes', question: '"May the Force be with you" is from which series?', options: ['Star Trek', 'Star Wars', 'Guardians', 'Dune'], correct: 1 },
  { category: '🌍 Capitals', question: 'What is the capital of Japan?', options: ['Osaka', 'Kyoto', 'Tokyo', 'Nagoya'], correct: 2 },
  { category: '🧠 Brain Teaser', question: 'What has keys but cannot open locks?', options: ['A map', 'A piano', 'A book', 'A car'], correct: 1 },
  { category: '🦸 Superheroes', question: 'Which metal coats Wolverine\'s skeleton?', options: ['Titanium', 'Vibranium', 'Adamantium', 'Steel'], correct: 2 },
  { category: '🎵 Song Lyrics', question: '"Hello from the other side" is a lyric by which artist?', options: ['Adele', 'Beyoncé', 'Rihanna', 'Sia'], correct: 0 },
];

export const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy',
    emoji: '🟢',
    points: 1,
    penalty: { type: 'shot', label: 'a SHOT of soju', emoji: '🥃' },
    color: '#22c55e',
    tagline: 'Big points are small, but fumble it and you SHOT',
  },
  medium: {
    label: 'Medium',
    emoji: '🟡',
    points: 2,
    penalty: { type: 'largeSip', label: 'a LARGE sip', emoji: '🍺' },
    color: '#eab308',
    tagline: 'Balanced risk and reward',
  },
  hard: {
    label: 'Hard',
    emoji: '🔴',
    points: 3,
    penalty: { type: 'sip', label: 'one normal sip', emoji: '💧' },
    color: '#ef4444',
    tagline: 'Most points, gentlest penalty — if you dare',
  },
};

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
