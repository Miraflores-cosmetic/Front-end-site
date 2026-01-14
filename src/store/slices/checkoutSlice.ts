import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { createCheckout, getCheckoutById } from '@/graphql/queries/checkout.service';
import { graphqlRequest } from '@/graphql/client';
import { CheckoutState, CheckoutCreateInput, CheckoutLine, CheckoutStateInLocalStorage } from '@/types/checkout';

// localStorage key
const CART_STORAGE_KEY = 'checkout_cart';

// Helper functions for localStorage
const loadCartFromStorage = (): CheckoutStateInLocalStorage => {
  try {
    const serializedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (serializedCart === null) {
      return { id: null, token: null, lines: [] };
    }
    const parsed = JSON.parse(serializedCart);
    // Обеспечиваем обратную совместимость
    return {
      id: parsed.id || null,
      token: parsed.token ?? null,
      lines: parsed.lines || []
    };
  } catch (err) {
    console.error('Error loading cart from localStorage:', err);
    return { id: null, token: null, lines: [] };
  }
};

const saveCartToStorage = (state: CheckoutStateInLocalStorage): void => {
  try {
    const serializedCart = JSON.stringify(state);
    localStorage.setItem(CART_STORAGE_KEY, serializedCart);
  } catch (err) {
    console.error('Error saving cart to localStorage:', err);
  }
};

// Initial state will be set by initializeCart thunk
const initialState: CheckoutState = {
  id: null,
  token: null,
  lines: [],
  loading: false,
  error: null,
  source: 'api',
  voucherCode: null,
  voucherDiscount: 0
};

// Initialize cart - API first, fallback to localStorage
export const initializeCart = createAsyncThunk(
  'checkout/initialize',
  async (_, { rejectWithValue }) => {
    // First, try to get saved checkout from localStorage
    const savedCart = loadCartFromStorage();

    // If we have a checkout ID, try to fetch it from API
    if (savedCart.id) {
      try {
        const apiResponse = await getCheckoutById(savedCart.id);

        // If API call succeeds, use API data
        if ((apiResponse as any)?.checkout) {
          return {
            id: (apiResponse as any).checkout.id,
            token: (apiResponse as any).checkout.token || savedCart.token || null,
            lines: savedCart.lines || [], // Keep lines from localStorage
            source: 'api'
          } as CheckoutState;
        }
      } catch (error) {
        // Fallback to localStorage on error
      }
    }

    // Fallback to localStorage data
    return {
      id: savedCart.id || null,
      token: savedCart.token || null,
      lines: savedCart.lines || [],
      source: 'localStorage'
    };
  }
);

