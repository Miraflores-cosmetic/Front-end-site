import { Product } from '@/types/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// --- Interfaces ---

export interface CartItem {
  id: string; // Composite ID: productID-size
  product: Product;
  quantity: number;
  size: string;
}

export interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  discount: number; // Percent
  appliedPromoCode: string | null;
}

// --- Payloads ---

export interface AddItemPayload {
  product: Product;
  quantity: number;
  size: string;
}

export interface PromoPayload {
  code: string;
  discountPercent: number;
}

// --- Local Storage Helpers ---

const STORAGE_KEY = 'cart-storage';

const loadCartFromLocalStorage = (): CartState => {
  if (typeof window === 'undefined') {
    return { 
      items: [], 
      totalItems: 0, 
      totalPrice: 0, 
      discount: 0, 
      appliedPromoCode: null 
    };
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data 
      ? JSON.parse(data) 
      : { 
          items: [], 
          totalItems: 0, 
          totalPrice: 0, 
          discount: 0, 
          appliedPromoCode: null 
        };
  } catch {
    return { 
      items: [], 
      totalItems: 0, 
      totalPrice: 0, 
      discount: 0, 
      appliedPromoCode: null 
    };
  }
};

const saveCartToLocalStorage = (state: CartState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
};

// --- Core Logic Helper (DRY) ---

/**
 * Recalculates total items and total price (including discount)
 * and persists the state to local storage.
 */
const updateCartTotals = (state: CartState) => {
  // 1. Calculate Subtotal
  const subtotal = state.items.reduce(
    (sum, item) => sum + (item.product.price ?? 0) * item.quantity,
    0
  );

  // 2. Calculate Total Items
  state.totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);

  // 3. Apply Discount
  const discountAmount = state.discount > 0 ? (subtotal * state.discount) / 100 : 0;
  state.totalPrice = Math.max(0, subtotal - discountAmount);

  // 4. Persist
  saveCartToLocalStorage(state);
};

// --- Slice ---

const initialState: CartState = loadCartFromLocalStorage();

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<AddItemPayload>) {
      const { product, quantity, size } = action.payload;
      // Unique ID per product variant (Size matters)
      const uniqueId = `${product.id}-${size}`;

      const existingItem = state.items.find((item) => item.id === uniqueId);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          id: uniqueId,
          product,
          quantity,
          size,
        });
      }

      updateCartTotals(state);
    },

    removeItem(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.items = state.items.filter((item) => item.id !== id);
      updateCartTotals(state);
    },

    increaseQuantity(state, action: PayloadAction<string>) {
      const id = action.payload;
      const item = state.items.find((i) => i.id === id);
      
      if (item) {
        item.quantity += 1;
        updateCartTotals(state);
      }
    },

    decreaseQuantity(state, action: PayloadAction<string>) {
      const id = action.payload;
      const item = state.items.find((i) => i.id === id);

      if (!item) return;

      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        // Automatically remove if quantity drops to 0
        state.items = state.items.filter((i) => i.id !== id);
      }
      
      updateCartTotals(state);
    },

    applyPromoCode(state, action: PayloadAction<PromoPayload>) {
      const { code, discountPercent } = action.payload;
      state.appliedPromoCode = code;
      state.discount = discountPercent;
      updateCartTotals(state);
    },

    removePromoCode(state) {
      state.appliedPromoCode = null;
      state.discount = 0;
      updateCartTotals(state);
    },

    clearCart(state) {
      state.items = [];
      state.totalItems = 0;
      state.totalPrice = 0;
      state.discount = 0;
      state.appliedPromoCode = null;
      saveCartToLocalStorage(state);
    },
  },
});

export const {
  addToCart,
  removeItem,
  increaseQuantity,
  decreaseQuantity,
  applyPromoCode,
  removePromoCode,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;