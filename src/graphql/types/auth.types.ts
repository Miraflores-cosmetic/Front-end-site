import { Connection } from './core.types';

export interface MutationError {
  code: string;
  field?: string;
  message: string;
}

export interface AccountError {
  code: string;
  message: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  dateJoined: string;
  isActive: boolean;
  isConfirmed: boolean;
  isStaff: boolean;
  externalReference?: string | null;
}

export interface AccountRegisterPayload {
  requiresConfirmation: boolean;
  errors: MutationError[];
  accountErrors: AccountError[];
  user: User | null;
}

export interface SignUpMutationResponse {
  accountRegister: AccountRegisterPayload;
}

export interface TokenCreateResponse {
  tokenCreate: tokenCreate;
}

export interface tokenCreate {
  csrfToken: string | null;
  refreshToken: string | null;
  token: string | null;
  errors: MutationError[];
}

export interface TokenRefreshResponse {
  tokenRefresh: {
    token: string | null;
    errors: MutationError[];
  };
}

export interface TokenVerifyResponse {
  tokenVerify: {
    payload: {};
    isValid: boolean;
    errors: MutationError[];
  };
}

export interface TokensDeactivateAll {
  tokensDeactivateAll: {
    errors: MutationError[];
  };
}
