export function buildCalendarEvents({ memories, capsules, importantDates, tripPins, dreams }) {
  const events = [];

  memories.forEach((m) => {
    if (!m.date) return;
    events.push({
      id: `memory-${m.id}`,
      kind: 'memory',
      title: m.title,
      date: m.date,
      route: '/moments',
      color: '#ff4d6d',
    });
  });

  capsules.forEach((c) => {
    events.push({
      id: `capsule-${c.id}`,
      kind: 'capsule',
      title: c.title,
      date: c.unlock_date,
      route: '/forever',
      color: '#facc15',
    });
  });

  importantDates.forEach((d) => {
    events.push({
      id: `date-${d.id}`,
      kind: 'anniversary',
      title: d.title,
      date: d.event_date,
      route: '/calendar',
      color: '#a78bfa',
    });
  });

  tripPins.forEach((p) => {
    if (!p.date) return;
    events.push({
      id: `pin-${p.id}`,
      kind: 'trip',
      title: p.title?.split(',')[0] || 'Trip',
      date: p.date,
      route: '/somewhere',
      color: '#60a5fa',
    });
  });

  dreams.filter((d) => d.status === 'Planned' && d.target_year?.length === 4).forEach((d) => {
    events.push({
      id: `dream-${d.id}`,
      kind: 'dream',
      title: d.title,
      date: `${d.target_year}-06-01`,
      route: '/someday',
      color: '#34d399',
    });
  });

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function eventsForMonth(events, year, month) {
  return events.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function groupByDate(events) {
  const map = {};
  events.forEach((e) => {
    if (!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  });
  return map;
}
