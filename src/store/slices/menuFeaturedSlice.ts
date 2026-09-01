import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getMenuSettings, type MenuSettings } from '@/api/settingsApi';

const STALE_MS = 5 * 60 * 1000;

type MenuFeaturedState = {
  data: MenuSettings | null;
  status: 'idle' | 'loading' | 'revalidating' | 'succeeded' | 'failed';
  fetchedAt: number;
  error: string | null;
};

const initialState: MenuFeaturedState = {
  data: null,
  status: 'idle',
  fetchedAt: 0,
  error: null,
};

type RootWithMenuFeatured = { menuFeatured: MenuFeaturedState };

function isFresh(state: MenuFeaturedState): boolean {
  return Boolean(state.data) && Date.now() - state.fetchedAt < STALE_MS;
}

/** Stale-while-revalidate: fresh → skip; иначе fetch (UI держит старые данные). */
export const fetchMenuFeatured = createAsyncThunk(
  'menuFeatured/fetch',
  async () => getMenuSettings(),
  {
    condition: (_, { getState }) => {
      const state = (getState() as RootWithMenuFeatured).menuFeatured;
      if (state.status === 'loading' || state.status === 'revalidating') return false;
      return !isFresh(state);
    },
  }
);

const menuFeaturedSlice = createSlice({
  name: 'menuFeatured',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenuFeatured.pending, (state) => {
        state.error = null;
        state.status = state.data ? 'revalidating' : 'loading';
      })
      .addCase(fetchMenuFeatured.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = 'succeeded';
        state.fetchedAt = Date.now();
        state.error = null;
      })
      .addCase(fetchMenuFeatured.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load';
      });
  },
});

export default menuFeaturedSlice.reducer;
