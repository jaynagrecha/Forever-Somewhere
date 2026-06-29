import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PageShell from '../components/Layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

const empty = { text: '', image_url: '', color: '#ff4d6d' };

export default function MoodBoard() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMoodBoard().then((d) => setItems(d.items || [])).catch(() => setItems([]));
  }, []);

  async function persist(next) {
    setSaving(true);
    try {
      await api.saveMoodBoard(next);
      setItems(next);
      toast('Mood board saved', 'success');
    } catch {
      toast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  function addItem() {
    if (!draft.text.trim() && !draft.image_url.trim()) {
      return toast('Add text or image URL', 'error');
    }
    persist([...items, { ...draft, id: Date.now() }]);
    setDraft(empty);
  }

  function removeAt(i) {
    persist(items.filter((_, idx) => idx !== i));
  }

  return (
    <PageShell title="🎨 Mood board" subtitle="Shared vibes — colours, quotes, and inspiration for us.">
      <Card className="mb-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Text / quote" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          <Input label="Image URL" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
          <Input label="Accent colour" type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
        </div>
        <Button className="mt-4" variant="primary" onClick={addItem} disabled={saving}>
          <Plus size={16} /> Add tile
        </Button>
      </Card>

      <div className="columns-2 gap-4 md:columns-3">
        {items.map((item, i) => (
          <Card key={item.id || i} className="mb-4 break-inside-avoid" style={{ borderColor: item.color }}>
            {item.image_url && (
              <img src={item.image_url} alt="" className="mb-3 w-full rounded-xl object-cover" />
            )}
            {item.text && <p className="leading-relaxed">{item.text}</p>}
            <Button size="sm" variant="danger" className="mt-3" onClick={() => removeAt(i)}>
              <Trash2 size={14} /> Remove
            </Button>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