// Create checkout API call
export const createCheckoutApi = createAsyncThunk(
  'checkout/create',
  async (input: CheckoutCreateInput, { rejectWithValue }) => {
      try {
        const result = await createCheckout(input);
        if (result.errors) {
          console.error('Checkout errors:', result.errors);
        }
        return result;
      } catch (error) {
        return rejectWithValue(error);
      }
  }
);

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    addItemToCart(state, action: PayloadAction<CheckoutLine>) {
      const existingItemIndex = state.lines.findIndex(
        item => item.variantId === action.payload.variantId
      );

      if (existingItemIndex !== -1) {
        state.lines[existingItemIndex].quantity += 1;
        // Обновляем oldPrice и discount, если они были null, а теперь есть
        if (action.payload.oldPrice && !state.lines[existingItemIndex].oldPrice) {
          state.lines[existingItemIndex].oldPrice = action.payload.oldPrice;
        }
        if (action.payload.discount && !state.lines[existingItemIndex].discount) {
          state.lines[existingItemIndex].discount = action.payload.discount;
        }
      } else {
        state.lines.push({
          variantId: action.payload.variantId,
          quantity: 1,
          title: action.payload.title,
          thumbnail: action.payload.thumbnail,
          price: action.payload.price,
          oldPrice: action.payload.oldPrice ?? null,
          discount: action.payload.discount ?? null,
          size: action.payload.size
        });
      }
      // Сохраняем только lines в localStorage, без id и token
      const cartToSave: CheckoutStateInLocalStorage = {
        id: state.id,
        token: state.token,
        lines: state.lines
      };
      saveCartToStorage(cartToSave);
    },

    removeItemFromCart(state, action: PayloadAction<string>) {
      state.lines = state.lines.filter(item => item.variantId !== action.payload);
      const cartToSave: CheckoutStateInLocalStorage = {
        id: state.id,
        token: state.token,
        lines: state.lines
      };
      saveCartToStorage(cartToSave);
    },

    increaseQuantity(state, action: PayloadAction<string>) {
      const existingItemIndex = state.lines.findIndex(item => item.variantId === action.payload);

      if (existingItemIndex !== -1) {
        state.lines[existingItemIndex].quantity += 1;
      }

      const cartToSave: CheckoutStateInLocalStorage = {
        id: state.id,
        token: state.token,
        lines: state.lines
      };
      saveCartToStorage(cartToSave);
    },

    decreaseQuantity(state, action: PayloadAction<string>) {
      const existingItemIndex = state.lines.findIndex(item => item.variantId === action.payload);

      if (existingItemIndex !== -1) {
        if (state.lines[existingItemIndex].quantity > 1) {
          state.lines[existingItemIndex].quantity -= 1;
        } else {
          state.lines.splice(existingItemIndex, 1);
        }
      }

      const cartToSave: CheckoutStateInLocalStorage = {
        id: state.id,
        token: state.token,
        lines: state.lines
      };
      saveCartToStorage(cartToSave);
    },

    clearCart(state) {
      state.id = null;
      state.token = null;
      state.lines = [];
      state.voucherCode = null;
      state.voucherDiscount = 0;
      const cartToSave: CheckoutStateInLocalStorage = {
        id: null,
        token: null,
        lines: []
      };
      saveCartToStorage(cartToSave);
    },

    removeVoucherCode(state) {
      state.voucherCode = null;
      state.voucherDiscount = 0;
      const cartToSave: CheckoutStateInLocalStorage = {
        id: state.id,
        token: state.token,
        lines: state.lines
      };
      saveCartToStorage(cartToSave);
    }
  },

  extraReducers: builder => {
    // Initialize cart
    builder
      .addCase(initializeCart.pending, state => {
        state.loading = true;
      })
      .addCase(initializeCart.fulfilled, (state, action) => {
        state.id = action.payload.id;
        state.token = action.payload.token || null;
        state.lines = action.payload.lines;
        state.loading = false;
        state.error = null;
      })
      .addCase(initializeCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to initialize cart';
      });

    // Create checkout
    builder
      .addCase(createCheckoutApi.pending, state => {
        state.loading = true;
      })
      .addCase(createCheckoutApi.fulfilled, (state, action) => {
        // Handle different response structures
        if (action.payload?.checkoutCreate?.checkout?.id) {
          state.id = action.payload.checkoutCreate.checkout.id;
          state.token = action.payload.checkoutCreate.checkout.token || null;
        }

        state.loading = false;
        state.error = null;
        const cartToSave: CheckoutStateInLocalStorage = {
          id: state.id,
          token: state.token,
          lines: state.lines
        };
        saveCartToStorage(cartToSave);
      })
      .addCase(createCheckoutApi.rejected, (state, action) => {
        state.loading = false;
        // Проверяем ошибку наличия товара
        const errorMessage = action.error.message || 'Failed to create checkout';
        if (errorMessage.includes('Only 0 remaining in stock') || errorMessage.includes('remaining in stock')) {
          state.error = 'Некоторые товары закончились. Пожалуйста, удалите их из корзины.';
          
          // Пытаемся извлечь название товара из ошибки и удалить его из корзины
          const productNameMatch = errorMessage.match(/«([^»]+)»/);
          if (productNameMatch) {
            const productName = productNameMatch[1];
            // Удаляем товары, которые закончились (по названию в title)
            state.lines = state.lines.filter((line: any) => {
              return !line.title || !line.title.includes(productName);
            });
            const cartToSave: CheckoutStateInLocalStorage = {
              id: state.id,
              token: state.token,
              lines: state.lines
            };
            saveCartToStorage(cartToSave);
          }
        } else {
          state.error = errorMessage;
        }
      });

    // Apply voucher code
    builder
      .addCase(applyVoucherCode.pending, state => {
        state.loading = true;
      })
      .addCase(applyVoucherCode.fulfilled, (state, action) => {
        // Проверяем, что промокод действительно изменился, чтобы избежать бесконечного цикла
        if (state.voucherCode === action.payload.voucherCode && 
            state.voucherDiscount === action.payload.voucherDiscount) {
          // Промокод уже применен, не обновляем state
          state.loading = false;
          return;
        }
        
        state.voucherCode = action.payload.voucherCode;
        state.voucherDiscount = action.payload.voucherDiscount;
        state.loading = false;
        state.error = null;
        const cartToSave: CheckoutStateInLocalStorage = {
          id: state.id,
          token: state.token,
          lines: state.lines
        };
        saveCartToStorage(cartToSave);
      })
      .addCase(applyVoucherCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to apply voucher code';
      });
  }
});

