/** Parse API datetimes stored as naive UTC (append Z when timezone is missing). */
export function parseUtcIso(iso) {
  if (!iso) return null;
  const trimmed = String(iso).trim();
  const hasTz = /[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed);
  const normalized = hasTz ? trimmed : `${trimmed}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format activity/event timestamps in the viewer's local timezone (IST if device is set to India). */
export function formatActivityWhen(iso) {
  const d = parseUtcIso(iso);
  if (!d) return '';

  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const dayKey = (x) => x.toDateString();

  if (dayKey(d) === dayKey(today)) return `Today · ${time}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return `Yesterday · ${time}`;

  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
  return `${date} · ${time}`;
}
