import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Shield, ArrowLeft } from 'lucide-react';
import StarBackground from '../components/StarBackground';
import BrandLogo from '../components/BrandLogo';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';

export default function Recover() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState('email');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [recoveredCode, setRecoveredCode] = useState('');

  async function sendRecoveryOtp(e) {
    e.preventDefault();
    if (!email.trim()) return toast('Enter your recovery email', 'error');
    setBusy(true);
    try {
      const res = await api.recoveryStart({ email: email.trim() });
      toast(res.message || 'Check your email', 'success');
      setStep(2);
    } catch (err) {
      toast(err.message || 'Could not send code', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function completeRecovery(e) {
    e.preventDefault();
    if (!otp.trim()) return toast('Enter the code from your email', 'error');
    setBusy(true);
    try {
      const res = await api.recoveryComplete({
        email: email.trim(),
        otp: otp.trim(),
        password,
      });
      toast(res.message || 'Invite code sent!', 'success');
      setStep(3);
    } catch (err) {
      toast(err.message || 'Recovery failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function recoverWithBackup(e) {
    e.preventDefault();
    if (!backupCode.trim()) return toast('Enter your backup code', 'error');
    setBusy(true);
    try {
      const res = await api.recoveryBackup({ backup_code: backupCode.trim() });
      setRecoveredCode(res.invite_code);
      toast('Invite code recovered — save it now', 'success');
    } catch (err) {
      toast(err.message || 'Invalid backup code', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <StarBackground>
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-12">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-white">
          <ArrowLeft size={16} /> Back
        </Link>

        <BrandLogo size="sm" showText className="mb-6" />

        <h1 className="font-display text-3xl">Recover our space</h1>
        <p className="mt-2 text-muted">
          Either partner can recover alone — no need to wait on the other person.
        </p>

        <div className="mt-6 flex gap-2">
          <Button
            size="sm"
            variant={mode === 'email' ? 'primary' : 'secondary'}
            onClick={() => { setMode('email'); setStep(1); setRecoveredCode(''); }}
          >
            <Mail size={14} /> Email + code
          </Button>
          <Button
            size="sm"
            variant={mode === 'backup' ? 'primary' : 'secondary'}
            onClick={() => { setMode('backup'); setRecoveredCode(''); }}
          >
            <KeyRound size={14} /> Backup code
          </Button>
        </div>

        {mode === 'email' && (
          <Card className="mt-6">
            {step === 1 && (
              <form onSubmit={sendRecoveryOtp} className="space-y-4">
                <p className="text-sm text-muted">
                  Use the recovery email you verified in Settings. We&apos;ll send a one-time code.
                </p>
                <Input
                  label="Your recovery email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                  Send recovery code
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={completeRecovery} className="space-y-4">
                <p className="text-sm text-muted">
                  Code sent to <strong className="text-white">{email}</strong>
                </p>
                <Input
                  label="One-time code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                />
                <Input
                  label="Space password (if you set one)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional unless your space uses a password"
                />
                <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                  Email me our invite code
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>
                  Use a different email
                </Button>
              </form>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center">
                <Shield className="mx-auto text-accent-soft" size={32} />
                <p className="text-muted">
                  Your invite code was emailed to you. Open your inbox, then tap Join with invite code on the home screen.
                </p>
                <Button variant="primary" onClick={() => navigate('/')}>
                  Go to join screen
                </Button>
              </div>
            )}
          </Card>
        )}

        {mode === 'backup' && (
          <Card className="mt-6">
            <form onSubmit={recoverWithBackup} className="space-y-4">
              <p className="text-sm text-muted">
                Use the backup code you saved from Settings (when email isn&apos;t available).
              </p>
              <Input
                label="Backup code"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="FS-XXXX-XXXX-XXXX"
                className="font-mono tracking-wider"
              />
              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                Recover invite code
              </Button>
            </form>

            {recoveredCode && (
              <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
                <p className="text-sm text-muted">Your invite code</p>
                <p className="mt-2 font-mono text-2xl tracking-widest text-accent-soft">{recoveredCode}</p>
                <Button
                  className="mt-4"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(recoveredCode);
                    toast('Copied', 'success');
                  }}
                >
                  Copy code
                </Button>
                <Button className="mt-2 w-full" variant="primary" onClick={() => navigate('/')}>
                  Join our space
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </StarBackground>
  );
}
