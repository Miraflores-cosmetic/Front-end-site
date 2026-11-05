import type { ReactNode } from 'react';
import {
  sampleAlreadyPurchasedToastMessage,
  sampleGuestToastMessage,
} from '@/components/sample-purchase/samplePurchaseToasts';

export const DEFAULT_SAMPLE_RULES_ARTICLE_URL =
  '/articles/pravila-priobreteniya-probnikov';

export type CartSyncRemovalLine = {
  key: string;
  reason?: string;
  name?: string;
};

type ToastApi = {
  warning: (message: ReactNode, durationMs?: number) => void;
  error: (message: ReactNode, durationMs?: number) => void;
};

/** Toasts после sync корзины — как ATC: ссылки + oos не глотается. */
export function notifyCartSyncRemovals(
  toast: ToastApi,
  removed: CartSyncRemovalLine[],
  rulesArticleUrl: string = DEFAULT_SAMPLE_RULES_ARTICLE_URL,
): void {
  if (!removed.length) return;

  const articleUrl = rulesArticleUrl.trim() || DEFAULT_SAMPLE_RULES_ARTICLE_URL;
  const hasGuest = removed.some((r) => r.reason === 'sample_guest');
  const hasRepeat = removed.some((r) => r.reason === 'sample_already_purchased');

  if (hasGuest) {
    toast.warning(sampleGuestToastMessage(), 4500);
  }
  if (hasRepeat) {
    toast.warning(sampleAlreadyPurchasedToastMessage(articleUrl), 5000);
  }

  const other = removed.filter(
    (r) =>
      r.reason !== 'sample_guest' &&
      r.reason !== 'sample_already_purchased',
  );
  if (!other.length) return;

  const names = other
    .map((r) => r.name)
    .filter((n): n is string => Boolean(n))
    .slice(0, 3);
  const oos = other.some((r) => r.reason === 'oos');
  toast.error(
    names.length
      ? `${oos ? 'Нет в наличии' : 'Недоступны'}: ${names.join(', ')}${
          other.length > names.length ? '…' : ''
        }`
      : `Убрано из корзины: ${other.length} поз.`,
  );
}
