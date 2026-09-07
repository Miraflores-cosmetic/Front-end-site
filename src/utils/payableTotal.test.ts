import { describe, expect, it } from 'vitest';
import { calcPayableTotals } from './payableTotal';

describe('calcPayableTotals', () => {
  const lines = [
    { variantId: 'v1', quantity: 2, price: 1000, oldPrice: 1200 },
    { variantId: 'v2', quantity: 1, price: 500, isGift: true },
  ];

  it('payableTotal = goods + shipping', () => {
    const t = calcPayableTotals({
      lines: lines as never,
      voucherDiscount: 200,
      shippingRub: 349,
    });
    expect(t.goodsSubtotal).toBe(2000);
    expect(t.goodsTotal).toBe(1800);
    expect(t.payableTotal).toBe(2149);
    expect(t.shippingReady).toBe(true);
  });

  it('null пока доставка не готова', () => {
    const t = calcPayableTotals({
      lines: lines as never,
      shippingRub: null,
      shippingLoading: true,
    });
    expect(t.payableTotal).toBeNull();
    expect(t.shippingReady).toBe(false);
  });
});

  it('gift-denom-only: shippingReady without carrier quote', () => {
    const t = calcPayableTotals({
      lines: [
        {
          variantId: 'gift-denom:abc',
          quantity: 1,
          price: 3000,
          title: 'Сертификат',
          isGiftDenom: true,
        },
      ],
      shippingRub: null,
      shippingLoading: false,
    });
    expect(t.hasPayableLines).toBe(false);
    expect(t.shippingReady).toBe(true);
    expect(t.shippingRub).toBe(0);
    expect(t.payableTotal).toBe(3000);
  });

