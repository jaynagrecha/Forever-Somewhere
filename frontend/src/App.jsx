import { Routes, Route } from 'react-router-dom';
import Recover from './pages/Recover';
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
import AfterDark from './pages/AfterDark';
import OurStory from './pages/OurStory';
import Quiz from './pages/Quiz';
import StarMap from './pages/StarMap';
import MoodBoard from './pages/MoodBoard';
import PageShell from './components/Layout/PageShell';
import ProtectedRoute from './components/ProtectedRoute';

function NotFound() {
  return (
    <PageShell title="Lost somewhere?" subtitle="This page doesn't exist.">
      <a href="/dashboard" className="text-accent-soft underline">
        Back to dashboard
      </a>
    </PageShell>
  );
}

function Guard({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/recover" element={<Recover />} />
      <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
      <Route path="/moments" element={<Guard><Moments /></Guard>} />
      <Route path="/somewhere" element={<Guard><Somewhere /></Guard>} />
      <Route path="/someday" element={<Guard><Someday /></Guard>} />
      <Route path="/forever" element={<Guard><Forever /></Guard>} />
      <Route path="/settings" element={<Guard><Settings /></Guard>} />
      <Route path="/calendar" element={<Guard><Calendar /></Guard>} />
      <Route path="/slideshow" element={<Guard><Slideshow /></Guard>} />
      <Route path="/date-night" element={<Guard><DateNight /></Guard>} />
      <Route path="/after-dark" element={<Guard><AfterDark /></Guard>} />
      <Route path="/story" element={<Guard><OurStory /></Guard>} />
      <Route path="/quiz" element={<Guard><Quiz /></Guard>} />
      <Route path="/star-map" element={<Guard><StarMap /></Guard>} />
      <Route path="/mood-board" element={<Guard><MoodBoard /></Guard>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
