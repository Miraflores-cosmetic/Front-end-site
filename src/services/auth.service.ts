/**
 * REST API service for authentication
 */

// Use relative path for proxy in development, absolute for production
// Берем базовый URL из GraphQL URL (убираем /graphql/)
const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8000/graphql/';
const baseUrl = graphqlUrl.replace('/graphql/', '').replace('/graphql', '');
const API_BASE_URL = import.meta.env.VITE_API_URL || baseUrl;

export interface RequestEmailCodeResponse {
  ok: boolean;
  sent?: boolean;
  error?: string;
}

export interface VerifyEmailCodeResponse {
  ok: boolean;
  token?: string;
  refreshToken?: string;
  csrfToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    isConfirmed: boolean;
  };
  error?: string;
}

/**
 * Retry utility for network requests
 */
const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isNetworkError = 
        error?.message?.includes('fetch') || 
        error?.message?.includes('network') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('Network request failed');
      
      if (!isNetworkError || i === retries - 1) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      
      if (import.meta.env.DEV) {
        console.log(`[Retry] Attempt ${i + 2}/${retries} after network error`);
      }
    }
  }
  throw new Error('Max retries exceeded');
};

/**
 * Request email verification code
 */
export async function requestEmailCode(
  email: string,
  firstName?: string
): Promise<RequestEmailCodeResponse> {
  try {
    return await retryRequest(async () => {
      const url = API_BASE_URL ? `${API_BASE_URL}/auth/request-email-code/` : '/auth/request-email-code/';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при отправке кода');
      }

      return data;
    });
  } catch (error: any) {
    console.error('Error requesting email code:', error);
    return {
      ok: false,
      error: error?.message || 'Ошибка при отправке кода',
    };
  }
}

/**
 * Verify email code
 */
export async function verifyEmailCode(
  email: string,
  code: string
): Promise<VerifyEmailCodeResponse> {
  try {
    return await retryRequest(async () => {
      const url = API_BASE_URL ? `${API_BASE_URL}/auth/verify-email-code/` : '/auth/verify-email-code/';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при проверке кода');
      }

      return data;
    });
  } catch (error: any) {
    console.error('Error verifying email code:', error);
    return {
      ok: false,
      error: error?.message || 'Ошибка при проверке кода',
    };
  }
}

