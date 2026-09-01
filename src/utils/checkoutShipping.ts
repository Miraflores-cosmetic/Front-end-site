import type { AddressInfo } from '@/types/auth';
import {
  extractPvzCodeFromStreet2,
  parseVspAddressMeta,
} from '@/lib/addressVspMeta';

/** Есть явный перевозчик в streetAddress2 (СДЭК / Яндекс / __VSP__). */
export function hasCheckoutDeliveryCarrier(
  streetAddress2: string | null | undefined,
): boolean {
  return resolveCheckoutShippingMethod(streetAddress2) != null;
}

export function resolveCheckoutShippingMethod(
  streetAddress2: string | null | undefined,
): 'CDEK' | 'YANDEX' | null {
  const vm = parseVspAddressMeta(streetAddress2);
  if (vm?.carrier === 'yandex') return 'YANDEX';
  if (vm?.carrier === 'cdek') return 'CDEK';

  const s = streetAddress2 || '';
  if (/Яндекс/i.test(s)) return 'YANDEX';
  if (/СДЭК/i.test(s)) return 'CDEK';
  return null;
}

/**
 * Старый/битый адрес: заявлен ПВЗ, но нет кода пункта в __VSP__.
 * Нужно открыть drawer и перевыбрать пункт.
 */
export function needsDeliveryPointReselection(
  address: AddressInfo | null | undefined,
): boolean {
  if (!address) return false;
  const s = address.streetAddress2 || '';
  const meta = parseVspAddressMeta(s);

  if (meta?.carrier === 'cdek') {
    if (meta.dropoff === 'courier') return false;
    return !meta.pvz?.trim();
  }
  if (meta?.carrier === 'yandex') {
    if (meta.dropoff === 'courier') return false;
    return !(meta.pvz || meta.cid)?.trim();
  }

  // Текст без мета: «…ПВЗ» без кода
  if (/СДЭК\s*ПВЗ/i.test(s)) return !extractPvzCodeFromStreet2(s);
  if (/Яндекс[^\n]*ПВЗ/i.test(s)) return !extractPvzCodeFromStreet2(s);

  return false;
}

export function isCheckoutReadyAddress(
  address: AddressInfo | null | undefined,
): boolean {
  if (!address) return false;
  if (!hasCheckoutDeliveryCarrier(address.streetAddress2)) return false;
  if (needsDeliveryPointReselection(address)) return false;
  return true;
}
