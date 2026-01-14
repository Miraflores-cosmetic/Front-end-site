import { Product } from '@/types/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';


interface BestSellerState {
  // для одного текущего выбранного
  bestSeller: Product | null;
  // для массива всех выбранных
  bestSellers: Product[];
}

const initialState: BestSellerState = {
  bestSeller: null,
  bestSellers: []
};

const bestSellerSlice = createSlice({
  name: 'bestSellerSlice',
  initialState,
  reducers: {
    // заменяет текущее значение одиночного продукта
    setBestSeller(state, action: PayloadAction<Product>) {
      state.bestSeller = action.payload;
    },
    clearChosenProduct(state) {
      state.bestSeller = null;
    },

    // ---------- массив ----------
    addBestSellerToList(state, action: PayloadAction<Product>) {
      // добавляем только если такого id ещё нет
      const exists = state.bestSellers.some(p => p.id === action.payload.id);
      if (!exists) {
        state.bestSellers.push(action.payload);
      }
    },
    removeChosenProduct(state, action: PayloadAction<number>) {
      // удаляем по id
      state.bestSellers = state.bestSellers.filter(p => p.id !== action.payload);
    },
    clearChosenProducts(state) {
      state.bestSellers = [];
    }
  }
});

export const {
  setBestSeller,
  clearChosenProduct,
  addBestSellerToList,
  removeChosenProduct,
  clearChosenProducts
} = bestSellerSlice.actions;

export default bestSellerSlice.reducer;
