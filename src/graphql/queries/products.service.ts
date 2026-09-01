/**
 * Каталог — тонкие обёртки над @/api/catalogApi (Админ панель 2.0).
 */
import {
  adaptProductDetail,
  fetchProductBySlug,
  getAllProductEdges,
  getFilteredProducts as catalogGetFilteredProducts,
  getProductEdges,
  getProductsByCollectionGid,
  getProductsForContextSearch as catalogContextSearch,
  getWarehouses as catalogGetWarehouses,
} from '@/api/catalogApi';
import type { Connection, ProductDetailNode, ProductNode, WarehouseNode } from '../types/core.types';
import type { ProductEdge } from '@/types/products';

export async function getSingleProduct(slug: string): Promise<ProductDetailNode | null> {
  const row = await fetchProductBySlug(slug);
  return row ? adaptProductDetail(row) : null;
}

export async function getQuizProductCard(slug: string): Promise<ProductDetailNode | null> {
  return getSingleProduct(slug);
}

export async function getFilteredProducts(
  first = 20,
  isPublished?: boolean,
): Promise<Connection<ProductNode>> {
  return catalogGetFilteredProducts(first, isPublished);
}

export async function getProductsForContextSearch(first = 200) {
  return catalogContextSearch(first);
}

export async function getWarehouses(): Promise<WarehouseNode[]> {
  return catalogGetWarehouses();
}

/** @deprecated Админ-мутация Saleor — не поддерживается */
export async function updateProductName(_productId: string, _newName: string): Promise<ProductNode> {
  throw new Error('updateProductName недоступен — используйте Админ панель 2.0');
}

export async function getBestsellerProducts(): Promise<{ edges: ProductEdge[] }> {
  return getProductsByCollectionGid('Q29sbGVjdGlvbjo3', 50);
}

export async function getAllProducts(maxLimit = 100): Promise<{ edges: ProductEdge[] }> {
  return getAllProductEdges(maxLimit);
}

/** Фильтр по тегу (этап ухода) через ?tag=slug */
export async function getProductsByCareStageRest(
  careStageSlug: string | null,
  limit = 200,
  excludeSlug?: string,
  excludeId?: string,
): Promise<{ edges: ProductEdge[] }> {
  const res = await getProductEdges({
    tag: careStageSlug || undefined,
    limit,
    page: 1,
  });
  let edges = res.edges;
  if (excludeSlug) edges = edges.filter((e) => e.node.slug !== excludeSlug);
  if (excludeId) edges = edges.filter((e) => e.node.id !== excludeId);
  return { edges };
}

export async function getProductsByCareStage(
  careStageSlug: string,
  first = 50,
): Promise<{ edges: ProductEdge[] }> {
  return getProductsByCareStageRest(careStageSlug, first);
}
