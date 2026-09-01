/** Post-auth return URL (quiz etc.) — sessionStorage + location.state.from. */

export const AUTH_RETURN_STORAGE_KEY = 'miraflores_auth_return';

export function setAuthReturnUrl(url: string): void {
  sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, url);
}

export function peekAuthReturnUrl(): string | null {
  return sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
}

export function consumeAuthReturnUrl(): string | null {
  const url = sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
  if (url) sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
  return url;
}

function sanitizeInternalPath(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  const t = path.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return null;
  if (
    t.startsWith('/sign-in') ||
    t.startsWith('/sign-up') ||
    t.startsWith('/email-confirmation') ||
    t.startsWith('/forgot-password') ||
    t.startsWith('/reset-password')
  ) {
    return null;
  }
  return t;
}

/**
 * Единая точка редиректа после входа:
 * quiz/session return → ProtectedRoute state.from → fallback.
 */
export function resolvePostAuthRedirect(
  fallback = '/',
  locationState?: { from?: unknown } | null,
): string {
  return (
    consumeAuthReturnUrl() ||
    sanitizeInternalPath(locationState?.from) ||
    fallback
  );
}
