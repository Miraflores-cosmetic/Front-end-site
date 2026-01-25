/**
 * Переводит известные сообщения об ошибках авторизации/учётки с английского на русский.
 * Сообщения приходят из Saleor GraphQL (tokenCreate, accountRegister и т.п.).
 */
const AUTH_ERROR_MAP: Record<string, string> = {
  // Вход (tokenCreate / create_token.py)
  'Please, enter valid credentials': 'Введите правильный email и пароль',
  'Account needs to be confirmed via email.': 'Подтвердите аккаунт по ссылке из письма',
  'Account inactive.': 'Аккаунт деактивирован',
  "Can't identify requester IP address.": 'Не удалось определить адрес. Попробуйте позже.',
  'Email and password are required': 'Введите email и пароль',

  // Регистрация и прочее
  'User with this Email already exists.': 'Пользователь с таким email уже зарегистрирован',

  // Обновление профиля (authSlice)
  'Failed to update account': 'Ошибка при обновлении аккаунта',

  // Сетевые ошибки
  'Network request failed': 'Проблема с подключением. Проверьте интернет',
  'Failed to fetch': 'Не удалось подключиться к серверу',
  'Timeout': 'Превышено время ожидания. Попробуйте позже',
  'Invalid email format': 'Неверный формат email адреса',
  'Password too weak': 'Пароль слишком простой',
  'Проблема с подключением. Проверьте интернет': 'Проблема с подключением. Проверьте интернет',
};

/** Проверка по подстроке (для длинных и динамических сообщений). */
const AUTH_ERROR_PATTERNS: Array<{ test: RegExp | ((s: string) => boolean); text: string }> = [
  {
    test: (s) =>
      /Logging has been suspended|too many.*attempts|logging attempts/i.test(s) ||
      /LOGIN_ATTEMPT_DELAYED/i.test(s),
    text: 'Слишком много попыток входа. Вход временно заблокирован. Попробуйте позже.',
  },
  {
    test: (s) => /already exists|already registered|unique/i.test(s) && /email|user/i.test(s),
    text: 'Пользователь с таким email уже зарегистрирован',
  },
];

export function translateAuthError(message: string | undefined): string {
  if (!message || typeof message !== 'string') return 'Произошла ошибка';

  const trimmed = message.trim();
  const mapped = AUTH_ERROR_MAP[trimmed];
  if (mapped) return mapped;

  for (const { test, text } of AUTH_ERROR_PATTERNS) {
    if (typeof test === 'function' ? test(trimmed) : test.test(trimmed)) return text;
  }

  return trimmed;
}
