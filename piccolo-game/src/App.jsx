import { usePiccoloGame } from './hooks/usePiccoloGame';
import SetupScreen from './components/SetupScreen';
import PromptCard from './components/PromptCard';
import BarnesInterrupt from './components/BarnesInterrupt';
import EndScreen from './components/EndScreen';

export default function App() {
  const game = usePiccoloGame();

  return (
    <>
      {game.phase === 'setup' && (
        <SetupScreen
          players={game.players}
          setPlayers={game.setPlayers}
          onStart={game.startGame}
        />
      )}

      {game.phase === 'game' && (
        <PromptCard
          players={game.players}
          playerIdx={game.playerIdx}
          currentPrompt={game.currentPrompt}
          promptText={game.promptText}
          flipped={game.flipped}
          onFlip={game.flipCard}
          onNext={game.nextTurn}
          onEnd={game.endGame}
          roundCount={game.roundCount}
        />
      )}

      {game.phase === 'end' && (
        <EndScreen
          players={game.players}
          roundCount={game.roundCount}
          onRestart={game.restartGame}
        />
      )}

      {game.barnesActive && (
        <BarnesInterrupt
          barnesTaps={game.barnesTaps}
          barnesTimeLeft={game.barnesTimeLeft}
          barnesResult={game.barnesResult}
          TAPS_NEEDED={game.TAPS_NEEDED}
          onTap={game.handleBarnesTap}
          onDismiss={game.dismissBarnes}
          players={game.players}
        />
      )}
    </>
  );
}
