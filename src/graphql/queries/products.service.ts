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
        rating
        name
        description
        metadata {
          key
          value
        }
        media {
          alt
          url
        }
        
        attributes {
          attribute {
            id
            metadata {
              key
              value
            }
            name
            slug
          }
          values {
            boolean
            date
            dateTime
            externalReference
            inputType
            name
            plainText
            richText
            reference
            slug
            value
          }
        }

        productType {
          name
        }
        category {
          name
          id
        }
        productVariants(first: 10) {
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
                  name
                  slug
                  plainText
                  richText
                }
              }
              pricing {
                priceUndiscounted {
                  gross {
                    currency
                    amount
                  }
                }
                price {
                  gross {
                    amount
                    currency
                  }
                }
                discount {
                  net {
                    amount
                    currency
                  }
                }
              }
            }
          }
          totalCount
        }
        isAvailableForPurchase
        reviews {
          id
          text
        }
        availableForPurchaseAt
        thumbnail {
          alt
          url
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
export async function getAllWarehouses(first = 50): Promise<Connection<WarehouseNode>> {
  const query = `
        query AllWarehouses($first: Int!) {
            warehouses(first: $first) {
                edges {
                    node {
                        id
                        name
                        slug
                        address {
                            city
                            country
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

  const variables = { first };
  const data = await graphqlRequest<WarehousesData>(query, variables);
  return data.warehouses;
}

// -----------------------------------------------------------
// C. Product Mutation (productUpdate)
// -----------------------------------------------------------

/**
 * MUTATION: Updates a product's name and publication status.
 * SERVICE NAME: productUpdate
 */
export async function updateProductName(productId: string, newName: string): Promise<ProductNode> {
  const mutation = `
        mutation UpdateProduct($id: ID!, $name: String!) {
            productUpdate(
                id: $id, 
                input: {
                    name: $name, 
                }
            ) {
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

  const variables = { id: productId, name: newName };
  const result = await graphqlRequest<ProductUpdateMutationResponse>(mutation, variables);

  const errors = result.productUpdate.errors || [];
  if (errors.length > 0) {
    throw new Error(
      `Product update failed: ${errors.map((e: MutationError) => e.message).join(', ')}`
    );
  }

  if (!result.productUpdate.product) {
    throw new Error('Product update returned no product');
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
