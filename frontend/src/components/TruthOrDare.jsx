import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dices, Moon, Plus } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Input, TextArea } from './ui/Input';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { usePostingAuthor } from '../context/AuthContext';

export default function TruthOrDare() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { author } = usePostingAuthor();
  const [tier, setTier] = useState('sweet');
  const [card, setCard] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [custom, setCustom] = useState({ kind: 'truth', text: '' });
  const [afterDark, setAfterDark] = useState(false);

  useEffect(() => {
    api.getPhase2Prefs().then((p) => setAfterDark(p.after_dark_unlocked)).catch(() => {});
  }, []);

  async function draw(kind = '') {
    try {
      const c = await api.drawDeck({ tier, kind: kind || undefined });
      setCard(c);
    } catch (err) {
      toast(err.message || 'Draw failed', 'error');
    }
  }

  async function addCustom() {
    if (!custom.text.trim()) return;
    try {
      await api.addDeckCard({ tier, kind: custom.kind, text: custom.text }, author);
      toast('Card added', 'success');
      setShowAdd(false);
      setCustom({ kind: 'truth', text: '' });
    } catch {
      toast('Could not add card', 'error');
    }
  }

  const tiers = ['sweet', 'spicy'];

  return (
    <Card className="mb-10">
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Dices size={22} className="text-accent-soft" /> Truth or Dare
      </h2>
      <p className="mt-2 text-sm text-muted">Sweet & Spicy for date night — Wild deck lives in After Dark.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tiers.map((t) => (
          <Button key={t} size="sm" variant={tier === t ? 'primary' : 'secondary'} onClick={() => { setTier(t); setCard(null); }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
        {afterDark && (
          <Button size="sm" variant="secondary" onClick={() => navigate('/after-dark')}>
            <Moon size={14} /> Wild → After Dark
          </Button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => draw('truth')}>Truth</Button>
        <Button size="sm" onClick={() => draw('dare')}>Dare</Button>
        <Button size="sm" variant="secondary" onClick={() => draw('')}>Random</Button>
        <Button size="sm" variant="ghost" onClick={() => setShowAdd(true)}><Plus size={14} /> Add ours</Button>
      </div>
      {card && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-widest text-accent-soft">{card.kind} · {tier}</p>
          <p className="mt-3 font-display text-xl leading-relaxed">{card.text}</p>
          <p className="mt-3 text-xs text-muted">Pass anytime — no pressure.</p>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add your card">
        <div className="flex gap-2">
          {['truth', 'dare', 'challenge'].filter((k) => tier === 'wild' || k !== 'challenge').map((k) => (
            <Button key={k} size="sm" variant={custom.kind === k ? 'primary' : 'secondary'} onClick={() => setCustom({ ...custom, kind: k })}>
              {k}
            </Button>
          ))}
        </div>
        <TextArea label="Card text" value={custom.text} onChange={(e) => setCustom({ ...custom, text: e.target.value })} className="mt-4" />
        <Button className="mt-4" variant="primary" onClick={addCustom}>Save card</Button>
      </Modal>
    </Card>
  );
}
