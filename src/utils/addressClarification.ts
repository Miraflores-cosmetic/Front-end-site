import type { AddressInfo } from '@/types/auth';

/**
 * Marker in streetAddress2 / shipping comment.
 * Must match Nest `backend/src/orders/address-clarification.ts` (no shared package —
 * drift only if this string is edited by hand on one side).
 */
export const ADDRESS_CLARIFICATION_MARKER = '__JCOS_ADDRESS_CLARIFICATION__=1';

export const ADDRESS_CLARIFICATION_LABEL = 'Уточнит оператор';

export const ADDRESS_CLARIFICATION_GUEST_ID = 'guest-address-clarification';

export const ADDRESS_CLARIFICATION_OPERATOR_NOTE =
  'С вами свяжется оператор для уточнения адреса';

/** Same contract as Nest `isClarificationComment`. */
export function isClarificationComment(
  comment: string | null | undefined,
): boolean {
  return (comment || '').includes(ADDRESS_CLARIFICATION_MARKER);
}

export function isAddressClarificationStreet2(
  streetAddress2: string | null | undefined,
): boolean {
  return isClarificationComment(streetAddress2);
}

export function isAddressClarification(
  address: AddressInfo | null | undefined,
): boolean {
  if (!address) return false;
  return isClarificationComment(address.streetAddress2);
}

export function buildAddressClarificationStreet2(): string {
  return `Тип доставки: ${ADDRESS_CLARIFICATION_LABEL}.\n${ADDRESS_CLARIFICATION_MARKER}`;
}

/** Synthetic address for DeliveryProfile / guest storage. */
export function buildClarificationAddressInfo(
  seed?: Partial<AddressInfo>,
): AddressInfo {
  const countryCode = (seed?.country?.code || 'RU').trim() || 'RU';
  return {
    id: seed?.id || ADDRESS_CLARIFICATION_GUEST_ID,
    firstName: (seed?.firstName || '').trim(),
    lastName: (seed?.lastName || '').trim(),
    phone: (seed?.phone || '').trim(),
    apartment: (seed?.apartment || '').trim(),
    countryArea: (seed?.countryArea || '').trim(),
    city: (seed?.city || '').trim() || '—',
    cityArea: (seed?.cityArea || '').trim(),
    streetAddress1:
      (seed?.streetAddress1 || '').trim() || 'Адрес уточнит оператор',
    streetAddress2: buildAddressClarificationStreet2(),
    postalCode: (seed?.postalCode || '').trim(),
    isDefaultShippingAddress: true,
    isDefaultBillingAddress: false,
    metadata: [],
    country: {
      code: countryCode,
      country: countryCode === 'RU' ? 'Russia' : countryCode,
    },
  };
}
