import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { checkAndNotify } from './utils/notifications';
import { API_BASE } from './api/client';

function NotificationChecker() {
  useEffect(() => {
    checkAndNotify(API_BASE);
    const t = setInterval(() => checkAndNotify(API_BASE), 60 * 60 * 1000);
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
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
