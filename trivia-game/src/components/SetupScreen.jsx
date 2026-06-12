import { useState } from 'react';
import '../styles/Setup.css';

const MAX_PLAYERS = 8;
const MIN_PLAYERS = 2;

export function SetupScreen({ onStart }) {
  const [names, setNames] = useState(['', '']);

  const updateName = (i, value) => {
    setNames(prev => prev.map((n, idx) => (idx === i ? value : n)));
  };

  const addPlayer = () => {
    if (names.length < MAX_PLAYERS) setNames(prev => [...prev, '']);
  };

  const removePlayer = (i) => {
    if (names.length > MIN_PLAYERS) setNames(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleStart = () => {
    const cleaned = names.map((n, i) => n.trim() || `Player ${i + 1}`);
    onStart(cleaned);
  };

  return (
    <div className="setup-screen">
      <div className="setup-bg" />
      <div className="setup-content">
        <div className="setup-icon">🧠🍻</div>
        <h1 className="setup-title">Brain &amp; Booze</h1>
        <p className="setup-subtitle">The General Knowledge Drinking Trivia</p>

        <div className="rules-card">
          <h3>Get it wrong, take your medicine</h3>
          <div className="rule-row"><span className="rule-emoji">🎲</span><span>Each question's <b>difficulty is dealt at random</b> — no choosing!</span></div>
          <div className="rule-row"><span className="rule-emoji">🟢</span><span><b>Easy</b> wrong → 🥃 a SHOT of soju</span></div>
          <div className="rule-row"><span className="rule-emoji">🟡</span><span><b>Medium</b> wrong → 🍺 a LARGE sip</span></div>
          <div className="rule-row"><span className="rule-emoji">🔴</span><span><b>Hard</b> wrong → 💧 one normal sip</span></div>
          <div className="rule-divider" />
          <div className="rule-row"><span className="rule-emoji">❓</span><span><b>Mystery rounds</b> strike at random — nail it and dish out shots to a rival!</span></div>
        </div>

        <div className="players-setup">
          <label className="players-label">Players ({names.length})</label>
          {names.map((name, i) => (
            <div className="player-row" key={i}>
              <span className="player-num">{i + 1}</span>
              <input
                type="text"
                placeholder={`Player ${i + 1}`}
                value={name}
                onChange={e => updateName(i, e.target.value)}
                maxLength={16}
              />
              {names.length > MIN_PLAYERS && (
                <button className="remove-btn" onClick={() => removePlayer(i)} aria-label="Remove player">✕</button>
              )}
            </div>
          ))}
          {names.length < MAX_PLAYERS && (
            <button className="add-player-btn" onClick={addPlayer}>＋ Add player</button>
          )}
        </div>

        <button className="start-btn" onClick={handleStart}>Start the Game</button>
        <p className="disclaimer">🔞 Play responsibly. Hydrate. Know your limits.</p>
      </div>
    </div>
  );
}
