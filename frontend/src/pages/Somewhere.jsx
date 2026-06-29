import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import LocationSearch from '../components/LocationSearch';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';
import { Input, TextArea } from '../components/ui/Input';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function Somewhere() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { mapLocations, pinOps } = useData();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ date: '', occasion: '', notes: '' });
  const [viewMode, setViewMode] = useState('pins');
  const pinId = params.get('pin');
  const linkedHighlightPinId = useMemo(() => {
    if (!pinId || !mapLocations.length) return null;
    return mapLocations.some((l) => String(l.pinId) === pinId) ? Number(pinId) : null;
  }, [pinId, mapLocations]);
  const effectiveViewMode = linkedHighlightPinId != null ? 'pins' : viewMode;

  useEffect(() => {
    if (linkedHighlightPinId == null) return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`map-pin-${linkedHighlightPinId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [linkedHighlightPinId]);

  const routePoints = useMemo(
    () =>
      [...mapLocations]
        .filter((l) => l.lat && l.lng)
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
        .map((l) => [l.lat, l.lng]),
    [mapLocations]
  );

  const heatCounts = useMemo(() => {
    const grid = {};
    mapLocations.forEach((l) => {
      const key = `${l.lat?.toFixed(1)},${l.lng?.toFixed(1)}`;
      grid[key] = (grid[key] || 0) + (l.memories?.length || 1);
    });
    return Object.entries(grid).map(([key, count]) => {
      const [lat, lng] = key.split(',').map(Number);
      return { lat, lng, count };
    });
  }, [mapLocations]);

  async function savePin() {
    if (!selected?.lat) return toast('Select a location first', 'error');
    try {
      await pinOps.create({
        title: selected.title,
        lat: selected.lat,
        lng: selected.lng,
        date: form.date,
        occasion: form.occasion,
        notes: form.notes,
      });
      toast('Trip pin added', 'success');
      setShowForm(false);
      setQuery('');
      setSelected(null);
      setForm({ date: '', occasion: '', notes: '' });
    } catch {
      toast('Could not save pin', 'error');
    }
  }

  async function deletePinOnly(pinId) {
    if (!pinId) {
      toast('This pin comes from a memory — edit it in Moments', 'error');
      return;
    }
    if (!window.confirm('Remove this trip pin?')) return;
    await pinOps.remove(pinId);
    toast('Pin removed', 'success');
  }

  return (
    <PageShell
      title="🗺 Somewhere"
      subtitle="The map — where our story lives in space. Memories appear automatically; add trip pins for visits and plans."
    >
      <SectionHint>
        <strong>Somewhere</strong> is read-only for memories (they come from Moments). Add{' '}
        <em>trip pins</em> for standalone places or upcoming visits. To log a past experience with
        photos, use Moments instead.
      </SectionHint>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant={viewMode === 'pins' ? 'primary' : 'secondary'} onClick={() => setViewMode('pins')}>
          Pins
        </Button>
        <Button size="sm" variant={viewMode === 'route' ? 'primary' : 'secondary'} onClick={() => setViewMode('route')}>
          Route
        </Button>
        <Button size="sm" variant={viewMode === 'heat' ? 'primary' : 'secondary'} onClick={() => setViewMode('heat')}>
          Heat map
        </Button>
      </div>

      <Button variant="primary" className="mb-6" onClick={() => setShowForm(true)}>
        <Plus size={18} /> Add Trip Pin
      </Button>

      <div className="overflow-hidden rounded-3xl shadow-2xl shadow-black/50">
        <MapContainer center={[22.59, 78.96]} zoom={4} className="h-[55vh] min-h-[320px] w-full md:h-[70vh]">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {effectiveViewMode === 'route' && routePoints.length > 1 && (
            <Polyline positions={routePoints} pathOptions={{ color: '#ff4d6d', weight: 3, opacity: 0.7 }} />
          )}
          {effectiveViewMode === 'heat' &&
            heatCounts.map((h) => (
              <CircleMarker
                key={`${h.lat}-${h.lng}`}
                center={[h.lat, h.lng]}
                radius={8 + h.count * 4}
                pathOptions={{ color: '#ff4d6d', fillColor: '#ff4d6d', fillOpacity: 0.35 }}
              />
            ))}
          {(effectiveViewMode === 'pins' || effectiveViewMode === 'route') &&
            mapLocations.map((loc) => (
            <Marker
              key={loc.key}
              position={[loc.lat, loc.lng]}
              eventHandlers={
                linkedHighlightPinId && loc.pinId === linkedHighlightPinId
                  ? { add: (e) => { e.target.openPopup(); } }
                  : undefined
              }
            >
              <Popup>
                <strong>{loc.title?.split(',')[0]}</strong>
                <br />
                📸 {loc.memories.length} memor{loc.memories.length === 1 ? 'y' : 'ies'}
                {loc.pinNotes && (
                  <>
                    <br />💭 {loc.pinNotes}
                  </>
                )}
                {loc.memories.map((m) => (
                  <div key={m.id} className="mt-2 text-sm">
                    📸 {m.title}
                  </div>
                ))}
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    className="rounded-lg bg-white/10 px-3 py-1 text-sm"
                    onClick={() => navigate('/moments')}
                  >
                    Open Moments
                  </button>
                  {loc.pinId && (
                    <button
                      className="rounded-lg bg-red-900/40 px-3 py-1 text-sm"
                      onClick={() => deletePinOnly(loc.pinId)}
                    >
                      Remove pin
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <h2 className="mt-10 font-display text-2xl">Places on our map</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mapLocations.map((loc) => (
          <Card
            key={loc.key}
            id={loc.pinId ? `map-pin-${loc.pinId}` : undefined}
            className={loc.pinId === linkedHighlightPinId ? 'ring-2 ring-accent' : ''}
          >
            <h3 className="font-display text-xl">{loc.title?.split(',')[0]}</h3>
            <p className="mt-1 text-sm text-muted">
              {loc.memories.length} memories
              {loc.isTripPin && ' · trip pin'}
            </p>
            {loc.memories.slice(0, 2).map((m) => (
              <p key={m.id} className="mt-2 text-sm text-muted">
                • {m.title}
              </p>
            ))}
            <Button
              size="sm"
              className="mt-4"
              onClick={() => navigate(loc.memories.length ? '/moments' : '/moments?new=1')}
            >
              <ExternalLink size={14} />
              {loc.memories.length ? 'View memories' : 'Add memory here'}
            </Button>
            {loc.pinId && (
              <Button size="sm" variant="danger" className="mt-2" onClick={() => deletePinOnly(loc.pinId)}>
                <Trash2 size={14} /> Remove pin
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Trip Pin">
        <LocationSearch
          value={query}
          onChange={setQuery}
          onSelect={setSelected}
          label="Where are we going (or went)?"
        />
        <Input type="date" label="Date (optional)" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input label="Occasion" value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} />
        <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="mt-6 flex gap-3">
          <Button variant="primary" onClick={savePin}>Save pin</Button>
          <Button onClick={() => setShowForm(false)}>Cancel</Button>
        </div>
      </Modal>
    </PageShell>
  );
}
