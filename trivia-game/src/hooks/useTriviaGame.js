import { useState, useCallback, useRef } from 'react';
import {
  EASY_QUESTIONS, MEDIUM_QUESTIONS, HARD_QUESTIONS, MYSTERY_QUESTIONS,
  DIFFICULTY_CONFIG, shuffle,
} from '../data/questions';

// Chance a turn becomes a Mystery Round (never on the very first turn,
// never twice in a row).
const MYSTERY_CHANCE = 0.22;

const POOLS = {
  easy: EASY_QUESTIONS,
  medium: MEDIUM_QUESTIONS,
  hard: HARD_QUESTIONS,
};
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function makePlayer(name) {
  return {
    name,
    score: 0,
    correct: 0,
    wrong: 0,
    drinks: { shot: 0, largeSip: 0, sip: 0 },
  };
}

export function useTriviaGame() {
  const [players, setPlayers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [phase, setPhase] = useState('setup'); // setup | question | mystery | assign | end
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [activeDifficulty, setActiveDifficulty] = useState(null);
  const [isMystery, setIsMystery] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { correct, selectedIdx, question, penalty, points, mysteryShots }
  const [shuffledOptions, setShuffledOptions] = useState(null); // { options, correctIdx }

  // Track used questions to reduce repeats within a game.
  const usedRef = useRef({ easy: new Set(), medium: new Set(), hard: new Set(), mystery: new Set() });
  const lastWasMystery = useRef(false);

  const pickFromPool = useCallback((poolKey, pool) => {
    const used = usedRef.current[poolKey];
    if (used.size >= pool.length) used.clear();
    let q;
    let guard = 0;
    do {
      q = pool[Math.floor(Math.random() * pool.length)];
      guard++;
    } while (used.has(q.question) && guard < 50);
    used.add(q.question);
    return q;
  }, []);

  const toShuffled = (q) => {
    const opts = shuffle(q.options.map((text, i) => ({ text, isCorrect: i === q.correct })));
    return {
      options: opts.map(o => o.text),
      correctIdx: opts.findIndex(o => o.isCorrect),
    };
  };

  // Deal a normal question with a RANDOMLY assigned difficulty.
  const dealNormal = useCallback(() => {
    const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
    const q = pickFromPool(difficulty, POOLS[difficulty]);
    lastWasMystery.current = false;
    setActiveQuestion(q);
    setActiveDifficulty(difficulty);
    setShuffledOptions(toShuffled(q));
    setIsMystery(false);
    setPhase('question');
  }, [pickFromPool]);

  // Deal a surprise Mystery Round.
  const dealMystery = useCallback(() => {
    const q = pickFromPool('mystery', MYSTERY_QUESTIONS);
    const shots = 1 + Math.floor(Math.random() * 3); // 1–3 shots to assign
    lastWasMystery.current = true;
    setActiveQuestion({ ...q, mysteryShots: shots });
    setActiveDifficulty(null);
    setShuffledOptions(toShuffled(q));
    setIsMystery(true);
    setPhase('mystery');
  }, [pickFromPool]);

  // Decide and deal the next turn. Mystery never on the very first turn
  // (allowMystery=false) and never twice in a row.
  const dealTurn = useCallback((allowMystery) => {
    const triggerMystery =
      allowMystery && !lastWasMystery.current && Math.random() < MYSTERY_CHANCE;
    if (triggerMystery) dealMystery();
    else dealNormal();
  }, [dealMystery, dealNormal]);

  const startGame = useCallback((names) => {
    setPlayers(names.map(makePlayer));
    setCurrent(0);
    setTurnCount(0);
    usedRef.current = { easy: new Set(), medium: new Set(), hard: new Set(), mystery: new Set() };
    lastWasMystery.current = false;
    dealTurn(false);
  }, [dealTurn]);

  // Player answered a normal question.
  const answerQuestion = useCallback((selectedIdx) => {
    const correctIdx = shuffledOptions.correctIdx;
    const correct = selectedIdx === correctIdx;
    const cfg = DIFFICULTY_CONFIG[activeDifficulty];

    setPlayers(prev => prev.map((p, i) => {
      if (i !== current) return p;
      if (correct) {
        return { ...p, score: p.score + cfg.points, correct: p.correct + 1 };
      }
      const drinks = { ...p.drinks };
      drinks[cfg.penalty.type] += 1;
      return { ...p, wrong: p.wrong + 1, drinks };
    }));

    setLastResult({
      correct,
      selectedIdx,
      correctIdx,
      isMystery: false,
      difficulty: activeDifficulty,
      penalty: correct ? null : cfg.penalty,
      points: correct ? cfg.points : 0,
    });
  }, [shuffledOptions, activeDifficulty, current]);

  // Player answered a mystery question.
  const answerMystery = useCallback((selectedIdx) => {
    const correctIdx = shuffledOptions.correctIdx;
    const correct = selectedIdx === correctIdx;

    setPlayers(prev => prev.map((p, i) =>
      i === current ? { ...p, correct: correct ? p.correct + 1 : p.correct } : p
    ));

    setLastResult({
      correct,
      selectedIdx,
      correctIdx,
      isMystery: true,
      mysteryShots: activeQuestion.mysteryShots,
      penalty: null,
      points: 0,
    });
  }, [shuffledOptions, activeQuestion, current]);

  const beginAssign = useCallback(() => setPhase('assign'), []);

  // After a winning mystery, assign shots to a chosen rival.
  const assignMysteryShots = useCallback((targetIdx, shots) => {
    setPlayers(prev => prev.map((p, i) => {
      if (i !== targetIdx) return p;
      const drinks = { ...p.drinks, shot: p.drinks.shot + shots };
      return { ...p, drinks };
    }));
  }, []);

  const nextTurn = useCallback(() => {
    setCurrent(prev => (prev + 1) % players.length);
    setTurnCount(prev => prev + 1);
    setLastResult(null);
    dealTurn(true);
  }, [players.length, dealTurn]);

  const endGame = useCallback(() => setPhase('end'), []);

  const playAgain = useCallback(() => {
    setPlayers(prev => prev.map(p => makePlayer(p.name)));
    setCurrent(0);
    setTurnCount(0);
    usedRef.current = { easy: new Set(), medium: new Set(), hard: new Set(), mystery: new Set() };
    lastWasMystery.current = false;
    setLastResult(null);
    dealTurn(false);
  }, [dealTurn]);

  const newPlayers = useCallback(() => {
    setPlayers([]);
    setActiveQuestion(null);
    setActiveDifficulty(null);
    setShuffledOptions(null);
    setLastResult(null);
    setPhase('setup');
  }, []);

  return {
    players, current, turnCount, phase,
    activeQuestion, activeDifficulty, isMystery, lastResult, shuffledOptions,
    startGame, answerQuestion, answerMystery,
    assignMysteryShots, beginAssign, nextTurn, endGame, playAgain, newPlayers,
  };
}
