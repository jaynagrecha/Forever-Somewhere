import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SESSION_KEY = 'forever_names_anim_shown';

/** Stars drift in, then partner names glow into view — once per browser session. */
export default function OpeningNamesAnimation({ onDone }) {
  const { partnerNames } = useAuth();
  const [phase, setPhase] = useState('stars');
  const canvasRef = useRef(null);
  const doneRef = useRef(false);

  const names = useMemo(() => {
    if (partnerNames?.length >= 2) return partnerNames;
    return ['Forever', 'Somewhere'];
  }, [partnerNames]);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      onDone?.();
      return undefined;
    }

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let start = performance.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      tx: canvas.width * (0.25 + Math.random() * 0.5),
      ty: canvas.height * (0.35 + Math.random() * 0.15),
      r: Math.random() * 1.8 + 0.5,
      a: Math.random(),
    }));

    const draw = (t) => {
      const elapsed = (t - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        const ease = Math.min(1, elapsed / 1.8);
        const cx = p.x + (p.tx - p.x) * ease;
        const cy = p.y + (p.ty - p.y) * ease;
        const twinkle = 0.4 + 0.6 * Math.sin(elapsed * 3 + i);
        ctx.beginPath();
        ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.a * twinkle})`;
        ctx.fill();
      });

      if (elapsed > 1.6 && phase === 'stars') setPhase('names');
      if (elapsed < 3.2) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const timer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        sessionStorage.setItem(SESSION_KEY, '1');
        onDone?.();
      }
    }, 3200);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
    };
  }, [onDone, phase]);

  if (sessionStorage.getItem(SESSION_KEY)) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink"
      role="presentation"
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div
        className={`relative z-10 text-center transition-all duration-1000 ${
          phase === 'names' ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <p className="mb-2 text-sm uppercase tracking-[0.4em] text-accent-soft">Welcome back</p>
        <h1 className="font-display text-4xl md:text-6xl">
          <span className="name-glow">{names[0]}</span>
          <span className="mx-3 text-accent">&amp;</span>
          <span className="name-glow">{names[1]}</span>
        </h1>
      </div>
    </div>
  );
}
