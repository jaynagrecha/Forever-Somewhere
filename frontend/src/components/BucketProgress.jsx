import Card from './ui/Card';
import { useData } from '../context/DataContext';

export default function BucketProgress() {
  const { insights, dreams } = useData();
  const progress = insights.bucket_progress;
  const completed = dreams.filter((d) => d.status === 'Completed').length;

  return (
    <Card className="mb-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">Bucket list</h2>
          <p className="mt-1 text-sm text-muted">
            {completed} of {dreams.length} dreams completed
          </p>
        </div>
        <span className="text-3xl font-semibold text-accent-soft">{progress}%</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </Card>
  );
}
