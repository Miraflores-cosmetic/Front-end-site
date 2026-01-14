import { createAsyncThunk, createSlice, SerializedError } from '@reduxjs/toolkit';
import { getAllArticles, ArticleNode } from '@/graphql/queries/articles.service';
import { Article, mapArticleNodeToArticle } from '@/store/slices/articleSlice';

interface ArticlesState {
  items: Article[];
  loading: boolean;
  error: SerializedError | null;
}

const initialState: ArticlesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchArticles = createAsyncThunk<Article[], number | undefined>(
  'articles/fetchAll',
  async (limit) => {
    const data: ArticleNode[] = await getAllArticles(limit ?? 20);
    return (data ?? []).map(mapArticleNodeToArticle);
  }
);

const articlesSlice = createSlice({
  name: 'articlesSlice',
  initialState,
  reducers: {
    clearArticles(state) {
      state.items = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchArticles.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchArticles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error;
      });
  },
});

export const { clearArticles } = articlesSlice.actions;
export default articlesSlice.reducer;
