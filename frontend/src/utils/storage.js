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
  const memories = readLocal('forever_somewhere_memories').map((m) => ({
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

  const places = readLocal('forever_somewhere_places').map((p) => ({
    title: p.title,
    lat: p.lat,
    lng: p.lng,
    date: p.date || '',
    occasion: p.occasion || '',
    notes: p.notes || '',
  }));

  const dreams = readLocal('forever_somewhere_dreams');

  return { memories, places, dreams };
}

export function hasLocalData() {
  return (
    readLocal('forever_somewhere_memories').length > 0 ||
    readLocal('forever_somewhere_places').length > 0 ||
    readLocal('forever_somewhere_dreams').length > 0
  );
}

export function clearLocalAfterMigration() {
  localStorage.removeItem('forever_somewhere_memories');
  localStorage.removeItem('forever_somewhere_places');
  localStorage.removeItem('forever_somewhere_dreams');
  localStorage.setItem('forever_somewhere_migrated', 'true');
}

export function wasMigrated() {
  return localStorage.getItem('forever_somewhere_migrated') === 'true';
}
