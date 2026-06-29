import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActivityProvider } from './context/ActivityContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './context/LocaleContext';
import { ToastProvider } from './context/ToastContext';
import { runNotificationPoll, ensurePushRegistered } from './utils/notifications';
import { getApiBase } from './api/client';

function NotificationChecker() {
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <ThemeProvider>
          <LocaleProvider>
            <DataProvider>
              <ActivityProvider>
                <NotificationChecker />
                <App />
              </ActivityProvider>
            </DataProvider>
          </LocaleProvider>
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        const sendConfig = (worker) => {
          worker?.postMessage({ type: 'CONFIG', apiBase: getApiBase() });
        };
        sendConfig(registration.active);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'activated') sendConfig(worker);
          });
        });
      })
      .catch(() => {});
  });
}
