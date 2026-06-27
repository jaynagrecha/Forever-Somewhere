import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Moments from './pages/Moments';
import Somewhere from './pages/Somewhere';
import Someday from './pages/Someday';
import Forever from './pages/Forever';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import Slideshow from './pages/Slideshow';
import DateNight from './pages/DateNight';
import PageShell from './components/Layout/PageShell';

function NotFound() {
  return (
    <PageShell title="Lost somewhere?" subtitle="This page doesn't exist.">
      <a href="/dashboard" className="text-accent-soft underline">
        Back to dashboard
      </a>
    </PageShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/moments" element={<Moments />} />
      <Route path="/somewhere" element={<Somewhere />} />
      <Route path="/someday" element={<Someday />} />
      <Route path="/forever" element={<Forever />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/slideshow" element={<Slideshow />} />
      <Route path="/date-night" element={<DateNight />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
