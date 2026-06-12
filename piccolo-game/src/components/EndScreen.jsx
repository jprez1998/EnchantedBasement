import '../styles/End.css';

export default function EndScreen({ players, roundCount, onRestart }) {
  return (
    <div className="end-screen">
      <div className="end-content">
        <div className="end-icon">🎯</div>
        <h2 className="end-title">Game Over!</h2>
        <p className="end-sub">
          {roundCount} rounds survived between {players.join(', ')}
        </p>
        <p className="end-sub end-kudos">Hope Barnes is still standing 🦬</p>
        <div className="end-actions">
          <button className="play-again-btn" onClick={onRestart}>Play Again</button>
        </div>
        <p className="disclaimer">🍺 Drink responsibly. Know your limits.</p>
      </div>
    </div>
  );
}
