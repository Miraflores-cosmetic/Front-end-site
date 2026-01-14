import {createAsyncThunk, createSlice, PayloadAction, SerializedError} from '@reduxjs/toolkit';
import {ProductDetailNode} from "@/graphql/types/core.types";
import {GetProductInput} from "@/types/productSlice";
import {getSingleProduct} from "@/graphql/queries/products.service";
import {ArticleNode, getSingleArticle} from "@/graphql/queries/articles.service";

export interface Article {
  id: string;
  slug: string;
  date: string;
  title: string;
  description: string;
  author: string;
  authorRole: string;
  image: string | null;
  imageAuthor: string | null;
  content?: string | null;
}

interface ArticleState {
  article: Article | null;
  loading: boolean,
  error: SerializedError | null;
}

const initialState: ArticleState = {
  article: null,
  loading: false,
  error: null,
};

function htmlToText(html: string, maxLen = 500): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = (div.textContent || div.innerText || '').trim();
  return text.length > maxLen
    ? text.slice(0, maxLen) + '…'
    : text;
}

export function mapArticleNodeToArticle(node: ArticleNode): Article {
  const imageAttr = node.assignedAttributes.find(item => item.attribute.slug === 'kartinka');
  const authorAttr = node.assignedAttributes.find(item => item.attribute.slug === 'imya-avtora');
  const authorPhotoAttr = node.assignedAttributes.find(item => item.attribute.slug === 'foto-avtora');
  const authorRoleMeta = node.metadata?.find(m => m.key === 'authorRole')?.value;

  let previewText = '';
  try {
    const parsed = JSON.parse(node.content || '{}');
    const firstBlock = parsed.blocks?.find((b: any) => b.type === 'paragraph');
    previewText = htmlToText(firstBlock?.data?.text ?? '', 500);

  } catch (e) {
    previewText = '';
  }

  return {
    id: node.id,
    slug: node.slug,
    date: new Date(node.created).toLocaleDateString('ru-RU'),
    title: node.title,
    description: previewText,
    author: authorAttr?.textValue ?? '',
    authorRole:authorRoleMeta ?? '',
    image: imageAttr?.fileValue?.url ?? null,
    imageAuthor: authorPhotoAttr?.fileValue?.url ?? null,
    content: node.content ?? null,
  };
}

export const fetchArticleBySlug = createAsyncThunk<Article, string>(
  'article/fetchBySlug',
  async (slug: string) => {
    const freshNode = await getSingleArticle(slug);
    if (!freshNode) {
      throw new Error('Article not found');
    }
    return mapArticleNodeToArticle(freshNode);
  }
);

const articleSlice = createSlice({
  name: 'articleSlice',
  initialState,

  reducers: {
    setArticle(state, action: PayloadAction<Article>) {
      state.article = action.payload;
      state.error = null;
      state.loading = false;
    },
    clearArticle(state) {
      state.article = null;
      state.loading = false;
      state.error = null;
    }
  } ,
  extraReducers: builder => {
    builder
      .addCase(fetchArticleBySlug.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchArticleBySlug.fulfilled, (state, action) => {
        state.article = action.payload;
        state.loading = false;
      })
      .addCase(fetchArticleBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error;
      });
  },
});

export const { setArticle, clearArticle } = articleSlice.actions;

export default articleSlice.reducer;
