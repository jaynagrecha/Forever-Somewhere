import { useState } from 'react';
import { Heart, UserCircle } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useMyName } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { romancePing } from '../utils/romanceSounds';

export default function ThinkingOfYou() {
  const { toast } = useToast();
  const { myName, setMyName, partnerNames, needsSetup, identityLocked } = useMyName();
  const { refreshActivity } = useActivity();
  const [busy, setBusy] = useState(false);
  const [lastPing, setLastPing] = useState(null);

  const partner = partnerNames.find((n) => n !== myName) || 'your partner';

  async function sendPing() {
    if (!myName) return toast('Choose who you are in Settings first', 'error');
    setBusy(true);
    try {
      const res = await api.sendThinkingOfYou({ author: myName });
      romancePing();
      refreshActivity();
      setLastPing(res.message);
      toast(`Ping sent to ${partner} 💕`, 'success');
    } catch (e) {
      toast(e.message || 'Could not send ping', 'error');
    } finally {
      setBusy(false);
    }
  }

  function pickIdentity(name) {
    const other = partnerNames.find((n) => n !== name) || 'your partner';
    const ok = window.confirm(
      `This device will permanently be ${name}. You cannot switch to ${other} on this phone later.\n\nContinue?`
    );
    if (!ok) return;
    if (!setMyName(name)) {
      toast('Identity already locked on this device', 'error');
      return;
    }
    toast(`This device is locked to ${name}`, 'success');
  }

  return (
    <Card highlight className="mb-6 border-accent/25 bg-gradient-to-br from-accent/10 to-transparent">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[200px] flex-1">
          <p className="text-sm text-accent-soft">Thinking of you</p>
          <h2 className="font-display text-xl">Send a little ping to {partner}</h2>
          <p className="mt-1 text-sm text-muted">
            They&apos;ll see who sent it in the activity feed — and get a push if enabled.
          </p>

          {identityLocked && (
            <p className="mt-4 text-sm text-muted">
              Sending as <strong className="text-white">{myName}</strong>
            </p>
          )}

          {needsSetup && partnerNames.length >= 2 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {partnerNames.map((n) => (
                <Button key={n} size="sm" variant="secondary" onClick={() => pickIdentity(n)}>
                  I am {n}
                </Button>
              ))}
            </div>
          )}

          {needsSetup && (
            <p className="mt-2 flex items-center gap-1 text-xs text-gold">
              <UserCircle size={14} /> Pick your name once — this device stays locked to that person.
            </p>
          )}

          {lastPing && <p className="mt-2 text-xs text-muted">{lastPing}</p>}
        </div>
        <Button variant="primary" onClick={sendPing} disabled={busy || !myName}>
          <Heart size={16} fill="currentColor" /> {busy ? 'Sending…' : 'Ping with love'}
        </Button>
      </div>
    </Card>
  );
}
