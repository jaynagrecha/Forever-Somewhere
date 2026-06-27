export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportArchive(api, fallbackData) {
  try {
    const res = await fetch('/api/export');
    if (res.ok) {
      const data = await res.json();
      downloadJson(`forever-somewhere-${Date.now()}.json`, data);
      return;
    }
  } catch {
    /* offline fallback */
  }
  downloadJson(`forever-somewhere-${Date.now()}.json`, {
    exported_at: new Date().toISOString(),
    ...fallbackData,
  });
}
