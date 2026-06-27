import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import StarBackground from '../components/StarBackground';
import Button from '../components/ui/Button';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <StarBackground>
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center animate-fade-in">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-accent-soft">
          Jay & Ikshika
        </p>
        <h1 className="font-display text-5xl leading-tight md:text-7xl">
          Forever, Somewhere
        </h1>
        <p className="mt-6 max-w-lg text-lg text-muted md:text-xl">
          Every place we&apos;ve loved.
          <br />
          Every place we&apos;ll find.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="mt-10"
          onClick={() => navigate('/dashboard')}
        >
          Enter Our World
        </Button>
      </div>

      <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        <div className="flex items-center justify-center gap-2 font-display text-xl">
          Jay <Heart className="text-accent" size={20} fill="currentColor" /> Ikshika
        </div>
        <p className="mt-1 text-sm italic tracking-wider text-muted">Forever, Somewhere.</p>
      </footer>
    </StarBackground>
  );
}
