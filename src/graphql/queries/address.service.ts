import {
  createAddress as apiCreateAddress,
  deleteAddress as apiDeleteAddress,
  setDefaultAddress as apiSetDefault,
  updateAddress as apiUpdateAddress,
} from '@/api/accountApi';
import { AddressInfo } from '@/types/auth';
import { AddressMutationError, accountErrorsToFieldMap } from '@/graphql/addressMutationError';
import {
  AddressInput,
  AddressTypeEnum,
  AccountAddressCreateResponse,
  Address,
  AccountSetDefaultAddressPayload,
  AccountSetDefaultAddressResponse,
} from '../types/address.types';

export interface AddressCreateInput {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  countryArea: string;
  city: string;
  cityArea: string;
  streetAddress1: string;
  streetAddress2?: string;
  postalCode: string;
  apartment: string;
}

export type AddressUpdateInput = AddressCreateInput;

export async function createAddress(
  input: AddressCreateInput,
  isDefaultShipping = false,
): Promise<AddressInfo[]> {
  try {
    return await apiCreateAddress(
      {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        city: input.city,
        streetAddress1: input.streetAddress1,
        streetAddress2: input.streetAddress2,
        postalCode: input.postalCode,
        apartment: input.apartment,
        countryArea: input.countryArea,
        cityArea: input.cityArea,
      },
      isDefaultShipping,
    );
  } catch (e: unknown) {
    throw new AddressMutationError(e instanceof Error ? e.message : 'Ошибка создания адреса', {});
  }
}

/** Saleor-shaped wrapper used by AddressDrawer. */
export async function createAddressService(
  addressInput: AddressInput,
  type: AddressTypeEnum = AddressTypeEnum.SHIPPING,
): Promise<Address> {
  try {
    const rows = await apiCreateAddress(
      {
        firstName: addressInput.firstName,
        lastName: addressInput.lastName,
        phone: addressInput.phone,
        city: addressInput.city,
        streetAddress1: addressInput.streetAddress1,
        streetAddress2: addressInput.streetAddress2,
        postalCode: addressInput.postalCode,
        apartment: addressInput.apartment,
        countryArea: addressInput.countryArea,
        cityArea: addressInput.cityArea,
      },
      type === AddressTypeEnum.SHIPPING,
    );
    const created = rows[rows.length - 1];
    if (!created) throw new Error('Address creation failed');
    return created as unknown as Address;
  } catch (e: unknown) {
    if (e instanceof AddressMutationError) throw e;
    throw new AddressMutationError(
      e instanceof Error ? e.message : 'Ошибка создания адреса',
      accountErrorsToFieldMap([]),
    );
  }
}

export async function updateAddress(id: string, input: AddressUpdateInput): Promise<AddressInfo[]> {
  try {
    return await apiUpdateAddress(id, {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      city: input.city,
      streetAddress1: input.streetAddress1,
      streetAddress2: input.streetAddress2,
      postalCode: input.postalCode,
      apartment: input.apartment,
      countryArea: input.countryArea,
      cityArea: input.cityArea,
    });
  } catch (e: unknown) {
    throw new AddressMutationError(e instanceof Error ? e.message : 'Ошибка обновления адреса', {});
  }
}

export async function deleteAddress(id: string): Promise<AddressInfo[]> {
  return apiDeleteAddress(id);
}

export async function setDefaultAddress(
  id: string,
  _type: 'SHIPPING' | 'BILLING' = 'SHIPPING',
): Promise<AddressInfo[]> {
  return apiSetDefault(id);
}

export async function setDefaultAddressService(
  addressId: string,
  _type: AddressTypeEnum = AddressTypeEnum.SHIPPING,
): Promise<AccountSetDefaultAddressPayload> {
  await apiSetDefault(addressId);
  return { user: { id: '' } } as AccountSetDefaultAddressPayload;
}

export type { AccountAddressCreateResponse, AccountSetDefaultAddressResponse };
