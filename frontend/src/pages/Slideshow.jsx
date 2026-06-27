import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Play, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { resolveMediaUrl } from '../utils/media';

export default function Slideshow() {
  const navigate = useNavigate();
  const { memories } = useData();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const slides = useMemo(() => {
    const items = [];
    memories.forEach((m) => {
      (m.photos || []).forEach((p) => {
        items.push({
          src: resolveMediaUrl(p.url) || p.data,
          title: m.title,
          date: m.date,
          location: m.location?.split(',')[0],
        });
      });
    });
    return items;
  }, [memories]);

  useEffect(() => {
    if (!playing || slides.length === 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [playing, slides.length]);

  if (slides.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
        <p className="text-muted">Add photos to memories to start the slideshow.</p>
        <button className="mt-4 text-accent-soft underline" onClick={() => navigate('/moments')}>
          Go to Moments
        </button>
      </div>
    );
  }

  const slide = slides[index];

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <img
        key={index}
        src={slide.src}
        alt=""
        className="h-full w-full object-contain animate-fade-in"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

      <div className="absolute bottom-0 left-0 right-0 p-8 text-center animate-slide-up">
        <h2 className="font-display text-3xl md:text-4xl">{slide.title}</h2>
        <p className="mt-2 text-muted">{slide.date} {slide.location && `· ${slide.location}`}</p>
        <p className="mt-4 text-sm text-muted">{index + 1} / {slides.length}</p>
      </div>

      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          className="rounded-full bg-white/10 p-3 backdrop-blur-md hover:bg-white/20"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          type="button"
          className="rounded-full bg-white/10 p-3 backdrop-blur-md hover:bg-white/20"
          onClick={() => navigate('/dashboard')}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
