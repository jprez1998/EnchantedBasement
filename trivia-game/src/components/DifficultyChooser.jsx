import { DIFFICULTY_CONFIG } from '../data/questions';
import '../styles/Chooser.css';

const ORDER = ['easy', 'medium', 'hard'];

export function DifficultyChooser({ playerName, onChoose }) {
  return (
    <div className="chooser-screen">
      <p className="chooser-turn">{playerName}, your turn</p>
      <h2 className="chooser-title">Pick your poison</h2>
      <p className="chooser-hint">Higher difficulty = more points, gentler penalty if you miss.</p>

      <div className="diff-cards">
        {ORDER.map(key => {
          const cfg = DIFFICULTY_CONFIG[key];
          return (
            <button
              key={key}
              className="diff-card"
              style={{ '--diff-color': cfg.color }}
              onClick={() => onChoose(key)}
            >
              <span className="diff-emoji">{cfg.emoji}</span>
              <span className="diff-label">{cfg.label}</span>
              <span className="diff-points">+{cfg.points} pt{cfg.points > 1 ? 's' : ''} if right</span>
              <span className="diff-penalty">{cfg.penalty.emoji} {cfg.penalty.label} if wrong</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
