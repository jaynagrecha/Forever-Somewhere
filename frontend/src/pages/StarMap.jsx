import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import PageShell from '../components/Layout/PageShell';
import Card from '../components/ui/Card';
import { useData } from '../context/DataContext';

const ZODIAC = [
  { name: 'Aries', symbol: '♈', start: [3, 21], end: [4, 19] },
  { name: 'Taurus', symbol: '♉', start: [4, 20], end: [5, 20] },
  { name: 'Gemini', symbol: '♊', start: [5, 21], end: [6, 20] },
  { name: 'Cancer', symbol: '♋', start: [6, 21], end: [7, 22] },
  { name: 'Leo', symbol: '♌', start: [7, 23], end: [8, 22] },
  { name: 'Virgo', symbol: '♍', start: [8, 23], end: [9, 22] },
  { name: 'Libra', symbol: '♎', start: [9, 23], end: [10, 22] },
  { name: 'Scorpio', symbol: '♏', start: [10, 23], end: [11, 21] },
  { name: 'Sagittarius', symbol: '♐', start: [11, 22], end: [12, 21] },
  { name: 'Capricorn', symbol: '♑', start: [12, 22], end: [1, 19] },
  { name: 'Aquarius', symbol: '♒', start: [1, 20], end: [2, 18] },
  { name: 'Pisces', symbol: '♓', start: [2, 19], end: [3, 20] },
];

function signForDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  for (const z of ZODIAC) {
    const [sm, sd] = z.start;
    const [em, ed] = z.end;
    if (sm === 12 && em === 1) {
      if ((m === 12 && day >= sd) || (m === 1 && day <= ed)) return z;
    } else if ((m === sm && day >= sd) || (m === em && day <= ed) || (m > sm && m < em)) {
      return z;
    }
  }
  return ZODIAC[0];
}

export default function StarMap() {
  const { memories, importantDates } = useData();

  const stars = useMemo(() => {
    const points = [];
    memories.filter((m) => m.isMilestone || m.is_milestone).forEach((m, i) => {
      const sign = signForDate(m.date);
      points.push({ id: `m-${m.id}`, label: m.title, sign, angle: (i * 47) % 360 });
    });
    importantDates.forEach((d, i) => {
      const sign = signForDate(d.event_date);
      points.push({ id: `d-${d.id}`, label: d.title, sign, angle: (i * 61 + 90) % 360 });
    });
    return points;
  }, [memories, importantDates]);

  return (
    <PageShell title="✨ Star map" subtitle="Milestones and anniversaries as constellations — our sky together.">
      <Card className="relative mx-auto aspect-square max-w-lg overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e1b4b,#020617)]" />
        {[...Array(40)].map((_, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/40"
            style={{ left: `${(i * 17) % 100}%`, top: `${(i * 23) % 100}%` }}
          />
        ))}
        {stars.map((s) => {
          const rad = (s.angle * Math.PI) / 180;
          const x = 50 + Math.cos(rad) * 38;
          const y = 50 + Math.sin(rad) * 38;
          return (
            <div
              key={s.id}
              className="absolute text-center"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span className="text-2xl">{s.sign?.symbol || '★'}</span>
              <p className="mt-1 max-w-[88px] text-[10px] leading-tight text-muted">{s.label}</p>
            </div>
          );
        })}
        {!stars.length && (
          <div className="absolute inset-0 flex items-center justify-center text-muted">
            <Sparkles className="mr-2" size={18} /> Add milestones or anniversaries
          </div>
        )}
      </Card>
      <p className="mt-6 text-center text-sm text-muted">
        Each star links a milestone memory or custom anniversary to its zodiac season.
      </p>
    </PageShell>
  );
}
