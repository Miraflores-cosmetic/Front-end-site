/** Mirrors Nest `backend/src/auth/password-policy.ts`. */

export const PASSWORD_POLICY_HINT =
  'Минимум 8 символов, хотя бы одна буква и одна цифра';

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) {
    return 'Пароль должен содержать минимум 8 символов';
  }
  if (!/[A-Za-zА-Яа-яЁё]/.test(password)) {
    return 'Пароль должен содержать хотя бы одну букву';
  }
  if (!/\d/.test(password)) {
    return 'Пароль должен содержать хотя бы одну цифру';
  }
  return null;
}
