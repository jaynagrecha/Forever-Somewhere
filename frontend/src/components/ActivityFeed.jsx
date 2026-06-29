import { useEffect, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { api } from '../api/client';
import { useActivity } from '../context/ActivityContext';

const KIND_LABEL = {
  ping: '💕 Ping',
  memory: '📸 Memory',
  dream: '✨ Dream',
  love_note: '💌 Note',
  capsule: '🔒 Capsule',
  trip_pin: '📍 Map pin',
  album: '📁 Album',
};

const POLL_MS = 12_000;
const FETCH_LIMIT = 30;
const COLLAPSED_COUNT = 5;

function formatActivityWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const dayKey = (x) => x.toDateString();

  if (dayKey(d) === dayKey(today)) return `Today · ${time}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return `Yesterday · ${time}`;

  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
  return `${date} · ${time}`;
}

export default function ActivityFeed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { version } = useActivity();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(() => {
    api
      .getActivity(FETCH_LIMIT)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, version, location.pathname]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') load();
    };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [load]);

  if (loading && !items.length) return null;
  if (!items.length) return null;

  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const hiddenCount = Math.max(0, items.length - COLLAPSED_COUNT);
  const needsScroll = expanded && items.length > 8;

  return (
    <Card className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <Activity size={20} className="text-accent-soft" /> Partner activity
        </h2>
        <span className="text-xs text-muted">{items.length} recent</span>
      </div>

      <ul
        className={`space-y-3 ${needsScroll ? 'max-h-80 overflow-y-auto overscroll-contain pr-1' : ''}`}
      >
        {visible.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => navigate(ev.route || '/dashboard')}
              className="flex w-full items-start gap-3 rounded-xl bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            >
              <span className="shrink-0 text-sm text-muted">{KIND_LABEL[ev.kind] || ev.kind}</span>
              <span className="min-w-0 flex-1 text-sm">
                {ev.kind === 'ping' ? (
                  <strong>{ev.title}</strong>
                ) : (
                  <>
                    <strong>{ev.author}</strong> — {ev.title}
                  </>
                )}
              </span>
              <span className="shrink-0 text-right text-xs leading-snug text-muted">
                {formatActivityWhen(ev.created_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 w-full"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <>
              <ChevronUp size={16} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={16} /> Show {hiddenCount} more
            </>
          )}
        </Button>
      )}
    </Card>
  );
}
