import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Pencil, Camera, CheckSquare } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Input, TextArea, Select } from '../components/ui/Input';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { buildDreamMemoryParams } from '../utils/insights';

const empty = {
  title: '',
  location: '',
  category: 'Trip',
  priority: 'Medium',
  target_year: '',
  notes: '',
  status: 'Wishlist',
  budget: '',
  checklist: [],
};

export default function Someday() {
  const navigate = useNavigate();
  const { dreams, dreamOps, insights } = useData();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);
  const [checkItem, setCheckItem] = useState('');

  function openEdit(d) {
    setEditingId(d.id);
    setForm({
      ...d,
      target_year: d.target_year || '',
      budget: d.budget || '',
      checklist: d.checklist || [],
    });
    setShowForm(true);
  }

  function reset() {
    setForm(empty);
    setEditingId(null);
  }

  async function save() {
    if (!form.title.trim()) return toast('Enter a dream title', 'error');
    try {
      if (editingId) await dreamOps.update(editingId, form);
      else await dreamOps.create(form);
      toast(editingId ? 'Dream updated' : 'Dream added', 'success');
      setShowForm(false);
      reset();
    } catch {
      toast('Save failed', 'error');
    }
  }

  function addCheckItem() {
    if (!checkItem.trim()) return;
    setForm((f) => ({
      ...f,
      checklist: [...(f.checklist || []), { id: Date.now(), text: checkItem, done: false }],
    }));
    setCheckItem('');
  }

  function toggleCheck(id) {
    setForm((f) => ({
      ...f,
      checklist: f.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    }));
  }

  return (
    <PageShell title="✨ Someday" subtitle="The future — plan trips with budgets and checklists, then log them as Moments when done.">
      <SectionHint>
        <strong>{insights.bucket_progress}%</strong> of your bucket list is complete.
        Use checklists for practical planning; use <strong>Log as memory</strong> when the dream becomes real.
      </SectionHint>

      <Button variant="primary" className="mb-8" onClick={() => { reset(); setShowForm(true); }}>
        <Plus size={18} /> Add Dream
      </Button>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dreams.map((dream) => {
          const checklist = dream.checklist || [];
          const doneCount = checklist.filter((c) => c.done).length;
          return (
            <Card key={dream.id}>
              <Badge tone={dream.status === 'Completed' ? 'success' : dream.status === 'Planned' ? 'accent' : 'default'}>
                {dream.status}
              </Badge>
              <h2 className="mt-3 font-display text-xl">{dream.title}</h2>
              <p className="mt-2 flex items-center gap-1 text-muted"><MapPin size={14} /> {dream.location || 'Anywhere'}</p>
              <p className="text-sm text-muted">🏷 {dream.category} · 🔥 {dream.priority}</p>
              {dream.budget && <p className="text-sm text-muted">💰 Budget: {dream.budget}</p>}
              <p className="text-sm text-muted">📅 {dream.target_year || 'Someday'}</p>
              {checklist.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  <CheckSquare size={12} className="inline" /> {doneCount}/{checklist.length} packed/planned
                </p>
              )}
              {dream.notes && <p className="mt-3 text-sm text-muted">{dream.notes}</p>}

              {checklist.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {checklist.slice(0, 4).map((c) => (
                    <li key={c.id} className={c.done ? 'text-muted line-through' : ''}>• {c.text}</li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {['Wishlist', 'Planned', 'Completed'].map((s) => (
                  <Button key={s} size="sm" variant={dream.status === s ? 'primary' : 'secondary'} onClick={() => dreamOps.update(dream.id, { ...dream, status: s })}>
                    {s}
                  </Button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openEdit(dream)}><Pencil size={14} /> Edit</Button>
                {dream.status !== 'Completed' && (
                  <>
                    <Button size="sm" onClick={() => dreamOps.promote(dream.id)}>Promote to map</Button>
                    <Button size="sm" variant="primary" onClick={() => navigate(buildDreamMemoryParams(dream))}>
                      <Camera size={14} /> Log as memory
                    </Button>
                  </>
                )}
                <Button size="sm" variant="danger" onClick={() => dreamOps.remove(dream.id)}>Delete</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); reset(); }} title={editingId ? 'Edit Dream' : 'Add Dream'} wide>
        <Input label="Dream title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <Input label="Budget estimate" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="e.g. ₹80,000 or $2,000" />
        <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {['Trip', 'Food', 'Experience', 'Home', 'Festival', 'Adventure', 'Other'].map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {['Low', 'Medium', 'High', 'Must Do'].map((p) => <option key={p}>{p}</option>)}
        </Select>
        <Input label="Target year" value={form.target_year} onChange={(e) => setForm({ ...form, target_year: e.target.value })} />
        <TextArea label="Why this matters" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">Trip checklist (passports, bookings…)</p>
          <div className="flex gap-2">
            <Input value={checkItem} onChange={(e) => setCheckItem(e.target.value)} placeholder="Add item" />
            <Button onClick={addCheckItem}>Add</Button>
          </div>
          <ul className="mt-3 space-y-2">
            {(form.checklist || []).map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c.id)} />
                  {c.text}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="primary" onClick={save}>Save</Button>
          <Button onClick={() => { setShowForm(false); reset(); }}>Cancel</Button>
        </div>
      </Modal>
    </PageShell>
  );
}
