import { useEffect, useState } from 'react';
import { CalendarHeart, Sparkles } from 'lucide-react';
import Card from './ui/Card';
import { api } from '../api/client';

function CountdownRing({ days, max = 365 }) {
  const pct = Math.max(0, Math.min(100, ((max - days) / max) * 100));
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width="88" height="88" className="-rotate-90">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="text-accent transition-all duration-700"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function RomanceWidgets() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getTogetherStats().then(setStats).catch(() => setStats(null));
  }, []);

  if (!stats) return null;

  const annLabel =
    stats.next_anniversary_days === 0
      ? 'Today!'
      : stats.next_anniversary_days != null
        ? `${stats.next_anniversary_days} days`
        : null;

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2">
      <Card
        highlight
        className="relative overflow-hidden border-gold/20 bg-gradient-to-br from-gold/10 to-transparent"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center">
            <CountdownRing days={stats.next_anniversary_days ?? 180} />
            <Sparkles className="absolute text-gold" size={22} />
          </div>
          <div>
            <p className="text-sm text-gold">Together</p>
            <p className="font-display text-4xl leading-none">{stats.days_together}</p>
            <p className="mt-1 text-sm text-muted">days and counting</p>
            {stats.together_since && (
              <p className="mt-1 text-xs text-muted">since {stats.together_since}</p>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted md:hidden">
          Add to home screen — this card is your together-days widget.
        </p>
      </Card>

      {stats.next_anniversary_title && (
        <Card highlight className="border-accent/20 bg-gradient-to-br from-accent/10 to-transparent">
          <div className="flex items-start gap-3">
            <CalendarHeart className="mt-1 shrink-0 text-accent-soft" size={28} />
            <div>
              <p className="text-sm text-accent-soft">Next anniversary</p>
              <h2 className="font-display text-2xl">{stats.next_anniversary_title}</h2>
              <p className="mt-2 text-muted">
                {stats.next_anniversary_date}
                {annLabel && ` · ${annLabel}`}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
