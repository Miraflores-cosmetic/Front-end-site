import { CHANNEL, graphqlRequest } from '../client';

export interface CollectionProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  attributes?: Array<{
    attribute: {
      id: string;
      name: string;
      slug: string;
    };
    values: Array<{
      name?: string;
      slug?: string;
      plainText?: string;
      richText?: any;
    }>;
  }>;
  thumbnail?: {
    url: string;
  };
  media?: Array<{
    url: string;
  }>;
  defaultVariant?: {
    id: string;
    name: string;
    pricing: {
      price: {
        gross: {
          amount: number;
        };
      };
      priceUndiscounted?: {
        gross: {
          amount: number;
        };
      };
      discount?: {
        gross: {
          amount: number;
        };
      };
    };
  };
  productVariants?: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        pricing: {
          price: {
            gross: {
              amount: number;
            };
          };
          priceUndiscounted?: {
            gross: {
              amount: number;
            };
          };
          discount?: {
            gross: {
              amount: number;
            };
          };
        };
        attributes?: Array<{
          attribute: {
            id: string;
            name: string;
            slug: string;
          };
          values: Array<{
            name?: string;
            slug?: string;
            plainText?: string;
          }>;
        }>;
      };
    }>;
  };
  collections?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  products: {
    edges: Array<{
      node: CollectionProduct;
    }>;
  };
}

export interface CollectionResponse {
  collection: Collection | null;
}

/**
 * Получить коллекцию по ID
 */
export async function getCollectionById(id: string, first: number = 10): Promise<Collection | null> {
  const query = `
    query GetCollection($id: ID!, $channel: String!, $first: Int!) {
      collection(id: $id, channel: $channel) {
        id
        name
        slug
        description
        products(first: $first) {
          edges {
            node {
              id
              name
              slug
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
                pricing {
                  price {
                    gross {
                      amount
                    }
                  }
                  priceUndiscounted {
                    gross {
                      amount
                    }
                  }
                  discount {
                    gross {
                      amount
                    }
                  }
                }
              }
              productVariants(first: 10) {
                edges {
                  node {
                    id
                    name
                    pricing {
                      price {
                        gross {
                          amount
                        }
                      }
                      priceUndiscounted {
                        gross {
                          amount
                        }
                      }
                      discount {
                        gross {
                          amount
                        }
                      }
                    }
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
        }
      }
    }
  `;

  const variables = { id, channel: CHANNEL, first };
  
  try {
    const data = await graphqlRequest<CollectionResponse>(query, variables);
    
    if (!data.collection || !data.collection.products) {
      console.warn('[Sets] Collection not found or has no products');
      return null;
    }
    
    return data.collection;
  } catch (error) {
    console.error('[Sets] Error fetching collection:', error);
    return null;
  }
}

