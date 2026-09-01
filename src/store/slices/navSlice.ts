import { createSlice, createAsyncThunk, SerializedError, AsyncThunkConfig } from '@reduxjs/toolkit';
import { fetchCatalogTags } from '@/api/catalogApi';
import { getAllCategorMenu } from '@/graphql/queries/category.service';
import { navSliceState, NavCatalogTag, NavMenuItem } from '@/types/nav';

const initialState: navSliceState = {
  items: [],
  tags: [],
  loading: false,
  tagsLoading: false,
  error: null,
  tagsError: null,
};

export const getMenuItems = createAsyncThunk<NavMenuItem[], void, AsyncThunkConfig>(
  'nav/getNavMenuItems',
  async () => {
    const categories = await getAllCategorMenu();
    return categories.map((cat: any) => ({
      id: cat.id,
      name: (cat.name || '').toUpperCase(),
      category: {
        id: cat.id,
        slug: cat.slug,
        backgroundImage: {
          url: cat.backgroundImage?.url || '',
        },
      },
    }));
  },
);

export const getCatalogTags = createAsyncThunk<NavCatalogTag[], void, AsyncThunkConfig>(
  'nav/getCatalogTags',
  async () => {
    const { items } = await fetchCatalogTags();
    return (items ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      title: t.title ?? null,
      description: t.description ?? null,
      coverImageUrl: t.coverImageUrl ?? null,
    }));
  },
);

const navSlice = createSlice({
  name: 'nav',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getMenuItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMenuItems.fulfilled, (state, action) => {
        const areEqual = JSON.stringify(state.items) === JSON.stringify(action.payload);
        if (!areEqual) state.items = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(getMenuItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error;
      })
      .addCase(getCatalogTags.pending, (state) => {
        state.tagsLoading = true;
        state.tagsError = null;
      })
      .addCase(getCatalogTags.fulfilled, (state, action) => {
        const areEqual = JSON.stringify(state.tags) === JSON.stringify(action.payload);
        if (!areEqual) state.tags = action.payload;
        state.tagsLoading = false;
        state.tagsError = null;
      })
      .addCase(getCatalogTags.rejected, (state, action) => {
        state.tagsLoading = false;
        state.tagsError = action.error;
      });
  },
});

export const {} = navSlice.actions;
export default navSlice.reducer;
