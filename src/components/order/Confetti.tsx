"use client";

import { useEffect, useMemo, useState } from "react";

const COLORS = ["#c9a962", "#8b2635", "#6b7c3e", "#d4bc7a", "#f5e9da"];
const PIECE_COUNT = 50;

interface Piece {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotate: number;
  drift: number;
  round: boolean;
}

export function Confetti() {
  const [visible, setVisible] = useState(true);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        size: 6 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotate: Math.random() * 360,
        drift: -40 + Math.random() * 80,
        round: Math.random() > 0.6,
      })),
    []
  );

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--confetti-rotate" as string]: `${p.rotate}deg`,
            ["--confetti-drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
