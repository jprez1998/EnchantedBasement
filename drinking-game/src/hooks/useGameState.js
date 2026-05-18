import { useState, useCallback } from 'react';
import { buildDeck, getRuleForCard } from '../utils/cardRules';

const INITIAL_COMPOSURE = 100;
const COMPOSURE_DROP_PER_SIP = 1.5;
const COMPOSURE_CHALLENGE_PASS = 15;
const COMPOSURE_CHALLENGE_FAIL = 10;
const COMPOSURE_MIN = 10;
const COMPOSURE_CHANCE_BASE = 0.08;
const COMPOSURE_CHANCE_SPECIAL = 0.28;
const SPECIAL_RANKS = new Set(['K', 'A', '8', '5']);

function shouldTriggerComposure(rank) {
  const chance = rank && SPECIAL_RANKS.has(rank)
    ? COMPOSURE_CHANCE_SPECIAL
    : COMPOSURE_CHANCE_BASE;
  return Math.random() < chance;
}

export function useGameState(playerNames) {
  const [deck, setDeck] = useState(() => buildDeck());
  const [discardPile, setDiscardPile] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [phase, setPhase] = useState('draw'); // draw | reveal | interaction | end
  const [players, setPlayers] = useState([
    { name: playerNames[0], sips: 0, composure: INITIAL_COMPOSURE },
    { name: playerNames[1], sips: 0, composure: INITIAL_COMPOSURE },
  ]);
  const [chaliceCount, setChaliceCount] = useState(0);
  const [questionMaster, setQuestionMaster] = useState(null);
  const [mateActive, setMateActive] = useState(false);
  const [composurePending, setComposurePending] = useState(null);
  const [lastInteraction, setLastInteraction] = useState(null); // { type, drawerIdx, data }
  const [gameLog, setGameLog] = useState([]);

  const addLog = useCallback((msg) => {
    setGameLog(prev => [{ msg, time: Date.now() + Math.random() }, ...prev].slice(0, 20));
  }, []);

  const addSips = useCallback((playerIdx, sips) => {
    if (sips <= 0) return;
    setPlayers(prev => prev.map((p, i) => {
      if (i !== playerIdx) return p;
      return {
        ...p,
        sips: p.sips + sips,
        composure: Math.max(COMPOSURE_MIN, p.composure - sips * COMPOSURE_DROP_PER_SIP),
      };
    }));
  }, []);

  // Advance to next player's turn, potentially triggering a composure check first
  const advanceTurn = useCallback((drawerIdx, rank) => {
    if (shouldTriggerComposure(rank)) {
      setComposurePending(drawerIdx);
    } else {
      setCurrentPlayer(prev => (prev === 0 ? 1 : 0));
      setCurrentCard(null);
      setPhase('draw');
    }
  }, []);

  const drawCard = useCallback(() => {
    if (deck.length === 0) {
      setPhase('end');
      return;
    }
    const [top, ...rest] = deck;
    setCurrentCard(top);
    setDeck(rest);
    setPhase('reveal');
  }, [deck]);

  const confirmCard = useCallback((drawerIdx) => {
    if (!currentCard) return;
    const rule = getRuleForCard(currentCard.rank);
    const otherIdx = drawerIdx === 0 ? 1 : 0;
    const rank = currentCard.rank;

    if (!rule) {
      advanceTurn(drawerIdx, rank);
      return;
    }

    // Chalice (King)
    if (rule.interaction === 'chalice') {
      const newCount = chaliceCount + 1;
      setChaliceCount(newCount);
      const isLast = newCount >= 4;
      if (isLast) {
        addSips(drawerIdx, 10);
        addLog(`🏺 LAST King! ${players[drawerIdx].name} drinks the entire Enchanted Chalice! (+10 sips)`);
      } else {
        addLog(`${players[drawerIdx].name} drew a King! Pour into the Chalice (${newCount}/4)`);
      }
      setLastInteraction({ type: 'chalice', drawerIdx, data: { count: newCount, isLast } });
      setDiscardPile(prev => [...prev, currentCard]);
      setCurrentCard(null);
      setPhase('interaction');
      return;
    }

    // Question master
    if (rule.interaction === 'question_master') {
      setQuestionMaster(drawerIdx);
      addLog(`${players[drawerIdx].name} is now the Question Master 👑`);
      setLastInteraction({ type: 'question_master', drawerIdx, data: {} });
      setDiscardPile(prev => [...prev, currentCard]);
      setCurrentCard(null);
      setPhase('interaction');
      return;
    }

    // Mate
    if (rule.interaction === 'mate') {
      setMateActive(true);
      addLog(`${players[drawerIdx].name} chose ${players[otherIdx].name} as Enchanted Mate 🔗`);
      setLastInteraction({ type: 'mate', drawerIdx, data: {} });
      setDiscardPile(prev => [...prev, currentCard]);
      setCurrentCard(null);
      setPhase('interaction');
      return;
    }

    // Direct sip cards (no interaction)
    if (rule.drawerSips > 0 || rule.otherSips > 0) {
      if (rule.drawerSips > 0) {
        addSips(drawerIdx, rule.drawerSips);
        addLog(`${players[drawerIdx].name} drinks ${rule.drawerSips} sips 🍺`);
      }
      if (rule.otherSips > 0) {
        addSips(otherIdx, rule.otherSips);
        addLog(`${players[otherIdx].name} drinks ${rule.otherSips} sips 🍺`);
      }
      if (mateActive && rule.drawerSips > 0) {
        addSips(otherIdx, rule.drawerSips);
        addLog(`🔗 Mate effect! ${players[otherIdx].name} also drinks ${rule.drawerSips} sips`);
      }
      setDiscardPile(prev => [...prev, currentCard]);
      setCurrentCard(null);
      advanceTurn(drawerIdx, rank);
      return;
    }

    // Has an interaction screen
    setLastInteraction({ type: rule.interaction, drawerIdx, data: {} });
    setPhase('interaction');
  }, [currentCard, chaliceCount, players, mateActive, addSips, addLog, advanceTurn]);

  const resolveInteraction = useCallback((result) => {
    if (!currentCard) {
      // currentCard may have already been cleared (chalice, mate, qm cases)
      const drawerIdx = currentPlayer;
      const rankRef = discardPile[discardPile.length - 1]?.rank;
      advanceTurn(drawerIdx, rankRef);
      return;
    }
    const rule = getRuleForCard(currentCard.rank);
    const drawerIdx = currentPlayer;
    const otherIdx = drawerIdx === 0 ? 1 : 0;
    const rank = currentCard.rank;

    if (rule?.interaction === 'give_or_take') {
      const target = result === 'give' ? otherIdx : drawerIdx;
      addSips(target, rule.sips);
      addLog(`${players[drawerIdx].name} chose to ${result === 'give' ? 'give' : 'take'} — ${players[target].name} drinks ${rule.sips} sips`);
    }

    if (rule?.interaction === 'reflex') {
      const loserIdx = result === 'drawer' ? drawerIdx : otherIdx;
      addSips(loserIdx, rule.loserSips);
      addLog(`${players[loserIdx].name} was LAST to point up — drinks ${rule.loserSips} sips! ☝️`);
    }

    if (rule?.interaction === 'rhyme' || rule?.interaction === 'categories' || rule?.interaction === 'never') {
      const loserIdx = result === 'drawer' ? drawerIdx : otherIdx;
      addSips(loserIdx, rule.loserSips);
      addLog(`${players[loserIdx].name} lost ${rule.name} — drinks ${rule.loserSips} sips!`);
    }

    if (rule?.interaction === 'waterfall') {
      addSips(drawerIdx, 3);
      addSips(otherIdx, 2);
      addLog(`🌊 Waterfall! ${players[drawerIdx].name} +3 sips, ${players[otherIdx].name} +2 sips`);
    }

    setDiscardPile(prev => [...prev, currentCard]);
    setCurrentCard(null);
    advanceTurn(drawerIdx, rank);
  }, [currentCard, currentPlayer, discardPile, players, addSips, addLog, advanceTurn]);

  // Called for interaction-only cards (mate, qm, chalice) that need "onNext"
  const resolveInteractionNext = useCallback(() => {
    const drawerIdx = currentPlayer;
    const rank = discardPile[discardPile.length - 1]?.rank;
    advanceTurn(drawerIdx, rank);
  }, [currentPlayer, discardPile, advanceTurn]);

  const resolveComposureChallenge = useCallback((playerIdx, passed) => {
    if (passed) {
      setPlayers(prev => prev.map((p, i) =>
        i === playerIdx
          ? { ...p, composure: Math.min(100, p.composure + COMPOSURE_CHALLENGE_PASS) }
          : p
      ));
      addLog(`✨ ${players[playerIdx].name} passed the composure check! +${COMPOSURE_CHALLENGE_PASS}% composure`);
    } else {
      addSips(playerIdx, 3);
      setPlayers(prev => prev.map((p, i) =>
        i === playerIdx
          ? { ...p, composure: Math.max(COMPOSURE_MIN, p.composure - COMPOSURE_CHALLENGE_FAIL) }
          : p
      ));
      addLog(`💀 ${players[playerIdx].name} fumbled the check! -${COMPOSURE_CHALLENGE_FAIL}% + 3 penalty sips`);
    }
    setComposurePending(null);
    setLastInteraction(null);
    setCurrentPlayer(prev => (prev === 0 ? 1 : 0));
    setCurrentCard(null);
    setPhase('draw');
  }, [players, addSips, addLog]);

  const nextTurn = useCallback(() => {
    setCurrentPlayer(prev => (prev === 0 ? 1 : 0));
    setCurrentCard(null);
    setPhase('draw');
  }, []);

  const getScore = useCallback((playerIdx) => {
    const p = players[playerIdx];
    return Math.round(p.sips * (p.composure / 100));
  }, [players]);

  const resetGame = useCallback(() => {
    setDeck(buildDeck());
    setDiscardPile([]);
    setCurrentCard(null);
    setCurrentPlayer(0);
    setPhase('draw');
    setPlayers([
      { name: playerNames[0], sips: 0, composure: INITIAL_COMPOSURE },
      { name: playerNames[1], sips: 0, composure: INITIAL_COMPOSURE },
    ]);
    setChaliceCount(0);
    setQuestionMaster(null);
    setMateActive(false);
    setComposurePending(null);
    setGameLog([]);
  }, [playerNames]);

  return {
    deck,
    currentCard,
    currentPlayer,
    phase,
    players,
    chaliceCount,
    questionMaster,
    mateActive,
    composurePending,
    gameLog,
    drawCard,
    confirmCard,
    resolveInteraction,
    resolveInteractionNext,
    resolveComposureChallenge,
    nextTurn,
    getScore,
    resetGame,
    setPhase,
    setComposurePending,
    lastInteraction,
  };
}
