import { useState } from 'react';
import { Heart } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { usePartnerPicker } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { romancePing } from '../utils/romanceSounds';

export default function ThinkingOfYou() {
  const { toast } = useToast();
  const author = usePartnerPicker(0);
  const [busy, setBusy] = useState(false);
  const [lastPing, setLastPing] = useState(null);

  async function sendPing() {
    setBusy(true);
    try {
      const res = await api.sendThinkingOfYou({ author });
      romancePing();
      setLastPing(res.message);
      toast('Love ping sent 💕', 'success');
    } catch (e) {
      toast(e.message || 'Could not send ping', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card highlight className="mb-6 border-accent/25 bg-gradient-to-br from-accent/10 to-transparent">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-accent-soft">Thinking of you</p>
          <h2 className="font-display text-xl">Send a little ping to your partner</h2>
          <p className="mt-1 text-sm text-muted">They&apos;ll see it in the activity feed — and get a push if enabled.</p>
          {lastPing && <p className="mt-2 text-xs text-gold">{lastPing}</p>}
        </div>
        <Button variant="primary" onClick={sendPing} disabled={busy}>
          <Heart size={16} fill="currentColor" /> {busy ? 'Sending…' : 'Ping with love'}
        </Button>
      </div>
    </Card>
  );
}
