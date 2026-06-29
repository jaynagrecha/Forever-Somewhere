import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { runNotificationPoll, ensurePushRegistered } from '../utils/notifications';

export default function NotificationChecker() {
  const { isAuthed } = useAuth();

  useEffect(() => {
    if (!isAuthed) return undefined;

    runNotificationPoll();
    ensurePushRegistered();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') runNotificationPoll();
    }, 20_000);

    const onVis = () => {
      if (document.visibilityState === 'visible') runNotificationPoll();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAuthed]);

  return null;
}
