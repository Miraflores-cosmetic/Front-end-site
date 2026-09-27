import type { AddressInfo } from '@/types/auth';
import {
  extractPvzCodeFromStreet2,
  parseVspAddressMeta,
} from '@/lib/addressVspMeta';
import { isOzonAvailable, ozonUnavailableMessage } from '@/lib/carrierAvailability';
import { checkoutCarriersLabel, YANDEX_DELIVERY_ENABLED } from '@/lib/deliveryCarriers';

/** Есть явный перевозчик в streetAddress2 (СДЭК / Яндекс / Ozon / __VSP__). */
export function hasCheckoutDeliveryCarrier(
  streetAddress2: string | null | undefined,
): boolean {
  return resolveCheckoutShippingMethod(streetAddress2) != null;
}

export type CheckoutShippingMethod = 'CDEK' | 'YANDEX' | 'OZON';

/** Перевозчик, записанный в адресе, — без учёта того, доступен ли он сейчас. */
export function detectAddressCarrier(
  streetAddress2: string | null | undefined,
): CheckoutShippingMethod | null {
  const vm = parseVspAddressMeta(streetAddress2);
  if (vm?.carrier === 'yandex') return 'YANDEX';
  if (vm?.carrier === 'cdek') return 'CDEK';
  if (vm?.carrier === 'ozon') return 'OZON';

  const s = streetAddress2 || '';
  if (/Яндекс/i.test(s)) return 'YANDEX';
  if (/СДЭК/i.test(s)) return 'CDEK';
  return null;
}

/** По умолчанию — флаг Яндекса из env и текущий статус Ozon из API. */
export type CarrierAvailabilityOptions = {
  yandexEnabled?: boolean;
  ozonAvailable?: boolean;
};

export function isCheckoutCarrierEnabled(
  method: CheckoutShippingMethod,
  opts: CarrierAvailabilityOptions = {},
): boolean {
  if (method === 'YANDEX') return opts.yandexEnabled ?? YANDEX_DELIVERY_ENABLED;
  if (method === 'OZON') return opts.ozonAvailable ?? isOzonAvailable();
  return true;
}

/** Способ доставки для чекаута; недоступный перевозчик (Яндекс, Ozon без подключения) → null. */
export function resolveCheckoutShippingMethod(
  streetAddress2: string | null | undefined,
  opts: CarrierAvailabilityOptions = {},
): CheckoutShippingMethod | null {
  const method = detectAddressCarrier(streetAddress2);
  if (!method || !isCheckoutCarrierEnabled(method, opts)) return null;
  return method;
}

/** Адрес сохранён под службой, которая сейчас недоступна. */
export function hasDisabledCarrier(
  address: AddressInfo | null | undefined,
  opts: CarrierAvailabilityOptions = {},
): boolean {
  if (!address) return false;
  const method = detectAddressCarrier(address.streetAddress2);
  return method != null && !isCheckoutCarrierEnabled(method, opts);
}

/** Текст для покупателя, почему сохранённый адрес нельзя использовать. */
export function disabledCarrierMessage(address: AddressInfo | null | undefined): string | null {
  if (!hasDisabledCarrier(address)) return null;
  if (detectAddressCarrier(address?.streetAddress2) === 'OZON') return ozonUnavailableMessage();
  return `Яндекс Доставка сейчас недоступна — выберите ${checkoutCarriersLabel()}`;
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
  if (meta?.carrier === 'ozon') {
    if (meta.dropoff === 'courier') return false;
    return !meta.pvz?.trim();
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
