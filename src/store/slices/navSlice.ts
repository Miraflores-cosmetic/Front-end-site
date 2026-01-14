import { createSlice, createAsyncThunk, SerializedError, AsyncThunkConfig } from '@reduxjs/toolkit';
import { getAllCategorMenu } from '@/graphql/queries/category.service';
import { navSliceState, NavMenuItem } from '@/types/nav'

const initialState: navSliceState = {
  items: [],
  loading: false,
  error: null
};

export const getMenuItems = createAsyncThunk<NavMenuItem[], void, AsyncThunkConfig>(
  'nav/getNavMenuItems',
  async () => {
    const categories = await getAllCategorMenu();
    // Приводим к форме NavMenuItem
    return categories.map((cat: any) => ({
      id: cat.id,
      name: (cat.name || '').toUpperCase(),
      category: {
        id: cat.id,
        slug: cat.slug,
        backgroundImage: {
          url: cat.backgroundImage?.url || ''
        }
      }
    }));
  }
);

const navSlice = createSlice({
  name: 'nav',
  initialState,
  reducers: {},
  extraReducers: builder => {
      builder
        .addCase(getMenuItems.pending, state => {
          state.loading = true;
          state.error = null;
        })
        .addCase(getMenuItems.fulfilled, (state, action) => {
          const areEqual = JSON.stringify(state.items) === JSON.stringify(action.payload);  
          if (!areEqual) {state.items = action.payload;};
          state.loading = false;
          state.error = null;
        })
        .addCase(getMenuItems.rejected, (state, action) => {
          state.loading = false;
          state.error = action.error;
        });
    }
});

export const {} = navSlice.actions;
export default navSlice.reducer;
