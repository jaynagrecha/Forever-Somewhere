const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  health: () => request('/'),
  getStats: () => request('/api/stats'),
  getOnThisDay: () => request('/api/memories/on-this-day'),
  getInsights: () => request('/api/insights'),
  getCalendar: () => request('/api/calendar'),
  getNotificationFeed: () => request('/api/notifications/feed'),
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),

  getMemories: () => request('/api/memories'),
  createMemory: (data) => request('/api/memories', { method: 'POST', body: JSON.stringify(data) }),
  updateMemory: (id, data) =>
    request(`/api/memories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMemory: (id) => request(`/api/memories/${id}`, { method: 'DELETE' }),
  uploadPhoto: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/api/memories/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  getTripPins: () => request('/api/trip-pins'),
  createTripPin: (data) => request('/api/trip-pins', { method: 'POST', body: JSON.stringify(data) }),
  deleteTripPin: (id) => request(`/api/trip-pins/${id}`, { method: 'DELETE' }),

  getDreams: () => request('/api/dreams'),
  createDream: (data) => request('/api/dreams', { method: 'POST', body: JSON.stringify(data) }),
  updateDream: (id, data) => request(`/api/dreams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDream: (id) => request(`/api/dreams/${id}`, { method: 'DELETE' }),
  promoteDream: (id) => request(`/api/dreams/${id}/promote-to-map`, { method: 'POST' }),

  getCapsules: () => request('/api/capsules'),
  createCapsule: (data) => request('/api/capsules', { method: 'POST', body: JSON.stringify(data) }),
  openCapsule: (id) => request(`/api/capsules/${id}/open`, { method: 'POST' }),
  deleteCapsule: (id) => request(`/api/capsules/${id}`, { method: 'DELETE' }),
  uploadCapsuleMedia: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/api/push/media`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  getLoveNotes: () => request('/api/love-notes'),
  createLoveNote: (data) => request('/api/love-notes', { method: 'POST', body: JSON.stringify(data) }),
  deleteLoveNote: (id) => request(`/api/love-notes/${id}`, { method: 'DELETE' }),

  getImportantDates: () => request('/api/important-dates'),
  createImportantDate: (data) =>
    request('/api/important-dates', { method: 'POST', body: JSON.stringify(data) }),
  deleteImportantDate: (id) => request(`/api/important-dates/${id}`, { method: 'DELETE' }),

  getPrompts: () => request('/api/prompts'),
  getPromptAnswers: () => request('/api/prompts/answers'),
  savePromptAnswer: (data) =>
    request('/api/prompts/answers', { method: 'POST', body: JSON.stringify(data) }),
  deletePromptAnswer: (id) => request(`/api/prompts/answers/${id}`, { method: 'DELETE' }),

  getVapidKey: () => request('/api/push/vapid-public-key'),
  subscribePush: (data) => request('/api/push/subscribe', { method: 'POST', body: JSON.stringify(data) }),

  importLocal: (data) => request('/api/import/local', { method: 'POST', body: JSON.stringify(data) }),
};

export async function isApiAvailable() {
  try {
    await api.health();
    return true;
  } catch {
    return false;
  }
}

export { API_BASE };
