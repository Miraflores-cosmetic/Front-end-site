import { isOzonAvailable } from '@/lib/carrierAvailability';

/**
 * Яндекс Доставка скрыта в чекауте и выборе адреса. Вернуть: VITE_YANDEX_DELIVERY_ENABLED=true
 * (и YANDEX_DELIVERY_ENABLED=true на бэкенде). Старые заказы/адреса с Яндексом по-прежнему отображаются.
 */
export const YANDEX_DELIVERY_ENABLED = import.meta.env.VITE_YANDEX_DELIVERY_ENABLED === 'true';

/** Перечень доступных сейчас служб для текстов ошибок/подсказок. */
export function checkoutCarriersLabel(ozonAvailable: boolean = isOzonAvailable()): string {
  const names = ['СДЭК'];
  if (YANDEX_DELIVERY_ENABLED) names.push('Яндекс Доставка');
  if (ozonAvailable) names.push('Ozon');
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} или ${names[names.length - 1]}`;
}
