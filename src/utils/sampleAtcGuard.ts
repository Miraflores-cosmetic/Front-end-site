import type { SampleEligibilityResponse, SamplePurchaseRules } from '@/api/catalogApi';
import { fetchSampleEligibility } from '@/api/catalogApi';
import {
  sampleAlreadyPurchasedToastMessage,
  sampleGuestToastMessage,
} from '@/components/sample-purchase/samplePurchaseToasts';
import type { useToast } from '@/components/toast/toast';
import { isProductVariantSample } from '@/utils/sampleVariant';

type ToastApi = ReturnType<typeof useToast>;

export type SampleAtcGuardInput = {
  variantId: string;
  variantName?: string | null;
  variantIsSample?: boolean | null;
  isAuth: boolean;
  toast: ToastApi;
  rules?: SamplePurchaseRules | null;
};

/** false = блок (toast уже показан). */
export async function runSampleAtcGuard(
  input: SampleAtcGuardInput,
): Promise<boolean> {
  const sampleLine = isProductVariantSample({
    name: input.variantName,
    isSample: input.variantIsSample,
  });
  if (!sampleLine) return true;

  if (!input.isAuth) {
    input.toast.warning(sampleGuestToastMessage(), 4200);
    return false;
  }

  try {
    const eligibility = await fetchSampleEligibility([input.variantId]);
    return applySampleEligibilityToasts(
      { toast: input.toast, rules: input.rules, variantId: input.variantId },
      eligibility,
    );
  } catch {
    input.toast.error('Не удалось проверить доступность пробника');
    return false;
  }
}

export function applySampleEligibilityToasts(
  input: Pick<SampleAtcGuardInput, 'toast' | 'rules' | 'variantId'>,
  eligibility: SampleEligibilityResponse,
): boolean {
  const row = eligibility.variants[input.variantId];
  if (!row) {
    input.toast.error('Вариант недоступен');
    return false;
  }
  if (!row.isSample) return true;
  if (row.eligible) return true;

  const articleUrl =
    eligibility.sampleRulesArticleUrl ??
    input.rules?.sampleRulesArticleUrl ??
    '/articles/pravila-priobreteniya-probnikov';

  if (row.reason === 'guest') {
    input.toast.warning(sampleGuestToastMessage(), 4200);
    return false;
  }
  if (row.reason === 'already_purchased') {
    input.toast.warning(sampleAlreadyPurchasedToastMessage(articleUrl), 5000);
    return false;
  }
  if (row.reason === 'unknown_variant') {
    input.toast.error('Вариант недоступен');
    return false;
  }

  input.toast.warning(sampleAlreadyPurchasedToastMessage(articleUrl), 4500);
  return false;
}
