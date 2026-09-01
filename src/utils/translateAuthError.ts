/**
 * Переводит известные EN / HTTP-сообщения auth API на русский.
 * Сообщения, уже на русском, проходят без изменений.
 */
const AUTH_ERROR_MAP: Record<string, string> = {
  'Invalid credentials': 'Неверный email или пароль',
  Unauthorized: 'Сессия истекла, войдите снова',
  'Network request failed': 'Проблема с подключением. Проверьте интернет',
  'Failed to fetch': 'Не удалось подключиться к серверу',
  Timeout: 'Превышено время ожидания. Попробуйте позже',
  'Too Many Requests': 'Слишком много попыток. Попробуйте позже.',
};

const AUTH_ERROR_PATTERNS: Array<{ test: RegExp; text: string }> = [
  {
    test: /too many|throttl|rate.?limit|429/i,
    text: 'Слишком много попыток. Попробуйте позже.',
  },
  {
    test: /already exists|already registered/i,
    text: 'Пользователь с таким email уже зарегистрирован',
  },
  {
    test: /session expired|token.?version|jwt expired|invalid.?token/i,
    text: 'Сессия истекла, войдите снова',
  },
];

export function translateAuthError(message: string | undefined): string {
  if (!message || typeof message !== 'string') return 'Произошла ошибка';

  const trimmed = message.trim();
  const mapped = AUTH_ERROR_MAP[trimmed];
  if (mapped) return mapped;

  for (const { test, text } of AUTH_ERROR_PATTERNS) {
    if (test.test(trimmed)) return text;
  }

  return trimmed;
}
