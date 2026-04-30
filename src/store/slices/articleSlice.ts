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
  /** Основное изображение статьи (атрибут kartinka), герой на странице статьи */
  image: string | null;
  /** Превью для списка статей (атрибут prevyu-stati) */
  previewImage: string | null;
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

/** Атрибут «Дата» на модели страницы-статьи (slug или имя из дашборда) */
function isArticleDateAttribute(a: ArticleNode['assignedAttributes'][0]): boolean {
  const slug = a.attribute.slug.toLowerCase();
  const name = (a.attribute.name || '').trim().toLowerCase();
  return slug === 'data' || slug === 'data-stati' || name === 'дата';
}

function formatArticleDisplayDate(
  attr: ArticleNode['assignedAttributes'][0] | undefined,
  fallback: string
): string {
  if (!attr) return fallback;
  if (attr.dateTimeValue) {
    const d = new Date(attr.dateTimeValue);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('ru-RU');
  }
  if (attr.dateValue) {
    const d = new Date(attr.dateValue);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('ru-RU');
  }
  const text = attr.textValue?.trim();
  if (text) return text;
  return fallback;
}

/** Для сортировки списка: дата из атрибута «Дата» или дата создания страницы */
export function getArticleNodeSortTimestamp(node: ArticleNode): number {
  const attr = node.assignedAttributes.find(isArticleDateAttribute);
  if (attr?.dateTimeValue) {
    const t = new Date(attr.dateTimeValue).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (attr?.dateValue) {
    const t = new Date(attr.dateValue).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const created = new Date(node.created).getTime();
  return Number.isNaN(created) ? 0 : created;
}

export function mapArticleNodeToArticle(node: ArticleNode): Article {
  const imageAttr = node.assignedAttributes.find(item => item.attribute.slug === 'kartinka');
  const previewAttr = node.assignedAttributes.find(
    item => item.attribute.slug === 'prevyu-stati'
  );
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

  const fallbackDate = new Date(node.created).toLocaleDateString('ru-RU');
  const dateAttr = node.assignedAttributes.find(isArticleDateAttribute);
  const displayDate = formatArticleDisplayDate(dateAttr, fallbackDate);

  return {
    id: node.id,
    slug: node.slug,
    date: displayDate,
    title: node.title,
    description: previewText,
    author: authorAttr?.textValue ?? '',
    authorRole:authorRoleMeta ?? '',
    image: imageAttr?.fileValue?.url ?? null,
    previewImage: previewAttr?.fileValue?.url ?? null,
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
