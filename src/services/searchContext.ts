import { getProductsForContextSearch } from '@/graphql/queries/products.service';
import { getAllArticles } from '@/graphql/queries/articles.service';
import type { ArticleNode } from '@/graphql/queries/articles.service';
import { searchProducts } from '@/services/searchProducts';

export type SearchResultItem =
  | { type: 'product'; id: string; title: string; slug: string; url: string }
  | { type: 'article'; id: string; title: string; slug: string; url: string };

function textContains(text: string | undefined | null, query: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

/** Извлекает текст из description товара (EditorJS JSON или строка). */
function extractTextFromDescription(desc: string | undefined | null): string {
  if (!desc || typeof desc !== 'string') return '';
  try {
    const parsed = JSON.parse(desc);
    if (parsed?.blocks && Array.isArray(parsed.blocks)) {
      return parsed.blocks
        .map((b: any) => b.data?.text ?? b.data?.content ?? '')
        .filter(Boolean)
        .join(' ');
    }
  } catch {
    return desc;
  }
  return desc;
}

function extractTextFromContent(content: string | undefined | null): string {
  if (!content) return '';
  if (typeof content !== 'string') return '';
  try {
    const parsed = JSON.parse(content);
    if (parsed?.blocks && Array.isArray(parsed.blocks)) {
      return parsed.blocks
        .map((b: any) => b.data?.text ?? b.data?.content ?? '')
        .filter(Boolean)
        .join(' ');
    }
  } catch {
    return content;
  }
  return content;
}

function productMatchesQuery(
  node: {
    name?: string;
    description?: string | null;
    attributes?: Array<{
      values?: Array<{ name?: string; plainText?: string; richText?: string }>;
    }>;
  },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (textContains(node.name, q)) return true;
  const descText = extractTextFromDescription(node.description);
  if (textContains(descText, q)) return true;
  if (textContains(node.description, q)) return true;
  if (node.attributes) {
    for (const attr of node.attributes) {
      for (const val of attr.values ?? []) {
        if (textContains(val.name, q) || textContains(val.plainText, q)) return true;
        if (typeof val.richText === 'string' && textContains(val.richText, q)) return true;
      }
    }
  }
  return false;
}

function articleMatchesQuery(node: ArticleNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (textContains(node.title, q)) return true;
  const contentText = extractTextFromContent(node.content);
  if (textContains(contentText, q)) return true;
  if (node.assignedAttributes) {
    for (const a of node.assignedAttributes) {
      if (a.textValue && textContains(a.textValue, q)) return true;
    }
  }
  return false;
}

let cachedProducts: Awaited<ReturnType<typeof getProductsForContextSearch>> | null = null;
let cachedArticles: ArticleNode[] | null = null;

export async function searchByContext(query: string): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const [productsSettled, articlesSettled] = await Promise.allSettled([
      cachedProducts ?? getProductsForContextSearch(200).then((p) => {
        cachedProducts = p;
        return p;
      }),
      cachedArticles ?? getAllArticles(100).then((a) => {
        cachedArticles = a;
        return a;
      })
    ]);

    const products =
      productsSettled.status === 'fulfilled' ? productsSettled.value : [];
    const articles =
      articlesSettled.status === 'fulfilled' ? articlesSettled.value : [];

    if (productsSettled.status === 'rejected') {
      console.warn('[searchContext] Products fetch failed:', productsSettled.reason);
    }
    if (articlesSettled.status === 'rejected') {
      console.warn('[searchContext] Articles fetch failed:', articlesSettled.reason);
    }

    const results: SearchResultItem[] = [];

    const seenProductIds = new Set<string>();
    for (const node of products) {
      if (productMatchesQuery(node, q)) {
        seenProductIds.add(node.id);
        results.push({
          type: 'product',
          id: node.id,
          title: node.name ?? '',
          slug: node.slug ?? '',
          url: `/product/${node.slug}`
        });
      }
    }

    if (results.filter((r) => r.type === 'product').length === 0) {
      try {
        const byName = await searchProducts(q);
        for (const p of byName) {
          if (seenProductIds.has(p.id)) continue;
          results.push({
            type: 'product',
            id: p.id,
            title: p.name ?? '',
            slug: p.slug ?? '',
            url: `/product/${p.slug}`
          });
        }
      } catch (_) {
        // ignore
      }
    }

    for (const node of articles) {
      if (articleMatchesQuery(node, q)) {
        results.push({
          type: 'article',
          id: node.id,
          title: node.title ?? '',
          slug: node.slug ?? '',
          url: `/about/articles/${node.slug}`
        });
      }
    }

    return results.slice(0, 30);
  } catch (err) {
    console.error('[searchContext] Error:', err);
    return [];
  }
}
