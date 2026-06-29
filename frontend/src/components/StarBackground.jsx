import { BACKGROUND_STARS } from '../utils/starField';

export default function StarBackground({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-ink to-surface text-white">
      {BACKGROUND_STARS.map((star) => (
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
