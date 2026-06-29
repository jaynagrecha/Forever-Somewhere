import { Link, useLocation } from 'react-router-dom';
import { Camera, Heart, Map, Sparkles, Home, Settings } from 'lucide-react';
import StarBackground from '../StarBackground';
import BrandLogo from '../BrandLogo';
import Button from '../ui/Button';

const nav = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/moments', label: 'Moments', icon: Camera },
  { to: '/somewhere', label: 'Map', icon: Map },
  { to: '/someday', label: 'Someday', icon: Sparkles },
  { to: '/forever', label: 'Forever', icon: Heart },
  { to: '/settings', label: 'Tools', icon: Settings },
];

export default function PageShell({ title, subtitle, children, backTo = '/dashboard', hideBack = false }) {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  if (isLanding) {
    return <StarBackground>{children}</StarBackground>;
  }

  return (
    <StarBackground>
      <div className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-6 md:px-8 md:pt-8">
        <div className="mb-6 animate-fade-in">
          <BrandLogo size="sm" to="/dashboard" showText={false} className="mx-auto md:hidden" />
          <BrandLogo size="sm" to="/dashboard" className="hidden md:inline-flex" />
        </div>
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <div>
            {!hideBack && (
              <Link to={backTo}>
                <Button variant="ghost" size="sm" className="mb-4">
                  ← Back
                </Button>
              </Link>
            )}
            {title && (
              <h1 className="font-display text-3xl md:text-5xl">{title}</h1>
            )}
            {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
          </div>
        </header>

        <main className="animate-slide-up">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-ink/90 backdrop-blur-xl md:hidden">
        <div className="flex justify-around py-2">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-xs ${active ? 'text-accent' : 'text-muted'}`}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </StarBackground>
  );
}

export function SectionHint({ children }) {
  return (
    <p className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted">
      {children}
    </p>
  );
}
