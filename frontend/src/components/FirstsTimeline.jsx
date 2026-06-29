import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { api } from '../api/client';
import { resolveMediaUrl } from '../utils/media';

export default function FirstsTimeline({ embedded = false }) {
  const navigate = useNavigate();
  const [firsts, setFirsts] = useState([]);

  useEffect(() => {
    api.getFirsts().then((d) => setFirsts(d.firsts || [])).catch(() => setFirsts([]));
  }, []);

  const content = (
    <>
      {!embedded && (
        <p className="mb-6 text-sm text-muted">
          Every first — first date, first trip, first kiss — tagged in Moments appears here.
        </p>
      )}
      <div className="relative space-y-0">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-accent/50 via-gold/30 to-transparent md:left-8" />
        {firsts.map((f, i) => (
          <div key={f.id} className="relative mb-8 ml-10 md:ml-16">
            <span className="absolute -left-[1.85rem] top-5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs md:-left-[2.35rem]">
              {i + 1}
            </span>
            <Card className="first-card overflow-hidden">
              <div className="flex gap-4">
                {f.photos?.[0]?.url && (
                  <img
                    src={resolveMediaUrl(f.photos[0].url)}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div>
                  <span className="handwritten-date text-accent-soft">{f.date || 'Undated'}</span>
                  <h3 className="font-display text-xl">{f.title}</h3>
                  {f.location && <p className="text-sm text-muted">{f.location.split(',')[0]}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(f.tags || []).map((t) => (
                      <span key={t} className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent-soft">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
        {!firsts.length && (
          <Card className="text-center text-muted">
            <Sparkles className="mx-auto mb-3 text-accent-soft" size={28} />
            Tag memories with First Date, First Trip, or First Kiss in Moments to build your firsts timeline.
            <Button className="mt-4" size="sm" onClick={() => navigate('/moments?new=1')}>
              Add a first memory
            </Button>
          </Card>
        )}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <section>
      <h2 className="mb-4 font-display text-2xl">Our firsts</h2>
      {content}
    </section>
  );
}
