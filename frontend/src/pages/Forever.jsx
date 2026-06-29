import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, Heart, Plus, StickyNote, Mic, Video, Feather } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import CapsuleWall from '../components/CapsuleWall';
import { Input, TextArea, Select } from '../components/ui/Input';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { usePostingAuthor } from '../context/AuthContext';
import PostingAs from '../components/PostingAs';
import { canManageByAuthor } from '../utils/author';
import { MOOD_OPTIONS } from '../utils/constants';
import { api, formatApiError } from '../api/client';
import { resolveMediaUrl } from '../utils/media';
import { romanceUnlock } from '../utils/romanceSounds';

const buildEmptyCapsule = (author) => ({ title: '', content: '', unlock_date: '', author, media_url: '', media_type: '' });
const buildEmptyNote = (author) => ({ content: '', author, mood: '', voice_url: '', letter_template: '' });

const LETTER_TEMPLATES = {
  '': 'Free write',
  'open-when-sad': 'Open when you feel sad…',
  'open-when-miss': 'Open when you miss me…',
  gratitude: 'Three things I love about you…',
  'future-us': 'Dear future us…',
};

function CapsuleMediaPlayer({ url, type }) {
  const src = resolveMediaUrl(url);
  if (!src) return null;
  if (type === 'audio') return <audio controls className="mt-4 w-full" src={src} />;
  if (type === 'video') return <video controls className="mt-4 max-h-64 w-full rounded-xl" src={src} />;
  return null;
}

