import type { CheckoutLine } from '@/types/checkout';
import type { AddressInfo } from '@/types/auth';
import { parseVspAddressMeta } from '@/lib/addressVspMeta';

/** Сумма товаров в корзине (как в progressContainer корзины). */
export function calcCartSubtotal(lines: CheckoutLine[]): number {
  return lines.reduce(
    (sum, line) => sum + (line.price ?? 0) * (line.quantity ?? 1),
    0,
  );
}

/**
 * Доставка до ПВЗ: только при __VSP__/__JCOS__ с dropoff=pvz и кодом пункта.
 * Текст «…ПВЗ» без мета — не free (симметрия СДЭК/Яндекс).
 */
export function isPvzDeliveryAddress(address: AddressInfo | null | undefined): boolean {
  if (!address) return false;
  const meta = parseVspAddressMeta(address.streetAddress2);
  if (!meta) return false;
  if (meta.dropoff === 'courier') return false;
  if (meta.carrier === 'cdek') return Boolean(meta.pvz?.trim());
  if (meta.carrier === 'yandex') return Boolean((meta.pvz || meta.cid)?.trim());
  return false;
}

/**
 * Порог бесплатной доставки до ПВЗ.
 *
 * Считается по **pre-promo / pre-gift subtotal** товаров (симметрия Front ↔ Nest
 * `computeFreePvzShipping` / shipping-quote). Промокод и сертификат **не**
 * открывают и **не** отменяют free PVZ: quote подписывается до apply промо.
 */
export function qualifiesForFreePvzShipping(
  goodsSubtotal: number,
  threshold: number,
): boolean {
  return threshold > 0 && goodsSubtotal >= threshold;
}
