import { User } from './auth.types';
import { MutationError } from './core.types'; // Assuming this exists from your previous code

// Enum for the address type
export enum AddressTypeEnum {
  BILLING = 'BILLING',
  SHIPPING = 'SHIPPING'
}

// 1. The Input Object
export interface AddressInput {
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  streetAddress1: string;
  city: string;
  cityArea?: string;
  postalCode: string;
  country: string; // Usually expects 2-letter ISO code (e.g., "US", "DE")
  countryArea?: string; // State or Province
}

// 2. The Resulting Object (Address)
export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  streetAddress1: string;
  city: string;
  postalCode: string;
  country: {
    code: string;
    country: string;
  };
}

// 3. The Mutation Payload
export interface AccountAddressCreatePayload {
  errors: MutationError[];
  address: Address | null;
}

// 4. The Top-Level Response
export interface AccountAddressCreateResponse {
  accountAddressCreate: AccountAddressCreatePayload;
}

export interface AccountSetDefaultAddressPayload {
  user: User | null;
  errors: MutationError[];
}

export interface AccountSetDefaultAddressResponse {
  accountSetDefaultAddress: AccountSetDefaultAddressPayload;
}

// Ensure you have the Enum (if not already added)
