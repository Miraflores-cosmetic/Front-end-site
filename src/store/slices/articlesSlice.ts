import { createAsyncThunk, createSlice, SerializedError } from '@reduxjs/toolkit';
import { getAllArticles, ArticleNode } from '@/graphql/queries/articles.service';
import { Article, getArticleNodeSortTimestamp, mapArticleNodeToArticle } from '@/store/slices/articleSlice';

interface ArticlesState {
  items: Article[];
  total: number;
  loading: boolean;
  error: SerializedError | null;
  /** Когда список последний раз успешно загружен (ms) */
  fetchedAt: number | null;
}

const initialState: ArticlesState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  fetchedAt: null,
};

const STALE_MS = 60_000;

export const fetchArticles = createAsyncThunk<
  { items: Article[]; total: number },
  number | undefined
>('articles/fetchAll', async (limit) => {
  const data = await getAllArticles(limit ?? 100);
  const sorted = [...(data.items ?? [])].sort(
    (a: ArticleNode, b: ArticleNode) =>
      getArticleNodeSortTimestamp(b) - getArticleNodeSortTimestamp(a),
  );
  return {
    items: sorted.map(mapArticleNodeToArticle),
    total: data.total,
  };
});

const articlesSlice = createSlice({
  name: 'articlesSlice',
  initialState,
  reducers: {
    clearArticles(state) {
      state.items = [];
      state.total = 0;
      state.loading = false;
      state.error = null;
      state.fetchedAt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchArticles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.loading = false;
        state.fetchedAt = Date.now();
      })
      .addCase(fetchArticles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error;
      });
  },
});

export function shouldRefetchArticles(state: ArticlesState): boolean {
  if (state.loading) return false;
  if (!state.fetchedAt || state.items.length === 0) return true;
  return Date.now() - state.fetchedAt > STALE_MS;
}

export const { clearArticles } = articlesSlice.actions;
export default articlesSlice.reducer;
