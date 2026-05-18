import '../styles/PlayerPanel.css';

export function PlayerPanel({ player, isActive, score, isQuestionMaster, isMate }) {
  const composureColor =
    player.composure >= 70 ? '#4ade80' :
    player.composure >= 40 ? '#facc15' : '#f87171';

  return (
    <div className={`player-panel ${isActive ? 'active' : ''}`}>
      {isActive && <div className="active-indicator">▶ Your Turn</div>}
      <div className="player-name">
        {player.name}
        {isQuestionMaster && <span className="badge qm">👑 QM</span>}
        {isMate && <span className="badge mate">🔗 Mate</span>}
      </div>

      <div className="player-stats">
        <div className="stat">
          <span className="stat-label">Sips</span>
          <span className="stat-value sips">{player.sips}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Score</span>
          <span className="stat-value score">{score}</span>
        </div>
      </div>

      <div className="composure-bar-wrap">
        <div className="composure-label">
          Composure <span style={{ color: composureColor }}>{Math.round(player.composure)}%</span>
        </div>
        <div className="composure-bar">
          <div
            className="composure-fill"
            style={{ width: `${player.composure}%`, background: composureColor }}
          />
        </div>
      </div>
    </div>
  );
}
