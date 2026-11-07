import { describe, expect, it } from 'vitest';
import { computeReferralSpendAmount } from './referralSpendAmount';

describe('computeReferralSpendAmount', () => {
  it('min(available, floor(payable×cap%), payable)', () => {
    expect(
      computeReferralSpendAmount({
        available: 5000,
        payableRub: 4000,
        spendCapPercent: 50,
      }),
    ).toBe(2000);
    expect(
      computeReferralSpendAmount({
        available: 100,
        payableRub: 4000,
        spendCapPercent: 100,
      }),
    ).toBe(100);
  });

  it('enabled=false → 0', () => {
    expect(
      computeReferralSpendAmount({
        available: 5000,
        payableRub: 4000,
        spendCapPercent: 100,
        enabled: false,
      }),
    ).toBe(0);
  });
});
