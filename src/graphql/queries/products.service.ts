import { CHANNEL, graphqlRequest } from '@/graphql/client';
import type {
  ProductNode,
  ProductDetailNode,
  ProductData,
  ProductsData,
  Connection,
  WarehouseNode,
  WarehousesData,
  ProductUpdateMutationResponse,
  MutationError
} from '../types/core.types';
import { BestSellersResponse, ProductEdge } from '@/types/products';
// -----------------------------------------------------------
// A. Product Queries (products, product)
// -----------------------------------------------------------
export async function getSingleProduct(slug: string): Promise<ProductDetailNode | null> {
  const query = `
    query getSingleProduct($slug: String!, $channel: String!) {
      product(slug: $slug, channel: $channel) {
        id
        name
        slug
        description
        productType {
          name
        }
        rating
        reviews {
          id
          rating
          text
          createdAt
          image1
          image2
        }
        thumbnail {
          url
          alt
        }
        media {
          id
          url
          alt
          sortOrder
        }
        attributes {
          attribute {
            id
            name
            slug
          }
          values {
            id
            name
            slug
            plainText
            richText
          }
        }
        defaultVariant {
          id
          name
          sku
          attributes {
            attribute {
              id
              name
              slug
            }
            values {
              id
              name
              slug
              plainText
            }
          }
          pricing {
            price {
              gross {
                amount
                currency
              }
            }
            priceUndiscounted {
              gross {
                amount
                currency
              }
            }
            discount {
              gross {
                amount
                currency
              }
            }
          }
        }
        productVariants(first: 20) {
          edges {
            node {
              id
              name
              sku
              attributes {
                attribute {
                  id
                  name
                  slug
                }
                values {
                  id
                  name
                  slug
                  plainText
                }
              }
              media {
                id
                url
                alt
                sortOrder
              }
              pricing {
                price {
                  gross {
                    amount
                    currency
                  }
                }
                priceUndiscounted {
                  gross {
                    amount
                    currency
                  }
                }
                discount {
                  gross {
                    amount
                    currency
                  }
                }
              }
            }
          }
        }
        collections {
          id
          name
          slug
        }
      }
    }
  `;

  const variables = { slug, channel: CHANNEL };
  const data = await graphqlRequest<ProductData>(query, variables);
  return data.product;
}

/**
 * QUERY: Fetches a paginated list of products, optionally filtered by publication status.
 * SERVICE NAME: products (Filtered Fetch)
 */