export default function Forever() {
  const { capsules, capsuleOps, loveNotes, noteOps, online } = useData();
  const { toast } = useToast();
  const { author: actor, needsSetup } = usePostingAuthor();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'notes' ? 'notes' : 'capsules');

  const [showCapsuleForm, setShowCapsuleForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(
    params.get('tab') === 'notes' && params.get('new') === '1'
  );
  const [capsuleForm, setCapsuleForm] = useState(() => buildEmptyCapsule(actor));
  const [noteForm, setNoteForm] = useState(() => buildEmptyNote(actor));
  const [opened, setOpened] = useState(null);
  const [moodPrompts, setMoodPrompts] = useState([]);
  const deepLinkHandled = useRef('');

  const openCapsule = useCallback(
    async (c) => {
      if (c.is_locked) return toast(`Unlocks in ${c.days_until_unlock} days`, 'error');
      try {
        const result = await capsuleOps.open(c.id);
        romanceUnlock();
        setOpened(result);
        toast('Capsule opened', 'success');
      } catch (e) {
        toast(e.message || 'Still locked', 'error');
      }
    },
    [capsuleOps, toast]
  );

  useEffect(() => {
    if (!noteForm.mood) return undefined;
    let active = true;
    api
      .getLetterPrompts(noteForm.mood)
      .then((d) => {
        if (active) setMoodPrompts(d.prompts || []);
      })
      .catch(() => {
        if (active) setMoodPrompts([]);
      });
    return () => {
      active = false;
    };
  }, [noteForm.mood]);

  const displayedMoodPrompts = noteForm.mood ? moodPrompts : [];

  const capsuleId = params.get('capsule');
  const linkedCapsuleTarget = useMemo(() => {
    if (!capsuleId || !capsules.length) return null;
    const capsule = capsules.find((x) => String(x.id) === capsuleId);
    return capsule || null;
  }, [capsuleId, capsules]);

  const noteId = params.get('note');
  const linkedNoteTarget = useMemo(() => {
    if (!noteId || !loveNotes.length) return null;
    return loveNotes.find((x) => String(x.id) === noteId) || null;
  }, [noteId, loveNotes]);

  const effectiveTab = linkedCapsuleTarget ? 'capsules' : linkedNoteTarget ? 'notes' : tab;
  const effectiveHighlightCapsuleId = linkedCapsuleTarget?.id ?? null;
  const effectiveHighlightNoteId = linkedNoteTarget?.id ?? null;

  useEffect(() => {
    if (!linkedCapsuleTarget) return undefined;
    const sig = `capsule:${linkedCapsuleTarget.id}`;
    if (deepLinkHandled.current === sig) return undefined;
    deepLinkHandled.current = sig;
    queueMicrotask(() => {
      if (linkedCapsuleTarget.is_opened) setOpened(linkedCapsuleTarget);
      else if (!linkedCapsuleTarget.is_locked) void openCapsule(linkedCapsuleTarget);
    });
    const frame = requestAnimationFrame(() => {
      document.getElementById(`capsule-${linkedCapsuleTarget.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [linkedCapsuleTarget, openCapsule]);

  useEffect(() => {
    if (!linkedNoteTarget) return undefined;
    const sig = `note:${linkedNoteTarget.id}`;
    if (deepLinkHandled.current === sig) return undefined;
    deepLinkHandled.current = sig;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`note-${linkedNoteTarget.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [linkedNoteTarget]);

  async function saveCapsule() {
    if (needsSetup) return toast('Set who you are in Settings first', 'error');
    if (!capsuleForm.title.trim() || !capsuleForm.unlock_date) {
      return toast('Fill title and unlock date', 'error');
    }
    if (!capsuleForm.content.trim() && !capsuleForm.media_url) {
      return toast('Add a letter or voice/video message', 'error');
    }
    try {
      await capsuleOps.create({ ...capsuleForm, author: capsuleForm.author || actor });
      toast('Time capsule sealed', 'success');
      setShowCapsuleForm(false);
      setCapsuleForm(buildEmptyCapsule(actor));
    } catch (err) {
      toast(formatApiError(err), 'error');
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

  function applyMoodPrompt(prompt) {
    setNoteForm((f) => ({
      ...f,
      content: prompt.starter || prompt.prompt,
      letter_template: '',
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

  async function saveNote() {
    if (needsSetup) return toast('Set who you are in Settings first', 'error');
    if (!noteForm.content.trim()) return toast('Write something', 'error');
    try {
      await noteOps.create({ ...noteForm, author: noteForm.author || actor });
      toast('Love note saved', 'success');
      setShowNoteForm(false);
      setNoteForm(buildEmptyNote(actor));
    } catch (err) {
      toast(formatApiError(err), 'error');
    }
  }

  const locked = capsules.filter((c) => c.is_locked);
  const ready = capsules.filter((c) => !c.is_locked && !c.is_opened);
  const openedList = capsules.filter((c) => c.is_opened);

  return (
    <PageShell title="💌 Forever" subtitle="Sealed capsules for the future — and love notes for right now.">
      <SectionHint>
        <strong>Capsules</strong> unlock on a date. <strong>Love notes</strong> are instant — pick a mood for letter prompts.
      </SectionHint>

      <div className="mb-8 flex gap-2">
        <Button variant={effectiveTab === 'capsules' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('capsules')}>
          <Lock size={14} /> Time capsules
        </Button>
        <Button variant={effectiveTab === 'notes' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('notes')}>
          <StickyNote size={14} /> Love notes
        </Button>
      </div>

      {effectiveTab === 'capsules' && (
        <>
          <Button variant="primary" className="mb-8" onClick={() => setShowCapsuleForm(true)}>
            <Plus size={18} /> Seal a letter
          </Button>

          <CapsuleWall
            locked={locked}
            ready={ready}
            opened={openedList}
            highlightId={effectiveHighlightCapsuleId}
            onOpen={openCapsule}
            onDelete={(id) => capsuleOps.remove(id, actor)}
            canDelete={(c) => canManageByAuthor(c, actor)}
          />

          {openedList.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl">Opened letters</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {openedList.map((c) => (
                  <Card key={c.id}>
                    <h3 className="font-display text-xl">{c.title}</h3>
                    <p className="mt-3 whitespace-pre-wrap">{c.content}</p>
                    <CapsuleMediaPlayer url={c.media_url} type={c.media_type} />
                    <p className="mt-4 text-sm text-muted">— {c.author}</p>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {effectiveTab === 'notes' && (
        <>
          <Button variant="primary" className="mb-8" onClick={() => setShowNoteForm(true)}>
            <Heart size={18} /> Write love note
          </Button>

          {loveNotes.length === 0 && (
            <Card className="text-center">
              <p className="text-muted">Quick notes for today — choose a mood for guided letter prompts.</p>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {loveNotes.map((n) => (
              <Card
                key={n.id}
                id={`note-${n.id}`}
                className={`border-accent/10 ${effectiveHighlightNoteId === n.id ? 'ring-2 ring-accent' : ''}`}
              >
                {n.mood && <Badge tone="accent">{n.mood}</Badge>}
                {n.letter_template && (
                  <p className="mt-2 text-xs text-muted">{LETTER_TEMPLATES[n.letter_template] || n.letter_template}</p>
                )}
                <p className="mt-3 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                {n.voice_url && <audio controls className="mt-3 w-full" src={resolveMediaUrl(n.voice_url)} />}
                <p className="mt-4 text-sm text-muted">— {n.author}</p>
                {canManageByAuthor(n, actor) && (
                  <Button size="sm" variant="danger" className="mt-3" onClick={() => noteOps.remove(n.id, actor)}>Delete</Button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal open={showCapsuleForm} onClose={() => setShowCapsuleForm(false)} title="Seal a time capsule">
        <PostingAs />
        <Input label="Title" value={capsuleForm.title} onChange={(e) => setCapsuleForm({ ...capsuleForm, title: e.target.value })} />
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

      <Modal open={showNoteForm} onClose={() => setShowNoteForm(false)} title="Love note" wide>
        <PostingAs />
        <Select label="Letter template" value={noteForm.letter_template} onChange={(e) => applyTemplate(e.target.value)}>
          {Object.entries(LETTER_TEMPLATES).map(([k, v]) => (
            <option key={k || 'free'} value={k}>{v}</option>
          ))}
        </Select>
        <Select label="Mood — unlocks letter prompts" value={noteForm.mood} onChange={(e) => setNoteForm({ ...noteForm, mood: e.target.value })}>
          <option value="">—</option>
          {MOOD_OPTIONS.map((m) => <option key={m}>{m}</option>)}
        </Select>

        {displayedMoodPrompts.length > 0 && (
          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm text-accent-soft">
              <Feather size={14} /> Prompts for {noteForm.mood}
            </p>
            <div className="flex flex-wrap gap-2">
              {displayedMoodPrompts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition hover:border-accent/40"
                  onClick={() => applyMoodPrompt(p)}
                >
                  {p.prompt}
                </button>
              ))}
            </div>
          </div>
        )}

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
            <CapsuleMediaPlayer url={opened.media_url} type={opened.media_type} />
            <p className="mt-6 text-muted">— {opened.author}</p>
          </>
        )}
      </Modal>
    </PageShell>
  );
}
