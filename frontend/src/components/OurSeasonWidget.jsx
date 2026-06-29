import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, ChevronRight } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPeriodLabel } from '../utils/season';
import { resolveMediaUrl } from '../utils/media';

export default function OurSeasonWidget() {
  const navigate = useNavigate();
  const { partnerNames } = useAuth();
  const [periodType] = useState('week');
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getSeasons(periodType).then(setData).catch(() => setData(null));
  }, [periodType]);

  const current = data?.current || [];
  const label = data?.current_period_start
    ? formatPeriodLabel(data.current_period_start, periodType)
    : 'This week';

  const names = partnerNames.length >= 2 ? partnerNames : ['Partner 1', 'Partner 2'];
  const missing = names.filter((n) => !current.some((e) => e.author === n));

  return (
    <Card
      highlight
      className="mb-6 cursor-pointer border-accent/20 bg-gradient-to-br from-violet-500/10 via-transparent to-rose-500/10 transition hover:border-accent/35"
      onClick={() => navigate('/mood-board')}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/mood-board')}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-accent-soft">
            <Palette size={16} /> Our season
          </div>
          <p className="mt-1 text-xs text-muted">{label}</p>
        </div>
        <ChevronRight className="shrink-0 text-muted" size={20} />
      </div>

      {current.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Share how this week feels — title, colour, photo, or a meme that captures your mood.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {current.map((entry) => (
            <div
              key={entry.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              style={{ borderLeftColor: entry.color, borderLeftWidth: 4 }}
            >
              {entry.photo_url && (
                <img
                  src={resolveMediaUrl(entry.photo_url)}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              )}
              <div className="p-3">
                <p className="text-xs text-muted">{entry.author}</p>
                <p className="font-display text-lg leading-snug">{entry.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {missing.length > 0 && current.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Waiting for {missing.join(' & ')} to share their mood
        </p>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="mt-4"
        onClick={(e) => {
          e.stopPropagation();
          navigate('/mood-board');
        }}
      >
        {current.some((e) => e.author) ? 'Update our season' : 'Share your mood'}
      </Button>
    </Card>
  );
}