export async function getFilteredProducts(
  first = 20,
  isPublished?: boolean
): Promise<Connection<ProductNode>> {
  const query = `
    query FilteredProducts($first: Int!, $published: Boolean) {
      products(
        first: $first, 
        channel: "${CHANNEL}",
        filter: { isPublished: $published }
      ) {
        edges {
          node {
            id
            name
            slug
            isPublished
            rating
            metadata { key value }
            thumbnail { url alt }
            media { id alt url }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const variables = {
    first,
    published: isPublished
  };

  const data = await graphqlRequest<ProductsData>(query, variables);
  return data.products;
}

// -----------------------------------------------------------
// B. Inventory Queries (warehouse, warehouses)
// -----------------------------------------------------------

/**
 * QUERY: Fetches a list of all active warehouses.
 * SERVICE NAME: warehouses (List Fetch)
 */
export async function getWarehouses(): Promise<WarehouseNode[]> {
  const query = `
    query Warehouses {
      warehouses {
        id
        name
        slug
      }
    }
  `;

  const data = await graphqlRequest<WarehousesData>(query, {});
  return data.warehouses.edges.map(edge => edge.node);
}

/**
 * MUTATION: Updates a product's name.
 * SERVICE NAME: productUpdate
 */
export async function updateProductName(productId: string, newName: string): Promise<ProductNode> {
  const mutation = `
    mutation UpdateProductName($id: ID!, $input: ProductInput!) {
      productUpdate(id: $id, input: $input) {
        product {
          id
          name
          slug
        }
        errors {
          field
          message
          code
        }
      }
    }
  `;

  const variables = {
    id: productId,
    input: {
      name: newName
    }
  };

  const result = await graphqlRequest<ProductUpdateMutationResponse>(mutation, variables);

  if (result.productUpdate.errors && result.productUpdate.errors.length > 0) {
    const error = result.productUpdate.errors[0];
    throw new Error(error.message || 'Failed to update product name');
  }

  if (!result.productUpdate.product) {
    throw new Error('Product not found after update');
  }

  return result.productUpdate.product;
}

// BESTSELLER PRODUCTS QUERY

export async function getBestsellerProducts(): Promise<{ edges: ProductEdge[] }> {
  const query = `
    query BestsellersCollection($id: ID!, $channel: String!) {
      collection(id: $id, channel: $channel) {
        id
        name
        products(first: 50) {
          edges {
            node {
              id
              slug
              name
              description
              attributes {
                attribute {
                  id
                  name
                  slug
                }
                values {
                  name
                  slug
                  plainText
                  richText
                }
              }
              thumbnail {
                url
              }
              media {
                url
              }
              defaultVariant {
                id
                name
                attributes {
                  attribute {
                    id
                    name
                    slug
                  }
                  values {
                    name
                    slug
                    plainText
                  }
                }
                pricing {
                  price {
                    gross {
                      amount
                      currency
                    }
                  }
                  priceUndiscounted {
                    gross {
                      amount
                      currency
                    }
                  }
                  discount {
                    gross {
                      amount
                      currency
                    }
                  }
                }
              }
             collections{
                id
                name
                slug
              }
              productVariants(first:10){
                edges{
                  node{
                    id
                    sku
                    name
                    attributes {
                      attribute {
                        id
                        name
                        slug
                      }
                      values {
                        name
                        slug
                        plainText
                      }
                    }
                    pricing {
                      discount {
                        gross {
                          amount
                          currency
                        }
                      }
                      price {
                        gross {
                          amount
                          currency
                        }
                      }
                      priceUndiscounted {
                        gross {
                          amount
                          currency
                        }
                      }
                    }
                  }
                }
              }   
            }
          }
        }
      }
    }
  `;

  const variables = {
    id: 'Q29sbGVjdGlvbjo3',
    channel: CHANNEL
  };

  try {
    const data = await graphqlRequest<BestSellersResponse>(query, variables);

    if (!data.collection || !data.collection.products) {
      console.warn('[Bestsellers] Collection not found or has no products');
      return { edges: [] };
    }

    return data.collection.products;
  } catch (error) {
    console.error('[Bestsellers] Error fetching bestseller products:', error);
    // Возвращаем пустой массив вместо проброса ошибки, чтобы не ломать UI
    return { edges: [] };
  }
}

/**
 * GraphQL: Загружает ВСЕ товары из каталога (не из коллекции бестселлеров)
 * Используется для фильтрации по этапам на клиенте
 * Использует пагинацию для получения всех товаров (максимум 100 за запрос)
 */
export async function getAllProducts(maxLimit: number = 100): Promise<{ edges: ProductEdge[] }> {
  const query = `
    query AllProducts($first: Int!, $after: String, $channel: String!) {
      products(first: $first, after: $after, channel: $channel, filter: { isPublished: true }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            slug
            name
            description
            attributes {
              attribute {
                id
                name
                slug
              }
              values {
                name
                slug
                plainText
                richText
              }
            }
            thumbnail {
              url
            }
            media {
              url
            }
            defaultVariant {
              id
              name
              attributes {
                attribute {
                  id
                  name
                  slug
                }
                values {
                  name
                  slug
                  plainText
                }
              }
              pricing {
                price {
                  gross {
                    amount
                    currency
                  }
                }
                priceUndiscounted {
                  gross {
                    amount
                    currency
                  }
                }
                discount {
                  gross {
                    amount
                    currency
                  }
                }
              }
            }
            collections {
              id
              name
              slug
            }
            productVariants(first: 10) {
              edges {
                node {
                  id
                  sku
                  name
                  attributes {
                    attribute {
                      id
                      name
                      slug
                    }
                    values {
                      name
                      slug
                      plainText
                    }
                  }
                  pricing {
                    discount {
                      gross {
                        amount
                        currency
                      }
                    }
                    price {
                      gross {
                        amount
                        currency
                      }
                    }
                    priceUndiscounted {
                      gross {
                        amount
                        currency
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const allEdges: ProductEdge[] = [];
  let hasNextPage = true;
  let after: string | null = null;
  const pageSize = 100; // Максимальный лимит GraphQL API

  try {
    while (hasNextPage && allEdges.length < maxLimit) {
      const variables: {
        first: number;
        after: string | null;
        channel: string;
      } = {
        first: Math.min(pageSize, maxLimit - allEdges.length),
        after: after,
        channel: CHANNEL
      };

      const data: {
        products: {
          edges: ProductEdge[];
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
        }
      } = await graphqlRequest<{
        products: {
          edges: ProductEdge[];
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
        }
      }>(query, variables);

      if (!data.products || !data.products.edges) {
        console.warn('[AllProducts] No products found');
        break;
      }

      allEdges.push(...data.products.edges);
      hasNextPage = data.products.pageInfo.hasNextPage;
      after = data.products.pageInfo.endCursor;

      // Если получили меньше запрошенного, значит это последняя страница
      if (data.products.edges.length < pageSize) {
        hasNextPage = false;
      }
    }

    return { edges: allEdges };
  } catch (error) {
    console.error('[AllProducts] Error fetching all products:', error);
    return { edges: [] };
  }
}

/**
 * REST API: Загружает товары по этапу ухода (care_stage) через REST эндпоинт
 * Использует кастомный REST API эндпоинт /api/products/by-care-stage/
 * Если careStageSlug не указан, возвращает все товары, сгруппированные по этапам
 * @deprecated Используйте getAllProducts() и фильтруйте на клиенте
 */
export async function getProductsByCareStageRest(
  careStageSlug: string | null,
  limit: number = 200,
  excludeSlug?: string,
  excludeId?: string
): Promise<{ edges: ProductEdge[] }> {
  // В development используем относительный путь для прокси Vite
  // В production используем полный URL
  const isDev = import.meta.env.DEV;
  let baseUrl = '';

  if (isDev) {
    // В development используем относительный путь - Vite прокси обработает
    baseUrl = '';
  } else {
    // В production используем полный URL
    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
    baseUrl = API_BASE_URL || (import.meta.env.VITE_GRAPHQL_URL || '').replace('/graphql/', '');
  }

  // Убеждаемся, что URL начинается с / если baseUrl пустой
  let url = baseUrl
    ? `${baseUrl}/api/products/by-care-stage/?limit=${limit}`
    : `/api/products/by-care-stage/?limit=${limit}`;
  if (careStageSlug) {
    url += `&care_stage=${encodeURIComponent(careStageSlug)}`;
  }
  if (excludeSlug) {
    url += `&exclude_slug=${encodeURIComponent(excludeSlug)}`;
  }
  if (excludeId) {
    url += `&exclude_id=${encodeURIComponent(excludeId)}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error('[ProductsByCareStageRest] API error:', data.error);
      return { edges: [] };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[ProductsByCareStageRest] Response data:', {
        hasProducts: !!data.products,
        hasStages: !!data.stages,
        productsCount: data.products?.length || 0,
        stagesCount: data.stages ? Object.keys(data.stages).length : 0,
        careStageSlug
      });
    }

    // Если careStageSlug указан, возвращаем товары этого этапа
    let products: any[] = [];
    if (careStageSlug && data.products) {
      products = data.products;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ProductsByCareStageRest] Found ${products.length} products for stage ${careStageSlug}`);
      }
    } else if (!careStageSlug && data.stages) {
      // Если careStageSlug не указан, возвращаем все товары из всех этапов
      products = Object.values(data.stages).flat() as any[];
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ProductsByCareStageRest] Found ${products.length} products across all stages`);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ProductsByCareStageRest] No products or stages in response');
      }
    }

    // Преобразуем данные из REST API в формат GraphQL
    const edges: ProductEdge[] = products.map((product: any) => {
      const defaultVariant = product.variants?.[0] || {};
      const allVariants = product.variants || [];

      const defaultVariantData = defaultVariant && defaultVariant.id ? {
        id: defaultVariant.id,
        name: defaultVariant.name || '',
        sku: defaultVariant.sku || '',
        pricing: {
          price: {
            gross: {
              amount: defaultVariant.price || 0,
              currency: defaultVariant.currency || 'RUB'
            }
          }
        }
      } : {
        id: '',
        name: '',
        sku: '',
        pricing: {
          price: {
            gross: {
              amount: 0,
              currency: 'RUB'
            }
          }
        }
      };

      return {
        node: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description || null,
          attributes: product.attributes || [],
          category: {
            id: '',
            name: ''
          },
          thumbnail: product.thumbnail ? {
            url: product.thumbnail,
            alt: product.name || ''
          } : {
            url: '',
            alt: ''
          },
          media: (product.images || []).map((url: string) => ({
            url,
            alt: product.name || '',
            id: ''
          })),
          defaultVariant: defaultVariantData,
          collections: product.collections || [],
          productVariants: allVariants.map((v: any) => ({
            node: {
              id: v.id,
              name: v.name || '',
              sku: v.sku || '',
              attributes: v.attributes || [],
              pricing: {
                price: {
                  gross: {
                    amount: v.price || 0,
                    currency: v.currency || 'RUB'
                  }
                },
                priceUndiscounted: v.oldPrice ? {
                  gross: {
                    amount: v.oldPrice,
                    currency: v.currency || 'RUB'
                  }
                } : null,
                discount: v.discount ? {
                  gross: {
                    amount: v.discount,
                    currency: v.currency || 'RUB'
                  }
                } : null
              }
            }
          }))
        }
      };
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ProductsByCareStageRest] Found ${edges.length} products for care_stage: ${careStageSlug}`);
    }

    return { edges };
  } catch (error) {
    console.error(`[ProductsByCareStageRest] Error fetching products for care_stage ${careStageSlug}:`, error);
    return { edges: [] };
  }
}

/**
 * QUERY: Загружает товары по этапу ухода (care_stage)
 * Использует фильтр по атрибуту напрямую через GraphQL
 */
export async function getProductsByCareStage(
  careStageSlug: string,
  first: number = 50
): Promise<{ edges: ProductEdge[] }> {
  const query = `
    query ProductsByCareStage($channel: String!, $first: Int!, $careStageSlug: String!) {
      products(
        first: $first,
        channel: $channel,
        where: {
          attributes: [
            {
              slug: "care_stage"
              value: {
                slug: {
                  eq: $careStageSlug
                }
              }
            }
          ]
        },
        filter: {
          isPublished: true
        }
      ) {
        edges {
          node {
            id
            slug
            name
            description
            attributes {
              attribute {
                id
                name
                slug
              }
              values {
                name
                slug
                plainText
                richText
              }
            }
            thumbnail {
              url
            }
            media {
              url
            }
            defaultVariant {
              id
              name
              attributes {
                attribute {
                  id
                  name
                  slug
                }
                values {
                  name
                  slug
                  plainText
                }
              }
              pricing {
                price {
                  gross {
                    amount
                    currency
                  }
                }
                priceUndiscounted {
                  gross {
                    amount
                    currency
                  }
                }
                discount {
                  gross {
                    amount
                    currency
                  }
                }
              }
            }
            collections {
              id
              name
              slug
            }
            productVariants(first: 10) {
              edges {
                node {
                  id
                  sku
                  name
                  attributes {
                    attribute {
                      id
                      name
                      slug
                    }
                    values {
                      name
                      slug
                      plainText
                    }
                  }
                  pricing {
                    discount {
                      gross {
                        amount
                        currency
                      }
                    }
                    price {
                      gross {
                        amount
                        currency
                      }
                    }
                    priceUndiscounted {
                      gross {
                        amount
                        currency
                      }
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const variables = {
    channel: CHANNEL,
    first,
    careStageSlug
  };

  try {
    const data = await graphqlRequest<{ products: { edges: ProductEdge[]; pageInfo: any } }>(query, variables);

    if (!data.products) {
      console.warn(`[ProductsByCareStage] No products found for care_stage: ${careStageSlug}`);
      return { edges: [] };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ProductsByCareStage] Found ${data.products.edges.length} products for care_stage: ${careStageSlug}`);
    }

    return data.products;
  } catch (error) {
    console.error(`[ProductsByCareStage] Error fetching products for care_stage ${careStageSlug}:`, error);
    return { edges: [] };
  }
}
