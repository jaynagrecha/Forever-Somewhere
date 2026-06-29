import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { ActivityProvider } from './context/ActivityContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './context/LocaleContext';
import { ToastProvider } from './context/ToastContext';
import NotificationChecker from './components/NotificationChecker';
import { initNotificationBridge } from './utils/notifications';
import { getApiBase } from './api/client';

initNotificationBridge();

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
