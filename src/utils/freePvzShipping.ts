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

/** Сумма товаров для порога free PVZ: после скидки промокода. */
export function goodsSubtotalForFreePvzThreshold(
  goodsSubtotalBeforePromo: number,
  promoDiscountRub: number,
): number {
  const sub = Math.max(0, Math.floor(goodsSubtotalBeforePromo));
  const disc = Math.max(0, Math.floor(promoDiscountRub));
  return Math.max(0, sub - Math.min(disc, sub));
}

/**
 * Доставка до ПВЗ: только при __VSP__/__JCOS__ с dropoff=pvz и кодом пункта.
 * Текст «…ПВЗ» без мета — не free (симметрия СДЭК/Яндекс/Ozon).
 */
export function isPvzDeliveryAddress(address: AddressInfo | null | undefined): boolean {
  if (!address) return false;
  const meta = parseVspAddressMeta(address.streetAddress2);
  if (!meta) return false;
  if (meta.dropoff === 'courier') return false;
  if (meta.carrier === 'cdek') return Boolean(meta.pvz?.trim());
  if (meta.carrier === 'yandex') return Boolean((meta.pvz || meta.cid)?.trim());
  if (meta.carrier === 'ozon') return Boolean(meta.pvz?.trim());
  return false;
}

/**
 * Порог бесплатной доставки до ПВЗ — по сумме товаров **после промокода**
 * (симметрия Nest `computeFreePvzShipping` / shipping-quote).
 */
export function qualifiesForFreePvzShipping(
  goodsSubtotalAfterPromo: number,
  threshold: number,
): boolean {
  return threshold > 0 && goodsSubtotalAfterPromo >= threshold;
}
