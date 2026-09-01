/**
 * HTTP-клиент Админ панели 2.0 (Nest `/api/v1`).
 *
 * Access JWT в `localStorage.token` — нормально для SPA без BFF.
 * Harden: CSP на CDN/прокси, короткий JWT_EXPIRES_IN, logout → tokenVersion++,
 * CMS HTML только через sanitize. httpOnly cookie — при появлении BFF.
 * Пароль регистрации — только in-memory (см. registerSession.ts).
 */

import { notifyUnauthorized } from '@/api/authSession';
import { clearRegisterPassword } from '@/api/registerSession';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function apiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api/v1';
  return raw.replace(/\/+$/, '');
}

function stripDevUploadsOrigin(url: string): string {
  return url.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):(?:3001|8000)/gi, '');
}

/** Абсолютный URL медиа с Nest (или relative `/uploads/...` через Vite proxy). */
export function uploadsUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  const s = stripDevUploadsOrigin(pathOrUrl.trim());
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
  const origin = (import.meta.env.VITE_UPLOADS_ORIGIN as string | undefined)?.replace(/\/+$/, '') || '';
  const path = s.startsWith('/') ? s : `/${s}`;
  return origin ? `${origin}${path}` : path;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem('token');
  return t && t !== 'null' && t !== 'undefined' ? t : null;
}

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (!token) {
    localStorage.removeItem('token');
    return;
  }
  localStorage.setItem('token', token);
}

export function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('email');
  sessionStorage.removeItem('miraflores.register.completionToken');
  sessionStorage.removeItem('miraflores.register.otpSent');
  sessionStorage.removeItem('miraflores_auth_return');
  // Guest id (miraflores.guest.v1 / legacy jcos) не трогаем — нужен для claim заказов.
  clearRegisterPassword();
}

const GUEST_KEY = 'miraflores.guest.v1';
const LEGACY_GUEST_KEY = 'jcos.guest.v1';

export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(GUEST_KEY) || localStorage.getItem(LEGACY_GUEST_KEY);
  if (id && !localStorage.getItem(GUEST_KEY)) {
    localStorage.setItem(GUEST_KEY, id);
    localStorage.removeItem(LEGACY_GUEST_KEY);
  }
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `g-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

type ApiFetchOptions = RequestInit & {
  /** Не прикреплять Bearer (login/register). */
  skipAuth?: boolean;
  /** Не чистить сессию и не звать notifyUnauthorized на 401 (например, logout). */
  skipUnauthorizedNotify?: boolean;
  /** Query string object. */
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = `${apiBase()}${p}`;
  if (!query) return base;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { skipAuth, skipUnauthorizedNotify, query, headers: hdrs, ...init } = options;
  const headers = new Headers(hdrs);
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(buildUrl(path, query), {
    ...init,
    headers,
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && body !== null && 'message' in body
        ? Array.isArray((body as { message: unknown }).message)
          ? ((body as { message: string[] }).message).join(', ')
          : String((body as { message: unknown }).message)
        : body && typeof body === 'object' && body !== null && 'error' in body
          ? String((body as { error: unknown }).error)
          : `HTTP ${res.status}`;
    if (res.status === 401 && !skipAuth && !skipUnauthorizedNotify) {
      clearAuthStorage();
      notifyUnauthorized();
    }
    throw new ApiError(msg || `HTTP ${res.status}`, res.status, body);
  }

  return body as T;
}

export async function apiJson<T = unknown>(
  path: string,
  method: string,
  body?: unknown,
  options: Omit<ApiFetchOptions, 'method' | 'body'> = {},
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
