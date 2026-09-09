import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { uploadsUrl } from '@/api/apiClient';
import { syncCart as apiSyncCart } from '@/api/catalogApi';
import {
  CheckoutState,
  CheckoutLine,
  CheckoutStateInLocalStorage,
  VoucherKind,
} from '@/types/checkout';
import { effectiveLineQuantityCap } from '@/utils/checkoutLineLimits';
import { cartWouldMixGiftAndPhysical } from '@/utils/giftDenomCart';

const CART_STORAGE_KEY = 'checkout_cart';

/** ETL/dev URL `http://127.0.0.1:3001/uploads/...` → `/uploads/...` (как на странице сертификатов). */
function cartThumbnail(url: string | null | undefined): string | undefined {
  const next = uploadsUrl(url) || (url ?? '').trim();
  return next || undefined;
}

function withCartThumbnails(lines: CheckoutLine[]): CheckoutLine[] {
  return lines.map((line) => ({
    ...line,
    thumbnail: cartThumbnail(line.thumbnail),
  }));
}

/** Ключ линии корзины — только variantId (оттенки не используются). */
export type CartLineKey = {
  variantId: string;
};

const normalizeLineKey = (payload: CartLineKey | string): CartLineKey =>
  typeof payload === 'string' ? { variantId: payload } : payload;

const matchesLineKey = (item: CheckoutLine, key: CartLineKey) =>
  item.variantId === key.variantId;

type PersistedCheckout = CheckoutStateInLocalStorage & {
  voucherCode: string | null;
  voucherDiscount: number;
  voucherKind: VoucherKind | null;
};

const loadCartFromStorage = (): PersistedCheckout => {
  try {
    const serializedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (serializedCart === null) {
      return {
        lines: [],
        voucherCode: null,
        voucherDiscount: 0,
        voucherKind: null,
      };
    }
    const parsed = JSON.parse(serializedCart) as Partial<PersistedCheckout>;
    return {
      lines: withCartThumbnails(parsed.lines || []),
      voucherCode: parsed.voucherCode ?? null,
      voucherDiscount: typeof parsed.voucherDiscount === 'number' ? parsed.voucherDiscount : 0,
      voucherKind:
        parsed.voucherKind === 'promo' || parsed.voucherKind === 'gift'
          ? parsed.voucherKind
          : null,
    };
  } catch {
    return {
      lines: [],
      voucherCode: null,
      voucherDiscount: 0,
      voucherKind: null,
    };
  }
};

const persistCheckout = (state: CheckoutState): void => {
  try {
    const payload: PersistedCheckout = {
      lines: state.lines,
      voucherCode: state.voucherCode,
      voucherDiscount: state.voucherDiscount,
      voucherKind: state.voucherKind,
    };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Error saving cart to localStorage:', err);
  }
};

const cartSubtotal = (lines: CheckoutLine[]) =>
  lines.reduce((sum, line) => sum + (line.isGift ? 0 : line.price * line.quantity), 0);

const initialState: CheckoutState = {
  lines: [],
  loading: false,
  error: null,
  source: 'localStorage',
  voucherCode: null,
  voucherDiscount: 0,
  voucherKind: null,
  voucherEmail: null,
  hydrated: false,
};

export const initializeCart = createAsyncThunk('checkout/initialize', async () => {
  const savedCart = loadCartFromStorage();
  return {
    lines: savedCart.lines || [],
    voucherCode: savedCart.voucherCode,
    voucherDiscount: savedCart.voucherDiscount,
    voucherKind: savedCart.voucherKind,
    source: 'localStorage' as const,
  };
});

export const syncCartLines = createAsyncThunk(
  'checkout/sync',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { checkout: CheckoutState };
      const lines = state.checkout.lines || [];
      if (!lines.length) return { lines: [] as CheckoutLine[], removed: [] };

      const res = await apiSyncCart(
        lines.map((l) => ({
          variantId: l.variantId,
          qty: l.quantity,
        })),
      );

      const synced: CheckoutLine[] = res.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.qty,
        title: item.name,
        productType: item.productType?.trim() || null,
        price: item.price,
        oldPrice: item.listPrice > item.price ? item.listPrice : null,
        slug: item.slug,
        thumbnail: cartThumbnail(item.imageUrl),
        size: item.variantName || undefined,
        quantityLimitPerCustomer: item.maxQty > 0 ? item.maxQty : null,
        quantityAvailable: item.maxQty,
        isGiftDenom:
          Boolean(item.isGiftDenom) ||
          item.variantId.startsWith('gift-denom:'),
      }));

      const removed = res.removedLines?.length
        ? res.removedLines
        : (res.removedKeys || []).map((key) => ({
            key,
            reason: 'missing' as const,
          }));

      return { lines: synced, removed };
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Не удалось синхронизировать корзину');
    }
  },
);

