/** Backend URL — web (static) talks to api (Docker). Api URL uses same-origin when it serves the build. */
export const PRODUCTION_API = 'https://forever-somewhere-api.onrender.com';

export function resolveApiBase() {
  const raw = import.meta.env.VITE_API_URL || '';
  if (raw) {
    return raw.startsWith('http')
      ? raw.replace(/\/$/, '')
      : `https://${raw.replace(/\/$/, '')}`;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'forever-somewhere-web.onrender.com') {
      return PRODUCTION_API;
    }
    if (host === 'forever-somewhere-api.onrender.com') {
      return '';
    }
  }

  return import.meta.env.PROD ? PRODUCTION_API : '';
}

export function getApiBase() {
  return resolveApiBase();
}

let coupleTokenGetter = () => (typeof window !== 'undefined' ? localStorage.getItem('forever_couple_token') : null);

export function setCoupleTokenGetter(fn) {
  coupleTokenGetter = fn;
}

const PUBLIC_PATHS = ['/api/health', '/api/couples/create', '/api/couples/join'];

async function request(path, options = {}) {
  const apiBase = getApiBase();
  const headers = { ...options.headers };
  const hasBody = options.body != null && options.method && options.method !== 'GET';
  if (hasBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const token = coupleTokenGetter();
  if (token && !isPublic) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = apiBase ? `${apiBase}${path}` : path;
  const res = await fetch(url, { ...options, headers, cache: 'no-store', mode: 'cors' });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const message = typeof err.detail === 'string' ? err.detail : err.detail?.msg || 'Request failed';
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  health: () => request('/api/health'),
  createCoupleSpace: (data) =>
    request('/api/couples/create', { method: 'POST', body: JSON.stringify(data) }),
  joinCoupleSpace: (data) =>
    request('/api/couples/join', { method: 'POST', body: JSON.stringify(data) }),
  getCoupleMe: () => request('/api/couples/me'),
  logoutCouple: () => request('/api/couples/logout', { method: 'POST' }),
  refreshCoupleToken: () => request('/api/couples/refresh-token', { method: 'POST' }),
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
    const url = `${getApiBase()}/api/memories/upload`;
    const token = coupleTokenGetter();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(url, { method: 'POST', body: form, mode: 'cors', headers });
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
    const url = `${getApiBase()}/api/push/media`;
    const token = coupleTokenGetter();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(url, { method: 'POST', body: form, mode: 'cors', headers });
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

  getActivity: (limit = 20) => request(`/api/activity?limit=${limit}`),
  getAlbums: () => request('/api/albums'),
  createAlbum: (data) => request('/api/albums', { method: 'POST', body: JSON.stringify(data) }),
  deleteAlbum: (id) => request(`/api/albums/${id}`, { method: 'DELETE' }),
  getDailyQuestion: () => request('/api/daily-question'),
  saveDailyAnswer: (data) =>
    request('/api/daily-question/answer', { method: 'POST', body: JSON.stringify(data) }),
  getQuiz: () => request('/api/quiz'),
  getQuizResults: () => request('/api/quiz/results'),
  submitQuiz: (data) => request('/api/quiz/submit', { method: 'POST', body: JSON.stringify(data) }),
  getMoodBoard: () => request('/api/mood-board'),
  saveMoodBoard: (items) =>
    request('/api/mood-board', { method: 'PUT', body: JSON.stringify(items) }),
  getStory: () => request('/api/story'),
  getExtraInsights: () => request('/api/insights/extra'),
  getRandomMemory: () => request('/api/memories/random'),

  sendThinkingOfYou: (data) =>
    request('/api/romance/thinking-of-you', { method: 'POST', body: JSON.stringify(data) }),
  getLetterPrompts: (mood = '') =>
    request(mood ? `/api/romance/letter-prompts?mood=${encodeURIComponent(mood)}` : '/api/romance/letter-prompts'),
  getDateDeck: () => request('/api/romance/date-deck'),
  getFirsts: () => request('/api/romance/firsts'),
  getTogetherStats: () => request('/api/romance/together'),
  getRecentPings: () => request('/api/romance/recent-pings'),
  restoreBackup: async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    return request('/api/import/local', {
      method: 'POST',
      body: JSON.stringify({
        memories: data.memories || [],
        places: data.trip_pins || data.places || [],
        dreams: data.dreams || [],
      }),
    });
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ping(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store', mode: 'cors' });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) return false;
    const data = await res.json();
    return data?.status === 'ok';
  } finally {
    clearTimeout(timer);
  }
}

/** Ping API with retries — Render cold starts can take ~60s. */
export async function isApiAvailable(maxAttempts = 8, intervalMs = 4000) {
  const base = getApiBase();
  if (!base) {
    const urls = ['/api/health', '/api/memories'];
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      for (const url of urls) {
        try {
          if (url.endsWith('/api/memories')) {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) return true;
          } else if (await ping(url.startsWith('http') ? url : `${window.location.origin}${url}`)) {
            return true;
          }
        } catch {
          /* retry */
        }
      }
      if (attempt < maxAttempts) await sleep(intervalMs);
    }
    return false;
  }

  const urls = [`${base}/api/health`, `${base}/api/memories`];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    for (const url of urls) {
      try {
        if (url.endsWith('/api/memories')) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          const res = await fetch(url, { signal: controller.signal, cache: 'no-store', mode: 'cors' });
          clearTimeout(timer);
          if (res.ok) return true;
        } else if (await ping(url)) {
          return true;
        }
      } catch {
        /* retry */
      }
    }
    if (attempt < maxAttempts) await sleep(intervalMs);
  }
  return false;
}

export const API_BASE = getApiBase();
