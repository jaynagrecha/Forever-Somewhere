import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { resolveMediaUrl } from '../utils/media';
import { romanceUnlock } from '../utils/romanceSounds';

export default function RandomMemory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(false);

  async function pick() {
    setLoading(true);
    try {
      setMemory(await api.getRandomMemory());
      romanceUnlock();
    } catch {
      toast('Add a memory first', 'error');
      setMemory(null);
    } finally {
      setLoading(false);
    }
  }

  const photo = memory?.photos?.[0];

  return (
    <Card className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl">Random memory</h2>
        <Button size="sm" variant="secondary" onClick={pick} disabled={loading}>
          <Shuffle size={16} /> Surprise me
        </Button>
      </div>
      {memory && (
        <button
          type="button"
          onClick={() => navigate('/moments')}
          className="mt-4 w-full rounded-2xl bg-white/5 p-4 text-left transition hover:bg-white/10"
        >
          {photo?.url && (
            <img
              src={resolveMediaUrl(photo.url) || photo.data}
              alt=""
              className="mb-3 h-40 w-full rounded-xl object-cover"
            />
          )}
          <p className="font-display text-lg">{memory.title}</p>
          <p className="mt-1 text-sm text-muted">
            {memory.date || 'Undated'} · {memory.location || 'Somewhere special'}
          </p>
        </button>
      )}
    </Card>
  );
}
