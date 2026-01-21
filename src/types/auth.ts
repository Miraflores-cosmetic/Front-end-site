import { SerializedError } from '@reduxjs/toolkit';

export interface MeInfo {
  id: string;
  email: string;
  firstName: string;
  isActive: boolean;
  isConfirmed: boolean;
  lastName: string;
  addresses: AddressInfo[]
  giftCards: { totalCount: number };
  avatar: ProfileAvatar | null;
  metadata?: { key: string; value: string }[];
}

export interface ProfileAvatar {
  url: string;
  alt: string;
}

export interface AuthState {
  email: string;
  pass: string;
  signUp: {
    agreeChecked: boolean;
    success: boolean;
    loadingStatus: boolean;
    error: SerializedError | null;
  };
  signIn: {
    success: boolean;
    loadingStatus: boolean;
    error: SerializedError | null;
  };
  getMe: {
    loadingStatus: boolean;
    error: SerializedError | null;
  };
  isAuth: boolean;
  token: string | null;
  me: MeInfo | null;
}

interface ResultSignUp {
  email: string;
}

export type ResultType = ResultSignUp | null;

export interface SignUpArgs {
  email: string;
  pass: string;
}

export interface MeInfoRequest {
  me: MeInfo;
}

export interface AddressInfo {
  cityArea: string;
  city: string;
  companyName: string;
  countryArea: string;
  firstName: string;
  id: string;
  isDefaultBillingAddress: boolean;
  isDefaultShippingAddress: boolean;
  lastName: string;
  phone: string;
  postalCode: string;
  streetAddress1: string;
  streetAddress2: string;
  metadata: any[];
  country: {
    code: string;
    country: string;
  };
}
