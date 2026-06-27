import { API_BASE } from '../api/client';

/** Prefix relative /uploads/ paths with the API host in production. */
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}
