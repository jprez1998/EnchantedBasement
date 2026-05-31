import { Confetti } from './Confetti';
import '../styles/End.css';

export function EndScreen({ players, onPlayAgain, onNewPlayers }) {
  const byScore = [...players].sort((a, b) => b.score - a.score);
  const topScore = byScore[0].score;
  const winners = byScore.filter(p => p.score === topScore);

  const byDrinks = [...players].map(p => ({
    ...p,
    total: p.drinks.shot * 3 + p.drinks.largeSip * 2 + p.drinks.sip,
  })).sort((a, b) => b.total - a.total);
  const drunkest = byDrinks[0];

  return (
    <div className="end-screen">
      <Confetti count={140} />
      <div className="end-content">
        <div className="end-icon">🏆</div>
        <h1 className="end-title">
          {winners.length > 1
            ? "It's a tie!"
            : `${winners[0].name} is the brainiac!`}
        </h1>
        <p className="end-sub">
          {winners.length > 1
            ? winners.map(w => w.name).join(' & ') + ` tied at ${topScore} pts`
            : `${topScore} points of pure genius`}
        </p>

        {drunkest.total > 0 && (
          <p className="end-drunkest">🍻 Most punished: <b>{drunkest.name}</b></p>
        )}

        <div className="final-board">
          {byScore.map((p, rank) => {
            const total = p.drinks.shot + p.drinks.largeSip + p.drinks.sip;
            return (
              <div key={p.name} className={`final-row ${rank === 0 && winners.length === 1 ? 'champ' : ''}`}>
                <span className="fr-rank">{rank === 0 ? '👑' : `#${rank + 1}`}</span>
                <span className="fr-name">{p.name}</span>
                <span className="fr-score">{p.score} pts</span>
                <span className="fr-drinks">
                  {p.drinks.shot > 0 && `🥃${p.drinks.shot} `}
                  {p.drinks.largeSip > 0 && `🍺${p.drinks.largeSip} `}
                  {p.drinks.sip > 0 && `💧${p.drinks.sip}`}
                  {total === 0 && '— stone cold sober'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="end-actions">
          <button className="play-again-btn" onClick={onPlayAgain}>🔄 Play Again</button>
          <button className="new-players-btn" onClick={onNewPlayers}>👥 New Players</button>
        </div>
        <p className="disclaimer">Drink water. You earned it. 💧</p>
      </div>
    </div>
  );
}
