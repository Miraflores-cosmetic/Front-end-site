import { getBlogPost, listBlogPosts } from '@/api/cmsApi';
import { uploadsUrl } from '@/api/apiClient';

export interface ArticleAssignedAttribute {
  attribute: { id: string; slug: string; name: string };
  fileValue?: { url: string };
  textValue?: string;
  dateValue?: string | null;
  dateTimeValue?: string | null;
}

export interface ArticleNode {
  id: string;
  slug: string;
  title: string;
  created: string;
  content?: string | null;
  /** Прямой URL обложки */
  coverUrl?: string | null;
  /** Nest author.displayName */
  authorName?: string | null;
  /** Лида API — приоритет для карточек / meta description */
  excerpt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalPath?: string | null;
  seoNoIndex?: boolean;
  assignedAttributes: ArticleAssignedAttribute[];
  metadata?: { key: string; value: string }[];
}

export interface SingleArticleConnection {
  page: ArticleNode | null;
}

const COVER_ATTR_SLUGS = ['kartinka', 'prevyu-stati', 'cover'] as const;

function mapPostToArticle(row: {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  bodyHtml?: string;
  body?: string;
  coverImageUrl?: string | null;
  coverUrl?: string | null;
  publishedAt?: string | null;
  author?: { id?: string; displayName?: string | null } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalPath?: string | null;
  seoNoIndex?: boolean;
}): ArticleNode {
  const attrs: ArticleAssignedAttribute[] = [];
  // cmsApi уже прогоняет coverImageUrl через uploadsUrl — не дублируем.
  const coverResolved =
    row.coverImageUrl?.trim() ||
    (row.coverUrl?.trim()
      ? uploadsUrl(row.coverUrl.trim()) || row.coverUrl.trim()
      : null) ||
    null;

  if (coverResolved) {
    for (const slug of COVER_ATTR_SLUGS) {
      attrs.push({
        attribute: { id: slug, slug, name: 'Обложка' },
        fileValue: { url: coverResolved },
      });
    }
  }
  const authorName = row.author?.displayName?.trim() || null;
  if (authorName) {
    attrs.push({
      attribute: { id: 'imya-avtora', slug: 'imya-avtora', name: 'Автор' },
      textValue: authorName,
    });
  }
  if (row.publishedAt) {
    attrs.push({
      attribute: { id: 'date', slug: 'date', name: 'Дата' },
      dateValue: row.publishedAt,
      dateTimeValue: row.publishedAt,
    });
  }
  const excerpt = (row.excerpt ?? '').trim() || null;
  const body = (row.bodyHtml ?? row.body ?? '').trim();
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    created: row.publishedAt || new Date().toISOString(),
    content: body || excerpt,
    excerpt,
    coverUrl: coverResolved,
    authorName,
    metaTitle: row.metaTitle ?? null,
    metaDescription: row.metaDescription ?? null,
    ogImageUrl: row.ogImageUrl ?? null,
    canonicalPath: row.canonicalPath ?? null,
    seoNoIndex: Boolean(row.seoNoIndex),
    assignedAttributes: attrs,
  };
}

export async function getAllArticles(first = 100): Promise<{
  items: ArticleNode[];
  total: number;
}> {
  const limit = Math.min(Math.max(1, first), 100);
  const res = await listBlogPosts({ limit, page: 1 });
  return {
    items: res.items.map((item) => mapPostToArticle(item)),
    total: res.total ?? res.items.length,
  };
}

export async function getSingleArticle(slug: string): Promise<ArticleNode | null> {
  return getArticleBySlug(slug);
}

export async function getArticleBySlug(
  slug: string,
): Promise<SingleArticleConnection['page']> {
  const row = await getBlogPost(slug);
  return row ? mapPostToArticle(row) : null;
}
