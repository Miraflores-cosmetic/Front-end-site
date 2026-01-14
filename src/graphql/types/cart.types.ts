export interface CartLine {
  id: string;
  quantity: number;
  variant: {
    id: string;
    name: string;
    product: {
      name: string;
    };
  };
  totalPrice: {
    gross: {
      amount: number;
      currency: string;
    };
  };
}

export interface Cart {
  id: string;
  totalPrice: {
    gross: {
      amount: number;
      currency: string;
    };
  };
  lines: CartLine[];
}

export interface GetCartData {
  checkout: Cart | null;
}

export interface CheckoutLineInput {
  variantId: string;
  quantity: number;
}

export interface CreateCartResponse {
  checkoutCreate: {
    checkout: Cart | null;
    errors: Array<{ message: string; code: string }>;
  };
}

export interface AddLineResponse {
  checkoutLinesAdd: {
    checkout: Cart | null;
    errors: Array<{ message: string; code: string }>;
  };
}

export interface UpdateLineResponse {
  checkoutLinesUpdate: {
    checkout: Cart | null;
    errors: Array<{ message: string; code: string }>;
  };
}

export interface RemoveLineResponse {
  checkoutLinesDelete: {
    checkout: Cart | null;
    errors: Array<{ message: string; code: string }>;
  };
}

// More explicit error shape used across cart mutations
export interface CartMutationError {
  field?: string | null;
  message: string;
  code?: string | null;
}

export interface CreateCartResponseV2 {
  checkoutCreate: {
    checkout: Cart | null;
    errors: CartMutationError[];
  };
}