import React from 'react';

export default function StarBackground({ children }) {
  const stars = React.useMemo(
    () =>
      Array.from({ length: 100 }, (_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.6 + 0.2,
        duration: 2 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-ink to-surface text-white">
      {stars.map((star) => (
        <span
          key={star.id}
          className="pointer-events-none absolute rounded-full bg-white"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animation: `twinkle ${star.duration}s infinite`,
          }}
        />
      ))}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
