import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageShell from '../components/Layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useData } from '../context/DataContext';
import { buildCalendarEvents, eventsForMonth, groupByDate } from '../utils/calendar';

const KIND_LABEL = {
  memory: '📸 Memory',
  capsule: '💌 Capsule',
  anniversary: '💕 Anniversary',
  trip: '🗺 Trip',
  dream: '✨ Dream',
};

export default function Calendar() {
  const data = useData();
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const allEvents = useMemo(
    () =>
      buildCalendarEvents({
        memories: data.memories,
        capsules: data.capsules,
        importantDates: data.importantDates,
        tripPins: data.tripPins,
        dreams: data.dreams,
      }),
    [data]
  );

  const monthEvents = eventsForMonth(allEvents, view.year, view.month);
  const grouped = groupByDate(monthEvents);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  function prevMonth() {
    setView((v) => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function nextMonth() {
    setView((v) => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDow = new Date(view.year, view.month, 1).getDay();

  return (
    <PageShell title="📅 Our calendar" subtitle="Memories, anniversaries, capsule unlocks, and planned trips — all in one view.">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft size={18} /></Button>
        <h2 className="font-display text-2xl">{monthLabel}</h2>
        <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight size={18} /></Button>
      </div>

      <div className="mb-8 grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const iso = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = grouped[iso] || [];
          const isToday =
            day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear();
          return (
            <div
              key={day}
              className={`min-h-[72px] rounded-xl border p-1 md:min-h-[88px] md:p-2 ${
                isToday ? 'border-accent bg-accent/10' : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              <div className={`text-sm ${isToday ? 'font-bold text-accent-soft' : ''}`}>{day}</div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <Link
                    key={e.id}
                    to={e.route}
                    className="block truncate rounded px-1 text-[10px] md:text-xs"
                    style={{ backgroundColor: `${e.color}33`, color: e.color }}
                  >
                    {e.title.split(',')[0]}
                  </Link>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-muted">+{dayEvents.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="mb-4 font-display text-xl">This month</h3>
      <div className="space-y-3">
        {monthEvents.length === 0 && <p className="text-muted">Nothing dated this month yet.</p>}
        {monthEvents.map((e) => (
          <Card key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <span className="text-xs text-muted">{KIND_LABEL[e.kind] || e.kind}</span>
              <h4 className="font-medium">{e.title}</h4>
              <p className="text-sm text-muted">{e.date}</p>
            </div>
            <Link to={e.route} className="text-sm text-accent-soft hover:underline">Open</Link>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
