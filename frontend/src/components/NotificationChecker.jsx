import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  PARTNER_ACTIVITY_TOAST_EVENT,
  ensurePushRegistered,
  pollPartnerActivityFeed,
  runNotificationPoll,
} from '../utils/notifications';

export default function NotificationChecker() {
  const { isAuthed } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const onPartner = (event) => {
      const { title, body } = event.detail || {};
      if (!title) return;
      toast(body ? `${title} — ${body}` : title, 'info');
    };
    window.addEventListener(PARTNER_ACTIVITY_TOAST_EVENT, onPartner);
    return () => window.removeEventListener(PARTNER_ACTIVITY_TOAST_EVENT, onPartner);
  }, [toast]);

  useEffect(() => {
    if (!isAuthed) return undefined;

    pollPartnerActivityFeed();
    runNotificationPoll();
    ensurePushRegistered();

    const tick = () => {
      pollPartnerActivityFeed();
      if (document.visibilityState === 'visible') runNotificationPoll();
    };

    const interval = setInterval(tick, 20_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAuthed]);

  return null;
}
