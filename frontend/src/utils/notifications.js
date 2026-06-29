const PREFS_KEY = 'forever_notifications_enabled';
const SHOWN_KEY = 'forever_notifications_shown';
const LAST_ACTIVITY_ID_KEY = 'forever_last_activity_id';
import { MY_NAME_KEY } from '../utils/constants';
import { ACTIVITY_REFRESH_EVENT } from '../context/ActivityContext';

const VAPID_KEY = 'forever_vapid_key';

export const PARTNER_ACTIVITY_TOAST_EVENT = 'forever-partner-activity-toast';

export function formatPartnerActivityAlert(item) {
  const author = item.author || 'Your partner';
  const title = item.title || '';
  switch (item.kind) {
    case 'ping':
      return { title: 'Thinking of you 💕', body: title };
    case 'love_note':
      return { title: 'Love note 💌', body: `${author} wrote you a note` };
    case 'capsule':
      return { title: 'Time capsule 🔒', body: `${author} sealed “${title}”` };
    case 'memory':
      return { title: 'New memory 📸', body: `${author} added “${title}”` };
    case 'dream':
      return { title: 'New dream ✨', body: `${author} added “${title}”` };
    case 'trip_pin':
      return { title: 'New map pin 📍', body: `${author} pinned “${title}”` };
    case 'album':
      return { title: 'Trip album 📁', body: `${author} created “${title}”` };
    case 'season':
      return { title: 'Our season 🎨', body: `${author} shared their mood` };
    case 'note_reaction':
      return { title: 'Note reaction 💕', body: `${author} ${title}` };
    case 'desire_jar':
      return { title: 'After Dark 🌙', body: 'Something new in the desire jar' };
    case 'vault':
      return { title: 'After Dark 🌙', body: `${author} left something for you` };
    case 'check_in':
      return { title: 'After Dark check-in 💬', body: `${author} — ${title}` };
    default:
      return { title: 'Partner activity', body: `${author} — ${title}` };
  }
}

function dispatchPartnerToast(alert, route) {
  window.dispatchEvent(
    new CustomEvent(PARTNER_ACTIVITY_TOAST_EVENT, {
      detail: { ...alert, route: route || '/dashboard' },
    })
  );
}

function bumpActivityFeed() {
  window.dispatchEvent(new Event(ACTIVITY_REFRESH_EVENT));
}

export function notificationsEnabled() {
  return localStorage.getItem(PREFS_KEY) === 'true';
}

export function setNotificationsEnabled(on) {
  localStorage.setItem(PREFS_KEY, on ? 'true' : 'false');
}

function wasShown(tag) {
  const raw = localStorage.getItem(SHOWN_KEY);
  const map = raw ? JSON.parse(raw) : {};
  return map[tag] === true;
}

function markShown(tag) {
  if (!tag) return;
  const raw = localStorage.getItem(SHOWN_KEY);
  const map = raw ? JSON.parse(raw) : {};
  map[tag] = true;
  localStorage.setItem(SHOWN_KEY, JSON.stringify(map));
}

/** Record a push/local notification so polls do not replay it after the app opens. */
function recordNotificationTag(tag, activityId = null) {
  if (!tag) return;
  markShown(tag);

  if (activityId != null && activityId > 0) {
    const lastSeen = Number(localStorage.getItem(LAST_ACTIVITY_ID_KEY) || 0);
    if (activityId > lastSeen) {
      localStorage.setItem(LAST_ACTIVITY_ID_KEY, String(activityId));
    }
    return;
  }

  if (tag.startsWith('activity-')) {
    const id = Number(tag.slice('activity-'.length));
    if (id > 0) {
      const lastSeen = Number(localStorage.getItem(LAST_ACTIVITY_ID_KEY) || 0);
      if (id > lastSeen) localStorage.setItem(LAST_ACTIVITY_ID_KEY, String(id));
    }
  }
}

function processPartnerActivityItems(items, { inAppToast = false, lockScreen = false } = {}) {
  if (!items.length) return false;

  const lastSeen = Number(localStorage.getItem(LAST_ACTIVITY_ID_KEY) || 0);
  const myName = localStorage.getItem(MY_NAME_KEY) || '';
  let newestId = lastSeen;
  let hadPartnerNews = false;

  for (const item of items) {
    if (item.id <= lastSeen) break;
    if (item.author === myName) continue;

    const tag = `activity-${item.id}`;
    if (wasShown(tag)) continue;

    hadPartnerNews = true;
    const alert = formatPartnerActivityAlert(item);
    const route = item.route || '/dashboard';

    if (inAppToast) {
      dispatchPartnerToast(alert, route);
    }
    if (lockScreen) {
      showLocalNotification({ ...alert, tag, route });
    } else {
      markShown(tag);
    }

    if (item.id > newestId) newestId = item.id;
  }

  const topId = items[0]?.id ?? newestId;
  if (topId > lastSeen) {
    localStorage.setItem(LAST_ACTIVITY_ID_KEY, String(topId));
  }

  if (hadPartnerNews) bumpActivityFeed();
  return hadPartnerNews;
}

