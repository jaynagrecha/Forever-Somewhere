import { Lock, Unlock, Clock } from 'lucide-react';
import Badge from './ui/Badge';
import Button from './ui/Button';

export default function CapsuleWall({ locked, ready, opened, onOpen, onDelete }) {
  const all = [
    ...locked.map((c) => ({ ...c, wallState: 'locked' })),
    ...ready.map((c) => ({ ...c, wallState: 'ready' })),
    ...opened.map((c) => ({ ...c, wallState: 'opened' })),
  ];

  if (!all.length) {
    return (
      <div className="capsule-wall-empty mb-10 rounded-3xl border border-dashed border-white/15 p-12 text-center text-muted">
        Your time capsule wall is empty — seal your first letter below.
      </div>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="mb-6 font-display text-xl">Time capsule wall</h2>
      <div className="capsule-wall grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {all.map((c, i) => (
          <div
            key={c.id}
            className={`capsule-jar relative flex flex-col items-center p-4 transition hover:scale-105 ${
              c.wallState === 'ready' ? 'capsule-jar-ready' : ''
            } ${c.wallState === 'opened' ? 'capsule-jar-opened opacity-80' : ''}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className={`relative flex h-28 w-20 flex-col items-center justify-end rounded-b-2xl border-2 ${
                c.wallState === 'locked'
                  ? 'border-white/20 bg-gradient-to-b from-white/10 to-white/5'
                  : c.wallState === 'ready'
                    ? 'border-gold/50 bg-gradient-to-b from-gold/20 to-amber-900/30 shadow-lg shadow-gold/20'
                    : 'border-accent/30 bg-gradient-to-b from-accent/15 to-transparent'
              }`}
            >
              <div className="absolute -top-3 h-4 w-14 rounded-t-lg border-2 border-inherit bg-inherit" />
              {c.wallState === 'locked' ? (
                <Lock className="mb-6 text-muted" size={22} />
              ) : (
                <Unlock className={`mb-6 ${c.wallState === 'ready' ? 'text-gold' : 'text-accent-soft'}`} size={22} />
              )}
            </div>
            <h3 className="mt-3 line-clamp-2 text-center font-display text-sm">{c.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Clock size={10} />
              {c.wallState === 'locked' && c.days_until_unlock != null
                ? `${c.days_until_unlock}d`
                : c.unlock_date?.slice(0, 10) || '—'}
            </p>
            <Badge tone={c.wallState === 'ready' ? 'gold' : c.wallState === 'opened' ? 'accent' : 'default'} className="mt-2">
              {c.wallState === 'locked' ? 'Sealed' : c.wallState === 'ready' ? 'Ready!' : 'Opened'}
            </Badge>
            <div className="mt-2 flex gap-1">
              {c.wallState === 'ready' && (
                <Button size="sm" variant="primary" onClick={() => onOpen(c)}>
                  Open
                </Button>
              )}
              {c.wallState === 'locked' && (
                <Button size="sm" variant="danger" onClick={() => onDelete(c.id)}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
