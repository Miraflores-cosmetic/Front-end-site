/**
 * Service for validating and applying vouchers via REST API
 */

// Use relative path for proxy in development, absolute for production
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface VoucherValidationResult {
  ok: boolean;
  code?: string;
  discountAmount?: number;
  discountType?: 'FIXED' | 'PERCENTAGE';
  discountPercent?: number;
  discountName?: string;
  error?: string;
}

/**
 * Validates a voucher code and returns discount information
 */
export async function validateVoucher(
  promoCode: string,
  variantIds: string[],
  quantities: number[],
  channel: string = 'miraflores-site'
): Promise<VoucherValidationResult> {
  try {
    const url = API_BASE_URL ? `${API_BASE_URL}/voucher/validate/` : '/voucher/validate/';
    console.log('[Voucher Service] Validating voucher:', { promoCode, variantIds, quantities, channel, url });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        promoCode: promoCode.trim(),
        variantIds,
        quantities,
        channel,
      }),
    });

    console.log('[Voucher Service] Response status:', response.status, response.statusText);
    const data = await response.json();
    console.log('[Voucher Service] Response data:', data);

    if (!response.ok) {
      return {
        ok: false,
        error: data.error || 'Ошибка при валидации промокода',
      };
    }

    return data;
  } catch (error: any) {
    console.error('[Voucher Service] Error validating voucher:', error);
    return {
      ok: false,
      error: error?.message || 'Ошибка при валидации промокода',
    };
  }
}

