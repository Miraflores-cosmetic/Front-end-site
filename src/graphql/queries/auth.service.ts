import { CHANNEL, graphqlRequest, RedirectUrl } from '../client';
import {
  tokenCreate,
  TokenCreateResponse,
  SignUpMutationResponse,
  TokenRefreshResponse,
  TokenVerifyResponse,
  TokensDeactivateAll
} from '../types/auth.types';

import { MeInfoRequest } from '@/types/auth';

/**
 * Retry utility for network requests
 * Retries only on network errors, not validation errors
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
        error?.message?.includes('Network request failed') ||
        error?.message?.includes('Проблема с подключением');
      
      // Don't retry on validation errors or if it's the last attempt
      if (!isNetworkError || i === retries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      
      // Log retry attempt in dev mode
      if (import.meta.env.DEV) {
        console.log(`[Retry] Attempt ${i + 2}/${retries} after network error`);
      }
    }
  }
  throw new Error('Max retries exceeded');
};

export async function signUpService(email: string, password: string) {
  return retryRequest(async () => {
    const mutation = `
      mutation signUp($email: String!, $password: String!) {
        accountRegister(
          input: { email: $email, password: $password }
        ) {
          requiresConfirmation
          errors {
            code
            message
          }
          accountErrors {
            message
            code
          }
          user {
            id
            email
            firstName
            lastName
            dateJoined
            isActive
            isConfirmed
            isStaff
            externalReference
          }
        }
      }
    `;

    const variables = { email, password };

    const result = await graphqlRequest<SignUpMutationResponse>(mutation, variables);

    // graphqlRequest already handles GraphQL errors, so we only need to check mutation-specific errors
    const errors = result.accountRegister.errors || [];

    if (errors.length > 0) {
      throw new Error(`SignUp failed: ${errors.map((e: any) => e.message).join(', ')}`);
    }

    return result.accountRegister.user;
  });
}

export async function getToken(email: string, password: string) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  return retryRequest(async () => {
    const mutation = `
      mutation TokenCreate($email: String!, $password: String!) {
        tokenCreate(
          email: $email,
          password: $password
        ) {
          csrfToken
          refreshToken
          token
          errors {
            field
            message
            code
            addressType
          }
        }
      }
    `;

    const variables = { email, password };

    const result = await graphqlRequest<TokenCreateResponse>(mutation, variables);

    // graphqlRequest already handles GraphQL errors, so we only need to check mutation-specific errors
    const payload: tokenCreate = result.tokenCreate;

    if (payload.errors?.length > 0) {
      throw new Error(payload.errors.map(e => e.message).join(', '));
    }

    return payload;
  });
}

// Флаг для предотвращения рекурсивных вызовов refreshToken
let isRefreshingToken = false;

export async function refreshToken(refreshToken: string) {
  // Если уже идет обновление токена, не вызываем повторно
  if (isRefreshingToken) {
    throw new Error('Token refresh already in progress');
  }

  isRefreshingToken = true;

  try {
    // Используем прямой fetch, чтобы избежать рекурсии через graphqlRequest
    const endpoint = String(import.meta.env.VITE_GRAPHQL_URL || '');
    if (!endpoint) throw new Error('VITE_GRAPHQL_URL is not defined');

    const mutation = `
      mutation RefreshToken($refreshToken: String!) {
        tokenRefresh(refreshToken: $refreshToken) {
          token
          errors {
            field
            message
            code
          }
        }
      }
    `;

    const variables = { refreshToken };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation, variables })
    });

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(`RefreshToken failed: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    const payload = result.data?.tokenRefresh;

    if (payload?.errors?.length > 0) {
      throw new Error(`RefreshToken failed: ${payload.errors.map((e: any) => e.message).join(', ')}`);
    }

    return payload;
  } finally {
    isRefreshingToken = false;
  }
}

export async function verifyToken(token: string) {
  const mutation = `
  mutation VerifyToken($token: String!) {
    tokenVerify(token: $token) {
      payload
      isValid
      errors {
        field
        message
        code
        addressType
      }
    }
  }
`;

  const variables = { token };
  const result = await graphqlRequest<TokenVerifyResponse>(mutation, variables);
  const payload = result.tokenVerify;
  if (payload.errors?.length > 0) {
    throw new Error(`VerifyToken failed: ${payload.errors.map(e => e.message).join(', ')}`);
  }

  return payload;
}

export async function DeactivateTokens() {
  const mutation = `
      mutation DeactivateTokens {
        tokensDeactivateAll {
          errors {
            addressType
              code
              field
              message
          }
        }

      }
  `;
  const result = await graphqlRequest<TokensDeactivateAll>(mutation);
  const payload = result.tokensDeactivateAll;
  if (payload.errors?.length > 0) {
    throw new Error(`DeactivateTokens failed: ${payload.errors.map(e => e.message).join(', ')}`);
  }

  return payload;
}

export async function getMeInfo() {
  const query = `
    query getMe{
        me{
          id
          email
          firstName
          lastName
          isActive
          isConfirmed
          metadata {
            key
            value
          }
          addresses {
            cityArea
            city
            companyName
            countryArea
            firstName
            id
            isDefaultBillingAddress
            isDefaultShippingAddress
            lastName
            phone
            postalCode
            streetAddress1
            streetAddress2
            metadata {
              key
              value
            }
            country {
              code
              country
            }
          }
          giftCards{
            totalCount
          }
          orders{
            totalCount
          }
          avatar{
            url
            alt
          }
        }
      }
  `;
  const data = await graphqlRequest<MeInfoRequest>(query);
  return data.me;
}
export async function confirmEmailRequest(email?: string, firstName?: string) {
  return retryRequest(async () => {
    // Используем REST API endpoint вместо GraphQL, так как он не требует авторизации
    // Берем базовый URL из GraphQL URL (убираем /graphql/)
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8000/graphql/';
    const baseUrl = graphqlUrl.replace('/graphql/', '').replace('/graphql', '');
    const endpoint = `${baseUrl}/auth/request-email-code/`;

    // Получаем email из параметра, localStorage или из состояния
    const userEmail = email || localStorage.getItem('email') || '';
    const userFirstName = firstName || localStorage.getItem('firstName') || '';

    if (!userEmail) {
      throw new Error('Email не найден. Пожалуйста, войдите в аккаунт или укажите email.');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        firstName: userFirstName,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Ошибка при отправке письма подтверждения');
    }

    return result;
  });
}

export async function requestPasswordReset(email: string, redirectUrl?: string) {
  const mutation = `
    mutation RequestPasswordReset($email: String!, $redirectUrl: String!) {
      requestPasswordReset(email: $email, redirectUrl: $redirectUrl, channel: $channel) {
        errors {
          field
          message
          code
        }
      }
    }
  `;

  const variables = {
    email,
    redirectUrl: redirectUrl || RedirectUrl,
    channel: CHANNEL
  };

  const result = await graphqlRequest<{
    requestPasswordReset: {
      errors: Array<{ field: string; message: string; code: string }>;
    };
  }>(mutation, variables);

  if (result.requestPasswordReset.errors?.length > 0) {
    throw new Error(
      result.requestPasswordReset.errors.map((e) => e.message).join(', ')
    );
  }

  return result.requestPasswordReset;
}

export async function setPassword(token: string, password: string) {
  const mutation = `
    mutation SetPassword($token: String!, $password: String!) {
      setPassword(token: $token, password: $password) {
        token
        refreshToken
        csrfToken
        errors {
          field
          message
          code
        }
        user {
          id
          email
          firstName
          lastName
        }
      }
    }
  `;

  const variables = { token, password };

  const result = await graphqlRequest<{
    setPassword: {
      token?: string;
      refreshToken?: string;
      csrfToken?: string;
      errors: Array<{ field: string; message: string; code: string }>;
      user?: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
    };
  }>(mutation, variables);

  if (result.setPassword.errors?.length > 0) {
    throw new Error(
      result.setPassword.errors.map((e) => e.message).join(', ')
    );
  }

  return result.setPassword;
}

export async function confirmAccount(token: string) {
  const mutation = `
    mutation ConfirmAccount($token: String!, $channel: String!) {
      confirmAccount(token: $token, channel: $channel) {
        errors {
          field
          message
          code
        }
        user {
          id
          email
          isActive
          isConfirmed
        }
      }
    }
  `;

  const variables = { token, channel: CHANNEL };

  const result = await graphqlRequest<{
    confirmAccount: {
      errors: Array<{ field: string; message: string; code: string }>;
      user?: {
        id: string;
        email: string;
        isActive: boolean;
        isConfirmed: boolean;
      };
    };
  }>(mutation, variables);

  if (result.confirmAccount.errors?.length > 0) {
    throw new Error(
      result.confirmAccount.errors.map((e) => e.message).join(', ')
    );
  }

  return result.confirmAccount;
}

export async function updateAccount(firstName?: string, lastName?: string) {
  const mutation = `
    mutation AccountUpdate($input: AccountInput!) {
      accountUpdate(input: $input) {
        errors {
          field
          message
          code
        }
        user {
          id
          email
          firstName
          lastName
        }
      }
    }
  `;

  const input: any = {};
  if (firstName !== undefined) input.firstName = firstName;
  if (lastName !== undefined) input.lastName = lastName;

  const variables = { input };

  const result = await graphqlRequest<{
    accountUpdate: {
      errors: Array<{ field: string; message: string; code: string }>;
      user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      } | null;
    };
  }>(mutation, variables);

  if (result.accountUpdate.errors?.length > 0) {
    throw new Error(
      result.accountUpdate.errors.map((e) => e.message).join(', ')
    );
  }

  if (!result.accountUpdate.user) {
    throw new Error('Failed to update account: No user data returned');
  }

  return result.accountUpdate.user;
}

/**
 * Update account with metadata (phone, birthday, receiveGreetings)
 */
