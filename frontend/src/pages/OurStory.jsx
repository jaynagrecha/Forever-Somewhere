import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookHeart } from 'lucide-react';
import PageShell from '../components/Layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FirstsTimeline from '../components/FirstsTimeline';
import { api } from '../api/client';

export default function OurStory() {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState([]);
  const [tab, setTab] = useState('milestones');

  useEffect(() => {
    api.getStory().then((d) => setMilestones(d.milestones || [])).catch(() => setMilestones([]));
  }, []);

  return (
    <PageShell title="📖 Our Story" subtitle="Milestones and firsts — the timeline of us.">
      <div className="mb-8 flex gap-2">
        <Button variant={tab === 'milestones' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('milestones')}>
          Milestones
        </Button>
        <Button variant={tab === 'firsts' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('firsts')}>
          Our firsts
        </Button>
      </div>

      {tab === 'firsts' && <FirstsTimeline />}

      {tab === 'milestones' && (
        <div className="relative space-y-0">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-accent/30 md:left-1/2" />
          {milestones.map((m, i) => (
            <div
              key={m.id}
              className={`relative mb-8 flex md:mb-12 ${i % 2 === 0 ? 'md:justify-start' : 'md:justify-end'}`}
            >
              <Card
                className={`ml-10 w-full max-w-md md:ml-0 ${i % 2 === 0 ? 'md:mr-[52%]' : 'md:ml-[52%]'}`}
              >
                <span className="handwritten-date text-accent-soft">{m.milestone_type || 'Milestone'}</span>
                <h2 className="mt-1 font-display text-2xl">{m.title}</h2>
                <p className="mt-2 text-sm text-muted">
                  {m.date || 'Undated'} {m.location ? `· ${m.location}` : ''}
                </p>
                <Button size="sm" className="mt-4" onClick={() => navigate('/moments')}>
                  <BookHeart size={14} /> View in Moments
                </Button>
              </Card>
              <span className="absolute left-2 top-6 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs md:left-1/2 md:-translate-x-1/2">
                ♥
              </span>
            </div>
          ))}
          {!milestones.length && (
            <Card className="text-center text-muted">
              Mark memories as milestones in Moments to build your story timeline.
            </Card>
          )}
        </div>
      )}
    </PageShell>
  );
}
