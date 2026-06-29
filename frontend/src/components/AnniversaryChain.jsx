import { useCallback, useEffect, useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, TextArea } from './ui/Input';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { usePostingAuthor } from '../context/AuthContext';

const REACTIONS = [
  { key: 'heart', label: '❤️' },
  { key: 'fire', label: '🔥' },
  { key: 'blush', label: '😳' },
];

export function NoteReactionsBar({ noteId, author, noteAuthor, reactions, onChange }) {
  if (noteAuthor === author) return null;

  const mine = reactions.find((r) => r.note_id === noteId && r.author === author);

  async function toggle(emoji) {
    if (mine?.emoji === emoji) {
      await api.unreactNote(noteId, author);
    } else {
      await api.reactToNote(noteId, emoji, author);
    }
    onChange?.();
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {REACTIONS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`rounded-full px-3 py-1 text-lg transition ${mine?.emoji === key ? 'bg-accent/30 ring-1 ring-accent' : 'bg-white/5 hover:bg-white/10'}`}
          onClick={() => toggle(key)}
          title={`React ${label}`}
        >
          {label}
        </button>
      ))}
      {reactions.filter((r) => r.note_id === noteId && r.author !== author).map((r) => (
        <span key={`${r.author}-${r.emoji}`} className="text-sm text-muted">
          {REACTIONS.find((x) => x.key === r.emoji)?.label || r.emoji} from {r.author}
        </span>
      ))}
    </div>
  );
}

export default function AnniversaryChain({ capsuleOps, onRefresh }) {
  const { toast } = useToast();
  const { author, needsSetup } = usePostingAuthor();
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const load = useCallback(() => {
    api.getAnniversaryChain().then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data?.anniversary_date) return null;

  const nextYear = (data.capsules?.length || 0) + 1;

  function unlockDateForYear(yearIndex) {
    const ad = new Date(`${data.anniversary_date}T12:00:00`);
    const unlockYear = ad.getFullYear() + yearIndex;
    const m = String(ad.getMonth() + 1).padStart(2, '0');
    const d = String(ad.getDate()).padStart(2, '0');
    return `${unlockYear}-${m}-${d}`;
  }

  async function dismissReminder() {
    if (!author) return;
    await api.updatePhase2Prefs({ actor: author, dismiss_anniversary_reminder: true });
    load();
  }

  async function sealLetter(e) {
    e.preventDefault();
    if (needsSetup) return toast('Set who you are in Settings first', 'error');
    if (!form.title.trim() || !form.content.trim()) return toast('Fill title and letter', 'error');
    try {
      await capsuleOps.create({
        title: form.title,
        content: form.content,
        unlock_date: unlockDateForYear(nextYear),
        author,
        capsule_type: 'anniversary',
        year_index: nextYear,
      });
      toast(`Year ${nextYear} letter sealed`, 'success');
      setShowForm(false);
      setForm({ title: '', content: '' });
      load();
      onRefresh?.();
    } catch (err) {
      toast(err.message || 'Could not seal letter', 'error');
    }
  }

  return (
    <Card highlight className="mb-8 border-gold/20">
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Calendar size={22} className="text-gold" /> Anniversary chain
      </h2>
      <p className="mt-2 text-sm text-muted">
        One sealed letter per year — unlocks on {data.anniversary_date.slice(5).replace('-', '/')} each anniversary.
      </p>

      {data.show_reminder && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
          <p className="text-sm">Anniversary coming up — seal year {nextYear}?</p>
          <Button size="sm" variant="primary" onClick={() => setShowForm(true)}>Seal letter</Button>
          <Button size="sm" variant="ghost" onClick={dismissReminder}>Dismiss</Button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(data.capsules || []).map((c) => (
          <span
            key={c.id}
            className={`rounded-full px-3 py-1 text-xs ${c.is_opened ? 'bg-emerald-500/20' : c.is_locked ? 'bg-white/10' : 'bg-gold/20'}`}
          >
            Year {c.year_index} {c.is_opened ? '· opened' : c.is_locked ? '· sealed' : '· ready'}
          </span>
        ))}
        {!data.capsules?.length && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Seal year 1
          </Button>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={`Seal year ${nextYear} letter`}>
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={`Our ${nextYear}${nextYear === 1 ? 'st' : nextYear === 2 ? 'nd' : nextYear === 3 ? 'rd' : 'th'} anniversary`} />
        <TextArea label="Letter" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-4" />
        <p className="mt-2 text-xs text-muted">Unlocks {unlockDateForYear(nextYear)}</p>
        <Button className="mt-4" variant="primary" onClick={sealLetter}>Seal for year {nextYear}</Button>
      </Modal>
    </Card>
  );
}
