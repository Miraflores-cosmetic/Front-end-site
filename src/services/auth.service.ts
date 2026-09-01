/**
 * REST OTP — Nest register flow.
 */
import { confirmEmailRequest, verifyEmailCodeAndComplete } from '@/api/authApi';

export type RequestEmailCodeResponse = {
  ok: boolean;
  sent?: boolean;
  error?: string;
};

export type VerifyEmailCodeResponse = {
  ok: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    isConfirmed: boolean;
  };
  error?: string;
};

export async function requestEmailCode(
  email: string,
  firstName?: string,
): Promise<RequestEmailCodeResponse> {
  try {
    const res = await confirmEmailRequest(email, firstName);
    return { ok: true, sent: res.otpSent };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ошибка при отправке кода' };
  }
}

export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<VerifyEmailCodeResponse> {
  try {
    return await verifyEmailCodeAndComplete(email, code);
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ошибка при проверке кода' };
  }
}