export type ApplyVoucherArg =
  | string
  | { code: string; email?: string; shippingRub?: number | null };

/** Всегда ходит на API — без short-circuit по тому же code. */
export const applyVoucherCode = createAsyncThunk(
  'checkout/applyVoucher',
  async (arg: ApplyVoucherArg, { getState, rejectWithValue }) => {
    try {
      const code = typeof arg === 'string' ? arg : arg.code;
      const email = typeof arg === 'string' ? undefined : arg.email;
      const shippingRub = typeof arg === 'string' ? undefined : arg.shippingRub;
      const state = getState() as { checkout: CheckoutState };
      const lines = state.checkout.lines || [];
      if (lines.length === 0) {
        throw new Error('Корзина пуста. Добавьте товары в корзину.');
      }

      const { validateVoucher } = await import('@/services/voucher.service');
      const validationResult = await validateVoucher(
        code,
        [],
        [],
        undefined,
        cartSubtotal(lines),
        email,
        shippingRub,
      );

      if (!validationResult.ok) {
        throw new Error(validationResult.error || 'Ошибка при применении промокода');
      }

      return {
        voucherCode: validationResult.code || code,
        voucherDiscount: validationResult.discountAmount || 0,
        voucherKind: (validationResult.kind ?? 'promo') as VoucherKind,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Ошибка при применении промокода';
      return rejectWithValue(msg);
    }
  },
);

/** Пересчёт текущего кода после правки корзины / email / доставки; при ошибке снимает voucher. */
export type RevalidateVoucherArg =
  | string
  | undefined
  | { email?: string; shippingRub?: number | null };

export const revalidateVoucher = createAsyncThunk(
  'checkout/revalidateVoucher',
  async (arg: RevalidateVoucherArg, { getState, dispatch }) => {
    const { voucherCode, voucherEmail, lines } = (getState() as { checkout: CheckoutState })
      .checkout;
    if (!voucherCode) return { ok: true as const };
    if (!lines.length) {
      dispatch(removeVoucherCode());
      return { ok: false as const };
    }
    const email =
      (typeof arg === 'string' ? arg : arg?.email)?.trim() || voucherEmail || undefined;
    const shippingRub = typeof arg === 'object' && arg ? arg.shippingRub : undefined;
    try {
      await dispatch(
        applyVoucherCode({
          code: voucherCode,
          email,
          shippingRub,
        }),
      ).unwrap();
      return { ok: true as const };
    } catch {
      dispatch(removeVoucherCode());
      return { ok: false as const };
    }
  },
);

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    addItemToCart(state, action: PayloadAction<CheckoutLine>) {
      const isGiftDenomIncoming =
        Boolean(action.payload.isGiftDenom) ||
        action.payload.variantId.startsWith('gift-denom:');
      if (
        cartWouldMixGiftAndPhysical(state.lines, {
          ...action.payload,
          isGiftDenom: isGiftDenomIncoming,
        })
      ) {
        return;
      }
      const existingItemIndex = state.lines.findIndex(
        (item) => item.variantId === action.payload.variantId,
      );

      const limitSrc =
        action.payload.quantityLimitPerCustomer ??
        (existingItemIndex !== -1
          ? state.lines[existingItemIndex].quantityLimitPerCustomer
          : undefined);
      const availSrc =
        action.payload.quantityAvailable ??
        (existingItemIndex !== -1
          ? state.lines[existingItemIndex].quantityAvailable
          : undefined);
      const maxQ = effectiveLineQuantityCap(limitSrc, availSrc);

      if (existingItemIndex !== -1) {
        const line = state.lines[existingItemIndex];
        if (line.quantity >= maxQ) return;
        line.quantity += 1;
        if (action.payload.quantityLimitPerCustomer != null) {
          line.quantityLimitPerCustomer = action.payload.quantityLimitPerCustomer;
        }
        if (action.payload.quantityAvailable !== undefined) {
          line.quantityAvailable = action.payload.quantityAvailable ?? null;
        }
        if (action.payload.oldPrice && !line.oldPrice) line.oldPrice = action.payload.oldPrice;
        if (action.payload.discount && !line.discount) line.discount = action.payload.discount;
        if (action.payload.slug && !line.slug) line.slug = action.payload.slug;
        if (action.payload.productType && !line.productType) {
          line.productType = action.payload.productType;
        }
      } else {
        const startQty = Math.min(action.payload.quantity || 1, maxQ);
        const isGiftDenom =
          Boolean(action.payload.isGiftDenom) ||
          action.payload.variantId.startsWith('gift-denom:');
        state.lines.push({
          ...action.payload,
          thumbnail: cartThumbnail(action.payload.thumbnail),
          quantity: startQty,
          oldPrice: action.payload.oldPrice ?? null,
          discount: action.payload.discount ?? null,
          isGiftDenom: isGiftDenom || undefined,
        });
      }
      persistCheckout(state);
    },

    removeItemFromCart(state, action: PayloadAction<CartLineKey | string>) {
      const key = normalizeLineKey(action.payload);
      state.lines = state.lines.filter((item) => !matchesLineKey(item, key));
      if (!state.lines.length) {
        state.voucherCode = null;
        state.voucherDiscount = 0;
        state.voucherKind = null;
        state.voucherEmail = null;
      }
      persistCheckout(state);
    },

    increaseQuantity(state, action: PayloadAction<CartLineKey | string>) {
      const key = normalizeLineKey(action.payload);
      const existingItemIndex = state.lines.findIndex((item) => matchesLineKey(item, key));
      if (existingItemIndex !== -1) {
        const line = state.lines[existingItemIndex];
        const maxQ = effectiveLineQuantityCap(
          line.quantityLimitPerCustomer,
          line.quantityAvailable,
        );
        if (line.quantity < maxQ) line.quantity += 1;
      }
      persistCheckout(state);
    },

    decreaseQuantity(state, action: PayloadAction<CartLineKey | string>) {
      const key = normalizeLineKey(action.payload);
      const existingItemIndex = state.lines.findIndex((item) => matchesLineKey(item, key));
      if (existingItemIndex !== -1) {
        if (state.lines[existingItemIndex].quantity > 1) {
          state.lines[existingItemIndex].quantity -= 1;
        } else {
          state.lines.splice(existingItemIndex, 1);
        }
      }
      if (!state.lines.length) {
        state.voucherCode = null;
        state.voucherDiscount = 0;
        state.voucherKind = null;
        state.voucherEmail = null;
      }
      persistCheckout(state);
    },

    clearCart(state) {
      state.lines = [];
      state.voucherCode = null;
      state.voucherDiscount = 0;
      state.voucherKind = null;
      state.voucherEmail = null;
      persistCheckout(state);
    },

    removeVoucherCode(state) {
      state.voucherCode = null;
      state.voucherDiscount = 0;
      state.voucherKind = null;
      state.voucherEmail = null;
      persistCheckout(state);
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(initializeCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeCart.fulfilled, (state, action) => {
        state.lines = action.payload.lines;
        state.voucherCode = action.payload.voucherCode;
        state.voucherDiscount = action.payload.voucherDiscount;
        state.voucherKind = action.payload.voucherKind;
        state.loading = false;
        state.hydrated = true;
        state.error = null;
      })
      .addCase(initializeCart.rejected, (state, action) => {
        state.loading = false;
        state.hydrated = true;
        state.error = action.error.message || 'Failed to initialize cart';
      })
      .addCase(syncCartLines.fulfilled, (state, action) => {
        state.lines = action.payload.lines;
        if (!state.lines.length) {
          state.voucherCode = null;
          state.voucherDiscount = 0;
          state.voucherKind = null;
          state.voucherEmail = null;
        }
        persistCheckout(state);
      })
      .addCase(applyVoucherCode.pending, (state) => {
        state.loading = true;
      })
      .addCase(applyVoucherCode.fulfilled, (state, action) => {
        state.voucherCode = action.payload.voucherCode;
        state.voucherDiscount = action.payload.voucherDiscount;
        state.voucherKind = action.payload.voucherKind;
        const arg = action.meta.arg;
        state.voucherEmail =
          typeof arg === 'string' ? null : arg.email?.trim() || null;
        state.loading = false;
        state.error = null;
        persistCheckout(state);
      })
      .addCase(applyVoucherCode.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to apply voucher code';
      });
  },
});

export const {
  addItemToCart,
  removeItemFromCart,
  increaseQuantity,
  decreaseQuantity,
  clearCart,
  removeVoucherCode,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
