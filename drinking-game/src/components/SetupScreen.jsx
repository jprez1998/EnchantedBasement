import { useState } from 'react';
import '../styles/Setup.css';

export function SetupScreen({ onStart }) {
  const [names, setNames] = useState(['', '']);

  const handleStart = () => {
    onStart([
      names[0].trim() || 'Player 1',
      names[1].trim() || 'Player 2',
    ]);
  };

  return (
    <div className="setup-screen">
      <div className="setup-glow" />
      <div className="setup-content">
        <div className="setup-icon">🏺</div>
        <h1 className="setup-title">Enchanted<br />Basement</h1>
        <p className="setup-subtitle">The Two-Soul Drinking Ritual</p>

        <div className="setup-players">
          <div className="player-input-group">
            <label>Player 1</label>
            <input
              type="text"
              placeholder="Your name"
              value={names[0]}
              onChange={e => setNames([e.target.value, names[1]])}
              maxLength={20}
            />
          </div>
          <div className="vs-divider">VS</div>
          <div className="player-input-group">
            <label>Player 2</label>
            <input
              type="text"
              placeholder="Their name"
              value={names[1]}
              onChange={e => setNames([names[0], e.target.value])}
              maxLength={20}
            />
          </div>
        </div>

        <div className="setup-rules">
          <h3>How to Play</h3>
          <ul>
            <li>🃏 Take turns drawing cards from the enchanted deck</li>
            <li>🍺 Each card triggers a drinking rule</li>
            <li>✨ Face composure challenges to keep your score up</li>
            <li>🏆 Score = Total Sips × Composure% — drink more, but hold it together!</li>
          </ul>
        </div>

        <button className="start-btn" onClick={handleStart}>
          Begin the Ritual
        </button>

        <p className="disclaimer">🔞 Drink responsibly. Know your limits.</p>
      </div>
    </div>
  );
}
