import { describe, expect, it } from 'vitest';
import { buildStreetAddress2WithMeta } from '@/lib/addressVspMeta';
import type { AddressInfo } from '@/types/auth';
import {
  detectAddressCarrier,
  hasDisabledCarrier,
  isCheckoutReadyAddress,
  resolveCheckoutShippingMethod,
} from './checkoutShipping';
import { getDeliveryTypeLabelFromStreet2 } from './deliveryAddressDisplay';

const yandexPvz = buildStreetAddress2WithMeta(
  { carrier: 'yandex', lon: '37.61', lat: '55.76', pvz: 'abc-123', cid: '', dropoff: 'pvz' },
  'Тип доставки: Яндекс Доставка ПВЗ.',
);
const cdekCourier = buildStreetAddress2WithMeta(
  { carrier: 'cdek', lon: '', lat: '', pvz: '', cid: '', dropoff: 'courier' },
  'Тип доставки: СДЭК Курьер.',
);

function address(streetAddress2: string): AddressInfo {
  return { id: 'a1', city: 'Москва', streetAddress1: 'Тверская, 1', streetAddress2 } as AddressInfo;
}

describe('Яндекс Доставка скрыта', () => {
  it('адрес с Яндексом не годится для чекаута, но перевозчик распознаётся', () => {
    expect(detectAddressCarrier(yandexPvz)).toBe('YANDEX');
    expect(resolveCheckoutShippingMethod(yandexPvz)).toBeNull();
    expect(resolveCheckoutShippingMethod('Тип доставки: Яндекс Доставка Курьер.')).toBeNull();
    expect(hasDisabledCarrier(address(yandexPvz))).toBe(true);
    expect(isCheckoutReadyAddress(address(yandexPvz))).toBe(false);
  });

  it('подпись старого адреса сохраняется', () => {
    expect(getDeliveryTypeLabelFromStreet2(yandexPvz)).toBe('Яндекс Доставка ПВЗ');
  });

  it('СДЭК не затронут; флаг возвращает Яндекс', () => {
    expect(resolveCheckoutShippingMethod(cdekCourier)).toBe('CDEK');
    expect(hasDisabledCarrier(address(cdekCourier))).toBe(false);
    expect(resolveCheckoutShippingMethod(yandexPvz, { yandexEnabled: true })).toBe('YANDEX');
    expect(hasDisabledCarrier(address(yandexPvz), { yandexEnabled: true })).toBe(false);
  });
});
