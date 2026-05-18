import { isRedSuit } from '../utils/cardRules';
import '../styles/Card.css';

export function PlayingCard({ card, faceDown = false, onClick, small = false }) {
  const red = card ? isRedSuit(card.suit) : false;

  return (
    <div
      className={`playing-card ${faceDown ? 'face-down' : 'face-up'} ${red ? 'red' : 'black'} ${small ? 'small' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      {faceDown ? (
        <div className="card-back">
          <div className="card-back-pattern">✦</div>
        </div>
      ) : (
        <div className="card-face">
          <div className="card-corner top-left">
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit">{card.suit}</span>
          </div>
          <div className="card-center-suit">{card.suit}</div>
          <div className="card-corner bottom-right">
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit">{card.suit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function CardStack({ count }) {
  const visible = Math.min(count, 3);
  return (
    <div className="card-stack">
      {Array.from({ length: visible }).map((_, i) => (
        <div key={i} className="stack-card" style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }} />
      ))}
      <span className="stack-count">{count}</span>
    </div>
  );
}
