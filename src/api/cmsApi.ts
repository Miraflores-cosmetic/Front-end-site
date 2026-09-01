import { apiFetch, uploadsUrl } from '@/api/apiClient';

export type CmsPage = {
  id?: string | null;
  slug: string;
  title: string;
  bodyHtml: string;
  isPublished?: boolean;
  publishedAt?: string | null;
};

export async function getCmsPage(slug: string): Promise<CmsPage | null> {
  try {
    return await apiFetch<CmsPage>(`/cms/pages/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

/** Сырой ответ Nest BlogPublicService */
type NestBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body?: string;
  bodyHtml?: string;
  coverUrl?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  author?: { id: string; displayName: string | null } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalPath?: string | null;
  seoNoIndex?: boolean;
};

export type BlogPostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  category?: { id: string; name: string; slug: string } | null;
  author?: { id: string; displayName: string | null } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalPath?: string | null;
  seoNoIndex?: boolean;
};

export type BlogPostDetail = BlogPostListItem & {
  bodyHtml: string;
};

function mapNestBlogPost(raw: NestBlogPost): BlogPostDetail {
  const cover =
    raw.coverImageUrl?.trim() || raw.coverUrl?.trim() || null;
  const og =
    raw.ogImageUrl?.trim() || null;
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt ?? null,
    coverImageUrl: cover ? uploadsUrl(cover) || cover : null,
    publishedAt: raw.publishedAt ?? null,
    category: raw.category ?? null,
    author: raw.author ?? null,
    metaTitle: raw.metaTitle ?? null,
    metaDescription: raw.metaDescription ?? null,
    ogImageUrl: og ? uploadsUrl(og) || og : null,
    canonicalPath: raw.canonicalPath ?? null,
    seoNoIndex: Boolean(raw.seoNoIndex),
    bodyHtml: (raw.bodyHtml ?? raw.body ?? '').trim(),
  };
}

export async function listBlogPosts(params?: {
  categorySlug?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: BlogPostListItem[]; total: number; page: number; limit: number }> {
  const res = await apiFetch<{
    items: NestBlogPost[];
    total: number;
    page: number;
    limit: number;
  }>('/blog/posts', {
    query: {
      categorySlug: params?.categorySlug,
      page: params?.page,
      limit: params?.limit,
    },
  });
  return {
    ...res,
    items: (res.items ?? []).map((p) => {
      const mapped = mapNestBlogPost(p);
      const { bodyHtml: _body, ...listItem } = mapped;
      return listItem;
    }),
  };
}

export async function getBlogPost(slug: string): Promise<BlogPostDetail | null> {
  try {
    const row = await apiFetch<NestBlogPost>(
      `/blog/posts/${encodeURIComponent(slug)}`,
    );
    return mapNestBlogPost(row);
  } catch {
    return null;
  }
}

export async function searchCatalog(
  q: string,
  options?: { signal?: AbortSignal },
): Promise<{
  q: string;
  groups: Array<{
    key: string;
    label: string;
    items: Array<{ id: string; title: string; href: string; subtitle?: string | null; imageUrl?: string | null }>;
  }>;
}> {
  return apiFetch('/search', { query: { q }, signal: options?.signal });
}
