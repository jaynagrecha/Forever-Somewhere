import { Link } from 'react-router-dom';
import { Calendar, Lock, MapPin, Star } from 'lucide-react';
import Card from './ui/Card';
import { useData } from '../context/DataContext';

const icons = {
  capsule: Lock,
  trip: MapPin,
  anniversary: Calendar,
  milestone: Star,
};

export default function UpcomingStrip() {
  const { insights } = useData();
  const items = insights.upcoming.filter((u) => u.days_until <= 60 && u.days_until >= 0).slice(0, 5);

  if (!items.length) return null;

  return (
    <Card className="mb-8 border-accent/15">
      <h2 className="mb-4 font-display text-xl">Coming up</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item, i) => {
          const Icon = icons[item.kind] || Calendar;
          return (
            <Link
              key={i}
              to={item.route}
              className="min-w-[180px] rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-accent/30"
            >
              <Icon size={16} className="mb-2 text-accent-soft" />
              <div className="font-medium">{item.title}</div>
              <div className="mt-1 text-sm text-muted">
                {item.days_until === 0 ? 'Today!' : `${item.days_until} days`}
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
