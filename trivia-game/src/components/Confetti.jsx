import { useMemo } from 'react';
import '../styles/Confetti.css';

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ec4899', '#f97316', '#a855f7', '#06b6d4'];

// A lightweight CSS confetti burst — no dependencies.
export function Confetti({ count = 80 }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = Math.random() * 360;
      const distance = 120 + Math.random() * 260;
      const tx = Math.cos((angle * Math.PI) / 180) * distance;
      const ty = Math.sin((angle * Math.PI) / 180) * distance - (60 + Math.random() * 120);
      return {
        id: i,
        tx: `${tx}px`,
        ty: `${ty}px`,
        rot: `${Math.random() * 720 - 360}deg`,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: `${Math.random() * 0.12}s`,
        duration: `${0.9 + Math.random() * 0.7}s`,
        size: `${6 + Math.random() * 8}px`,
        round: Math.random() > 0.5,
      };
    });
  }, [count]);

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className={`confetti-piece ${p.round ? 'round' : ''}`}
          style={{
            '--tx': p.tx,
            '--ty': p.ty,
            '--rot': p.rot,
            '--delay': p.delay,
            '--duration': p.duration,
            background: p.color,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}
