import '../styles/PromptCard.css';

const TYPE_COLORS = {
  drink: { bg: 'var(--c-drink)', label: 'DRINK UP' },
  dare:  { bg: 'var(--c-dare)',  label: 'DARE'     },
  rule:  { bg: 'var(--c-rule)',  label: 'NEW RULE' },
  question: { bg: 'var(--c-question)', label: 'HOT SEAT' },
};

const PLAYER_COLORS = ['#f43f5e', '#3b82f6', '#22c55e'];

export default function PromptCard({
  players, playerIdx, currentPrompt, promptText,
  flipped, onFlip, onNext, onEnd, roundCount,
}) {
  const player = players[playerIdx];
  const color = PLAYER_COLORS[playerIdx];
  const typeInfo = TYPE_COLORS[currentPrompt?.type] ?? TYPE_COLORS.drink;

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="player-badges">
          {players.map((p, i) => (
            <div
              key={i}
              className={`player-badge ${i === playerIdx ? 'active' : ''}`}
              style={{ '--pc': PLAYER_COLORS[i] }}
            >
              {p}
            </div>
          ))}
        </div>
        <button className="end-btn" onClick={onEnd}>End</button>
      </div>

      <div className="card-area">
        <div className={`prompt-card ${flipped ? 'flipped' : ''}`}>
          {/* Front face — hidden until flipped */}
          <div className="card-face card-back">
            <div className="card-back-icon">🎯</div>
            <div className="card-back-label">
              <span style={{ color }}>@{player}</span>
              <br />
              tap to reveal
            </div>
            <button className="flip-btn" onClick={onFlip}>Flip Card</button>
          </div>

          {/* Back face — shown after flip */}
          <div className="card-face card-front" style={{ '--type-color': typeInfo.bg }}>
            <div className="type-badge">{typeInfo.label}</div>
            <div className="card-emoji">{currentPrompt?.emoji}</div>
            <p className="card-text">{promptText}</p>
            <div className="card-player-tag" style={{ color }}>@{player}</div>
            <button className="next-btn" onClick={onNext}>Done ✓</button>
          </div>
        </div>
      </div>

      <div className="round-counter">Round {Math.floor(roundCount / 3) + 1} • Card {(roundCount % 3) + 1}/3</div>
    </div>
  );
}
