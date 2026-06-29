import { useEffect, useState } from 'react';
import { Heart, Pin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from './ui/Card';
import Button from './ui/Button';
import { api } from '../api/client';
import { usePostingAuthor } from '../context/AuthContext';

export default function StolenNoteWidget() {
  const navigate = useNavigate();
  const { author } = usePostingAuthor();
  const [stolen, setStolen] = useState(null);

  useEffect(() => {
    if (!author) return;
    api.getStolenNote(author).then((d) => setStolen(d.note)).catch(() => setStolen(null));
  }, [author]);

  if (!stolen) return null;

  return (
    <Card highlight className="mb-8 border-rose-500/20">
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Pin size={20} className="text-accent-soft" /> Stolen note
      </h2>
      <p className="mt-1 text-xs text-muted">Pinned on your dashboard this week</p>
      <p className="mt-4 whitespace-pre-wrap leading-relaxed">{stolen.content}</p>
      <p className="mt-3 text-sm text-muted">— {stolen.author}</p>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="primary" onClick={() => navigate('/forever?tab=notes')}>
          <Heart size={14} /> Open Forever
        </Button>
        <Button size="sm" variant="ghost" onClick={() => api.releaseStolenNote(author).then(() => setStolen(null))}>
          Release
        </Button>
      </div>
    </Card>
  );
}
