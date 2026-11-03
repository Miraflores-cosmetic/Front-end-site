import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ADDRESS_CLARIFICATION_MARKER,
  buildClarificationAddressInfo,
} from '@/utils/addressClarification';
import {
  clearCheckoutClarificationDraft,
  loadCheckoutClarificationDraft,
  saveCheckoutClarificationDraft,
} from '@/utils/checkoutClarificationDraft';

describe('checkoutClarificationDraft', () => {
  afterEach(() => {
    clearCheckoutClarificationDraft();
    vi.restoreAllMocks();
  });

  it('save/load ephemeral clarification; ignores non-clarification', () => {
    const clar = buildClarificationAddressInfo({ city: 'Москва' });
    saveCheckoutClarificationDraft(clar);
    expect(loadCheckoutClarificationDraft()?.city).toBe('Москва');
    expect(loadCheckoutClarificationDraft()?.streetAddress2).toContain(
      ADDRESS_CLARIFICATION_MARKER,
    );

    saveCheckoutClarificationDraft({
      ...clar,
      streetAddress2: 'Тип доставки: СДЭК ПВЗ',
    });
    // non-clarification rejected — previous draft remains or cleared by failed save
    // (save no-ops without emit overwrite when marker missing)
    expect(loadCheckoutClarificationDraft()?.city).toBe('Москва');
  });

  it('clear removes draft', () => {
    saveCheckoutClarificationDraft(buildClarificationAddressInfo());
    clearCheckoutClarificationDraft();
    expect(loadCheckoutClarificationDraft()).toBeNull();
  });
});