/** Keep partner activity feed fresh even when push is off. */
export async function pollPartnerActivityFeed() {
  try {
    const { api } = await import('../api/client');
    const items = await api.getActivity(12);
    if (!items.length) return;

    const lastSeen = Number(localStorage.getItem(LAST_ACTIVITY_ID_KEY) || 0);
    const myName = localStorage.getItem(MY_NAME_KEY) || '';
    const hasNewPartner = items.some((item) => item.id > lastSeen && item.author !== myName);

    if (hasNewPartner) bumpActivityFeed();

    const inApp = document.visibilityState === 'visible';
    if (inApp) {
      processPartnerActivityItems(items, { inAppToast: true, lockScreen: false });
      return;
    }

    if (notificationsEnabled() && Notification.permission === 'granted') {
      processPartnerActivityItems(items, { inAppToast: false, lockScreen: true });
    }
  } catch {
    /* offline */
  }
}

export function initNotificationBridge() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || msg.type !== 'PUSH_ACTIVITY') return;
    recordNotificationTag(msg.tag, msg.activityId ?? null);
    bumpActivityFeed();

    if (msg.shown) return;

    const activityId = msg.activityId;
    if (!activityId) return;

    import('../api/client')
      .then(({ api }) => api.getActivity(12))
      .then((items) => {
        const item = items.find((row) => row.id === activityId);
        if (!item) return;
        const myName = localStorage.getItem(MY_NAME_KEY) || '';
        if (item.author === myName) return;
        dispatchPartnerToast(formatPartnerActivityAlert(item), item.route);
      })
      .catch(() => {});
  });
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showLocalNotification({ title, body, tag, route = '/dashboard' }) {
  if (!notificationsEnabled()) return;
  if (Notification.permission !== 'granted') return;
  if (wasShown(tag)) return;

  const n = new Notification(title, {
    body,
    tag,
    icon: '/icons/icon-192.png',
    data: { route },
  });
  n.onclick = () => {
    window.focus();
    window.location.href = route;
  };
  recordNotificationTag(tag);
}

export async function checkAndNotify() {
  if (!notificationsEnabled() || Notification.permission !== 'granted') return;

  try {
    const { api } = await import('../api/client');
    const items = await api.getNotificationFeed();
    items.forEach((item) => showLocalNotification(item));
  } catch {
    /* offline */
  }
}

/**
 * Partner alerts: in-app toast when open, lock-screen when backgrounded.
 */
export async function pollPartnerActivity() {
  await pollPartnerActivityFeed();
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function waitForServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg;
}

/** Register this device for lock-screen Web Push (requires owner name + valid VAPID). */
export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const perm = await requestNotificationPermission();
  if (!perm) return { ok: false, reason: 'denied' };

  const reg = await waitForServiceWorker();
  if (!reg) return { ok: false, reason: 'no-sw' };

  const { api } = await import('../api/client');
  let publicKey;
  try {
    const data = await api.getVapidKey();
    publicKey = data.publicKey || '';
  } catch {
    return { ok: false, reason: 'vapid-fetch' };
  }

  if (!publicKey) {
    return { ok: false, reason: 'no-vapid' };
  }

  const storedVapid = localStorage.getItem(VAPID_KEY);
  let sub = await reg.pushManager.getSubscription();

  if (sub && storedVapid && storedVapid !== publicKey) {
    await sub.unsubscribe();
    sub = null;
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  localStorage.setItem(VAPID_KEY, publicKey);

  const json = sub.toJSON();
  const ownerName = localStorage.getItem(MY_NAME_KEY) || '';
  await api.subscribePush({
    endpoint: json.endpoint,
    keys: json.keys,
    owner_name: ownerName,
  });

  setNotificationsEnabled(true);
  return { ok: true, ownerName };
}

/** Re-register push when app opens (fixes lost subscriptions after deploy). */
export async function ensurePushRegistered() {
  if (!notificationsEnabled()) return;
  if (Notification.permission !== 'granted') return;
  try {
    await subscribeToPush();
  } catch {
    /* best effort */
  }
}

export async function testPushOnDevice() {
  const { api } = await import('../api/client');
  let endpoint = '';
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      endpoint = sub?.endpoint || '';
    }
  } catch {
    /* best effort */
  }
  return api.testPush(
    endpoint ? { endpoint, this_device_only: true } : { this_device_only: false }
  );
}

export async function runNotificationPoll() {
  await Promise.all([checkAndNotify(), pollPartnerActivityFeed()]);
}
