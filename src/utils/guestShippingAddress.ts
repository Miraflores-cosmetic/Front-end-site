import type { AddressInfo } from '@/types/auth';
import type { AddressInput } from '@/graphql/types/address.types';

const STORAGE_KEY = 'miraflores.guestShippingAddress.v1';
const LEGACY_STORAGE_KEY = 'jcos.guestShippingAddress.v1';
export const GUEST_SHIPPING_ADDRESS_EVENT = 'miraflores:guest-shipping-address';

export const GUEST_SHIPPING_ADDRESS_ID = 'guest-shipping';

function emit(address: AddressInfo | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(GUEST_SHIPPING_ADDRESS_EVENT, { detail: address }),
  );
}

export function loadGuestShippingAddress(): AddressInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, raw);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const parsed = JSON.parse(raw) as AddressInfo & { companyName?: string };
    if (!parsed || typeof parsed !== 'object' || !parsed.streetAddress1) return null;
    const apartment =
      (parsed.apartment || '').trim() ||
      (typeof parsed.companyName === 'string' ? parsed.companyName.trim() : '');
    const { companyName: _legacy, ...rest } = parsed as AddressInfo & {
      companyName?: string;
    };
    return {
      ...rest,
      apartment,
      id: parsed.id || GUEST_SHIPPING_ADDRESS_ID,
      metadata: Array.isArray(parsed.metadata) ? parsed.metadata : [],
      country: parsed.country ?? { code: 'RU', country: 'Russia' },
    };
  } catch {
    return null;
  }
}

export function saveGuestShippingAddress(address: AddressInfo): void {
  if (typeof window === 'undefined') return;
  const next: AddressInfo = {
    ...address,
    id: address.id || GUEST_SHIPPING_ADDRESS_ID,
    isDefaultShippingAddress: true,
    isDefaultBillingAddress: false,
    metadata: address.metadata ?? [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit(next);
}

export function clearGuestShippingAddress(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  emit(null);
}

/** AddressInput из drawer → AddressInfo для checkout / списка. */
export function addressInfoFromGuestInput(
  payload: AddressInput,
  existingId?: string | null,
): AddressInfo {
  const countryCode = (payload.country || 'RU').trim() || 'RU';
  return {
    id: existingId?.trim() || GUEST_SHIPPING_ADDRESS_ID,
    firstName: (payload.firstName || '').trim(),
    lastName: (payload.lastName || '').trim(),
    phone: (payload.phone || '').trim(),
    apartment: (payload.apartment || '').trim(),
    countryArea: (payload.countryArea || '').trim(),
    city: (payload.city || '').trim(),
    cityArea: (payload.cityArea || '').trim(),
    streetAddress1: (payload.streetAddress1 || '').trim(),
    streetAddress2: (payload.streetAddress2 || '').trim(),
    postalCode: (payload.postalCode || '').trim(),
    isDefaultShippingAddress: true,
    isDefaultBillingAddress: false,
    metadata: [],
    country: {
      code: countryCode,
      country: countryCode === 'RU' ? 'Russia' : countryCode,
    },
  };
}

export function subscribeGuestShippingAddress(
  cb: (address: AddressInfo | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<AddressInfo | null>).detail ?? null;
    cb(detail);
  };
  window.addEventListener(GUEST_SHIPPING_ADDRESS_EVENT, handler);
  return () => window.removeEventListener(GUEST_SHIPPING_ADDRESS_EVENT, handler);
}
