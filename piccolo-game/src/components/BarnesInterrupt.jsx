import { useEffect, useRef } from 'react';
import '../styles/Barnes.css';

export default function BarnesInterrupt({
  barnesTaps, barnesTimeLeft, barnesResult, TAPS_NEEDED: tapsNeeded,
  onTap, onDismiss,
}) {
  const totalMs = 5000;
  const pct = Math.max(0, (barnesTimeLeft / totalMs) * 100);
  const tapPct = Math.min(100, (barnesTaps / tapsNeeded) * 100);

  const shakeRef = useRef(null);
  useEffect(() => {
    if (barnesResult === 'failed' && shakeRef.current) {
      shakeRef.current.classList.add('shake-fail');
    }
  }, [barnesResult]);

  // Single handler for the whole overlay — tap to save OR tap to dismiss
  function handleOverlayTap(e) {
    e.preventDefault();
    if (barnesResult !== null) {
      onDismiss();
    } else {
      onTap();
    }
  }

  return (
    <div
      className={`barnes-overlay ${barnesResult === 'saved' ? 'overlay-saved' : ''} ${barnesResult === 'failed' ? 'overlay-failed' : ''}`}
      onTouchStart={handleOverlayTap}
      onClick={handleOverlayTap}
    >
      {barnesResult === null && (
        <>
          <div className="barnes-bg-text" aria-hidden>BUFFALO</div>
          <div className="barnes-content" ref={shakeRef}>
            <div className="barnes-warning">⚠️ ALERT ⚠️</div>
            <div className="barnes-main-text">
              <span>OI</span>
              <span className="barnes-name">BARNES</span>
              <span>BUFFALO</span>
            </div>
            <p className="barnes-sub">TAP LIKE YOUR LIFE DEPENDS ON IT</p>

            <div className="tap-progress-wrap">
              <div className="tap-progress-bar" style={{ width: `${tapPct}%` }} />
            </div>
            <div className="tap-count">{barnesTaps} / {tapsNeeded} taps</div>

            <div className="timer-bar-wrap">
              <div
                className={`timer-bar ${pct < 30 ? 'timer-danger' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="timer-label">{(barnesTimeLeft / 1000).toFixed(1)}s</div>
          </div>
        </>
      )}

      {barnesResult === 'saved' && (
        <div className="barnes-result saved">
          <div className="result-icon">🦸</div>
          <h2>SAVED!</h2>
          <p>Barnes escapes... this time.</p>
          <p className="tap-to-continue">tap anywhere to continue</p>
        </div>
      )}

      {barnesResult === 'failed' && (
        <div className="barnes-result failed">
          <div className="result-icon">💀</div>
          <h2>TOO SLOW, BARNES</h2>
          <p className="penalty-text">Take 3 sips you buffalo</p>
          <p className="tap-to-continue">tap anywhere to continue</p>
        </div>
      )}
    </div>
  );
}
