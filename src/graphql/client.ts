import { refreshToken } from './queries/auth.service';
import { getGraphQLEndpoint } from '@/graphql/graphqlEndpoint';

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}
export const CHANNEL = 'miraflores-site';

/**
 * Страна для поля ProductVariant.quantityAvailable(countryCode).
 * Без совпадения зон доставки склада с этой страной Saleor может отдавать 0, хотя в дашборде на складе есть остаток.
 * Переопределение: VITE_AVAILABILITY_COUNTRY_CODE (например KZ).
 */
export const AVAILABILITY_COUNTRY_FOR_STOCK =
  (import.meta.env.VITE_AVAILABILITY_COUNTRY_CODE as string | undefined)?.trim() || 'RU';

export const RedirectUrl = 'http://localhost:5173/email-confirmation';

type RefreshOutcome =
  | { kind: 'ok'; token: string }
  | { kind: 'logout' }
  /** Временная ошибка (сеть/CORS): сессию не сбрасываем */
  | { kind: 'soft_fail' };

function isLikelyTransientFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('load failed') ||
    m.includes('aborted') ||
    m.includes('aborterror') ||
    m.includes('timeout') ||
    m.includes('the internet connection appears') ||
    m.includes('подключен')
  );
}

/** Одна общая операция refresh для всех параллельных GraphQL-запросов с истёкшим JWT */
let refreshChain: Promise<RefreshOutcome> | null = null;

async function runRefreshOnce(): Promise<RefreshOutcome> {
  const storedRefreshToken = localStorage.getItem('refreshToken');
  if (!storedRefreshToken || storedRefreshToken === 'null' || storedRefreshToken === 'undefined') {
    return { kind: 'logout' };
  }

  try {
    console.log('[Token Refresh] Attempting to refresh token...');
    const result = await refreshToken(storedRefreshToken);
    if (result?.token) {
      localStorage.setItem('token', result.token);
      console.log('[Token Refresh] Token refreshed successfully');
      return { kind: 'ok', token: result.token };
    }
    return { kind: 'logout' };
  } catch (error: unknown) {
    console.error('[Token Refresh] Failed to refresh token:', error);
    const msg = String(error instanceof Error ? error.message : error);

    if (isLikelyTransientFailure(msg)) {
      return { kind: 'soft_fail' };
    }

    const lower = msg.toLowerCase();
    if (
      lower.includes('invalidrefreshtoken') ||
      lower.includes('jwt_invalid') ||
      lower.includes('token refresh failed') ||
      (lower.includes('refresh') && lower.includes('invalid'))
    ) {
      return { kind: 'logout' };
    }

    // Неизвестная ошибка сервера — не разлогиниваем автоматически
    return { kind: 'soft_fail' };
  }
}

async function queueRefreshAccessToken(): Promise<RefreshOutcome> {
  if (!refreshChain) {
    refreshChain = runRefreshOnce().finally(() => {
      refreshChain = null;
    });
  }
  return refreshChain;
}

function clearAuthStorage(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
}

function isJwtExpiredGraphqlError(first: GraphQLError): boolean {
  const msg = first.message || '';
  const extCode = (first.extensions as { exception?: { code?: string } } | undefined)?.exception?.code;
  return (
    msg.includes('Signature has expired') ||
    msg.includes('token expired') ||
    msg.includes('ExpiredSignatureError') ||
    msg.includes('JWT_EXPIRED') ||
    extCode === 'ExpiredSignatureError' ||
    extCode === 'JWT_EXPIRED'
  );
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const endpoint = getGraphQLEndpoint();

  let rawToken = localStorage.getItem('token');
  let token = rawToken && rawToken !== 'null' && rawToken !== 'undefined' ? rawToken : null;

  if (query.includes('accountUpdate')) {
    console.log('GraphQL Request - Token check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  let json = (await res.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    const first = json.errors[0];
    const msg = first.message || '';

    if (isJwtExpiredGraphqlError(first)) {
      const outcome = await queueRefreshAccessToken();

      if (outcome.kind === 'ok') {
        headers['Authorization'] = `Bearer ${outcome.token}`;
        res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables })
        });
        json = (await res.json()) as GraphQLResponse<T>;

        if (!json.errors || json.errors.length === 0) {
          if (!json.data) {
            throw new Error('GraphQL response did not contain data');
          }
          return json.data;
        }

        console.error('[GraphQL] Token refresh did not resolve errors:', json.errors);
        throw new Error(json.errors[0]?.message || 'GraphQL error after token refresh');
      }

      if (outcome.kind === 'logout') {
        clearAuthStorage();
        if (typeof window !== 'undefined' && window.location.pathname !== '/sign-in') {
          window.location.href = '/sign-in';
        }
        throw new Error('TokenExpired');
      }

      throw new Error(msg || 'JWT expired; temporary refresh failure — try again');
    }

    if (msg.includes('PermissionDenied') || msg.includes('AUTHENTICATED_USER')) {
      const currentToken = localStorage.getItem('token');
      console.error('Permission denied error:', {
        hasToken: !!currentToken,
        tokenLength: currentToken?.length,
        endpoint,
        query: query.substring(0, 100),
        responseStatus: res.status
      });

      if (currentToken) {
        console.warn('Permission denied - token may be invalid or expired. Try refreshing auth.');
      }
      throw new Error(msg || 'Permission denied');
    }

    throw new Error(msg || 'GraphQL error');
  }

  if (!json.data) {
    throw new Error('GraphQL response did not contain data');
  }

  return json.data;
}
