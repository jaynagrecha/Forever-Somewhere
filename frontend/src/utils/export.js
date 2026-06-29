import { api as defaultApi } from '../api/client';

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportArchive(apiClient = defaultApi, fallbackData) {
  try {
    const data = await apiClient.exportArchive();
    downloadJson(`forever-somewhere-${Date.now()}.json`, data);
    return;
  } catch {
    /* offline or API unavailable — use local snapshot */
  }
  downloadJson(`forever-somewhere-${Date.now()}.json`, {
    exported_at: new Date().toISOString(),
    ...fallbackData,
  });
}
