import { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { getRuleForCard } from '../utils/cardRules';
import { PlayingCard, CardStack } from './PlayingCard';
import { PlayerPanel } from './PlayerPanel';
import { InteractionScreen } from './InteractionScreen';
import { ComposureChallenge } from './ComposureChallenge';
import { EndScreen } from './EndScreen';
import '../styles/GameBoard.css';

export function GameBoard({ playerNames, onQuit }) {
  const game = useGameState(playerNames);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [quitConfirm, setQuitConfirm] = useState(false);

  useEffect(() => {
    if (game.phase === 'reveal') {
      setCardFlipped(false);
      const t = setTimeout(() => setCardFlipped(true), 60);
      return () => clearTimeout(t);
    }
  }, [game.phase, game.currentCard]);

  if (game.phase === 'end') {
    return <EndScreen players={game.players} getScore={game.getScore} onRestart={onQuit} />;
  }

  if (game.composurePending !== null) {
    return (
      <ComposureChallenge
        playerName={game.players[game.composurePending].name}
        onResult={(passed) => game.resolveComposureChallenge(game.composurePending, passed)}
      />
    );
  }

  if (game.phase === 'interaction') {
    return (
      <InteractionScreen
        card={game.currentCard}
        lastInteraction={game.lastInteraction}
        drawerIdx={game.currentPlayer}
        players={game.players}
        chaliceCount={game.chaliceCount}
        onResolve={(result) => game.resolveInteraction(result)}
        onNext={() => game.resolveInteractionNext()}
      />
    );
  }

  const activePlayer = game.players[game.currentPlayer];

  return (
    <div className="game-board">
      <div className="board-header">
        <button className="quit-btn" onClick={() => setQuitConfirm(true)}>✕</button>
        <div className="chalice-indicator">
          🏺 {game.chaliceCount}/4
          {game.questionMaster !== null && (
            <span className="qm-badge">👑 {game.players[game.questionMaster].name}</span>
          )}
          {game.mateActive && <span className="mate-badge">🔗 Mate</span>}
        </div>
        <div className="deck-count">{game.deck.length} cards</div>
      </div>

      <div className="players-row">
        <PlayerPanel
          player={game.players[0]}
          isActive={game.currentPlayer === 0}
          score={game.getScore(0)}
          isQuestionMaster={game.questionMaster === 0}
          isMate={game.mateActive && game.currentPlayer === 1}
        />
        <PlayerPanel
          player={game.players[1]}
          isActive={game.currentPlayer === 1}
          score={game.getScore(1)}
          isQuestionMaster={game.questionMaster === 1}
          isMate={game.mateActive && game.currentPlayer === 0}
        />
      </div>

      <div className="center-area">
        {game.phase === 'draw' && (
          <div className="draw-zone">
            <p className="turn-prompt">{activePlayer.name}'s turn</p>
            <div className="deck-area" onClick={game.drawCard}>
              <CardStack count={game.deck.length} />
              <p className="tap-hint">Tap to draw</p>
            </div>
          </div>
        )}

        {game.phase === 'reveal' && game.currentCard && (() => {
          const rule = getRuleForCard(game.currentCard.rank);
          return (
            <div className="reveal-zone">
              <div className={`card-flip-container ${cardFlipped ? 'flipped' : ''}`}>
                <div className="card-flip-inner">
                  <div className="card-flip-front">
                    <PlayingCard card={game.currentCard} faceDown />
                  </div>
                  <div className="card-flip-back">
                    <PlayingCard card={game.currentCard} />
                  </div>
                </div>
              </div>
              {cardFlipped && rule && (
                <div className="rule-preview">
                  <div className="rule-icon-sm">{rule.icon}</div>
                  <strong>{rule.name}</strong>
                  <p>{rule.description}</p>
                  <button className="action-btn" onClick={() => game.confirmCard(game.currentPlayer)}>
                    {rule.interaction ? 'Show Rule →' : 'Got It →'}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <div className="game-log">
        {game.gameLog.slice(0, 3).map((entry, i) => (
          <div key={entry.time} className="log-entry" style={{ opacity: 1 - i * 0.3 }}>
            {entry.msg}
          </div>
        ))}
      </div>

      {quitConfirm && (
        <div className="quit-modal">
          <div className="quit-modal-box">
            <p>End the ritual?</p>
            <div className="quit-modal-btns">
              <button onClick={onQuit}>Yes, end game</button>
              <button onClick={() => setQuitConfirm(false)}>Keep playing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
