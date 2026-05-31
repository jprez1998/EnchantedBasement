import '../styles/Assign.css';

export function AssignShots({ players, currentIdx, shots, onAssign }) {
  const rivals = players.map((p, i) => ({ ...p, i })).filter(p => p.i !== currentIdx);

  return (
    <div className="assign-screen">
      <div className="assign-burst">🥃</div>
      <h2 className="assign-title">{shots} shot{shots > 1 ? 's' : ''} to give!</h2>
      <p className="assign-sub">{players[currentIdx].name}, choose who drinks:</p>

      <div className="rival-list">
        {rivals.map(r => (
          <button key={r.i} className="rival-btn" onClick={() => onAssign(r.i, shots)}>
            <span className="rival-name">{r.name}</span>
            <span className="rival-assign">🥃 × {shots} ▶</span>
          </button>
        ))}
      </div>
    </div>
  );
}
