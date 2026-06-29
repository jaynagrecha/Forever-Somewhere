import { useState, useEffect } from 'react';
import { Download, CalendarPlus, Smartphone, Bell, Cloud, Upload, Sun, Moon, Languages } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth, useMyName } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { exportArchive } from '../utils/export';
import { api } from '../api/client';
import {
  notificationsEnabled,
  setNotificationsEnabled,
  subscribeToPush,
  ensurePushRegistered,
  testPushOnDevice,
} from '../utils/notifications';

export default function Settings() {
  const { memories, tripPins, dreams, capsules, loveNotes, importantDates, dateOps, online, connecting, reconnect, refreshAll } = useData();
  const { toast } = useToast();
  const { inviteCode, displayName, logout, partnerNames } = useAuth();
  const { myName, setMyName } = useMyName();
  const { theme, setTheme, seasonalThemes } = useTheme();
  const { locale, setLocale } = useLocale();
  const [annTitle, setAnnTitle] = useState('');
  const [annDate, setAnnDate] = useState('');
  const [notifOn, setNotifOn] = useState(notificationsEnabled());
  const [pushStatus, setPushStatus] = useState(null);

  useEffect(() => {
    if (online) {
      api.getPushStatus().then(setPushStatus).catch(() => setPushStatus(null));
    }
  }, [online, notifOn]);

  async function addAnniversary() {
    if (!annTitle || !annDate) return toast('Fill title and date', 'error');
    await dateOps.create({ title: annTitle, event_date: annDate, recurring: true });
    toast('Anniversary added', 'success');
    setAnnTitle('');
    setAnnDate('');
  }

  async function handleExport() {
    await exportArchive(null, {
      memories,
      trip_pins: tripPins,
      dreams,
      capsules,
      love_notes: loveNotes,
      important_dates: importantDates,
    });
    toast('Archive downloaded', 'success');
  }

  async function enableNotifications() {
    if (!myName) return toast('Tap “I am …” above first — push needs to know this device', 'error');
    const result = await subscribeToPush();
    if (!result.ok) {
      if (result.reason === 'no-vapid') {
        toast('Push server still starting — wait 1 min and try again', 'error');
        return;
      }
      if (result.reason === 'unsupported') {
        toast('Use Chrome (Android) or Home Screen app (iPhone)', 'error');
        return;
      }
      toast('Allow notifications when prompted', 'error');
      return;
    }
    setNotifOn(true);
    api.getPushStatus().then(setPushStatus).catch(() => {});
    toast(`Push registered for ${result.ownerName || myName}`, 'success');
  }

  async function reregisterPush() {
    if (!myName) return toast('Set who you are on this device first', 'error');
    await enableNotifications();
  }

  async function sendTestPush() {
    try {
      const res = await testPushOnDevice();
      toast(
        res.sent > 0
          ? `Test sent to ${res.sent} device(s)`
          : 'No devices registered — enable push on both phones',
        res.sent > 0 ? 'success' : 'error'
      );
    } catch {
      toast('Test push failed', 'error');
    }
  }

  function disableNotifications() {
    setNotificationsEnabled(false);
    setNotifOn(false);
    toast('Notifications off', 'success');
  }

  async function handleRestore(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.restoreBackup(file);
      await refreshAll(true);
      toast('Backup restored — refresh if data looks incomplete', 'success');
    } catch {
      toast('Invalid backup file', 'error');
    }
    e.target.value = '';
  }

  return (
    <PageShell title="⚙ Settings & tools" subtitle="Sync, backup, reminders — so your world stays safe on both phones.">
      <SectionHint>
        Deploy once → both phones use the same URL → shared memories, map, and capsules. See deploy guide below.
      </SectionHint>

      <Card className="md:col-span-2 border-accent/20" highlight>
          <h2 className="font-display text-xl">Your private space</h2>
          <p className="mt-2 text-muted">{displayName}</p>
          <p className="mt-4 text-sm text-muted">Invite code — share with your partner only</p>
          <p className="mt-1 font-mono text-2xl tracking-widest text-accent-soft">{inviteCode}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                toast('Invite code copied', 'success');
              }}
            >
              Copy invite code
            </Button>
            <Button variant="danger" onClick={async () => { await logout(); window.location.href = '/'; }}>
              Sign out on this device
            </Button>
          </div>
        </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {partnerNames.length >= 2 && (
          <Card highlight className="border-accent/20 md:col-span-2">
            <Smartphone className="mb-3 text-accent-soft" size={24} />
            <h2 className="font-display text-xl">Who&apos;s on this device?</h2>
            <p className="mt-2 text-sm text-muted">
              Each phone or browser remembers its own name — so pings, daily answers, and quiz replies
              show the right person. Jay picks Jay on his phone; Ikshika picks Ikshika on hers.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {partnerNames.map((name) => (
                <Button
                  key={name}
                  variant={myName === name ? 'primary' : 'secondary'}
                  onClick={async () => {
                    setMyName(name);
                    toast(`This device is ${name}`, 'success');
                    if (notifOn) await ensurePushRegistered();
                  }}
                >
                  I am {name}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <Card className="md:col-span-2">
          <Bell className="mb-3 text-accent-soft" size={24} />
          <h2 className="font-display text-xl">Notifications</h2>
          <p className="mt-2 text-sm text-muted">
            Love pings, anniversaries, capsule unlock days, and partner activity.
          </p>
          {notifOn ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={disableNotifications}>Disable on this device</Button>
              <Button variant="secondary" onClick={reregisterPush}>Re-register this device</Button>
              <Button variant="secondary" onClick={sendTestPush}>Send test push</Button>
            </div>
          ) : (
            <Button className="mt-4" variant="primary" onClick={enableNotifications}>Enable on this device</Button>
          )}
          {pushStatus && (
            <p className="mt-3 text-xs text-muted">
              Server: {pushStatus.vapid_configured ? 'ready' : 'starting…'} ·{' '}
              {pushStatus.subscriber_count} device(s) registered
              {pushStatus.devices?.length > 0 && (
                <> ({pushStatus.devices.map((d) => d.owner_name).filter(Boolean).join(', ')})</>
              )}
            </p>
          )}
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
            <p className="font-medium text-white">iPhone lock-screen push (both partners)</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Open <strong className="text-accent-soft">Safari</strong> → forever-somewhere-web.onrender.com</li>
              <li>Share → <strong className="text-accent-soft">Add to Home Screen</strong> (required for iOS push)</li>
              <li>Open the app from the home screen icon — not Safari tabs</li>
              <li>Settings here → <strong className="text-accent-soft">Enable on this device</strong> → Allow</li>
              <li>Set <strong className="text-accent-soft">Who&apos;s on this device?</strong> above</li>
            </ol>
            <p className="mt-2 text-xs">Each partner enables push on their own phone. Requires iOS 16.4+.</p>
          </div>
        </Card>

        <Card>
          <Download className="mb-3 text-accent-soft" size={24} />
          <h2 className="font-display text-xl">Export archive</h2>
          <p className="mt-2 text-sm text-muted">Full JSON backup of your world.</p>
          <Button className="mt-4" onClick={handleExport}>Download backup</Button>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-accent-soft">
            <Upload size={16} /> Restore from backup
            <input type="file" accept="application/json,.json" className="hidden" onChange={handleRestore} />
          </label>
        </Card>

        <Card>
          {theme === 'light' ? <Sun className="mb-3 text-accent-soft" size={24} /> : <Moon className="mb-3 text-accent-soft" size={24} />}
          <h2 className="font-display text-xl">Theme</h2>
          <p className="mt-2 text-sm text-muted">Midnight, daylight, or seasonal romantic palettes.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {seasonalThemes.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={theme === t.id ? 'primary' : 'secondary'}
                onClick={() => setTheme(t.id)}
              >
                {t.emoji} {t.label}
              </Button>
            ))}
          </div>
        </Card>

        <Card>
          <Languages className="mb-3 text-accent-soft" size={24} />
          <h2 className="font-display text-xl">Language</h2>
          <Select label="App labels" value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="gu">ગુજરાતી</option>
          </Select>
        </Card>

        <Card>
          <Smartphone className="mb-3 text-accent-soft" size={24} />
          <h2 className="font-display text-xl">Install on phone</h2>
          <p className="mt-2 text-sm text-muted">
            Use this URL in Safari (not the old <code className="text-accent-soft">-web</code> link):
          </p>
          <p className="mt-2 text-xs font-mono break-all text-accent-soft">
            https://forever-somewhere-web.onrender.com
          </p>
          <p className="mt-2 text-sm text-muted">Share → Add to Home Screen. Both partners use the same app link + invite code.</p>
        </Card>

        <Card>
          <Cloud className="mb-3 text-accent-soft" size={24} />
          <h2 className="font-display text-xl">Two-phone sync</h2>
          <p className="mt-2 text-sm text-muted">
            Status:{' '}
            {connecting ? '◌ Connecting to backend…' : online ? '● Backend connected' : '○ Offline / local only'}
          </p>
          {!online && !connecting && (
            <Button className="mt-4" variant="primary" onClick={() => reconnect()}>
              Retry sync
            </Button>
          )}
          <p className="mt-2 text-xs text-muted font-mono break-all">
            App URL: https://forever-somewhere-web.onrender.com
          </p>
        </Card>

        <Card className="md:col-span-2">
          <CalendarPlus className="mb-3 text-accent-soft" size={24} />
          <h2 className="font-display text-xl">Custom anniversaries</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Input label="Title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Our first date" />
            <Input label="Date" type="date" value={annDate} onChange={(e) => setAnnDate(e.target.value)} />
            <div className="flex items-end">
              <Button variant="primary" onClick={addAnniversary}>Add</Button>
            </div>
          </div>
          <ul className="mt-6 space-y-2">
            {importantDates.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                <span>{d.title} — {d.event_date}</span>
                <Button size="sm" variant="danger" onClick={() => dateOps.remove(d.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
