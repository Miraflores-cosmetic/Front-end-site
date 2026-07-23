import type { SavedQuizResult, SavedQuizResultResponse } from '@/types/quizResult';
import { isSavedQuizResult } from '@/lib/quiz/savedQuizResult';

export type SaveQuizResultOutcome =
  | { ok: true }
  | { ok: false; error: string };

function getQuizResultsApiEndpoint(): string {
  if (import.meta.env.DEV) {
    return '/api/quiz/results/';
  }
  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || '';
  return graphqlUrl.replace('/graphql/', '/api/quiz/results/');
}

function getAuthHeaders(): Record<string, string> | null {
  const token = localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchSavedQuizResult(): Promise<SavedQuizResult | null> {
  const headers = getAuthHeaders();
  if (!headers) return null;

  try {
    const res = await fetch(getQuizResultsApiEndpoint(), {
      method: 'GET',
      headers,
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;

    const json = (await res.json()) as SavedQuizResultResponse;
    if (!json.result) return null;
    if (!isSavedQuizResult(json.result)) {
      console.warn('[fetchSavedQuizResult] invalid payload shape');
      return null;
    }
    return json.result;
  } catch (error) {
    console.warn('[fetchSavedQuizResult]', error);
    return null;
  }
}

export async function saveQuizResult(payload: SavedQuizResult): Promise<SaveQuizResultOutcome> {
  const headers = getAuthHeaders();
  if (!headers) {
    return { ok: false, error: 'Войдите в аккаунт, чтобы сохранить программу' };
  }

  try {
    const res = await fetch(getQuizResultsApiEndpoint(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      return { ok: false, error: 'Сессия истекла. Войдите снова и повторите сохранение' };
    }

    if (!res.ok) {
      let message = 'Не удалось сохранить программу';
      try {
        const json = await res.json();
        if (typeof json.error === 'string' && json.error.trim()) {
          message = json.error;
        }
      } catch {
        /* ignore parse errors */
      }
      console.warn('[saveQuizResult] failed', res.status, message);
      return { ok: false, error: message };
    }

    const json = await res.json();
    if (json.ok === true) {
      return { ok: true };
    }

    return {
      ok: false,
      error: typeof json.error === 'string' ? json.error : 'Не удалось сохранить программу',
    };
  } catch (error) {
    console.warn('[saveQuizResult]', error);
    return { ok: false, error: 'Ошибка сети. Проверьте подключение и попробуйте снова' };
  }
}

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

/** Единая точка редиректа после входа: return URL или fallback. */
export function resolvePostAuthRedirect(fallback = '/'): string {
  return consumeAuthReturnUrl() || fallback;
}
