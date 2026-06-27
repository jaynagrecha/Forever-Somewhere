const PRODUCTION_API = 'https://forever-somewhere-api.onrender.com';

export function resolveApiBase() {
  const raw = import.meta.env.VITE_API_URL || '';
  if (raw) {
    return raw.startsWith('http')
      ? raw.replace(/\/$/, '')
      : `https://${raw.replace(/\/$/, '')}`;
  }
  if (import.meta.env.PROD) {
    return PRODUCTION_API;
  }
  return '';
}

/** Resolved at call time so runtime hostname is always available. */
export function getApiBase() {
  const base = resolveApiBase();
  if (base) return base;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('.onrender.com') || host === 'localhost') {
      return PRODUCTION_API;
    }
  }
  return '';
}

async function request(path, options = {}) {
  const apiBase = getApiBase();
  const headers = { ...options.headers };
  const hasBody = options.body != null && options.method && options.method !== 'GET';
  if (hasBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${apiBase}${path}`, { ...options, headers });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  health: () => request('/api/health'),
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
    const res = await fetch(`${getApiBase()}/api/memories/upload`, { method: 'POST', body: form });
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
    const res = await fetch(`${getApiBase()}/api/push/media`, { method: 'POST', body: form });
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ping API with retries — Render cold starts can take ~60s. */
export async function isApiAvailable(maxAttempts = 12, intervalMs = 5000) {
  const apiBase = getApiBase();
  if (!apiBase) return false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(`${apiBase}/api/health`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data?.status !== 'ok') throw new Error('bad health payload');
      return true;
    } catch {
      if (attempt < maxAttempts) await sleep(intervalMs);
    }
  }
  return false;
}

/** @deprecated use getApiBase() */
export const API_BASE = PRODUCTION_API;
