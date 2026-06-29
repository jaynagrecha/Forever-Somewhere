/** Safe in-app path after login (blocks open redirects). */
export function resolvePostLoginPath(from) {
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from !== '/') {
    return from;
  }
  return '/dashboard';
}
