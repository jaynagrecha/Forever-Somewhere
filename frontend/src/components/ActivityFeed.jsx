import { useEffect, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import Card from './ui/Card';
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

export default function ActivityFeed({ limit = 6 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { version } = useActivity();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api
      .getActivity(limit)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [limit]);

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

  return (
    <Card className="mb-8">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
        <Activity size={20} className="text-accent-soft" /> Partner activity
      </h2>
      <ul className="space-y-3">
        {items.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => navigate(ev.route || '/dashboard')}
              className="flex w-full items-start gap-3 rounded-xl bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            >
              <span className="text-sm text-muted">{KIND_LABEL[ev.kind] || ev.kind}</span>
              <span className="flex-1 text-sm">
                {ev.kind === 'ping' ? (
                  <strong>{ev.title}</strong>
                ) : (
                  <>
                    <strong>{ev.author}</strong> — {ev.title}
                  </>
                )}
              </span>
              <span className="text-xs text-muted">
                {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
