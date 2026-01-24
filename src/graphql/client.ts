import { refreshToken } from './queries/auth.service';

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
export const RedirectUrl = 'http://localhost:5173/email-confirmation';

// Флаг для предотвращения повторных вызовов refresh token
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Функция для обновления токена
async function tryRefreshToken(): Promise<string | null> {
  // Если уже идет обновление токена, возвращаем существующий промис
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const storedRefreshToken = localStorage.getItem('refreshToken');
  if (!storedRefreshToken || storedRefreshToken === 'null' || storedRefreshToken === 'undefined') {
    return null;
  }

  // Устанавливаем флаг и создаем промис
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      console.log('[Token Refresh] Attempting to refresh token...');
      const result = await refreshToken(storedRefreshToken);
      if (result.token) {
        localStorage.setItem('token', result.token);
        console.log('[Token Refresh] Token refreshed successfully');
        return result.token;
      }
      return null;
    } catch (error) {
      console.error('[Token Refresh] Failed to refresh token:', error);
      // Очищаем токены при ошибке обновления
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      return null;
    } finally {
      // Сбрасываем флаг и промис после завершения
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  // В development используем относительный путь для прокси Vite
  // В production используем полный URL из .env
  const isDev = import.meta.env.DEV;
  let endpoint = '';
  
  if (isDev) {
    // В development используем относительный путь - Vite прокси обработает
    endpoint = '/graphql/';
  } else {
    // В production используем полный URL из .env
    endpoint = String(import.meta.env.VITE_GRAPHQL_URL || '');
  }
  
  if (!endpoint) throw new Error('VITE_GRAPHQL_URL is not defined');

  let rawToken = localStorage.getItem('token');
  let token = rawToken && rawToken !== 'null' && rawToken !== 'undefined' ? rawToken : null;

  // Логирование для отладки
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
  } else {
    console.warn('GraphQL Request - No token found in localStorage');
  }

  let res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  let json = (await res.json()) as GraphQLResponse<T>;

  // Если токен истек, пытаемся обновить его (только один раз)
  if (json.errors && json.errors.length > 0) {
    const first = json.errors[0];
    const msg = first.message || '';
    
    // Проверка на истекший токен
    if (
      msg.includes('Signature has expired') || 
      msg.includes('token expired') ||
      msg.includes('ExpiredSignatureError') ||
      ((first.extensions as any)?.exception?.code === 'ExpiredSignatureError')
    ) {
      // Пытаемся обновить токен (с защитой от повторных вызовов)
      const newToken = await tryRefreshToken();
      
      if (newToken) {
        // Повторяем запрос с новым токеном (только один раз)
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables })
        });
        json = (await res.json()) as GraphQLResponse<T>;
        
        // Если после обновления токена ошибок нет, возвращаем результат
        if (!json.errors || json.errors.length === 0) {
          if (!json.data) {
            throw new Error('GraphQL response did not contain data');
          }
          return json.data;
        }
        
        // Если после обновления токена все еще есть ошибки, не пытаемся снова
        // Это предотвращает бесконечный цикл
        console.error('[GraphQL] Token refresh did not resolve errors:', json.errors);
      }
      
      // Если обновление не помогло или не удалось, редиректим на вход
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      if (typeof window !== 'undefined' && window.location.pathname !== '/sign-in') {
        window.location.href = '/sign-in';
      }
      throw new Error('TokenExpired');
    }
    
    // Проверка на ошибки авторизации
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
    
    // Для других ошибок просто пробрасываем
    throw new Error(msg || 'GraphQL error');
  }

  if (!json.data) {
    throw new Error('GraphQL response did not contain data');
  }

  return json.data;
}
