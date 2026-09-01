import { configureStore } from '@reduxjs/toolkit';
import drawerReducer from './slices/drawerSlice';
import bestsellerSlice from './slices/bestsellersSlice';
import articleSlice from './slices/articleSlice';
import articlesSlice from './slices/articlesSlice';
import authSlice from './slices/authSlice';
import checkoutSlice from './slices/checkoutSlice';
import navSlice from '@/store/slices/navSlice';
import productSlice from '@/store/slices/productSlice';
import categorySlice from '@/store/slices/categorySlice';
import menuFeaturedSlice from '@/store/slices/menuFeaturedSlice';
import { checkoutListenerMiddleware } from './checkoutListenerMiddleware';

export const store = configureStore({
  reducer: {
    drawer: drawerReducer,
    articleSlice: articleSlice,
    articlesSlice: articlesSlice,
    authSlice: authSlice,
    bestsellerSlice: bestsellerSlice,
    checkout: checkoutSlice,
    nav: navSlice,
    product: productSlice,
    category: categorySlice,
    menuFeatured: menuFeaturedSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(checkoutListenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
