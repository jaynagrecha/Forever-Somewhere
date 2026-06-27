import { useState } from 'react';
import { Film } from 'lucide-react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { useData } from '../context/DataContext';
import { memoriesForYear } from '../utils/insights';
import { resolveMediaUrl } from '../utils/media';

export default function YearInReview() {
  const { memories } = useData();
  const years = [...new Set(memories.filter((m) => m.date).map((m) => new Date(m.date).getFullYear()))].sort(
    (a, b) => b - a
  );
  const [year, setYear] = useState(years[0] || new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const review = memoriesForYear(memories, year);

  if (!memories.length) return null;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Film size={16} /> Year in review
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Year in review" wide>
        <div className="mb-6 flex flex-wrap gap-2">
          {years.map((y) => (
            <Button key={y} size="sm" variant={y === year ? 'primary' : 'secondary'} onClick={() => setYear(y)}>
              {y}
            </Button>
          ))}
        </div>
        {review.length === 0 ? (
          <p className="text-muted">No memories in {year} yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {review.map((m) => (
              <div key={m.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-muted">{m.date}</p>
                <h3 className="mt-1 font-display text-xl">{m.title}</h3>
                <p className="mt-2 text-sm text-muted">{m.location?.split(',')[0]}</p>
                {m.photos?.[0] && (
                  <img
                    src={resolveMediaUrl(m.photos[0].url) || m.photos[0].data}
                    alt=""
                    className="mt-3 h-32 w-full rounded-xl object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
