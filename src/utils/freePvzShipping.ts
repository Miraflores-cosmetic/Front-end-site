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

/** Доставка до ПВЗ: СДЭК или Яндекс ПВЗ (не курьер). */
export function isPvzDeliveryAddress(address: AddressInfo | null | undefined): boolean {
  if (!address) return false;
  const meta = parseVspAddressMeta(address.streetAddress2);
  if (!meta) return true;
  return meta.dropoff !== 'courier';
}

export function qualifiesForFreePvzShipping(
  subtotal: number,
  threshold: number,
): boolean {
  return threshold > 0 && subtotal >= threshold;
}
