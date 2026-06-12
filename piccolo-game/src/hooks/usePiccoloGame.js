import { useState, useCallback, useRef, useEffect } from 'react';
import { shufflePrompts, buildPrompt } from '../data/prompts';

const TAPS_NEEDED = 10;
const BARNES_DURATION = 5000;
// Random interval: 35–90 seconds
const BARNES_MIN = 35000;
const BARNES_MAX = 90000;

function randInterval() {
  return BARNES_MIN + Math.floor(Math.random() * (BARNES_MAX - BARNES_MIN));
}

export function usePiccoloGame() {
  const [phase, setPhase] = useState('setup'); // setup | game | end
  const [players, setPlayers] = useState(['', '', '']);

  // Game state
  const [deck, setDeck] = useState([]);
  const [deckIdx, setDeckIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [roundCount, setRoundCount] = useState(0);

  // Barnes interrupt
  const [barnesActive, setBarnesActive] = useState(false);
  const [barnesTaps, setBarnesTaps] = useState(0);
  const [barnesTimeLeft, setBarnesTimeLeft] = useState(BARNES_DURATION);
  const [barnesResult, setBarnesResult] = useState(null); // null | 'saved' | 'failed'

  const barnesTimerRef = useRef(null);
  const barnesIntervalRef = useRef(null);
  const barnesCountdownRef = useRef(null);

  const clearBarnesTimers = useCallback(() => {
    clearTimeout(barnesTimerRef.current);
    clearInterval(barnesIntervalRef.current);
    clearInterval(barnesCountdownRef.current);
  }, []);

  const scheduleBarnes = useCallback(() => {
    clearTimeout(barnesTimerRef.current);
    barnesTimerRef.current = setTimeout(() => {
      setBarnesActive(true);
      setBarnesTaps(0);
      setBarnesTimeLeft(BARNES_DURATION);
      setBarnesResult(null);
    }, randInterval());
  }, [clearBarnesTimers]);

  // Countdown tick while barnes is active
  useEffect(() => {
    if (!barnesActive || barnesResult !== null) return;

    barnesCountdownRef.current = setInterval(() => {
      setBarnesTimeLeft(t => {
        if (t <= 100) {
          clearInterval(barnesCountdownRef.current);
          setBarnesResult('failed');
          return 0;
        }
        return t - 100;
      });
    }, 100);

    return () => clearInterval(barnesCountdownRef.current);
  }, [barnesActive, barnesResult]);

  const handleBarnesTap = useCallback(() => {
    if (barnesResult !== null) return;
    setBarnesTaps(prev => {
      const next = prev + 1;
      if (next >= TAPS_NEEDED) {
        clearInterval(barnesCountdownRef.current);
        setBarnesResult('saved');
      }
      return next;
    });
  }, [barnesResult]);

  const dismissBarnes = useCallback(() => {
    clearBarnesTimers();
    setBarnesActive(false);
    setBarnesResult(null);
    if (phase === 'game') scheduleBarnes();
  }, [clearBarnesTimers, phase, scheduleBarnes]);

  // Start game
  const startGame = useCallback(() => {
    const filled = players.map(p => p.trim() || `Player ${players.indexOf(p) + 1}`);
    setPlayers(filled);
    const shuffled = shufflePrompts();
    setDeck(shuffled);
    setDeckIdx(0);
    setPlayerIdx(0);
    setFlipped(false);
    setRoundCount(0);
    setPhase('game');
    scheduleBarnes();
  }, [players, scheduleBarnes]);

  // Flip current card
  const flipCard = useCallback(() => {
    setFlipped(true);
  }, []);

  // Advance to next player / card
  const nextTurn = useCallback(() => {
    setFlipped(false);
    setPlayerIdx(i => (i + 1) % 3);
    setDeckIdx(i => {
      const next = i + 1;
      if (next >= deck.length) {
        // reshuffle
        setDeck(shufflePrompts());
        return 0;
      }
      return next;
    });
    setRoundCount(r => r + 1);
  }, [deck.length]);

  const endGame = useCallback(() => {
    clearBarnesTimers();
    setPhase('end');
  }, [clearBarnesTimers]);

  const restartGame = useCallback(() => {
    clearBarnesTimers();
    setPhase('setup');
    setPlayers(['', '', '']);
    setBarnesActive(false);
    setBarnesResult(null);
  }, [clearBarnesTimers]);

  // Cleanup on unmount
  useEffect(() => () => clearBarnesTimers(), [clearBarnesTimers]);

  const currentPrompt = deck[deckIdx] ?? null;
  const promptText = currentPrompt
    ? buildPrompt(currentPrompt.text, players, playerIdx)
    : '';

  return {
    phase, players, setPlayers,
    playerIdx, flipped, roundCount,
    currentPrompt, promptText,
    startGame, flipCard, nextTurn, endGame, restartGame,
    barnesActive, barnesTaps, barnesTimeLeft, barnesResult, TAPS_NEEDED,
    handleBarnesTap, dismissBarnes,
  };
}
