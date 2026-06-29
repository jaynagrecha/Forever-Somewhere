/** @param {string} periodStart ISO date (YYYY-MM-DD) */
export function formatPeriodLabel(periodStart, periodType) {
  const start = new Date(`${periodStart}T12:00:00`);
  if (Number.isNaN(start.getTime())) return periodStart;

  if (periodType === 'month') {
    return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function groupEntriesByPeriod(entries, periodType) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.period_start;
    if (!groups.has(key)) {
      groups.set(key, { period_start: key, period_label: formatPeriodLabel(key, periodType), entries: [] });
    }
    groups.get(key).entries.push(entry);
  }
  return [...groups.values()].sort((a, b) => b.period_start.localeCompare(a.period_start));
}

export function isCurrentPeriod(periodStart, currentPeriodStart) {
  return periodStart === currentPeriodStart;
}
