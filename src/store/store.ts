import {configureStore} from '@reduxjs/toolkit';
import drawerReducer from './slices/drawerSlice';
import bestSellerSlice from './slices/bestSellerSlice';
import bestsellerSlice from './slices/bestsellersSlice';
import articleSlice from './slices/articleSlice';
import articlesSlice from './slices/articlesSlice';
import cartSlice from './slices/cartSlice';
import authSlice from './slices/authSlice';
import checkoutSlice from './slices/checkoutSlice';
import searchSlice from '@/store/slices/searchSlice';
import navSlice from '@/store/slices/navSlice'
import productSlice from '@/store/slices/productSlice'
import categorySlice from '@/store/slices/categorySlice'

export const store = configureStore({
  reducer: {
    drawer: drawerReducer,
    bestSellerSlice: bestSellerSlice,
    articleSlice: articleSlice,
    articlesSlice: articlesSlice,
    cartSlice: cartSlice,
    authSlice: authSlice,
    bestsellerSlice: bestsellerSlice,
    checkout: checkoutSlice,
    search: searchSlice,
    nav: navSlice,
    product: productSlice,
    category: categorySlice
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
