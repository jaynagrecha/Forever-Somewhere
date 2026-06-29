/** Backend URL — web (static) talks to api (Docker). Api URL uses same-origin when it serves the build. */
import { TOKEN_KEY } from '../utils/constants';

export const PRODUCTION_API = 'https://forever-somewhere-api.onrender.com';
export const PRODUCTION_WEB = 'https://forever-somewhere-web.onrender.com';

export function getAppShareUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'forever-somewhere-web.onrender.com' || host === 'forever-somewhere-api.onrender.com') {
      return PRODUCTION_WEB;
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return window.location.origin;
    }
  }
  return PRODUCTION_WEB;
}

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

let coupleTokenGetter = () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);

export function setCoupleTokenGetter(fn) {
  coupleTokenGetter = fn;
}

const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/couples/create',
  '/api/couples/join',
  '/api/recovery/start',
  '/api/recovery/complete',
  '/api/recovery/backup',
]);

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isUnauthorizedError(err) {
  return err instanceof ApiError && err.status === 401;
}

export function formatApiError(err) {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return 'Could not reach the server — wait a few seconds and try again (the API may be waking up).';
    }
    return err.message || 'Request failed';
  }
  return err?.message || 'Request failed';
}

function withAuthorQuery(path, author) {
  if (!author) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}author=${encodeURIComponent(author)}`;
}

async function request(path, options = {}) {
  const apiBase = getApiBase();
  const headers = { ...options.headers };
  const hasBody = options.body != null && options.method && options.method !== 'GET';
  if (hasBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const isPublic = PUBLIC_PATHS.has(path);
  const token = coupleTokenGetter();
  if (token && !isPublic) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = apiBase ? `${apiBase}${path}` : path;
  let res;
  try {
    res = await fetch(url, { ...options, headers, cache: 'no-store', mode: 'cors' });
  } catch (err) {
    throw new ApiError(err.message || 'Network error', 0);
  }
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const message = typeof err.detail === 'string' ? err.detail : err.detail?.msg || 'Request failed';
    throw new ApiError(message, res.status);
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

  getRecoverySettings: () => request('/api/recovery/settings'),
  requestRecoveryEmailVerify: (data) =>
    request('/api/recovery/email/request', { method: 'POST', body: JSON.stringify(data) }),
  confirmRecoveryEmailVerify: (data) =>
    request('/api/recovery/email/confirm', { method: 'POST', body: JSON.stringify(data) }),
  generateRecoveryBackupCode: (data) =>
    request('/api/recovery/backup/generate', { method: 'POST', body: JSON.stringify(data) }),
  recoveryStart: (data) =>
    request('/api/recovery/start', { method: 'POST', body: JSON.stringify(data) }),
  recoveryComplete: (data) =>
    request('/api/recovery/complete', { method: 'POST', body: JSON.stringify(data) }),
  recoveryBackup: (data) =>
    request('/api/recovery/backup', { method: 'POST', body: JSON.stringify(data) }),

  getStats: () => request('/api/stats'),
  getOnThisDay: () => request('/api/memories/on-this-day'),
  getNotificationFeed: () => request('/api/notifications/feed'),
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),

  getMemories: () => request('/api/memories'),
  createMemory: (data, actor) =>
    request(withAuthorQuery('/api/memories', actor), { method: 'POST', body: JSON.stringify(data) }),
  updateMemory: (id, data, author) =>
    request(withAuthorQuery(`/api/memories/${id}`, author), { method: 'PUT', body: JSON.stringify(data) }),
  deleteMemory: (id, author) => request(withAuthorQuery(`/api/memories/${id}`, author), { method: 'DELETE' }),
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
  createDream: (data, actor) =>
    request(withAuthorQuery('/api/dreams', actor), { method: 'POST', body: JSON.stringify(data) }),
  updateDream: (id, data) => request(`/api/dreams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDream: (id, author) => request(withAuthorQuery(`/api/dreams/${id}`, author), { method: 'DELETE' }),
  promoteDream: (id) => request(`/api/dreams/${id}/promote-to-map`, { method: 'POST' }),

  getCapsules: () => request('/api/capsules'),
  createCapsule: (data, actor) =>
    request(withAuthorQuery('/api/capsules', actor), { method: 'POST', body: JSON.stringify(data) }),
  openCapsule: (id) => request(`/api/capsules/${id}/open`, { method: 'POST' }),
  deleteCapsule: (id, author) => request(withAuthorQuery(`/api/capsules/${id}`, author), { method: 'DELETE' }),
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
  createLoveNote: (data, actor) =>
    request(withAuthorQuery('/api/love-notes', actor), { method: 'POST', body: JSON.stringify(data) }),
  deleteLoveNote: (id, author) => request(withAuthorQuery(`/api/love-notes/${id}`, author), { method: 'DELETE' }),

  getImportantDates: () => request('/api/important-dates'),
  createImportantDate: (data) =>
    request('/api/important-dates', { method: 'POST', body: JSON.stringify(data) }),
  deleteImportantDate: (id) => request(`/api/important-dates/${id}`, { method: 'DELETE' }),

  getPrompts: () => request('/api/prompts'),
  getPromptAnswers: () => request('/api/prompts/answers'),
  savePromptAnswer: (data, actor) =>
    request(withAuthorQuery('/api/prompts/answers', actor), { method: 'POST', body: JSON.stringify(data) }),
  deletePromptAnswer: (id, author) =>
    request(withAuthorQuery(`/api/prompts/answers/${id}`, author), { method: 'DELETE' }),

  getVapidKey: () => request('/api/push/vapid-public-key'),
  getPushStatus: () => request('/api/push/status'),
  testPush: (data = {}) => request('/api/push/test', { method: 'POST', body: JSON.stringify(data) }),
  clearPushSubscriptions: () => request('/api/push/subscriptions', { method: 'DELETE' }),
  subscribePush: (data) => request('/api/push/subscribe', { method: 'POST', body: JSON.stringify(data) }),

  importLocal: (data) => request('/api/import/local', { method: 'POST', body: JSON.stringify(data) }),
  exportArchive: () => request('/api/export'),

  getActivity: (limit = 20) => request(`/api/activity?limit=${limit}`),
  getAlbums: () => request('/api/albums'),
  createAlbum: (data) => request('/api/albums', { method: 'POST', body: JSON.stringify(data) }),
  deleteAlbum: (id) => request(`/api/albums/${id}`, { method: 'DELETE' }),
  getDailyQuestion: () => request('/api/daily-question'),
  saveDailyAnswer: (data, actor) =>
    request(withAuthorQuery('/api/daily-question/answer', actor), { method: 'POST', body: JSON.stringify(data) }),
  getQuiz: () => request('/api/quiz'),
  getQuizResults: () => request('/api/quiz/results'),
  submitQuiz: (data, actor) =>
    request(withAuthorQuery('/api/quiz/submit', actor), { method: 'POST', body: JSON.stringify(data) }),
  getSeasons: (periodType = 'week') =>
    request(`/api/seasons?period_type=${encodeURIComponent(periodType)}`),
  saveSeason: (data, actor) =>
    request(withAuthorQuery('/api/seasons', actor), { method: 'POST', body: JSON.stringify(data) }),
  deleteSeason: (id, author) =>
    request(`/api/seasons/${id}?author=${encodeURIComponent(author)}`, { method: 'DELETE' }),
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
