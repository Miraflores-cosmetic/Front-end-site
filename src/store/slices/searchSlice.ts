import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { searchByContext, type SearchResultItem } from '@/services/searchContext';

interface SearchState {
  query: string;
  results: SearchResultItem[];
  loading: boolean;
}

const initialState: SearchState = {
  query: '',
  results: [],
  loading: false
};

export const fetchSearch = createAsyncThunk('search/fetchSearch', async (query: string) => {
  const results = await searchByContext(query);
  return { query, results };
});

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    clearSearch(state) {
      state.query = '';
      state.results = [];
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchSearch.pending, state => {
      state.loading = true;
    });
    builder.addCase(fetchSearch.fulfilled, (state, action) => {
      state.loading = false;
      state.query = action.payload.query;
      state.results = action.payload.results;
    });
    builder.addCase(fetchSearch.rejected, state => {
      state.loading = false;
      state.results = [];
    });
  }
});

export const { clearSearch } = searchSlice.actions;
export default searchSlice.reducer;
