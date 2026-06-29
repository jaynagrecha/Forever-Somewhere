import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ImagePlus, Loader2, Sparkles, Trash2 } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth, useMyName, usePartnerPicker } from '../context/AuthContext';
import { compressImage } from '../utils/compressImage';
import { resolveMediaUrl } from '../utils/media';
import SeasonColorPicker from '../components/SeasonColorPicker';
import { formatPeriodLabel, groupEntriesByPeriod, isCurrentPeriod } from '../utils/season';

const emptyForm = {
  title: '',
  description: '',
  color: '#ff4d6d',
  photo_url: '',
};

function SeasonCard({ entry, editable, onEdit, onDelete, deleting }) {
  return (
    <Card
      className="overflow-hidden break-inside-avoid transition hover:border-white/20"
      style={{ borderTopColor: entry.color, borderTopWidth: 4 }}
    >
      {entry.photo_url && (
        <img
          src={resolveMediaUrl(entry.photo_url)}
          alt=""
          className="mb-4 max-h-72 w-full rounded-xl object-cover"
        />
      )}
      <p className="text-xs uppercase tracking-widest text-muted">{entry.author}&apos;s mood</p>
      <h3 className="mt-1 font-display text-2xl leading-snug">{entry.title}</h3>
      {entry.description && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{entry.description}</p>
      )}
      {editable && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onEdit(entry)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(entry)} disabled={deleting}>
            <Trash2 size={14} /> Remove
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function MoodBoard() {
  const { toast } = useToast();
  const { partnerNames } = useAuth();
  const { myName, needsSetup } = useMyName();
  const defaultAuthor = usePartnerPicker(0);

  const [periodType, setPeriodType] = useState('week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const names = partnerNames.length >= 2 ? partnerNames : ['Partner 1', 'Partner 2'];
  const author = myName || defaultAuthor;

  function applyEntryToForm(entry) {
    if (!entry) {
      setEditingId(null);
      setForm(emptyForm);
      return;
    }
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      description: entry.description || '',
      color: entry.color || '#ff4d6d',
      photo_url: entry.photo_url || '',
    });
  }

  useEffect(() => {
    let active = true;
    api
      .getSeasons(periodType)
      .then((next) => {
        if (!active) return;
        setData(next);
        const mine = next.current?.find((e) => e.author === author) || null;
        applyEntryToForm(mine);
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        toast('Could not load our season', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [periodType, author, toast]);

  async function refreshSeasons() {
    const next = await api.getSeasons(periodType);
    setData(next);
    const mine = next.current?.find((e) => e.author === author) || null;
    applyEntryToForm(mine);
    return next;
  }

  const archiveGroups = useMemo(() => {
    if (!data?.entries?.length) return [];
    const past = data.entries.filter((e) => !isCurrentPeriod(e.period_start, data.current_period_start));
    return groupEntriesByPeriod(past, periodType);
  }, [data, periodType]);

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const uploaded = await api.uploadPhoto(compressed);
      setForm((f) => ({ ...f, photo_url: uploaded.url }));
      toast('Photo added', 'success');
    } catch {
      toast('Photo upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (needsSetup && !myName) {
      return toast('Set who you are in Settings first', 'error');
    }
    if (!form.title.trim()) return toast('Give this season a title', 'error');

    setSaving(true);
    try {
      await api.saveSeason({
        author,
        period_type: periodType,
        title: form.title.trim(),
        description: form.description.trim(),
        color: form.color,
        photo_url: form.photo_url,
      });
      toast(editingId ? 'Season updated' : 'Your mood is shared', 'success');
      await refreshSeasons();
    } catch (err) {
      toast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm('Remove your mood for this period?')) return;
    setDeletingId(entry.id);
    try {
      await api.deleteSeason(entry.id, author);
      toast('Removed', 'success');
      setForm(emptyForm);
      setEditingId(null);
      await refreshSeasons();
    } catch (err) {
      toast(err.message || 'Could not remove', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(entry) {
    applyEntryToForm(entry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const periodLabel = data?.current_period_start
    ? formatPeriodLabel(data.current_period_start, periodType)
    : periodType === 'month'
      ? 'This month'
      : 'This week';

  return (
    <PageShell
      title="🎨 Our season"
      subtitle="How we've felt — weekly or monthly. Title, colour, words, photos, memes — anything that captures your mood."
    >
      <SectionHint>
        Each of you can share one mood per week or month. Over time this becomes a timeline of your relationship chapters.
      </SectionHint>

      <div className="mb-8 flex flex-wrap gap-2">
        {['week', 'month'].map((type) => (
          <Button
            key={type}
            variant={periodType === type ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setLoading(true);
              setPeriodType(type);
            }}
          >
            <CalendarDays size={14} /> {type === 'week' ? 'Weekly' : 'Monthly'}
          </Button>
        ))}
      </div>

      <Card highlight className="mb-8 border-accent/25">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent-soft">Current {periodType}</p>
            <h2 className="font-display text-2xl">{periodLabel}</h2>
          </div>
          <Sparkles className="text-accent-soft/60" size={28} />
        </div>

        {loading ? (
          <p className="mt-6 flex items-center gap-2 text-muted">
            <Loader2 className="animate-spin" size={18} /> Loading…
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(data?.current?.length ? data.current : names.map((n) => ({ author: n, placeholder: true }))).map(
              (entry) =>
                entry.placeholder ? (
                  <Card key={entry.author} className="border-dashed border-white/15 bg-white/[0.02]">
                    <p className="text-xs uppercase tracking-widest text-muted">{entry.author}</p>
                    <p className="mt-2 text-sm text-muted">Hasn&apos;t shared yet</p>
                  </Card>
                ) : (
                  <SeasonCard
                    key={entry.id}
                    entry={entry}
                    editable={entry.author === author}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    deleting={deletingId === entry.id}
                  />
                )
            )}
          </div>
        )}
      </Card>

      <Card className="mb-10">
        <h2 className="font-display text-xl">
          {editingId ? 'Update your mood' : 'Share your mood'}
        </h2>
        <p className="mt-1 text-sm text-muted">
          You&apos;re posting as <span className="text-accent-soft">{author}</span>
          {needsSetup && !myName && ' — set who you are in Settings first'}
        </p>
        <p className="mt-2 text-sm text-muted">
          A title, a colour, and any photo — memory, selfie, meme, screenshot — that fits how you feel.
        </p>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          {(form.title.trim() || form.color) && (
            <div
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              style={{ borderTopColor: form.color, borderTopWidth: 4 }}
            >
              <div className="p-4">
                <p className="text-xs uppercase tracking-widest text-muted">Preview before you share</p>
                <p className="mt-1 font-display text-xl leading-snug">{form.title.trim() || 'Your title here'}</p>
                {form.description.trim() && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted">{form.description}</p>
                )}
              </div>
              {form.photo_url && (
                <img
                  src={resolveMediaUrl(form.photo_url)}
                  alt=""
                  className="max-h-40 w-full object-cover opacity-90"
                />
              )}
            </div>
          )}

          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Cozy chaos · Soft landing · Main character week"
          />
          <TextArea
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What this week/month has felt like for you…"
          />
          <SeasonColorPicker
            value={form.color}
            onChange={(color) => setForm((f) => ({ ...f, color }))}
          />
          <div>
            <span className="mb-2 block text-sm text-muted">Photo</span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:border-accent/30">
              <ImagePlus size={18} />
              {uploading ? 'Uploading…' : form.photo_url ? 'Change photo' : 'Upload photo or meme'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
            </label>
          </div>

          {form.photo_url && (
            <img
              src={resolveMediaUrl(form.photo_url)}
              alt=""
              className="max-h-64 rounded-2xl border border-white/10 object-cover"
            />
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving || uploading}>
              {saving ? 'Saving…' : editingId ? 'Update season' : 'Share mood'}
            </Button>
            {form.photo_url && (
              <Button type="button" variant="ghost" onClick={() => setForm((f) => ({ ...f, photo_url: '' }))}>
                Remove photo
              </Button>
            )}
          </div>
        </form>
      </Card>

      {archiveGroups.length > 0 && (
        <>
          <h2 className="mb-4 font-display text-xl">Past seasons</h2>
          <div className="space-y-10">
            {archiveGroups.map((group) => (
              <section key={group.period_start}>
                <p className="mb-4 text-sm uppercase tracking-widest text-accent-soft">{group.period_label}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {group.entries.map((entry) => (
                    <SeasonCard
                      key={entry.id}
                      entry={entry}
                      editable={entry.author === author}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                      deleting={deletingId === entry.id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
