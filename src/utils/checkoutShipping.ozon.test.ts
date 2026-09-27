import { describe, expect, it } from 'vitest';
import {
  buildStreetAddress2WithMeta,
  extractPvzCodeFromStreet2,
  parseVspAddressMeta,
} from '@/lib/addressVspMeta';
import { resolveOzonCityCenter } from '@/lib/ozonCityCenters';
import type { AddressInfo } from '@/types/auth';
import {
  isCheckoutReadyAddress,
  needsDeliveryPointReselection,
  resolveCheckoutShippingMethod,
} from './checkoutShipping';
import { getDeliveryTypeLabelFromStreet2 } from './deliveryAddressDisplay';
import { isPvzDeliveryAddress } from './freePvzShipping';

const pvzStreet2 = buildStreetAddress2WithMeta(
  { carrier: 'ozon', lon: '37.61', lat: '55.76', pvz: '1011000000123', cid: '', dropoff: 'pvz' },
  'Тип доставки: Ozon ПВЗ.',
);
const courierStreet2 = buildStreetAddress2WithMeta(
  { carrier: 'ozon', lon: '', lat: '', pvz: '', cid: '', dropoff: 'courier' },
  'Тип доставки: Ozon Курьер.',
);

function address(streetAddress2: string): AddressInfo {
  return { id: 'a1', city: 'Москва', streetAddress1: 'Тверская, 1', streetAddress2 } as AddressInfo;
}

describe('Ozon в адресе доставки', () => {
  it('мета Ozon парсится и даёт OZON', () => {
    expect(parseVspAddressMeta(pvzStreet2)).toMatchObject({ carrier: 'ozon', pvz: '1011000000123' });
    expect(resolveCheckoutShippingMethod(pvzStreet2)).toBe('OZON');
    expect(extractPvzCodeFromStreet2(pvzStreet2)).toBe('1011000000123');
    expect(getDeliveryTypeLabelFromStreet2(pvzStreet2)).toBe('Ozon ПВЗ');
    expect(getDeliveryTypeLabelFromStreet2(courierStreet2)).toBe('Ozon Курьер');
  });

  it('ПВЗ Ozon — бесплатный по порогу, курьер — нет', () => {
    expect(isPvzDeliveryAddress(address(pvzStreet2))).toBe(true);
    expect(isPvzDeliveryAddress(address(courierStreet2))).toBe(false);
  });

  it('ПВЗ без кода требует перевыбора', () => {
    const broken = '__VSP:carrier=ozon|lon=|lat=|pvz=|dropoff=pvz__';
    expect(needsDeliveryPointReselection(address(broken))).toBe(true);
    expect(isCheckoutReadyAddress(address(pvzStreet2))).toBe(true);
    expect(isCheckoutReadyAddress(address(courierStreet2))).toBe(true);
  });

  it('центр города по названию и алиасам', () => {
    expect(resolveOzonCityCenter('г. Казань')?.city).toBe('Казань');
    expect(resolveOzonCityCenter('спб')?.city).toBe('Санкт-Петербург');
    expect(resolveOzonCityCenter('Урюпинск')).toBeNull();
  });
});
