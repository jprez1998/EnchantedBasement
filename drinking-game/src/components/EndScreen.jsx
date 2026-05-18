import '../styles/End.css';

export function EndScreen({ players, getScore, onRestart }) {
  const scores = players.map((p, i) => ({ ...p, score: getScore(i), idx: i }));
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const loser = sorted[1];
  const tied = sorted[0].score === sorted[1].score;

  return (
    <div className="end-screen">
      <div className="end-glow" />
      <div className="end-content">
        <div className="end-icon">🏺</div>
        <h1 className="end-title">{tied ? 'A Draw!' : `${winner.name} Wins!`}</h1>
        <p className="end-subtitle">
          {tied
            ? 'Both souls showed equal enchantment.'
            : `${winner.name} drank the most while keeping their composure.`}
        </p>

        <div className="final-scores">
          {sorted.map((p, rank) => (
            <div key={p.idx} className={`final-player ${rank === 0 && !tied ? 'winner' : ''}`}>
              <div className="final-rank">{rank === 0 ? (tied ? '🤝' : '🥇') : '🥈'}</div>
              <div className="final-name">{p.name}</div>
              <div className="final-stats">
                <span className="fs-sips">🍺 {p.sips} sips</span>
                <span className="fs-composure">✨ {Math.round(p.composure)}% composure</span>
                <span className="fs-score">Score: {p.score}</span>
              </div>
              <div className="score-formula">
                {p.sips} sips × {Math.round(p.composure)}% = <strong>{p.score}</strong>
              </div>
            </div>
          ))}
        </div>

        <div className="end-flavour">
          {winner.score > 0 && !tied && (
            <p>
              {winner.name} drank {winner.sips - loser.sips >= 0 ? winner.sips - loser.sips : 0} more sips
              {winner.composure >= loser.composure ? ' and kept better composure' : ' but composure carried the score'}.
            </p>
          )}
        </div>

        <button className="restart-btn" onClick={onRestart}>
          🔄 Play Again
        </button>
        <p className="disclaimer">Drink water. You earned it. 💧</p>
      </div>
    </div>
  );
}
