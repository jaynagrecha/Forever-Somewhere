import { Link } from 'react-router-dom';
import { CalendarHeart } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { useData } from '../context/DataContext';

export default function OnThisDayBanner() {
  const { insights } = useData();
  const onThisDay = insights.on_this_day || [];
  if (!onThisDay.length) return null;

  return (
    <Card highlight className="mb-8 border-accent/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-accent-soft">
            <CalendarHeart size={18} />
            <span className="text-sm font-medium">On This Day</span>
          </div>
          <p className="text-muted">
            {onThisDay.length} memor{onThisDay.length === 1 ? 'y' : 'ies'} from today in your past
          </p>
          <ul className="mt-3 space-y-1">
            {onThisDay.slice(0, 3).map((m) => (
              <li key={m.id} className="font-medium">
                {m.title} {m.date && <span className="text-muted">({m.date})</span>}
              </li>
            ))}
          </ul>
        </div>
        <Link to="/moments">
          <Button variant="primary" size="sm">
            View timeline
          </Button>
        </Link>
      </div>
    </Card>
  );
}
