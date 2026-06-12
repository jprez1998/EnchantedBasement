import { useState, useEffect } from 'react';
import { getRandomComposureChallenge } from '../utils/challenges';
import '../styles/Composure.css';

const TIME_LIMIT = 8; // seconds

export function ComposureChallenge({ playerName, onResult }) {
  const [challenge] = useState(() => getRandomComposureChallenge());
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timerColor =
    timeLeft > 5 ? '#4ade80' :
    timeLeft > 2 ? '#facc15' : '#f87171';

  return (
    <div className="composure-screen">
      <div className="composure-card">
        <div className="composure-header">
          <span className="composure-icon">🧠</span>
          <h2>Composure Check</h2>
          <p>{playerName}, keep it together!</p>
        </div>

        <div className="challenge-content">
          <p className="challenge-prompt">{challenge.prompt}</p>
          <div className="challenge-item">{challenge.item}</div>
        </div>

        {!expired && (
          <div className="timer-row">
            <div className="timer-bar">
              <div
                className="timer-fill"
                style={{
                  width: `${(timeLeft / TIME_LIMIT) * 100}%`,
                  background: timerColor,
                }}
              />
            </div>
            <span className="timer-num" style={{ color: timerColor }}>{timeLeft}s</span>
          </div>
        )}

        {expired ? (
          <div className="expired-section">
            <p className="expired-text">Time's up! Did {playerName} manage it?</p>
            <div className="result-buttons">
              <button className="result-btn pass" onClick={() => onResult(true)}>✅ Passed</button>
              <button className="result-btn fail" onClick={() => onResult(false)}>❌ Failed</button>
            </div>
          </div>
        ) : (
          <div className="result-buttons">
            <button className="result-btn pass" onClick={() => onResult(true)}>✅ Nailed it</button>
            <button className="result-btn fail" onClick={() => onResult(false)}>❌ Fumbled</button>
          </div>
        )}
      </div>
    </div>
  );
}
