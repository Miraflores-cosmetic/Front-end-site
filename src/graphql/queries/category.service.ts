import { fetchCatalogTags, fetchCategories, getProductEdges } from '@/api/catalogApi';
import { uploadsUrl } from '@/api/apiClient';
import type { CategoryConnection, SingleCategoryConnection } from '../types/category';

function findCategoryInTree(
  items: Awaited<ReturnType<typeof fetchCategories>>['items'],
  slug: string,
): { id: string; name: string; slug: string } | null {
  for (const root of items) {
    if (root.slug === slug) return root;
    for (const ch of root.children ?? []) {
      if (ch.slug === slug) return ch;
    }
  }
  return null;
}

export async function getAllCategory(first: number): Promise<CategoryConnection['categories']> {
  const { items } = await fetchCategories();
  const flat: Array<{
    id: string;
    name: string;
    slug: string;
    parent?: { id: string; name: string; slug: string } | null;
  }> = [];
  for (const root of items) {
    flat.push({
      id: root.id,
      name: root.name,
      slug: root.slug,
      parent: root.parentId ? { id: root.parentId, name: '', slug: '' } : null,
    });
    for (const ch of root.children ?? []) {
      flat.push({
        id: ch.id,
        name: ch.name,
        slug: ch.slug,
        parent: { id: root.id, name: root.name, slug: root.slug },
      });
    }
  }
  return {
    edges: flat.slice(0, first).map((node) => ({ node: { ...node, description: '' } })),
    totalCount: flat.length,
    categories: {
      edges: flat.slice(0, first).map((node) => ({ node: { ...node, description: '' } })),
      totalCount: flat.length,
    },
  } as unknown as CategoryConnection['categories'];
}

export async function getAllCategorMenu(): Promise<any[]> {
  const { items } = await fetchCategories();
  return items.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    backgroundImage: c.imageUrl ? { url: uploadsUrl(c.imageUrl) } : null,
    parent: c.parentId ? { id: c.parentId } : null,
  }));
}

/** Каталог по slug категории или контекстного тега (/category/:slug). */
async function categoryWithProducts(slug: string, first: number, after?: string | null) {
  const page = after ? parseInt(after, 10) || 1 : 1;
  const { items: categories } = await fetchCategories();
  const category = findCategoryInTree(categories, slug);

  let name = category?.name ?? slug;
  let description = '';
  let edges: Awaited<ReturnType<typeof getProductEdges>>['edges'] = [];
  let total = 0;

  if (category) {
    const res = await getProductEdges({ category: slug, limit: first, page });
    edges = res.edges;
    total = res.total;
  } else {
    const { items: tags } = await fetchCatalogTags();
    const tag = tags.find((t) => t.slug === slug);
    if (tag) {
      name = tag.title?.trim() || tag.name;
      description = tag.description?.trim() || '';
      const res = await getProductEdges({ tag: slug, limit: first, page });
      edges = res.edges;
      total = res.total;
    }
  }

  return {
    id: category?.id ?? slug,
    name,
    description,
    slug,
    products: {
      pageInfo: {
        hasNextPage: page * first < total,
        endCursor: String(page + 1),
      },
      totalCount: total,
      edges,
    },
  };
}

export async function getSingleCategory(
  first: number,
  slug: string,
): Promise<SingleCategoryConnection['category']> {
  const category = await categoryWithProducts(slug, first);
  return category as unknown as SingleCategoryConnection['category'];
}

export async function getCategoryBySlug(
  first: number,
  categorySlug: string,
  after?: string | null,
): Promise<SingleCategoryConnection['category']> {
  const category = await categoryWithProducts(categorySlug, first, after);
  return category as unknown as SingleCategoryConnection['category'];
}

export async function getCategoryTabsBySlug(first: number, slug: string) {
  const { items } = await fetchCategories();
  const root = items.find((c) => c.slug === slug);
  return (root?.children ?? []).slice(0, first).map((ch) => ({
    id: ch.id,
    name: ch.name,
    slug: ch.slug,
  }));
}
