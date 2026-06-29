import Button from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from '../context/ToastContext';
import { api, formatApiError } from '../api/client';

export default function PartnerRecoverySetup({ slot, partnerName, recovery, form, onFormChange, onSettingsRefresh }) {
  const { toast } = useToast();

  async function sendVerifyOtp() {
    if (!form.email.trim()) return toast('Enter an email', 'error');
    try {
      await api.requestRecoveryEmailVerify({ partner_slot: slot, email: form.email.trim() });
      toast(`Verification code sent to ${partnerName}'s inbox`, 'success');
      onFormChange({ step: 2 });
    } catch (err) {
      toast(formatApiError(err), 'error');
    }
  }

  async function confirmVerifyOtp() {
    try {
      await api.confirmRecoveryEmailVerify({
        partner_slot: slot,
        email: form.email.trim(),
        otp: form.otp.trim(),
      });
      toast(`${partnerName}'s recovery email saved`, 'success');
      onFormChange({ step: 1, otp: '', email: '' });
      onSettingsRefresh();
    } catch (err) {
      toast(formatApiError(err), 'error');
    }
  }

  async function generateBackup() {
    try {
      const res = await api.generateRecoveryBackupCode({ partner_slot: slot });
      onFormChange({ backupShown: res.backup_code });
      toast(`Save ${partnerName}'s backup code now — shown once`, 'success');
      onSettingsRefresh();
    } catch (err) {
      toast(formatApiError(err), 'error');
    }
  }

  if (!recovery) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="font-medium text-white">Recovery for {partnerName}</p>
      <p className="mt-1 text-sm text-muted">
        Your personal recovery — set this up on your phone after you lock your identity in Settings.
      </p>
      <p className="mt-3 text-sm">
        Status:{' '}
        {recovery.verified ? (
          <span className="text-green-400">✓ {recovery.email_masked}</span>
        ) : (
          <span className="text-muted">No verified email yet</span>
        )}
        {recovery.has_backup && <span className="ml-2 text-accent-soft">· Backup code on file</span>}
      </p>
      {!recovery.verified && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            label={`${partnerName}'s recovery email`}
            type="email"
            value={form.email}
            onChange={(e) => onFormChange({ email: e.target.value })}
            placeholder={`${partnerName.toLowerCase()}@example.com`}
            disabled={form.step === 2}
          />
          {form.step === 1 ? (
            <div className="flex items-end">
              <Button variant="primary" onClick={sendVerifyOtp}>Send verification code</Button>
            </div>
          ) : (
            <>
              <Input
                label="6-digit code from email"
                value={form.otp}
                onChange={(e) => onFormChange({ otp: e.target.value })}
                placeholder="123456"
                maxLength={6}
              />
              <div className="flex flex-wrap items-end gap-2">
                <Button variant="primary" onClick={confirmVerifyOtp}>Confirm email</Button>
                <Button variant="secondary" onClick={() => onFormChange({ step: 1, otp: '' })}>Change email</Button>
              </div>
            </>
          )}
        </div>
      )}
      <div className="mt-4">
        <Button variant="secondary" onClick={generateBackup}>
          {recovery.has_backup ? `Generate new backup code for ${partnerName}` : `Generate backup code for ${partnerName}`}
        </Button>
      </div>
      {form.backupShown && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-200">
            {partnerName} — save now, won&apos;t show again
          </p>
          <p className="mt-2 font-mono text-lg tracking-wider text-white">{form.backupShown}</p>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(form.backupShown);
              toast('Backup code copied', 'success');
            }}
          >
            Copy code
          </Button>
        </div>
      )}
    </div>
  );
}
