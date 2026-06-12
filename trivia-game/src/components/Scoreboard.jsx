import '../styles/Scoreboard.css';

export function Scoreboard({ players, currentIdx, compact }) {
  const sorted = [...players].map((p, i) => ({ ...p, i }));

  return (
    <div className={`scoreboard ${compact ? 'compact' : ''}`}>
      {sorted.map(p => {
        const totalDrinks = p.drinks.shot + p.drinks.largeSip + p.drinks.sip;
        return (
          <div key={p.i} className={`score-row ${p.i === currentIdx ? 'active' : ''}`}>
            <span className="sr-name">
              {p.i === currentIdx && <span className="sr-arrow">▶</span>}
              {p.name}
            </span>
            <span className="sr-stats">
              <span className="sr-score">{p.score} pts</span>
              {totalDrinks > 0 && (
                <span className="sr-drinks">
                  {p.drinks.shot > 0 && <span title="shots">🥃{p.drinks.shot}</span>}
                  {p.drinks.largeSip > 0 && <span title="large sips">🍺{p.drinks.largeSip}</span>}
                  {p.drinks.sip > 0 && <span title="sips">💧{p.drinks.sip}</span>}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
