import {createAsyncThunk, createSlice, PayloadAction, SerializedError} from '@reduxjs/toolkit';
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
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalPath?: string | null;
  seoNoIndex?: boolean;
}

interface ArticleState {
  article: Article | null;
  /** true до первого fetch, чтобы не мигать «не найдена» */
  loading: boolean;
  error: SerializedError | null;
}

const initialState: ArticleState = {
  article: null,
  loading: true,
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
  const coverSlugs = new Set(['kartinka', 'prevyu-stati', 'cover']);
  const coverAttrs = node.assignedAttributes.filter((item) =>
    coverSlugs.has(item.attribute.slug),
  );
  const imageAttr =
    coverAttrs.find((a) => a.attribute.slug === 'kartinka') ||
    coverAttrs.find((a) => a.attribute.slug === 'cover') ||
    coverAttrs[0];
  const previewAttr =
    coverAttrs.find((a) => a.attribute.slug === 'prevyu-stati') ||
    coverAttrs.find((a) => a.attribute.slug === 'cover') ||
    coverAttrs[0];
  const authorAttr = node.assignedAttributes.find(
    (item) => item.attribute.slug === 'imya-avtora',
  );
  const authorPhotoAttr = node.assignedAttributes.find(
    (item) => item.attribute.slug === 'foto-avtora',
  );
  const authorRoleMeta = node.metadata?.find((m) => m.key === 'authorRole')?.value;

  // 1) Nest excerpt  2) HTML/JSON body fallback
  const excerptPlain = htmlToText((node.excerpt || '').trim(), 500);
  let previewText = excerptPlain;
  if (!previewText) {
    const rawContent = node.content || '';
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed?.blocks && Array.isArray(parsed.blocks)) {
        const firstBlock = parsed.blocks.find(
          (b: { type?: string }) => b.type === 'paragraph',
        );
        previewText = htmlToText(firstBlock?.data?.text ?? '', 500);
      } else {
        previewText = htmlToText(rawContent, 500);
      }
    } catch {
      previewText = htmlToText(rawContent, 500);
    }
  }

  const fallbackDate = new Date(node.created).toLocaleDateString('ru-RU');
  const dateAttr = node.assignedAttributes.find(isArticleDateAttribute);
  const displayDate = formatArticleDisplayDate(dateAttr, fallbackDate);
  const coverFallback = node.coverUrl?.trim() || null;

  return {
    id: node.id,
    slug: node.slug,
    date: displayDate,
    title: node.title,
    description: previewText,
    author: authorAttr?.textValue?.trim() || node.authorName?.trim() || '',
    authorRole: authorRoleMeta ?? '',
    image:
      imageAttr?.fileValue?.url ??
      previewAttr?.fileValue?.url ??
      coverFallback,
    previewImage:
      previewAttr?.fileValue?.url ??
      imageAttr?.fileValue?.url ??
      coverFallback,
    imageAuthor: authorPhotoAttr?.fileValue?.url ?? null,
    content: node.content ?? null,
    metaTitle: node.metaTitle ?? null,
    metaDescription: node.metaDescription ?? null,
    ogImageUrl: node.ogImageUrl ?? null,
    canonicalPath: node.canonicalPath ?? null,
    seoNoIndex: Boolean(node.seoNoIndex),
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

/** /info/:slug → Nest CMS (privacy/terms/delivery), не blog. */
export const fetchInfoPageBySlug = createAsyncThunk<Article, string>(
  'article/fetchInfoBySlug',
  async (slug: string) => {
    const { getPageBySlug } = await import('@/graphql/queries/pages.service');
    const page = await getPageBySlug(slug);
    if (!page) {
      throw new Error('Info page not found');
    }
    return {
      id: page.id,
      slug,
      date: '',
      title: page.title,
      description: htmlToText(page.content || '', 200),
      author: '',
      authorRole: '',
      image: null,
      previewImage: null,
      imageAuthor: null,
      content: page.content ?? null,
    };
  },
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
      state.loading = true;
      state.error = null;
    }
  } ,
  extraReducers: builder => {
    builder
      .addCase(fetchArticleBySlug.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        if (state.article?.slug !== action.meta.arg) {
          state.article = null;
        }
      })
      .addCase(fetchArticleBySlug.fulfilled, (state, action) => {
        state.article = action.payload;
        state.loading = false;
      })
      .addCase(fetchArticleBySlug.rejected, (state, action) => {
        state.loading = false;
        state.article = null;
        state.error = action.error;
      })
      .addCase(fetchInfoPageBySlug.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        if (state.article?.slug !== action.meta.arg) {
          state.article = null;
        }
      })
      .addCase(fetchInfoPageBySlug.fulfilled, (state, action) => {
        state.article = action.payload;
        state.loading = false;
      })
      .addCase(fetchInfoPageBySlug.rejected, (state, action) => {
        state.loading = false;
        state.article = null;
        state.error = action.error;
      });
  },
});

export const { setArticle, clearArticle } = articleSlice.actions;

export default articleSlice.reducer;
