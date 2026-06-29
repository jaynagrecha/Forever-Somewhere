import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, Unlock, Heart, Plus, Clock, StickyNote, Mic, Video } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Input, TextArea, Select } from '../components/ui/Input';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useAuthorOptions, usePartnerPicker } from '../context/AuthContext';
import { MOOD_OPTIONS } from '../utils/constants';
import { api } from '../api/client';
import { resolveMediaUrl } from '../utils/media';

const emptyCapsule = { title: '', content: '', unlock_date: '', author: 'Us', media_url: '', media_type: '' };
const emptyNote = { content: '', author: 'Us', mood: '', voice_url: '', letter_template: '', reveal_date: '' };

const LETTER_TEMPLATES = {
  '': 'Free write',
  'open-when-sad': 'Open when you feel sad…',
  'open-when-miss': 'Open when you miss me…',
  'gratitude': 'Three things I love about you…',
  'future-us': 'Dear future us…',
};

export default function Forever() {
  const { capsules, capsuleOps, loveNotes, noteOps, online } = useData();
  const { toast } = useToast();
  const authorOptions = useAuthorOptions();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'notes' ? 'notes' : 'capsules');

  const [showCapsuleForm, setShowCapsuleForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(params.get('tab') === 'notes');
  const [capsuleForm, setCapsuleForm] = useState(emptyCapsule);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [opened, setOpened] = useState(null);

  async function saveCapsule() {
    if (!capsuleForm.title.trim() || !capsuleForm.unlock_date) {
      return toast('Fill title and unlock date', 'error');
    }
    if (!capsuleForm.content.trim() && !capsuleForm.media_url) {
      return toast('Add a letter or voice/video message', 'error');
    }
    try {
      await capsuleOps.create(capsuleForm);
      toast('Time capsule sealed', 'success');
      setShowCapsuleForm(false);
      setCapsuleForm(emptyCapsule);
    } catch {
      toast('Could not seal capsule', 'error');
    }
  }

  async function handleNoteVoice(e) {
    const file = e.target.files?.[0];
    if (!file || !online) return toast('Connect to upload voice', 'error');
    try {
      const uploaded = await api.uploadCapsuleMedia(file);
      setNoteForm((f) => ({ ...f, voice_url: uploaded.url }));
      toast('Voice attached', 'success');
    } catch {
      toast('Upload failed', 'error');
    }
  }

  function applyTemplate(key) {
    const starters = {
      'open-when-sad': 'Open when you feel sad,\n\nI want you to know…',
      'open-when-miss': 'Open when you miss me,\n\nRight now I am thinking…',
      gratitude: 'Three things I love about you:\n1.\n2.\n3.',
      'future-us': 'Dear future us,\n\nLooking back from…',
    };
    setNoteForm((f) => ({
      ...f,
      letter_template: key,
      content: starters[key] || f.content,
    }));
  }

  async function handleMediaUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (online) {
        const uploaded = await api.uploadCapsuleMedia(file);
        setCapsuleForm((f) => ({
          ...f,
          media_url: uploaded.url,
          media_type: uploaded.media_type,
        }));
        toast('Media attached', 'success');
      } else {
        toast('Connect to server to upload voice/video', 'error');
      }
    } catch {
      toast('Upload failed', 'error');
    }
  }

  function MediaPlayer({ url, type }) {
    const src = resolveMediaUrl(url);
    if (!src) return null;
    if (type === 'audio') return <audio controls className="mt-4 w-full" src={src} />;
    if (type === 'video') return <video controls className="mt-4 max-h-64 w-full rounded-xl" src={src} />;
    return null;
  }

  async function saveNote() {
    if (!noteForm.content.trim()) return toast('Write something', 'error');
    try {
      await noteOps.create(noteForm);
      toast('Love note saved', 'success');
      setShowNoteForm(false);
      setNoteForm(emptyNote);
    } catch {
      toast('Save failed', 'error');
    }
  }

  async function openCapsule(c) {
    if (c.is_locked) return toast(`Unlocks in ${c.days_until_unlock} days`, 'error');
    try {
      const result = await capsuleOps.open(c.id);
      setOpened(result);
      toast('Capsule opened', 'success');
    } catch (e) {
      toast(e.message || 'Still locked', 'error');
    }
  }

  const locked = capsules.filter((c) => c.is_locked);
  const ready = capsules.filter((c) => !c.is_locked && !c.is_opened);
  const openedList = capsules.filter((c) => c.is_opened);

  return (
    <PageShell title="💌 Forever" subtitle="Sealed capsules for the future — and love notes for right now.">
      <SectionHint>
        <strong>Capsules</strong> unlock on a date. <strong>Love notes</strong> are instant — a quick "thinking of you" any day.
      </SectionHint>

      <div className="mb-8 flex gap-2">
        <Button variant={tab === 'capsules' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('capsules')}>
          <Lock size={14} /> Time capsules
        </Button>
        <Button variant={tab === 'notes' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('notes')}>
          <StickyNote size={14} /> Love notes
        </Button>
      </div>

      {tab === 'capsules' && (
        <>
          <Button variant="primary" className="mb-8" onClick={() => setShowCapsuleForm(true)}>
            <Plus size={18} /> Seal a letter
          </Button>

          {locked.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl"><Lock size={20} /> Sealed ({locked.length})</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {locked.map((c) => (
                  <Card key={c.id} className="border-accent/20">
                    <Badge tone="accent">Sealed</Badge>
                    <h3 className="mt-3 font-display text-xl">{c.title}</h3>
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <Clock size={14} /> Unlocks {c.unlock_date}
                      {c.days_until_unlock != null && ` · ${c.days_until_unlock} days left`}
                    </p>
                    <Button size="sm" variant="danger" className="mt-3" onClick={() => capsuleOps.remove(c.id)}>
                      Delete
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {ready.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl text-gold"><Unlock size={20} /> Ready ({ready.length})</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {ready.map((c) => (
                  <Card key={c.id} highlight>
                    <Badge tone="gold">Ready!</Badge>
                    <h3 className="mt-3 font-display text-xl">{c.title}</h3>
                    <Button variant="primary" size="sm" className="mt-4" onClick={() => openCapsule(c)}>
                      <Unlock size={14} /> Open
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {openedList.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl">Opened letters</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {openedList.map((c) => (
                  <Card key={c.id}>
                    <h3 className="font-display text-xl">{c.title}</h3>
                    <p className="mt-3 whitespace-pre-wrap">{c.content}</p>
                    <MediaPlayer url={c.media_url} type={c.media_type} />
                    <p className="mt-4 text-sm text-muted">— {c.author}</p>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {tab === 'notes' && (
        <>
          <Button variant="primary" className="mb-8" onClick={() => setShowNoteForm(true)}>
            <Heart size={18} /> Write love note
          </Button>

          {loveNotes.length === 0 && (
            <Card className="text-center">
              <p className="text-muted">Quick notes for today — no unlock date needed.</p>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {loveNotes.map((n) => (
              <Card key={n.id} className="border-accent/10">
                {n.mood && <Badge tone="accent">{n.mood}</Badge>}
                {n.letter_template && (
                  <p className="mt-2 text-xs text-muted">{LETTER_TEMPLATES[n.letter_template] || n.letter_template}</p>
                )}
                <p className="mt-3 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                {n.voice_url && <audio controls className="mt-3 w-full" src={resolveMediaUrl(n.voice_url)} />}
                <p className="mt-4 text-sm text-muted">— {n.author}</p>
                <Button size="sm" variant="danger" className="mt-3" onClick={() => noteOps.remove(n.id)}>Delete</Button>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal open={showCapsuleForm} onClose={() => setShowCapsuleForm(false)} title="Seal a time capsule">
        <Input label="Title" value={capsuleForm.title} onChange={(e) => setCapsuleForm({ ...capsuleForm, title: e.target.value })} />
        <Select label="From" value={capsuleForm.author} onChange={(e) => setCapsuleForm({ ...capsuleForm, author: e.target.value })}>
          {authorOptions.map((a) => <option key={a}>{a}</option>)}
        </Select>
        <Input label="Unlock on" type="date" value={capsuleForm.unlock_date} onChange={(e) => setCapsuleForm({ ...capsuleForm, unlock_date: e.target.value })} />
        <TextArea label="Your letter (optional if you add media)" value={capsuleForm.content} onChange={(e) => setCapsuleForm({ ...capsuleForm, content: e.target.value })} />
        <label className="mt-4 block text-sm text-muted">
          <Mic size={14} className="inline" /> Voice or <Video size={14} className="inline" /> video message
          <input type="file" accept="audio/*,video/*" className="mt-2 block w-full text-sm" onChange={handleMediaUpload} />
        </label>
        {capsuleForm.media_url && (
          <p className="mt-2 text-sm text-emerald-300">Media attached ({capsuleForm.media_type})</p>
        )}
        <div className="mt-6 flex gap-3">
          <Button variant="primary" onClick={saveCapsule}><Lock size={16} /> Seal</Button>
          <Button onClick={() => setShowCapsuleForm(false)}>Cancel</Button>
        </div>
      </Modal>

      <Modal open={showNoteForm} onClose={() => setShowNoteForm(false)} title="Love note">
        <Select label="From" value={noteForm.author} onChange={(e) => setNoteForm({ ...noteForm, author: e.target.value })}>
          {authorOptions.map((a) => <option key={a}>{a}</option>)}
        </Select>
        <Select label="Letter template" value={noteForm.letter_template} onChange={(e) => applyTemplate(e.target.value)}>
          {Object.entries(LETTER_TEMPLATES).map(([k, v]) => (
            <option key={k || 'free'} value={k}>{v}</option>
          ))}
        </Select>
        <Select label="Mood" value={noteForm.mood} onChange={(e) => setNoteForm({ ...noteForm, mood: e.target.value })}>
          <option value="">—</option>
          {MOOD_OPTIONS.map((m) => <option key={m}>{m}</option>)}
        </Select>
        <Input
          label="Reveal on (optional — scheduled note)"
          type="date"
          value={noteForm.reveal_date}
          onChange={(e) => setNoteForm({ ...noteForm, reveal_date: e.target.value })}
        />
        <TextArea label="Note" value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} placeholder="Thinking of you today because…" />
        <label className="mt-4 block text-sm text-muted">
          <Mic size={14} className="inline" /> Voice note
          <input type="file" accept="audio/*" className="mt-2 block w-full text-sm" onChange={handleNoteVoice} />
        </label>
        <div className="mt-6 flex gap-3">
          <Button variant="primary" onClick={saveNote}>Save note</Button>
          <Button onClick={() => setShowNoteForm(false)}>Cancel</Button>
        </div>
      </Modal>

      <Modal open={!!opened} onClose={() => setOpened(null)} title="💌 A letter from the past" wide>
        {opened && (
          <>
            <h3 className="font-display text-3xl">{opened.title}</h3>
            <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed">{opened.content}</p>
            <MediaPlayer url={opened.media_url} type={opened.media_type} />
            <p className="mt-6 text-muted">— {opened.author}</p>
          </>
        )}
      </Modal>
    </PageShell>
  );
}
