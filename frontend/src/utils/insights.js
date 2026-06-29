function daysUntil(targetStr, recurring = false) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetStr);
  if (recurring) {
    target.setFullYear(today.getFullYear());
    if (target < today) target.setFullYear(today.getFullYear() + 1);
  }
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function computeInsights({ memories, dreams, capsules, importantDates = [] }) {
  const today = new Date();
  const onThisDay = memories.filter((m) => {
    if (!m.date) return false;
    const d = new Date(m.date);
    return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  });

  const memoryDates = [
    ...new Set(
      memories
        .map((m) => m.date)
        .filter(Boolean)
        .map((d) => {
          const parsed = new Date(d);
          parsed.setHours(0, 0, 0, 0);
          return parsed.getTime();
        })
        .filter((t) => !Number.isNaN(t))
    ),
  ].sort((a, b) => a - b);

  let memoryStreakWeeks = 0;
  if (memoryDates.length) {
    memoryStreakWeeks = 1;
    for (let i = memoryDates.length - 1; i > 0; i -= 1) {
      const gapDays = (memoryDates[i] - memoryDates[i - 1]) / (1000 * 60 * 60 * 24);
      if (gapDays <= 7) memoryStreakWeeks += 1;
      else break;
    }
  }

  const total = dreams.length;
  const completed = dreams.filter((d) => d.status === 'Completed').length;
  const bucketProgress = total ? Math.round((completed / total) * 1000) / 10 : 0;

  const upcoming = [];

  capsules
    .filter((c) => !c.is_opened)
    .forEach((c) => {
      upcoming.push({
        kind: 'capsule',
        title: c.title,
        date: c.unlock_date,
        days_until: daysUntil(c.unlock_date),
        route: '/forever',
      });
    });

  dreams
    .filter((d) => d.status === 'Planned')
    .forEach((d) => {
      upcoming.push({
        kind: 'trip',
        title: d.title,
        date: d.target_year || 'Planned',
        days_until: 999,
        route: '/someday',
      });
    });

  importantDates.forEach((d) => {
    upcoming.push({
      kind: 'anniversary',
      title: d.title,
      date: d.event_date,
      days_until: daysUntil(d.event_date, d.recurring),
      route: '/settings',
    });
  });

  memories
    .filter((m) => m.isMilestone || m.is_milestone)
    .filter((m) => m.date)
    .forEach((m) => {
      upcoming.push({
        kind: 'milestone',
        title: m.milestoneType || m.milestone_type || m.title,
        date: m.date,
        days_until: daysUntil(m.date, true),
        route: '/moments',
      });
    });

  upcoming.sort((a, b) => a.days_until - b.days_until);

  let nextAnniversary = null;
  if (importantDates.length) {
    const nearest = [...importantDates].sort(
      (a, b) => daysUntil(a.event_date, a.recurring) - daysUntil(b.event_date, b.recurring)
    )[0];
    nextAnniversary = {
      ...nearest,
      days_until: daysUntil(nearest.event_date, nearest.recurring),
    };
  }

  return {
    on_this_day: onThisDay,
    on_this_day_count: onThisDay.length,
    bucket_progress: bucketProgress,
    memory_streak_weeks: memoryStreakWeeks,
    next_anniversary: nextAnniversary,
    upcoming: upcoming.slice(0, 12),
  };
}

export function searchAll({ memories, dreams, capsules, loveNotes }, q) {
  const term = q.toLowerCase();
  const results = [];

  memories.forEach((m) => {
    const tags = m.tags || [];
    const hay = `${m.title} ${m.location} ${m.notes} ${m.occasion}`.toLowerCase();
    if (hay.includes(term) || tags.some((t) => t.toLowerCase().includes(term))) {
      results.push({ kind: 'memory', id: m.id, title: m.title, subtitle: m.location, route: '/moments' });
    }
  });

  dreams.forEach((d) => {
    if (`${d.title} ${d.location} ${d.notes}`.toLowerCase().includes(term)) {
      results.push({ kind: 'dream', id: d.id, title: d.title, subtitle: d.status, route: '/someday' });
    }
  });

  capsules.forEach((c) => {
    if (`${c.title} ${c.content || ''}`.toLowerCase().includes(term)) {
      results.push({ kind: 'capsule', id: c.id, title: c.title, subtitle: 'Capsule', route: '/forever' });
    }
  });

  (loveNotes || []).forEach((n) => {
    if (n.content.toLowerCase().includes(term)) {
      results.push({ kind: 'note', id: n.id, title: n.content.slice(0, 40), subtitle: 'Love note', route: '/forever' });
    }
  });

  return results.slice(0, 30);
}

export function buildDreamMemoryParams(dream) {
  const params = new URLSearchParams({
    new: '1',
    title: dream.title,
    location: dream.location || '',
    occasion: `Completed dream: ${dream.title}`,
    notes: dream.notes || '',
    dreamId: String(dream.id),
  });
  return `/moments?${params.toString()}`;
}

export function memoriesForYear(memories, year) {
  return memories.filter((m) => m.date && new Date(m.date).getFullYear() === Number(year));
}
