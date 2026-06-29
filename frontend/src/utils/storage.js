import { LS_KEYS } from './constants';

export function readLocal(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function buildImportPayload() {
  const memories = readLocal(LS_KEYS.memories).map((m) => ({
    title: m.title,
    date: m.date || '',
    location: m.location || '',
    lat: m.lat ?? null,
    lng: m.lng ?? null,
    occasion: m.occasion || '',
    mood: m.mood || '',
    notes: m.notes || '',
    photos: (m.photos || []).map((p) => ({
      id: String(p.id),
      name: p.name || 'photo.jpg',
      url: p.url || '',
      data: p.data || '',
    })),
    is_milestone: m.isMilestone || false,
    milestone_type: m.milestoneType || '',
  }));

  const places = readLocal(LS_KEYS.pins).map((p) => ({
    title: p.title,
    lat: p.lat,
    lng: p.lng,
    date: p.date || '',
    occasion: p.occasion || '',
    notes: p.notes || '',
  }));

  const dreams = readLocal(LS_KEYS.dreams);

  return { memories, places, dreams };
}

export function hasLocalData() {
  return (
    readLocal(LS_KEYS.memories).length > 0 ||
    readLocal(LS_KEYS.pins).length > 0 ||
    readLocal(LS_KEYS.dreams).length > 0
  );
}

export function clearLocalAfterMigration() {
  localStorage.removeItem(LS_KEYS.memories);
  localStorage.removeItem(LS_KEYS.pins);
  localStorage.removeItem(LS_KEYS.dreams);
  localStorage.setItem(LS_KEYS.migrated, 'true');
}

export function wasMigrated() {
  return localStorage.getItem(LS_KEYS.migrated) === 'true';
}
