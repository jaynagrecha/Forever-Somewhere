const PREFS_KEY = 'forever_notifications_enabled';
const SHOWN_KEY = 'forever_notifications_shown';
const LAST_ACTIVITY_ID_KEY = 'forever_last_activity_id';
const MY_NAME_KEY = 'forever_my_name';

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
  const raw = localStorage.getItem(SHOWN_KEY);
  const map = raw ? JSON.parse(raw) : {};
  map[tag] = true;
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

/** Notify partner activity (pings, new memories) when app is open or in background tab. */
export async function pollPartnerActivity() {
  if (!notificationsEnabled() || Notification.permission !== 'granted') return;

  try {
    const { api } = await import('../api/client');
    const items = await api.getActivity(8);
    if (!items.length) return;

    const lastSeen = Number(localStorage.getItem(LAST_ACTIVITY_ID_KEY) || 0);
    const myName = localStorage.getItem(MY_NAME_KEY) || '';
    let newestId = lastSeen;

    for (const item of items) {
      if (item.id <= lastSeen) break;
      if (item.author === myName) continue;

      const title =
        item.kind === 'ping'
          ? item.title
          : `${item.author} — ${item.title}`;

      showLocalNotification({
        title: item.kind === 'ping' ? 'Thinking of you 💕' : 'Partner activity',
        body: title,
        tag: `activity-${item.id}`,
        route: item.route || '/dashboard',
      });

      if (item.id > newestId) newestId = item.id;
    }

    const topId = items[0]?.id ?? newestId;
    if (topId > lastSeen) {
      localStorage.setItem(LAST_ACTIVITY_ID_KEY, String(topId));
    }
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

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const perm = await requestNotificationPermission();
  if (!perm) return false;

  const reg = await navigator.serviceWorker.ready;

  const { api } = await import('../api/client');
  let publicKey = '';
  try {
    const data = await api.getVapidKey();
    publicKey = data.publicKey;
  } catch {
    return false;
  }

  if (!publicKey) {
    setNotificationsEnabled(true);
    return true;
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = sub.toJSON();
  await api.subscribePush({ endpoint: json.endpoint, keys: json.keys });

  setNotificationsEnabled(true);
  return true;
}

export async function runNotificationPoll() {
  await Promise.all([checkAndNotify(), pollPartnerActivity()]);
}
