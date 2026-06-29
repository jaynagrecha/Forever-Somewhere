import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import JSZip from 'jszip';
import { Shuffle, Plus, Filter } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import LocationSearch from '../components/LocationSearch';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, TextArea, Select } from '../components/ui/Input';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useAuthorOptions, usePartnerPicker } from '../context/AuthContext';
import { api } from '../api/client';
import { compressImage } from '../utils/compressImage';
import { resolveMediaUrl } from '../utils/media';
import { MEMORY_TAGS } from '../utils/constants';
import PolaroidMemory from '../components/PolaroidMemory';

const emptyForm = {
  title: '',
  date: '',
  occasion: '',
  mood: '',
  notes: '',
  photos: [],
  location: '',
  lat: null,
  lng: null,
  is_milestone: false,
  milestone_type: '💍 Engagement',
  playlist_url: '',
  tags: [],
  album_id: null,
  voice_url: '',
  before_photo: null,
  after_photo: null,
  added_by: '',
};

export default function Moments() {
  const { memories, memoryOps, dreamOps, online } = useData();
  const { toast } = useToast();
  const authorOptions = useAuthorOptions();
  const defaultAuthor = usePartnerPicker(0);
  const [params] = useSearchParams();

  const [showForm, setShowForm] = useState(params.get('new') === '1');
  const [editingId, setEditingId] = useState(null);
  const [linkedDreamId, setLinkedDreamId] = useState(params.get('dreamId'));
  const [surprise, setSurprise] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [locationQuery, setLocationQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [albums, setAlbums] = useState([]);
  const [albumFilter, setAlbumFilter] = useState('');
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [albumTitle, setAlbumTitle] = useState('');

  useEffect(() => {
    api.getAlbums().then(setAlbums).catch(() => setAlbums([]));
  }, [memories.length]);

  useEffect(() => {
    if (params.get('new') === '1' && params.get('title')) {
      setForm((f) => ({
        ...f,
        title: params.get('title') || '',
        occasion: params.get('occasion') || '',
        notes: params.get('notes') || '',
      }));
      setLocationQuery(params.get('location') || '');
      setShowForm(true);
    }
  }, [params]);

  const filtered = memories.filter((m) => {
    if (tagFilter && !(m.tags || []).includes(tagFilter)) return false;
    if (albumFilter && String(m.album_id) !== albumFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.date || '9999') - new Date(b.date || '9999')
  );

  function resetForm() {
    setForm({ ...emptyForm, added_by: defaultAuthor });
    setEditingId(null);
    setLinkedDreamId(null);
    setLocationQuery('');
  }

  function toggleTag(tag) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  function openEdit(m) {
    setEditingId(m.id);
    setForm({
      title: m.title,
      date: m.date || '',
      occasion: m.occasion || '',
      mood: m.mood || '',
      notes: m.notes || '',
      photos: m.photos || [],
      location: m.location || '',
      lat: m.lat,
      lng: m.lng,
      is_milestone: m.isMilestone || m.is_milestone,
      milestone_type: m.milestoneType || m.milestone_type || '💍 Engagement',
      playlist_url: m.playlist_url || '',
      tags: m.tags || [],
    });
    setLocationQuery(m.location || '');
    setShowForm(true);
  }

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        if (online) {
          const uploaded = await api.uploadPhoto(compressed);
          setForm((prev) => ({
            ...prev,
            photos: [...prev.photos, { id: uploaded.id, name: uploaded.name, url: uploaded.url }],
          }));
        } else {
          const reader = new FileReader();
          reader.onload = () => {
            setForm((prev) => ({
              ...prev,
              photos: [...prev.photos, { id: Date.now() + Math.random(), name: file.name, data: reader.result }],
            }));
          };
          reader.readAsDataURL(compressed);
        }
      } catch {
        toast('Could not add photo', 'error');
      }
    }
  }

  async function save() {
    if (!form.title.trim()) return toast('Enter a title', 'error');
    if (form.lat == null) return toast('Pick a location from suggestions', 'error');

    const payload = { ...form, is_milestone: form.is_milestone, milestone_type: form.milestone_type };
    try {
      if (editingId) await memoryOps.update(editingId, payload);
      else await memoryOps.create(payload);

      if (linkedDreamId) {
        await dreamOps.update(Number(linkedDreamId), { status: 'Completed' });
      }

      toast(editingId ? 'Memory updated' : 'Memory saved', 'success');
      setShowForm(false);
      resetForm();
    } catch {
      toast('Save failed', 'error');
    }
  }

  async function downloadZip(memory) {
    const zip = new JSZip();
    zip.file('memory.txt', `Title: ${memory.title}\nDate: ${memory.date}\nLocation: ${memory.location}\nNotes: ${memory.notes}`);
    const folder = zip.folder('photos');
    for (const p of memory.photos || []) {
      if (p.data) folder.file(p.name, p.data.split(',')[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${memory.title}.zip`;
    a.click();
  }

  async function createAlbum() {
    if (!albumTitle.trim()) return toast('Album title required', 'error');
    try {
      const a = await api.createAlbum({ title: albumTitle });
      setAlbums((prev) => [a, ...prev]);
      setAlbumTitle('');
      setShowAlbumForm(false);
      toast('Trip album created', 'success');
    } catch {
      toast('Could not create album', 'error');
    }
  }

  async function uploadSidePhoto(e, side) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      if (online) {
        const uploaded = await api.uploadPhoto(compressed);
        setForm((f) => ({
          ...f,
          [side]: { id: uploaded.id, name: uploaded.name, url: uploaded.url },
        }));
      }
    } catch {
      toast('Photo upload failed', 'error');
    }
  }

  function shareMemoryCard(memory) {
    const text = `${memory.title}\n${memory.date || ''} · ${memory.location || ''}\n\n— Forever, Somewhere`;
    if (navigator.share) {
      navigator.share({ title: memory.title, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast('Share text copied', 'success');
    }
  }
  function photoSrc(p) {
    return resolveMediaUrl(p.url) || p.data;
  }

  return (
    <PageShell title="📸 Moments" subtitle="The past — what already happened. Tag firsts, link playlists, build your timeline.">
      <SectionHint>
        Use <strong>tags</strong> like First Trip or Anniversary. Add a <strong>playlist</strong> that takes you back.
        Dreams marked complete from Someday land here automatically.
      </SectionHint>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-muted" />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm"
        >
          <option value="">All tags</option>
          {MEMORY_TAGS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={albumFilter}
          onChange={(e) => setAlbumFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm"
        >
          <option value="">All albums</option>
          {albums.map((a) => (
            <option key={a.id} value={String(a.id)}>{a.title}</option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={() => setShowAlbumForm(true)}>New trip album</Button>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={18} /> Add Memory
        </Button>
        <Button variant="secondary" onClick={() => {
          if (!memories.length) return toast('No memories yet', 'error');
          setSurprise(memories[Math.floor(Math.random() * memories.length)]);
        }}>
          <Shuffle size={18} /> Surprise Memory
        </Button>
      </div>

      <div className="mx-auto max-w-lg">
        {sorted.map((m) => (
          <PolaroidMemory
            key={m.id}
            memory={m}
            photoSrc={photoSrc}
            onEdit={openEdit}
            onShare={shareMemoryCard}
            onDelete={(id) => memoryOps.remove(id)}
            onDownload={downloadZip}
            onPreview={setPreview}
          />
        ))}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editingId ? 'Edit Memory' : 'Add Memory'} wide>
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <LocationSearch value={locationQuery} onChange={setLocationQuery} onSelect={(loc) => setForm({ ...form, location: loc.title, lat: loc.lat, lng: loc.lng })} />
        <Input label="Spotify / playlist URL" value={form.playlist_url} onChange={(e) => setForm({ ...form, playlist_url: e.target.value })} placeholder="https://open.spotify.com/..." />
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">Tags — firsts & milestones</p>
          <div className="flex flex-wrap gap-2">
            {MEMORY_TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-full px-3 py-1 text-xs ${form.tags.includes(tag) ? 'bg-accent text-white' : 'bg-white/10'}`}>
                {tag}
              </button>
            ))}
          </div>
        </div>
        <Select label="Trip album" value={form.album_id || ''} onChange={(e) => setForm({ ...form, album_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">None</option>
          {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </Select>
        <Select label="Added by" value={form.added_by || defaultAuthor} onChange={(e) => setForm({ ...form, added_by: e.target.value })}>
          {authorOptions.filter((a) => a !== 'Us').map((a) => <option key={a}>{a}</option>)}
        </Select>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-muted">Before photo<input type="file" accept="image/*" className="mt-2 block w-full" onChange={(e) => uploadSidePhoto(e, 'before_photo')} /></label>
          <label className="text-sm text-muted">After photo<input type="file" accept="image/*" className="mt-2 block w-full" onChange={(e) => uploadSidePhoto(e, 'after_photo')} /></label>
        </div>
        <Input label="Occasion" value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} />
        <Input label="Mood" value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })} />
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_milestone} onChange={(e) => setForm({ ...form, is_milestone: e.target.checked })} />
          Mark as milestone
        </label>
        {form.is_milestone && (
          <Select label="Milestone type" value={form.milestone_type} onChange={(e) => setForm({ ...form, milestone_type: e.target.value })}>
            <option>💍 Engagement</option>
            <option>✈️ First Trip</option>
            <option>🏠 First Home</option>
            <option>💒 Wedding</option>
            <option>❤️ Special Day</option>
          </Select>
        )}
        <label className="mt-4 block text-sm text-muted">
          Photos
          <input type="file" multiple accept="image/*" className="mt-2 block w-full text-sm" onChange={handlePhotos} />
        </label>
        <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="mt-6 flex gap-3">
          <Button variant="primary" onClick={save}>Save</Button>
          <Button onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
        </div>
      </Modal>

      <Modal open={showAlbumForm} onClose={() => setShowAlbumForm(false)} title="New trip album">
        <Input label="Album title" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} placeholder="Rajkot trip 2025" />
        <Button className="mt-4" variant="primary" onClick={createAlbum}>Create album</Button>
      </Modal>

      <Modal open={!!surprise} onClose={() => setSurprise(null)} title="🎞 Surprise Memory">
        {surprise && (
          <>
            <h3 className="font-display text-3xl">{surprise.title}</h3>
            <p className="mt-2 text-muted">{surprise.date} · {surprise.location?.split(',')[0]}</p>
            <p className="mt-4">{surprise.notes}</p>
          </>
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Photo" wide>
        {preview && <img src={photoSrc(preview)} alt="" className="mx-auto max-h-[70vh] rounded-2xl" />}
      </Modal>
    </PageShell>
  );
}
