import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, KeyRound, Sparkles } from 'lucide-react';
import StarBackground from '../components/StarBackground';
import BrandLogo from '../components/BrandLogo';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';

export default function Landing() {
  const navigate = useNavigate();
  const { login, isAuthed, displayName, partnerNames } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState('welcome');
  const [busy, setBusy] = useState(false);

  const [createForm, setCreateForm] = useState({
    display_name: '',
    partner1_name: '',
    partner2_name: '',
    password: '',
  });
  const [joinForm, setJoinForm] = useState({ invite_code: '', password: '' });
  const [newInvite, setNewInvite] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.display_name.trim() || !createForm.partner1_name.trim() || !createForm.partner2_name.trim()) {
      return toast('Fill in all names', 'error');
    }
    setBusy(true);
    try {
      const session = await api.createCoupleSpace(createForm);
      login(session);
      setNewInvite(session.couple.invite_code);
      toast('Your private space is ready!', 'success');
      setMode('created');
    } catch (err) {
      toast(err.message || 'Could not create space', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinForm.invite_code.trim()) return toast('Enter invite code', 'error');
    setBusy(true);
    try {
      const session = await api.joinCoupleSpace(joinForm);
      login(session);
      toast('Welcome back to your space', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.message || 'Could not join', 'error');
    } finally {
      setBusy(false);
    }
  }

  const subtitle = isAuthed
    ? displayName
    : 'A private world for two — anywhere on Earth';

  return (
    <StarBackground>
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
        <BrandLogo size="lg" className="mb-6 flex-col gap-4 md:flex-row" textClassName="text-center md:text-left" />
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-accent-soft">
          {isAuthed && partnerNames.length >= 2
            ? `${partnerNames[0]} & ${partnerNames[1]}`
            : 'For every couple'}
        </p>
        <h1 className="sr-only">Forever, Somewhere</h1>
        <p className="mt-6 max-w-lg text-lg text-muted md:text-xl">
          {subtitle}
          <br />
          Every place you&apos;ve loved. Every place you&apos;ll find.
        </p>

        {isAuthed ? (
          <Button variant="primary" size="lg" className="mt-10" onClick={() => navigate('/dashboard')}>
            Enter {displayName || 'Our World'}
          </Button>
        ) : (
          <div className="mt-10 w-full max-w-md text-left">
            {mode === 'welcome' && (
              <div className="grid gap-4">
                <Button variant="primary" size="lg" onClick={() => setMode('create')}>
                  <Sparkles size={18} /> Create our private space
                </Button>
                <Button variant="secondary" size="lg" onClick={() => setMode('join')}>
                  <KeyRound size={18} /> Join with invite code
                </Button>
                <Button variant="ghost" size="lg" onClick={() => navigate('/recover')}>
                  Recover our space
                </Button>
                <p className="text-center text-xs text-muted">
                  One space per couple. Your memories never mix with anyone else&apos;s.
                </p>
              </div>
            )}

            {mode === 'create' && (
              <Card>
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input
                    label="Couple / space name"
                    value={createForm.display_name}
                    onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                    placeholder="Ben & Julie"
                  />
                  <Input
                    label="Partner 1 name"
                    value={createForm.partner1_name}
                    onChange={(e) => setCreateForm({ ...createForm, partner1_name: e.target.value })}
                  />
                  <Input
                    label="Partner 2 name"
                    value={createForm.partner2_name}
                    onChange={(e) => setCreateForm({ ...createForm, partner2_name: e.target.value })}
                  />
                  <Input
                    label="Space password (optional)"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Recommended if you share the code"
                  />
                  <Button variant="primary" type="submit" disabled={busy} className="w-full">
                    Create space
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setMode('welcome')}>
                    Back
                  </Button>
                </form>
              </Card>
            )}

            {mode === 'created' && (
              <Card highlight className="text-center">
                <p className="text-sm text-gold">Share this invite code with your partner</p>
                <p className="mt-3 font-mono text-3xl tracking-widest text-accent-soft">{newInvite}</p>
                <p className="mt-4 text-sm text-muted">
                  They open this same app URL and tap &quot;Join with invite code&quot;.
                </p>
                <Button className="mt-6" variant="primary" onClick={() => navigate('/dashboard')}>
                  Enter our world
                </Button>
              </Card>
            )}

            {mode === 'join' && (
              <Card>
                <form onSubmit={handleJoin} className="space-y-4">
                  <Input
                    label="Invite code"
                    value={joinForm.invite_code}
                    onChange={(e) => setJoinForm({ ...joinForm, invite_code: e.target.value.toUpperCase() })}
                    placeholder="ABCD-1234"
                  />
                  <Input
                    label="Space password (if set)"
                    type="password"
                    value={joinForm.password}
                    onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
                  />
                  <Button variant="primary" type="submit" disabled={busy} className="w-full">
                    Join space
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setMode('welcome')}>
                    Back
                  </Button>
                </form>
              </Card>
            )}
          </div>
        )}
      </div>

      <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        {isAuthed && partnerNames.length >= 2 ? (
          <div className="flex items-center justify-center gap-2 font-display text-xl">
            {partnerNames[0]} <Heart className="text-accent" size={20} fill="currentColor" /> {partnerNames[1]}
          </div>
        ) : (
          <p className="text-sm text-muted">Private spaces for couples worldwide</p>
        )}
        <p className="mt-1 text-sm italic tracking-wider text-muted">Forever, Somewhere.</p>
      </footer>
    </StarBackground>
  );
}
