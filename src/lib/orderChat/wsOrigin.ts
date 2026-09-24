/**
 * Origin для Socket.IO (без `/api/v1`).
 * В dev Vite проксирует `/socket.io` на Nest; в prod — nginx `location /socket.io/`.
 */
export function getWsOrigin(): string {
  const override = (import.meta.env.VITE_SOCKET_ORIGIN as string | undefined)?.trim();
  if (override) {
    try {
      return new URL(override).origin;
    } catch {
      /* fall through */
    }
  }
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api/v1';
  if (raw.startsWith('/')) {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://localhost:5173';
  }
  try {
    return new URL(raw).origin;
  } catch {
    return 'http://127.0.0.1:3001';
  }
}
