import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import Card from './ui/Card';
import { api } from '../api/client';

const KIND_LABEL = {
  ping: '💕 Ping',
  memory: '📸 Memory',
  dream: '✨ Dream',
  love_note: '💌 Note',
  capsule: '🔒 Capsule',
  trip_pin: '📍 Map pin',
  album: '📁 Album',
};

export default function ActivityFeed({ limit = 6 }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .getActivity(limit)
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch(() => {
        if (alive) setItems([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [limit]);

  if (loading) return null;
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
                <strong>{ev.author}</strong> — {ev.title}
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
