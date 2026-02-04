// ------------------------------------
// Checkout Line (Basket Item)
// ------------------------------------
export interface CheckoutLine {
  lineId?: string; // added for update/delete support
  variantId: string;
  quantity: number;

  title: string;
  price: number;

  thumbnail?: string;
  oldPrice?: number | null;
  discount?: number | null;
  size?: string;
  /** Подарок по программе благодарности — не удаляется из корзины */
  isGift?: boolean;
}
// ------------------------------------
// Checkout State Storage
// ------------------------------------
export interface CheckoutStateInLocalStorage {
  id: string | null;
  /**
   * Checkout token from Saleor. Optional, kept for backward compatibility.
   */
  token?: string | null;
  lines: CheckoutLine[];
}


// ------------------------------------
// Checkout State
// ------------------------------------
export interface CheckoutState  extends  CheckoutStateInLocalStorage{
  loading: boolean;
  error: string | null;
  // optional field to indicate where data came from when initializing
  source: 'api' | 'localStorage';
  voucherCode: string | null;
  voucherDiscount: number;
}

// ------------------------------------
// Shared GraphQL Types
// ------------------------------------
export interface CheckoutError {
  field: string | null;
  message: string;
}

export interface Checkout {
  id: string;
}

// ------------------------------------
// Inputs
// ------------------------------------
// Represents the payload passed as the GraphQL variable $input
export interface CheckoutCreateInput {
  lines: CheckoutLineAddInput[];
  email?: string;
  channel?: string;
}

export interface CheckoutLineAddInput {
  quantity: number;
  variantId: string;
}

export interface CheckoutLineUpdateInput {
  lineId: string;
  quantity?: number;
  price?: number;
  variantId?: string;
}

// ------------------------------------
// Responses
// ------------------------------------

// checkoutCreate
export interface CheckoutCreateResponse {
  checkoutCreate: {
    checkout: Checkout | null;
    errors: CheckoutError[];
  };
}

// checkoutLinesAdd
export interface CheckoutLinesAddResponse {
  checkoutLinesAdd: {
    checkout: Checkout | null;
    errors: CheckoutError[];
  };
}

// checkoutLinesUpdate
export interface CheckoutLinesUpdateResponse {
  checkoutLinesUpdate: {
    checkout: Checkout | null;
    errors: CheckoutError[];
  };
}

// checkoutLineDelete (single)
export interface CheckoutLineDeleteResponse {
  checkoutLineDelete: {
    checkout: Checkout | null;
    errors: CheckoutError[];
  };
}

// checkoutLinesDelete (multiple)
export interface CheckoutLinesDeleteResponse {
  checkoutLinesDelete: {
    checkout: Checkout | null;
    errors: CheckoutError[];
  };
}

// ------------------------------------
// Basket Card Props
// ------------------------------------
export interface BasketCardProps extends CheckoutLine {
  onAdd?: () => void;
  onRemove?: () => void;
}
