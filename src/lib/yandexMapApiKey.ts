/** Ключ Яндекс.Карт — только VITE_* попадает в Vite bundle при сборке. */
export function getYandexMapApiKey(): string {
  return (
    import.meta.env.VITE_PUBLIC_YANDEX_MAP_API_KEY?.trim() ||
    import.meta.env.VITE_YANDEX_MAP_API_KEY?.trim() ||
    ''
  );
}

export const YANDEX_MAP_KEY_ENV_HINT =
  'VITE_PUBLIC_YANDEX_MAP_API_KEY в Front/.env (нужен при npm run build)';
