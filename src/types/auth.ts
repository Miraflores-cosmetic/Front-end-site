import { SerializedError } from '@reduxjs/toolkit';

/** Результат login / register/complete для authSlice. */
export interface AuthTokenResult {
  token: string;
  errors: { code: string; message: string; field?: string }[];
}

/** Минимальный user shape (адреса и др.). */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive?: boolean;
  isConfirmed?: boolean;
}

export interface MeInfo {
  id: string;
  email: string;
  firstName: string;
  isActive: boolean;
  isConfirmed: boolean;
  lastName: string;
  addresses: AddressInfo[]
  giftCards: { totalCount: number };
  orders?: { totalCount: number };
  avatar: ProfileAvatar | null;
  metadata?: { key: string; value: string }[];
  phone?: string | null;
  birthday?: string | null;
  marketingConsent?: boolean;
}

export interface ProfileAvatar {
  url: string;
  alt: string;
}

export interface AuthState {
  email: string;
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
  otpSent: boolean;
  message: string;
}

export type ResultType = ResultSignUp | null;

export interface SignUpArgs {
  email: string;
  password: string;
  consentMarketing?: boolean;
}

export interface MeInfoRequest {
  me: MeInfo;
}

export interface AddressInfo {
  cityArea: string;
  city: string;
  /** Квартира / офис */
  apartment: string;
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
