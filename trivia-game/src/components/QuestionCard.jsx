import { useState } from 'react';
import { DIFFICULTY_CONFIG } from '../data/questions';
import { Confetti } from './Confetti';
import '../styles/Question.css';

const LETTERS = ['A', 'B', 'C', 'D'];

export function QuestionCard({
  question, options, correctIdx, isMystery, difficulty,
  playerName, onResolved,
}) {
  const [selected, setSelected] = useState(null);
  const revealed = selected !== null;
  const correct = revealed && selected === correctIdx;
  const cfg = difficulty ? DIFFICULTY_CONFIG[difficulty] : null;

  const handleTap = (idx) => {
    if (revealed) return;
    setSelected(idx);
  };

  const optionClass = (idx) => {
    if (!revealed) return 'option';
    if (idx === correctIdx) return 'option reveal-correct';
    if (idx === selected) return 'option reveal-wrong';
    return 'option faded';
  };

  return (
    <div className={`question-screen ${revealed ? (correct ? 'flash-correct' : 'flash-wrong') : ''} ${isMystery ? 'mystery' : ''}`}>
      {revealed && correct && <Confetti count={isMystery ? 110 : 80} />}

      <div className="question-top">
        {isMystery ? (
          <div className="mystery-banner">
            <span className="mystery-pulse">❓ MYSTERY ROUND ❓</span>
            <span className="mystery-cat">{question.category}</span>
          </div>
        ) : (
          <div className="q-meta" style={{ '--diff-color': cfg.color }}>
            <span className="q-diff">{cfg.emoji} {cfg.label}</span>
            <span className="q-cat">{question.category}</span>
            <span className="q-points">+{cfg.points} pt{cfg.points > 1 ? 's' : ''}</span>
          </div>
        )}
        <p className="q-player">{playerName}'s question</p>
      </div>

      <div className={`question-box ${isMystery ? 'mystery-box' : ''}`}>
        <p className="question-text">{question.question}</p>
      </div>

      <div className="options-grid">
        {options.map((opt, idx) => (
          <button
            key={idx}
            className={optionClass(idx)}
            onClick={() => handleTap(idx)}
            disabled={revealed}
          >
            <span className="option-letter">{LETTERS[idx]}</span>
            <span className="option-text">{opt}</span>
            {revealed && idx === correctIdx && <span className="option-mark">✓</span>}
            {revealed && idx === selected && idx !== correctIdx && <span className="option-mark">✗</span>}
          </button>
        ))}
      </div>

      {revealed && (
        <div className={`result-banner ${correct ? 'good' : 'bad'}`}>
          {isMystery ? (
            correct ? (
              <>
                <span className="rb-title">🎯 CORRECT!</span>
                <span className="rb-sub">Assign {question.mysteryShots} shot{question.mysteryShots > 1 ? 's' : ''} to a rival!</span>
              </>
            ) : (
              <>
                <span className="rb-title">😅 Wrong!</span>
                <span className="rb-sub">No penalty — mystery rounds are mercy rounds.</span>
              </>
            )
          ) : correct ? (
            <>
              <span className="rb-title">✅ CORRECT!</span>
              <span className="rb-sub">+{cfg.points} point{cfg.points > 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <span className="rb-title">❌ WRONG!</span>
              <span className="rb-sub">{cfg.penalty.emoji} Take {cfg.penalty.label}!</span>
            </>
          )}
          <button className="next-btn" onClick={() => onResolved(selected, correct)}>
            {isMystery && correct ? 'Choose target ▶' : 'Next player ▶'}
          </button>
        </div>
      )}
    </div>
  );
}
