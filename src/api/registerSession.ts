/**
 * Пароль регистрации только в RAM вкладки (не sessionStorage).
 * Reload на OTP → память пуста → verify кладёт completionToken → SignUp resumeMode
 * (шаг 3: только пароль, email из localStorage / Redux).
 */

let pendingRegisterPassword: string | null = null;

export function stashRegisterPassword(password: string) {
  pendingRegisterPassword = password || null;
}

export function peekRegisterPassword(): string | null {
  return pendingRegisterPassword;
}

export function clearRegisterPassword() {
  pendingRegisterPassword = null;
}

export function takeRegisterPassword(): string | null {
  const p = peekRegisterPassword();
  clearRegisterPassword();
  return p;
}
