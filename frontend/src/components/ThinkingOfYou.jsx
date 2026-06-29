import { useState } from 'react';
import { Heart, UserCircle } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { Select } from './ui/Input';
import { useMyName } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { romancePing } from '../utils/romanceSounds';

export default function ThinkingOfYou() {
  const { toast } = useToast();
  const { myName, setMyName, partnerNames, needsSetup } = useMyName();
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

  return (
    <Card highlight className="mb-6 border-accent/25 bg-gradient-to-br from-accent/10 to-transparent">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[200px] flex-1">
          <p className="text-sm text-accent-soft">Thinking of you</p>
          <h2 className="font-display text-xl">Send a little ping to {partner}</h2>
          <p className="mt-1 text-sm text-muted">
            They&apos;ll see who sent it in the activity feed — and get a push if enabled.
          </p>

          {partnerNames.length >= 2 && (
            <div className="mt-4 max-w-xs">
              <Select
                label="Sending as (this device)"
                value={myName}
                onChange={(e) => {
                  setMyName(e.target.value);
                  toast(`This device is now ${e.target.value}`, 'success');
                }}
              >
                <option value="">— Choose —</option>
                {partnerNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
            </div>
          )}

          {needsSetup && (
            <p className="mt-2 flex items-center gap-1 text-xs text-gold">
              <UserCircle size={14} /> Pick your name so pings aren&apos;t always credited to {partnerNames[0]}.
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
