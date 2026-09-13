import { describe, expect, it } from 'vitest';
import { buildCheckoutFingerprint } from './pendingCheckoutOrder';

const base = {
  email: 'a@b.co',
  phone: '+79991234567',
  customerName: 'Иван',
  shippingMethod: 'CDEK',
  shippingAddress: {
    city: 'Москва',
    address: 'ул. Тест, 1',
  },
  shippingCost: 300,
};

describe('buildCheckoutFingerprint', () => {
  it('меняется при смене qty', () => {
    const a = buildCheckoutFingerprint({
      ...base,
      lines: [{ variantId: 'v1', qty: 1, unitPrice: 1000 }],
      goodsSubtotal: 1000,
    });
    const b = buildCheckoutFingerprint({
      ...base,
      lines: [{ variantId: 'v1', qty: 2, unitPrice: 1000 }],
      goodsSubtotal: 2000,
    });
    expect(a).not.toBe(b);
  });

  it('меняется при той же qty, но другой цене (иначе ЮKassa reuse со старой суммой)', () => {
    const a = buildCheckoutFingerprint({
      ...base,
      lines: [{ variantId: 'v1', qty: 1, unitPrice: 1000 }],
      goodsSubtotal: 1000,
      clientPayableTotal: 1300,
    });
    const b = buildCheckoutFingerprint({
      ...base,
      lines: [{ variantId: 'v1', qty: 1, unitPrice: 1500 }],
      goodsSubtotal: 1500,
      clientPayableTotal: 1800,
    });
    expect(a).not.toBe(b);
  });

  it('стабилен при одинаковой корзине', () => {
    const input = {
      ...base,
      lines: [
        { variantId: 'v2', qty: 1, unitPrice: 500 },
        { variantId: 'v1', qty: 2, unitPrice: 1000 },
      ],
      goodsSubtotal: 2500,
      voucherDiscount: 100,
      clientPayableTotal: 2700,
    };
    expect(buildCheckoutFingerprint(input)).toBe(buildCheckoutFingerprint(input));
  });
});
