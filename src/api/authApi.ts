/**
 * Nest REST auth (`/auth/*`, `/account/me`).
 */

import {
  apiFetch,
  apiJson,
  clearAuthStorage,
  getAccessToken,
  getOrCreateGuestId,
  setAccessToken,
} from '@/api/apiClient';
import {
  stashRegisterPassword,
  peekRegisterPassword,
  clearRegisterPassword,
} from '@/api/registerSession';
import type { MeInfo, AddressInfo, AuthTokenResult } from '@/types/auth';

export {
  stashRegisterPassword,
  peekRegisterPassword,
  clearRegisterPassword,
  takeRegisterPassword,
} from '@/api/registerSession';

const COMPLETION_KEY = 'miraflores.register.completionToken';

export function stashCompletionToken(token: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(COMPLETION_KEY, token);
}

export function peekCompletionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(COMPLETION_KEY);
}

export function clearCompletionToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(COMPLETION_KEY);
}

export function takeCompletionToken(): string | null {
  const t = peekCompletionToken();
  clearCompletionToken();
  return t;
}

export type RegisterStartResult = {
  email: string;
  otpSent: boolean;
  message: string;
};

/** Шаг 1 регистрации: OTP на email. */
export async function signUpService(
  email: string,
  password: string,
  consentMarketing = false,
): Promise<RegisterStartResult> {
  stashRegisterPassword(password);
  const data = await apiJson<{ message?: string; otpSent?: boolean }>(
    '/auth/register/start',
    'POST',
    {
      email: email.trim().toLowerCase(),
      consentPersonalData: true,
      consentMarketing: consentMarketing === true,
    },
    { skipAuth: true },
  );
  const normalized = email.trim().toLowerCase();
  const otpSent = data.otpSent === true;
  if (otpSent && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('miraflores.register.otpSent', normalized);
  } else {
    // OTP не ушёл — пароль в памяти не нужен
    clearRegisterPassword();
  }
  return {
    email: normalized,
    otpSent,
    message:
      data.message ||
      'Если этот email свободен, мы отправили код подтверждения. Проверьте почту (и «Спам»).',
  };
}

/** Login → JWT. */
/** Login / register FE throws this when fields empty. */
export async function getToken(email: string, password: string): Promise<AuthTokenResult> {
  if (!email || !password) {
    throw new Error('Введите email и пароль');
  }
  const data = await apiJson<{ access_token: string }>(
    '/auth/login',
    'POST',
    {
      email: email.trim().toLowerCase(),
      password,
      guestId: getOrCreateGuestId() || undefined,
    },
    { skipAuth: true },
  );
  setAccessToken(data.access_token);
  return {
    token: data.access_token,
    errors: [],
  };
}

export async function verifyToken(_token: string): Promise<boolean> {
  try {
    await apiFetch('/auth/me');
    return true;
  } catch {
    return false;
  }
}

function splitDisplayName(displayName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '' };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

function mapAddress(a: {
  id: string;
  city: string;
  address: string;
  apartment?: string | null;
  region?: string | null;
  district?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  recipientName?: string | null;
  isDefault?: boolean;
  comment?: string | null;
}): AddressInfo {
  const { firstName, lastName } = splitDisplayName(a.recipientName);
  return {
    id: a.id,
    city: a.city || '',
    cityArea: a.district || '',
    apartment: a.apartment || '',
    countryArea: a.region || '',
    firstName,
    lastName,
    phone: a.phone || '',
    postalCode: a.postalCode || '',
    streetAddress1: a.address || '',
    streetAddress2: a.comment || '',
    isDefaultBillingAddress: Boolean(a.isDefault),
    isDefaultShippingAddress: Boolean(a.isDefault),
    metadata: [],
    country: { code: 'RU', country: 'Россия' },
  };
}

export async function getMeInfo(): Promise<MeInfo> {
  const [authMe, account, addresses, orders] = await Promise.all([
    apiFetch<{
      id: string;
      email: string;
      displayName: string | null;
      isActive: boolean;
      phone?: string | null;
    }>('/auth/me'),
    apiFetch<{
      id: string;
      email: string;
      displayName: string | null;
      phone: string | null;
      birthday?: string | null;
      marketingConsent?: boolean;
      hasGiftCertificates?: boolean;
    }>('/account/me').catch(() => null),
    apiFetch<Array<Parameters<typeof mapAddress>[0]> | { items?: Array<Parameters<typeof mapAddress>[0]> }>(
      '/account/addresses',
    ).catch(() => []),
    apiFetch<{ items?: unknown[]; total?: number } | unknown[]>('/account/orders', {
      query: { page: 1, limit: 1 },
    }).catch(() => []),
  ]);

  const displayName = account?.displayName ?? authMe.displayName;
  const { firstName, lastName } = splitDisplayName(displayName);
  const addressRows = Array.isArray(addresses)
    ? addresses
    : (addresses?.items ?? []);
  const orderRows = Array.isArray(orders) ? orders : (orders?.items ?? []);
  const orderTotal = Array.isArray(orders)
    ? orders.length
    : (orders?.total ?? orderRows.length);

  const phone = account?.phone ?? authMe.phone ?? null;
  const birthday = account?.birthday ?? null;
  const marketingConsent = account?.marketingConsent === true;

  return {
    id: authMe.id,
    email: account?.email ?? authMe.email,
    firstName,
    lastName,
    isActive: authMe.isActive,
    // Nest: buyer создаётся после register/complete — «подтверждён» = есть аккаунт.
    isConfirmed: Boolean(authMe.id && authMe.isActive),
    addresses: addressRows.map(mapAddress),
    giftCards: { totalCount: account?.hasGiftCertificates ? 1 : 0 },
    orders: { totalCount: orderTotal },
    avatar: null,
    phone,
    birthday,
    marketingConsent,
    metadata: [
      ...(phone ? [{ key: 'phone', value: phone }] : []),
      ...(birthday ? [{ key: 'birthday', value: birthday }] : []),
      { key: 'receiveGreetings', value: marketingConsent ? 'true' : 'false' },
    ],
  };
}

