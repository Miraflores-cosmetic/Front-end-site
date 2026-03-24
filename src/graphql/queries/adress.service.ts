import { graphqlRequest } from '@/graphql/client';
import { AddressMutationError, accountErrorsToFieldMap } from '@/graphql/addressMutationError';
import {
  AddressInput,
  AddressTypeEnum,
  AccountAddressCreateResponse,
  Address,
  AccountSetDefaultAddressPayload,
  AccountSetDefaultAddressResponse
} from '../types/adress.types';

export async function createAddressService(
  addressInput: AddressInput,
  type: AddressTypeEnum = AddressTypeEnum.SHIPPING
): Promise<Address> {
  const mutation = `
    mutation createAddress($input: AddressInput!, $type: AddressTypeEnum) {
      accountAddressCreate(input: $input, type: $type) {
        address {
          id
          firstName
          lastName
          streetAddress1
          streetAddress2
          city
          postalCode
          phone
          country {
            code
            country
          }
        }
        errors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: addressInput,
    type
  };

  const result = await graphqlRequest<AccountAddressCreateResponse>(mutation, variables);

  const errors = result.accountAddressCreate.errors || [];

  if (errors.length > 0) {
    throw new AddressMutationError(
      errors.map((e) => e.message).join(', '),
      accountErrorsToFieldMap(errors),
    );
  }

  // We are guaranteed an address here if there are no errors
  return result.accountAddressCreate.address as Address;
}
export async function setDefaultAddressService(
  addressId: string,
  type: AddressTypeEnum = AddressTypeEnum.SHIPPING
): Promise<AccountSetDefaultAddressPayload> {
  const mutation = `
    mutation setDefaultAddress($id: ID!, $type: AddressTypeEnum!) {
      accountSetDefaultAddress(id: $id, type: $type) {
        user {
          id
          addresses {
             id
             isDefaultShippingAddress
             isDefaultBillingAddress
          }
        }
        errors {
          field
          message
        }
      }
    }
  `;

  const variables = { id: addressId, type };

  const result = await graphqlRequest<AccountSetDefaultAddressResponse>(mutation, variables);

  const errors = result.accountSetDefaultAddress.errors || [];

  if (errors.length > 0) {
    throw new Error(`Failed to set default address: ${errors.map(e => e.message).join(', ')}`);
  }

  return result.accountSetDefaultAddress;
}
