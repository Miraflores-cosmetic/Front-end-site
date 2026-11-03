import type { AddressInfo } from '@/types/auth';
import { isAddressClarification } from '@/utils/addressClarification';

/**
 * Ephemeral checkout-only draft «уточнит оператор».
 * sessionStorage (вкладка) — не Saleor account addresses, не guest localStorage.
 * Logged-in: cross-device не синкаем осознанно (не засоряем сохранённые адреса).
 */
const STORAGE_KEY = 'miraflores.checkoutClarification.v1';
export const CHECKOUT_CLARIFICATION_EVENT = 'miraflores:checkout-clarification';

function emit(address: AddressInfo | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(CHECKOUT_CLARIFICATION_EVENT, { detail: address }),
  );
}

export function loadCheckoutClarificationDraft(): AddressInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AddressInfo;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!isAddressClarification(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCheckoutClarificationDraft(address: AddressInfo): void {
  if (typeof window === 'undefined') return;
  if (!isAddressClarification(address)) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(address));
  emit(address);
}

export function clearCheckoutClarificationDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
  emit(null);
}

export function subscribeCheckoutClarificationDraft(
  cb: (address: AddressInfo | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<AddressInfo | null>).detail ?? null;
    cb(detail);
  };
  window.addEventListener(CHECKOUT_CLARIFICATION_EVENT, handler);
  return () => window.removeEventListener(CHECKOUT_CLARIFICATION_EVENT, handler);
}
