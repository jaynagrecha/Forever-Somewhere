import { getApiBase } from '../api/client';

/** Prefix relative /uploads/ paths with the API host in production. */
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const apiBase = getApiBase();
  return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
}