// Apply voucher code
export const applyVoucherCode = createAsyncThunk(
  'checkout/applyVoucher',
  async (code: string, { getState, rejectWithValue, dispatch }) => {
    try {
      const state = getState() as any;
      
      // Проверяем, не применяется ли уже этот промокод
      if (state.checkout.voucherCode === code && state.checkout.voucherDiscount > 0) {
        // Промокод уже применен, возвращаем текущие значения
        return {
          voucherCode: state.checkout.voucherCode,
          voucherDiscount: state.checkout.voucherDiscount
        };
      }
      
      // Используем REST API для валидации промокода
      const { validateVoucher } = await import('@/services/voucher.service');
      const lines = state.checkout.lines || [];
      
      if (lines.length === 0) {
        throw new Error('Корзина пуста. Добавьте товары в корзину.');
      }
      
      const variantIds = lines.map((line: any) => line.variantId);
      const quantities = lines.map((line: any) => line.quantity);
      
      const validationResult = await validateVoucher(
        code,
        variantIds,
        quantities,
        'miraflores-site'
      );
      
      if (!validationResult.ok) {
        throw new Error(validationResult.error || 'Ошибка при применении промокода');
      }
      
      // Возвращаем результат валидации
      return {
        voucherCode: validationResult.code || code,
        voucherDiscount: validationResult.discountAmount || 0,
        discountType: validationResult.discountType,
        discountPercent: validationResult.discountPercent,
        discountName: validationResult.discountName,
      };
      
      // Старый код через GraphQL (закомментирован)
      /*
      let checkoutId = state.checkout.id;

      // Если checkout не создан, создаем его
      if (!checkoutId) {
        const lines = state.checkout.lines || [];
        if (lines.length === 0) {
          throw new Error('Корзина пуста. Добавьте товары в корзину.');
        }

        // Создаем checkout
        const checkoutInput = {
          lines: lines.map((line: any) => ({
            quantity: line.quantity,
            variantId: line.variantId
          })),
          channel: 'miraflores-site'
        };

        try {
          const createResult = await dispatch(createCheckoutApi(checkoutInput)).unwrap();
          checkoutId = createResult?.checkoutCreate?.checkout?.id;
          
          if (!checkoutId) {
            // Проверяем ошибки в ответе
            if (createResult?.checkoutCreate?.errors && createResult.checkoutCreate.errors.length > 0) {
              const error = createResult.checkoutCreate.errors[0];
              throw new Error(error.message || 'Ошибка при создании корзины');
            }
            throw new Error('Не удалось создать корзину для применения промокода');
          }
          
          // Обновляем checkoutId из нового state после создания
          const newState = getState() as any;
          checkoutId = newState.checkout.id || checkoutId;
        } catch (createError: any) {
          // Если ошибка связана с наличием товара, пробрасываем её дальше
          if (createError?.message?.includes('remaining in stock') || 
              createError?.message?.includes('Only 0 remaining')) {
            throw new Error('Некоторые товары закончились. Пожалуйста, удалите их из корзины перед применением промокода.');
          }
          throw createError;
        }
      } else {
        // Если checkout уже существует, убеждаемся что используем актуальный ID
        const currentState = getState() as any;
        checkoutId = currentState.checkout.id || checkoutId;
      }

      const mutation = `
        mutation checkoutAddPromoCode($id: ID!, $promoCode: String!) {
          checkoutAddPromoCode(id: $id, promoCode: $promoCode) {
            checkout {
              id
              discount {
                amount
              }
              discountName
              voucherCode
            }
            errors {
              field
              message
              code
            }
          }
        }
      `;

      const result = await graphqlRequest<any>(mutation, {
        id: checkoutId,
        promoCode: code
      });

      if (result.checkoutAddPromoCode.errors && result.checkoutAddPromoCode.errors.length > 0) {
        const error = result.checkoutAddPromoCode.errors[0];
        throw new Error(error.message || 'Ошибка при применении промокода');
      }

      const checkout = result.checkoutAddPromoCode.checkout;
      // discount.amount может быть в формате Decimal, конвертируем в число
      const discountAmount = checkout.discount?.amount 
        ? parseFloat(String(checkout.discount.amount)) 
        : 0;
      
      return {
        voucherCode: checkout.voucherCode || code,
        voucherDiscount: discountAmount
      };
      */
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка при применении промокода');
    }
  }
);

export const { addItemToCart, removeItemFromCart, increaseQuantity, decreaseQuantity, clearCart, removeVoucherCode } =
  checkoutSlice.actions;

export default checkoutSlice.reducer;
