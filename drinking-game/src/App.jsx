import { useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { GameBoard } from './components/GameBoard';
import './styles/globals.css';

export default function App() {
  const [playerNames, setPlayerNames] = useState(null);

  if (!playerNames) {
    return <SetupScreen onStart={setPlayerNames} />;
  }

  return <GameBoard playerNames={playerNames} onQuit={() => setPlayerNames(null)} />;
}
