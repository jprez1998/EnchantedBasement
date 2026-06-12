import '../styles/Setup.css';

const PLAYER_COLORS = ['#f43f5e', '#3b82f6', '#22c55e'];
const PLAYER_EMOJIS = ['🎮', '🎯', '🎲'];

export default function SetupScreen({ players, setPlayers, onStart }) {
  return (
    <div className="setup-screen">
      <div className="setup-content">
        <div className="setup-icon">🎯</div>
        <h1 className="setup-title">Piccolo</h1>
        <p className="setup-subtitle">3 players. No mercy. Tap to survive.</p>

        <div className="rules-card">
          <h3>How it works</h3>
          <div className="rule-row">
            <span className="rule-emoji">📲</span>
            <span>Pass the phone — each player sees their own challenge</span>
          </div>
          <div className="rule-divider" />
          <div className="rule-row">
            <span className="rule-emoji">🎯</span>
            <span>Tap <b>Flip</b> to reveal your card, then <b>Done</b> to pass it on</span>
          </div>
          <div className="rule-divider" />
          <div className="rule-row">
            <span className="rule-emoji">⚠️</span>
            <span>Watch out — <b>OI BARNES BUFFALO</b> can strike at any time...</span>
          </div>
        </div>

        <div className="players-setup">
          <div className="players-label">Enter player names</div>
          {players.map((name, i) => (
            <div className="player-row" key={i}>
              <div className="player-num" style={{ background: PLAYER_COLORS[i] }}>
                {PLAYER_EMOJIS[i]}
              </div>
              <input
                type="text"
                placeholder={`Player ${i + 1}`}
                value={name}
                maxLength={16}
                onChange={e => {
                  const next = [...players];
                  next[i] = e.target.value;
                  setPlayers(next);
                }}
              />
            </div>
          ))}
        </div>

        <button className="start-btn" onClick={onStart}>
          Let's Go 🔥
        </button>

        <p className="disclaimer">🍺 Drink responsibly. Know your limits.</p>
      </div>
    </div>
  );
}
