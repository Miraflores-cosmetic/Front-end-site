import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildStreetAddress2WithMeta } from '@/lib/addressVspMeta';
import type { AddressInfo } from '@/types/auth';
import {
  disabledCarrierMessage,
  isCheckoutReadyAddress,
  resolveCheckoutShippingMethod,
} from '@/utils/checkoutShipping';
import {
  isOzonAvailable,
  refreshOzonAvailability,
  resetOzonAvailabilityForTests,
  setOzonAvailability,
} from './carrierAvailability';
import { checkoutCarriersLabel } from './deliveryCarriers';

const ozonPvz = buildStreetAddress2WithMeta(
  { carrier: 'ozon', lon: '37.61', lat: '55.76', pvz: '1011000000123', cid: '', dropoff: 'pvz' },
  'Тип доставки: Ozon ПВЗ.',
);

function address(streetAddress2: string): AddressInfo {
  return { id: 'a1', city: 'Москва', streetAddress1: 'Тверская, 1', streetAddress2 } as AddressInfo;
}

afterEach(() => {
  resetOzonAvailabilityForTests();
  vi.unstubAllGlobals();
});

describe('доступность Ozon на витрине', () => {
  it('до ответа API Ozon считается доступным', () => {
    expect(isOzonAvailable()).toBe(true);
    expect(resolveCheckoutShippingMethod(ozonPvz)).toBe('OZON');
    expect(checkoutCarriersLabel()).toBe('СДЭК или Ozon');
  });

  it('не подключён: адрес Ozon не годится для чекаута, текст понятный', () => {
    setOzonAvailability({ available: false, message: 'Ozon временно недоступен' });
    expect(resolveCheckoutShippingMethod(ozonPvz)).toBeNull();
    expect(isCheckoutReadyAddress(address(ozonPvz))).toBe(false);
    expect(disabledCarrierMessage(address(ozonPvz))).toBe('Ozon временно недоступен');
    expect(checkoutCarriersLabel()).toBe('СДЭК');
  });

  it('статус берётся из /delivery/ozon/availability; сетевая ошибка его не меняет', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ available: false, message: null }), { status: 200 })),
    );
    await refreshOzonAvailability(true);
    expect(isOzonAvailable()).toBe(false);

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    await refreshOzonAvailability(true);
    expect(isOzonAvailable()).toBe(false);
  });
});
