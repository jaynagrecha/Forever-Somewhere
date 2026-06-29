import { useCallback, useEffect, useState } from 'react';
import { Flame, Lock, Moon } from 'lucide-react';
import PageShell, { SectionHint } from '../components/Layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, TextArea, Select } from '../components/ui/Input';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { usePostingAuthor } from '../context/AuthContext';
import { AFTER_DARK_PIN_KEY, AFTER_DARK_UNLOCK_KEY } from '../utils/constants';

const TABS = [
  { id: 'jar', label: 'Desire jar' },
  { id: 'deck', label: 'Wild deck' },
  { id: 'vault', label: 'Vault' },
  { id: 'energy', label: 'Us tonight' },
  { id: 'checkin', label: 'Check-in' },
];

function isUnlocked() {
  const until = Number(localStorage.getItem(AFTER_DARK_UNLOCK_KEY) || 0);
  return until > Date.now();
}

function unlockSession(minutes = 30) {
  localStorage.setItem(AFTER_DARK_UNLOCK_KEY, String(Date.now() + minutes * 60 * 1000));
}

export default function AfterDark() {
  const { toast } = useToast();
  const { author } = usePostingAuthor();
  const [prefs, setPrefs] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [sessionOpen, setSessionOpen] = useState(isUnlocked);
  const [tab, setTab] = useState('jar');

  const [jar, setJar] = useState([]);
  const [jarChips, setJarChips] = useState([]);
  const [slipForm, setSlipForm] = useState({ slip_type: 'curious', body: '', chip: '', anonymous: false });

  const [card, setCard] = useState(null);
  const [deckKind, setDeckKind] = useState('');

  const [vault, setVault] = useState([]);
  const [vaultForm, setVaultForm] = useState({ entry_kind: 'fantasy', title: '', body: '', visibility: 'private' });

  const [energy, setEnergy] = useState({ energy: 'playful', surprises: 'ask' });
  const [partnerEnergy, setPartnerEnergy] = useState([]);
  const [checkIn, setCheckIn] = useState({ rating: 'good', note: '' });

  const loadPrefs = useCallback(() => {
    api.getPhase2Prefs().then(setPrefs).catch(() => setPrefs(null));
  }, []);

  const loadJar = useCallback(() => {
    api.getDesireJar(author).then((d) => {
      setJar(d.slips || []);
      setJarChips(d.chips || []);
    }).catch(() => toast('Could not load jar', 'error'));
  }, [author, toast]);

  const loadVault = useCallback(() => {
    api.getVault(author).then((d) => setVault(d.entries || [])).catch(() => {});
  }, [author]);

  const loadEnergy = useCallback(() => {
    api.getEnergy().then((d) => setPartnerEnergy(d.statuses || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    if (!sessionOpen || !prefs?.after_dark_unlocked) return;
    if (tab === 'jar') loadJar();
    if (tab === 'vault') loadVault();
    if (tab === 'energy') loadEnergy();
  }, [sessionOpen, prefs, tab, loadJar, loadVault, loadEnergy]);

  function tryPin() {
    const saved = localStorage.getItem(AFTER_DARK_PIN_KEY);
    if (!saved || pinInput === saved) {
      unlockSession();
      setSessionOpen(true);
      setPinInput('');
      return;
    }
    toast('Wrong PIN', 'error');
  }

  async function addSlip(e) {
    e.preventDefault();
    if (!slipForm.body.trim()) return;
    try {
      await api.addDesireSlip(slipForm, author);
      setSlipForm({ slip_type: 'curious', body: '', chip: '', anonymous: false });
      loadJar();
      toast('Slip added', 'success');
    } catch {
      toast('Could not add slip', 'error');
    }
  }

  async function drawWild() {
    try {
      const c = await api.drawDeck({ tier: 'wild', kind: deckKind || undefined });
      setCard(c);
    } catch {
      toast('Draw failed', 'error');
    }
  }

  async function saveVault(e) {
    e.preventDefault();
    if (!vaultForm.body.trim()) return;
    try {
      await api.createVaultEntry(vaultForm, author);
      setVaultForm({ entry_kind: 'fantasy', title: '', body: '', visibility: 'private' });
      loadVault();
      toast('Saved to vault', 'success');
    } catch {
      toast('Save failed', 'error');
    }
  }

  async function saveEnergy() {
    try {
      await api.setEnergy(energy, author);
      loadEnergy();
      toast('Updated', 'success');
    } catch {
      toast('Save failed', 'error');
    }
  }

  async function submitCheckIn() {
    try {
      await api.checkIn(checkIn, author);
      toast('Check-in saved', 'success');
      setCheckIn({ rating: 'good', note: '' });
    } catch {
      toast('Save failed', 'error');
    }
  }

  if (!prefs) {
    return (
      <PageShell title="After Dark" subtitle="Loading…">
        <p className="text-muted">Loading…</p>
      </PageShell>
    );
  }

  if (!prefs.after_dark_unlocked) {
    return (
      <PageShell title="🌙 After Dark" subtitle="A private room for both of you.">
        <Card className="text-center">
          <Lock className="mx-auto mb-4 text-muted" size={40} />
          <p className="text-muted">Both partners must opt in under Settings → After Dark before this room opens.</p>
          <Button className="mt-6" variant="primary" onClick={() => window.location.assign('/settings')}>
            Go to Settings
          </Button>
        </Card>
      </PageShell>
    );
  }

  if (!sessionOpen) {
    const hasPin = Boolean(localStorage.getItem(AFTER_DARK_PIN_KEY));
    return (
      <PageShell title="🌙 After Dark" subtitle="Enter your optional PIN to open this session.">
        <Card className="max-w-sm">
          {hasPin ? (
            <>
              <Input label="PIN" type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} />
              <Button className="mt-4 w-full" variant="primary" onClick={tryPin}>Unlock</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">No PIN set — tap to open for 30 minutes.</p>
              <Button className="mt-4 w-full" variant="primary" onClick={() => { unlockSession(); setSessionOpen(true); }}>
                Open After Dark
              </Button>
            </>
          )}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="🌙 After Dark" subtitle="Private · consent-first · just the two of you.">
      <SectionHint>
        Desire jar, wild deck, vault, and energy — nothing here appears on your main dashboard unless you choose to tease energy in Settings.
      </SectionHint>

      <div className="mb-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? 'primary' : 'secondary'} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'jar' && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-xl">Drop a slip</h2>
            <form onSubmit={addSlip} className="mt-4 space-y-4">
              <Select label="Type" value={slipForm.slip_type} onChange={(e) => setSlipForm({ ...slipForm, slip_type: e.target.value })}>
                <option value="curious">Curious</option>
                <option value="into">Into</option>
                <option value="someday">Someday</option>
                <option value="hard_no">Hard no (boundary)</option>
              </Select>
              <p className="mb-2 text-sm text-muted">
                Chips optional — pick the same one to match on a topic, or leave blank and match on Curious/Into alone.
              </p>
              <div className="flex flex-wrap gap-2">
                {jarChips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs ${slipForm.chip === c ? 'bg-accent text-white' : 'bg-white/10'}`}
                    onClick={() => setSlipForm({ ...slipForm, chip: c })}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <TextArea label="Your words" value={slipForm.body} onChange={(e) => setSlipForm({ ...slipForm, body: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={slipForm.anonymous} onChange={(e) => setSlipForm({ ...slipForm, anonymous: e.target.checked })} />
                Anonymous to partner until revealed
              </label>
              <Button type="submit" variant="primary">Add to jar</Button>
            </form>
          </Card>
          <div className="space-y-3">
            {jar.map((s) => (
              <Card key={s.id}>
                <p className="text-xs uppercase text-muted">
                  {s.slip_type}
                  {s.chip ? ` · ${s.chip}` : ''}
                  {s.matched_id ? ' · matched' : ''}
                  {s.revealed ? ' · revealed' : ''}
                </p>
                <p className="mt-2">
                  {s.body
                    || (s.matched_id && !s.revealed
                      ? '(matched — tap Reveal match on your slip to unlock both)'
                      : '(hidden — waiting for a partner match on the same Curious/Into or chip)')}
                </p>
                <p className="mt-2 text-xs text-muted">— {s.author}</p>
                {s.is_mine && s.matched_id && !s.revealed && (
                  <Button size="sm" className="mt-3" variant="primary" onClick={() => api.revealDesireSlip(s.id, author).then(loadJar)}>
                    Reveal match
                  </Button>
                )}
                {s.is_mine && (
                  <Button size="sm" variant="danger" className="mt-2" onClick={() => api.deleteDesireSlip(s.id, author).then(loadJar)}>
                    Remove
                  </Button>
                )}
              </Card>
            ))}
            {!jar.length && <p className="text-muted">Jar is empty — be the first to drop something.</p>}
          </div>
        </div>
      )}

      {tab === 'deck' && (
        <Card>
          <h2 className="font-display text-xl">Wild deck</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {['', 'truth', 'dare', 'challenge'].map((k) => (
              <Button key={k || 'all'} size="sm" variant={deckKind === k ? 'primary' : 'secondary'} onClick={() => setDeckKind(k)}>
                {k || 'Any'}
              </Button>
            ))}
          </div>
          <Button className="mt-6" variant="primary" onClick={drawWild}><Flame size={16} /> Draw card</Button>
          {card && (
            <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
              <p className="text-xs uppercase text-accent-soft">{card.kind}</p>
              <p className="mt-3 font-display text-xl leading-relaxed">{card.text}</p>
              <p className="mt-4 text-sm text-muted">Pass anytime — no streaks, no pressure.</p>
            </div>
          )}
        </Card>
      )}

      {tab === 'vault' && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-xl">New vault entry</h2>
            <form onSubmit={saveVault} className="mt-4 space-y-4">
              <Select label="Kind" value={vaultForm.entry_kind} onChange={(e) => setVaultForm({ ...vaultForm, entry_kind: e.target.value })}>
                <option value="fantasy">Fantasy</option>
                <option value="scene">Scene</option>
                <option value="open_when">Open when</option>
              </Select>
              <Input label="Title (optional)" value={vaultForm.title} onChange={(e) => setVaultForm({ ...vaultForm, title: e.target.value })} />
              <TextArea label="Body" value={vaultForm.body} onChange={(e) => setVaultForm({ ...vaultForm, body: e.target.value })} />
              <Select label="Visibility" value={vaultForm.visibility} onChange={(e) => setVaultForm({ ...vaultForm, visibility: e.target.value })}>
                <option value="private">Private</option>
                <option value="offered">Offer to partner</option>
                <option value="shared">Shared now</option>
              </Select>
              <Button type="submit" variant="primary">Save</Button>
            </form>
          </Card>
          <div className="space-y-3">
            {vault.map((v) => (
              <Card key={v.id}>
                {v.locked ? (
                  <>
                    <p className="text-sm text-muted">{v.title || 'Locked entry'}</p>
                    <p className="text-xs text-muted">— {v.author}</p>
                    {!v.is_mine && v.visibility === 'offered' && (
                      <Button size="sm" className="mt-3" onClick={() => api.acceptVault(v.id, author).then(loadVault)}>
                        Accept & read
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="font-display text-lg">{v.title || v.entry_kind}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{v.body}</p>
                    <p className="mt-2 text-xs text-muted">— {v.author}</p>
                  </>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'energy' && (
        <Card>
          <h2 className="font-display text-xl">Us tonight</h2>
          <p className="mt-2 text-sm text-muted">Expires in 12 hours. Optional tease on dashboard in Settings.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Select label="Energy" value={energy.energy} onChange={(e) => setEnergy({ ...energy, energy: e.target.value })}>
              <option value="quiet">Quiet</option>
              <option value="playful">Playful</option>
              <option value="very">Very</option>
            </Select>
            <Select label="Surprises" value={energy.surprises} onChange={(e) => setEnergy({ ...energy, surprises: e.target.value })}>
              <option value="open">Open</option>
              <option value="ask">Ask first</option>
              <option value="no">Not tonight</option>
            </Select>
          </div>
          <Button className="mt-4" variant="primary" onClick={saveEnergy}>Update</Button>
          <div className="mt-8 space-y-2">
            {partnerEnergy.filter((p) => p.author !== author).map((p) => (
              <p key={p.author} className="text-sm">
                <Moon size={14} className="inline text-accent-soft" /> {p.author}: {p.energy} · surprises: {p.surprises}
              </p>
            ))}
          </div>
        </Card>
      )}

      {tab === 'checkin' && (
        <Card>
          <h2 className="font-display text-xl">How did that land?</h2>
          <Select label="Rating" value={checkIn.rating} onChange={(e) => setCheckIn({ ...checkIn, rating: e.target.value })} className="mt-4">
            <option value="great">Great</option>
            <option value="good">Good</option>
            <option value="talk">Let&apos;s talk</option>
            <option value="not_for_me">Not for me</option>
          </Select>
          <TextArea label="Note (optional)" value={checkIn.note} onChange={(e) => setCheckIn({ ...checkIn, note: e.target.value })} className="mt-4" />
          <Button className="mt-4" variant="primary" onClick={submitCheckIn}>Save check-in</Button>
        </Card>
      )}
    </PageShell>
  );
}
