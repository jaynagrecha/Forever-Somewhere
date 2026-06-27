const PREFS_KEY = 'forever_notifications_enabled';
const SHOWN_KEY = 'forever_notifications_shown';

export function notificationsEnabled() {
  return localStorage.getItem(PREFS_KEY) === 'true';
}

export function setNotificationsEnabled(on) {
  localStorage.setItem(PREFS_KEY, on ? 'true' : 'false');
}

function wasShown(tag) {
  const raw = localStorage.getItem(SHOWN_KEY);
  const map = raw ? JSON.parse(raw) : {};
  const today = new Date().toISOString().slice(0, 10);
  return map[tag] === today;
}

function markShown(tag) {
  const raw = localStorage.getItem(SHOWN_KEY);
  const map = raw ? JSON.parse(raw) : {};
  map[tag] = new Date().toISOString().slice(0, 10);
  localStorage.setItem(SHOWN_KEY, JSON.stringify(map));
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
    icon: '/favicon.svg',
    data: { route },
  });
  n.onclick = () => {
    window.focus();
    window.location.href = route;
  };
  markShown(tag);
}

export async function checkAndNotify(apiBase = '') {
  if (!notificationsEnabled() || Notification.permission !== 'granted') return;

  try {
    const res = await fetch(`${apiBase}/api/notifications/feed`);
    if (!res.ok) return;
    const items = await res.json();
    items.forEach((item) => showLocalNotification(item));
  } catch {
    /* offline */
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(apiBase = '') {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const perm = await requestNotificationPermission();
  if (!perm) return false;

  const reg = await navigator.serviceWorker.ready;

  let publicKey = '';
  try {
    const res = await fetch(`${apiBase}/api/push/vapid-public-key`);
    const data = await res.json();
    publicKey = data.publicKey;
  } catch {
    return perm;
  }

  if (!publicKey) return perm;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = sub.toJSON();
  await fetch(`${apiBase}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });

  setNotificationsEnabled(true);
  return true;
}
