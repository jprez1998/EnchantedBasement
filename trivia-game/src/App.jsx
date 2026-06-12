import { useTriviaGame } from './hooks/useTriviaGame';
import { SetupScreen } from './components/SetupScreen';
import { GameScreen } from './components/GameScreen';
import { EndScreen } from './components/EndScreen';
import './styles/globals.css';

export default function App() {
  const game = useTriviaGame();

  if (game.phase === 'setup') {
    return <SetupScreen onStart={game.startGame} />;
  }

  if (game.phase === 'end') {
    return (
      <EndScreen
        players={game.players}
        onPlayAgain={game.playAgain}
        onNewPlayers={game.newPlayers}
      />
    );
  }

  return <GameScreen game={game} />;
}
