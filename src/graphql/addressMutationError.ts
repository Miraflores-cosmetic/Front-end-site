import type { AddressInput } from '@/graphql/types/adress.types';

export type AddressFormFieldKey = keyof AddressInput;

export class AddressMutationError extends Error {
    constructor(
        message: string,
        public readonly fieldErrors: Partial<Record<AddressFormFieldKey, string>>,
    ) {
        super(message);
        this.name = 'AddressMutationError';
    }
}

const SALEOR_FIELD_TO_FORM: Record<string, AddressFormFieldKey> = {
    postalCode: 'postalCode',
    streetAddress1: 'streetAddress1',
    streetAddress2: 'streetAddress2',
    city: 'city',
    cityArea: 'cityArea',
    country: 'country',
    countryArea: 'countryArea',
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'phone',
    companyName: 'companyName',
    postal_code: 'postalCode',
    street_address_1: 'streetAddress1',
    street_address_2: 'streetAddress2',
    city_area: 'cityArea',
    country_area: 'countryArea',
    first_name: 'firstName',
    last_name: 'lastName',
    company_name: 'companyName',
};

function normalizeErrorField(field: string | null | undefined | string[]): string | null {
    if (field == null) return null;
    if (Array.isArray(field)) return field[0] != null ? String(field[0]) : null;
    return String(field);
}

export function accountErrorsToFieldMap(
    errors: { field?: string | null | string[]; message: string }[],
): Partial<Record<AddressFormFieldKey, string>> {
    const out: Partial<Record<AddressFormFieldKey, string>> = {};
    for (const e of errors) {
        const f = normalizeErrorField(e.field as string | null | undefined | string[]);
        if (!f) continue;
        const key = SALEOR_FIELD_TO_FORM[f];
        if (key && !out[key]) {
            out[key] = e.message;
        }
    }
    return out;
}