export async function requestPasswordReset(email: string, redirectUrl?: string) {
  return apiJson<{ message: string; emailSent?: boolean; devHint?: string }>(
    '/auth/password-reset/request',
    'POST',
    {
      email: email.trim().toLowerCase(),
      ...(redirectUrl?.trim() ? { redirectUrl: redirectUrl.trim() } : {}),
    },
    { skipAuth: true },
  );
}

export async function setPassword(token: string, password: string) {
  await apiJson(
    '/auth/password-reset/confirm',
    'POST',
    { token, password },
    { skipAuth: true },
  );
  return { user: { id: '', email: '' }, token: null as string | null };
}

/** Повторная отправка OTP (register/start). */
export async function confirmEmailRequest(email: string, _firstName?: string) {
  const data = await apiJson<{ message?: string; otpSent?: boolean }>(
    '/auth/register/start',
    'POST',
    {
      email: email.trim().toLowerCase(),
      consentPersonalData: true,
    },
    { skipAuth: true },
  );
  const otpSent = data.otpSent === true;
  const normalized = email.trim().toLowerCase();
  if (otpSent && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('miraflores.register.otpSent', normalized);
  }
  return {
    ok: true,
    sent: otpSent,
    otpSent,
    message: data.message,
  };
}

/** Resume after OTP verified but password was missing. */
export async function completeRegistrationWithPassword(
  email: string,
  password: string,
) {
  const completionToken = peekCompletionToken();
  if (!completionToken) {
    throw new Error('Сессия регистрации истекла. Подтвердите email снова.');
  }
  const data = await apiJson<{ access_token: string }>(
    '/auth/register/complete',
    'POST',
    {
      completionToken,
      password,
      guestId: getOrCreateGuestId() || undefined,
    },
    { skipAuth: true },
  );
  clearCompletionToken();
  clearRegisterPassword();
  setAccessToken(data.access_token);
  return {
    ok: true,
    token: data.access_token,
    user: {
      id: '',
      email,
      firstName: null,
      lastName: null,
      isActive: true,
      isConfirmed: true,
    },
  };
}

/** Verify OTP → complete registration → JWT. */
export async function verifyEmailCodeAndComplete(email: string, code: string) {
  const verify = await apiJson<{ completionToken: string }>(
    '/auth/register/verify',
    'POST',
    { email: email.trim().toLowerCase(), code: code.trim() },
    { skipAuth: true },
  );
  const password = peekRegisterPassword();
  if (!password) {
    stashCompletionToken(verify.completionToken);
    throw new Error(
      'Пароль не найден (страница была перезагружена). Введите пароль снова, чтобы завершить регистрацию.',
    );
  }
  try {
    const data = await apiJson<{ access_token: string }>(
      '/auth/register/complete',
      'POST',
      {
        completionToken: verify.completionToken,
        password,
        guestId: getOrCreateGuestId() || undefined,
      },
      { skipAuth: true },
    );
    clearRegisterPassword();
    clearCompletionToken();
    setAccessToken(data.access_token);
    return {
      ok: true,
      token: data.access_token,
      user: { id: '', email, firstName: null, lastName: null, isActive: true, isConfirmed: true },
    };
  } catch (e) {
    stashCompletionToken(verify.completionToken);
    throw e;
  }
}

export async function updateAccount(firstName?: string, lastName?: string) {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const row = await apiJson<{ displayName: string | null }>('/account/me', 'PATCH', {
    displayName: displayName || undefined,
  });
  const split = splitDisplayName(row.displayName);
  return { firstName: split.firstName, lastName: split.lastName };
}

export type UpdateBuyerProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthday?: string | null;
  marketingConsent?: boolean;
};

export async function updateBuyerProfile(input: UpdateBuyerProfileInput) {
  const displayName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
  return apiJson<{
    displayName: string | null;
    phone: string | null;
    birthday: string | null;
    marketingConsent: boolean;
  }>('/account/me', 'PATCH', {
    ...(displayName ? { displayName } : {}),
    ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
    ...(input.birthday !== undefined ? { birthday: input.birthday || null } : {}),
    ...(input.marketingConsent !== undefined
      ? { marketingConsent: input.marketingConsent }
      : {}),
  });
}

export async function updateAccountWithMetadata(
  firstName?: string,
  lastName?: string,
  metadata?: { key: string; value: string }[],
) {
  const phone = metadata?.find(m => m.key === 'phone')?.value;
  const birthday = metadata?.find(m => m.key === 'birthday')?.value;
  const receiveGreetings = metadata?.find(m => m.key === 'receiveGreetings')?.value;
  await updateBuyerProfile({
    firstName,
    lastName,
    ...(phone !== undefined ? { phone } : {}),
    ...(birthday !== undefined ? { birthday: birthday || null } : {}),
    ...(receiveGreetings !== undefined
      ? { marketingConsent: receiveGreetings === 'true' }
      : {}),
  });
  return updateAccount(firstName, lastName);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await apiJson('/account/me/password', 'POST', { currentPassword, newPassword });
  clearAuthStorage();
  return { ok: true };
}

/** Server revoke (tokenVersion++) + local clear. */
export async function revokeSession(): Promise<void> {
  if (!getAccessToken()) {
    clearAuthStorage();
    return;
  }
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      skipUnauthorizedNotify: true,
    });
  } catch {
    /* токен уже мёртв — всё равно чистим локально */
  }
  clearAuthStorage();
}
