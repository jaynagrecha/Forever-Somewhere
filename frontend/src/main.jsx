import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { checkAndNotify } from './utils/notifications';
import { getApiBase } from './api/client';

function NotificationChecker() {
  useEffect(() => {
    checkAndNotify(getApiBase());
    const t = setInterval(() => checkAndNotify(getApiBase()), 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ToastProvider>
      <DataProvider>
        <NotificationChecker />
        <App />
      </DataProvider>
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