export async function updateAccountWithMetadata(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthday?: string; // format: YYYY-MM-DD or DD.MM.YYYY
  receiveGreetings?: boolean;
}) {
  const mutation = `
    mutation AccountUpdate($input: AccountInput!) {
      accountUpdate(input: $input) {
        errors {
          field
          message
          code
        }
        user {
          id
          email
          firstName
          lastName
          metadata {
            key
            value
          }
        }
      }
    }
  `;

  const input: any = {};

  if (data.firstName !== undefined) input.firstName = data.firstName;
  if (data.lastName !== undefined) input.lastName = data.lastName;

  // Build metadata array
  const metadata: { key: string; value: string }[] = [];

  if (data.phone !== undefined) {
    metadata.push({ key: 'phone', value: data.phone });
  }
  if (data.birthday !== undefined) {
    metadata.push({ key: 'birthday', value: data.birthday });
  }
  if (data.receiveGreetings !== undefined) {
    metadata.push({ key: 'receiveGreetings', value: String(data.receiveGreetings) });
  }

  if (metadata.length > 0) {
    input.metadata = metadata;
  }

  const variables = { input };

  const result = await graphqlRequest<{
    accountUpdate: {
      errors: Array<{ field: string; message: string; code: string }>;
      user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        metadata: { key: string; value: string }[];
      } | null;
    };
  }>(mutation, variables);

  if (result.accountUpdate.errors?.length > 0) {
    throw new Error(
      result.accountUpdate.errors.map((e) => e.message).join(', ')
    );
  }

  if (!result.accountUpdate.user) {
    throw new Error('Failed to update account: No user data returned');
  }

  return result.accountUpdate.user;
}

/**
 * Change password for authenticated user
 */
export async function changePassword(oldPassword: string, newPassword: string) {
  const mutation = `
    mutation PasswordChange($oldPassword: String!, $newPassword: String!) {
      passwordChange(oldPassword: $oldPassword, newPassword: $newPassword) {
        errors {
          field
          message
          code
        }
        user {
          id
          email
        }
      }
    }
  `;

  const variables = { oldPassword, newPassword };

  const result = await graphqlRequest<{
    passwordChange: {
      errors: Array<{ field: string; message: string; code: string }>;
      user: { id: string; email: string } | null;
    };
  }>(mutation, variables);

  if (result.passwordChange.errors?.length > 0) {
    throw new Error(
      result.passwordChange.errors.map((e) => e.message).join(', ')
    );
  }

  return result.passwordChange.user;
}
