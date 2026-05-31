import { useState } from 'react';
import { DifficultyChooser } from './DifficultyChooser';
import { QuestionCard } from './QuestionCard';
import { AssignShots } from './AssignShots';
import { Scoreboard } from './Scoreboard';
import '../styles/Game.css';

export function GameScreen({ game }) {
  const [showQuit, setShowQuit] = useState(false);
  const player = game.players[game.current];

  const handleResolved = (selectedIdx, correct) => {
    if (game.isMystery) {
      game.answerMystery(selectedIdx);
      if (correct) {
        game.beginAssign();
      } else {
        game.nextTurn();
      }
    } else {
      game.answerQuestion(selectedIdx);
      game.nextTurn();
    }
  };

  const handleAssign = (targetIdx, shots) => {
    game.assignMysteryShots(targetIdx, shots);
    game.nextTurn();
  };

  return (
    <div className="game-screen">
      <header className="game-header">
        <button className="end-game-btn" onClick={() => setShowQuit(true)}>End game</button>
        <span className="turn-badge">Turn {game.turnCount + 1}</span>
      </header>

      <Scoreboard players={game.players} currentIdx={game.current} compact />

      <div className="game-body">
        {game.phase === 'choose' && (
          <DifficultyChooser playerName={player.name} onChoose={game.chooseDifficulty} />
        )}

        {(game.phase === 'question' || game.phase === 'mystery') && game.shuffledOptions && (
          <QuestionCard
            key={`${game.turnCount}-${game.activeQuestion.question}`}
            question={game.activeQuestion}
            options={game.shuffledOptions.options}
            correctIdx={game.shuffledOptions.correctIdx}
            isMystery={game.isMystery}
            difficulty={game.activeDifficulty}
            playerName={player.name}
            onResolved={handleResolved}
          />
        )}

        {game.phase === 'assign' && (
          <AssignShots
            players={game.players}
            currentIdx={game.current}
            shots={game.lastResult.mysteryShots}
            onAssign={handleAssign}
          />
        )}
      </div>

      {showQuit && (
        <div className="quit-modal">
          <div className="quit-box">
            <p>End the game and see the results?</p>
            <div className="quit-actions">
              <button className="quit-yes" onClick={game.endGame}>Show results</button>
              <button className="quit-no" onClick={() => setShowQuit(false)}>Keep playing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
