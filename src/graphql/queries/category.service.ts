import { CHANNEL, graphqlRequest } from '../client';
import { CategoryConnection, SingleCategoryConnection } from '../types/category';

export async function getAllCategory(first: number): Promise<CategoryConnection['categories']> {
  const query = `
    query Category($first: Int!) {
      categories(first: $first) {
        edges {
          node {
            id
            description
            name
            slug
            parent {
              name
              id
              slug
            }
          }
        }
        totalCount
      }
    }
  `;

  const variables = { first };
  const data = await graphqlRequest<CategoryConnection>(query, variables);
  return data.categories;
}

export async function getAllCategorMenu(): Promise<any[]> {
  const query = `
    query getAllCategory {
      categories(first: 50, level: 0) {
        edges {
          node {
            id
            name
            slug
            backgroundImage {
              url
            }
            parent {
              id
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<CategoryConnection>(query);

  // Оставляем только корневые (parent === null)
  return data.categories.edges.map((e: any) => e.node).filter((cat: any) => !cat.parent);
}
export async function getSingleCategory(
  first: number,
  slug: string
): Promise<SingleCategoryConnection['category']> {
  const query = `
    query getSingleCategory($slug: String!, $channel: String!, $first: Int!) {
      category(slug: $slug) {
        id
        description
        metadata {
          key
          value
        }
        name
        products(channel: $channel, first: $first, where: { isPublished: true, isVisibleInListing: true }) {
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
          totalCount
          edges {
            node {
              id
              name
              slug
              description
              isAvailableForPurchase
              media {
                alt
                url
              }
              pricing {
                discount {
                  gross {
                    fractionalAmount
                    amount
                    currency
                  }
                }
              }
              thumbnail {
                alt
                url
              }
              weight {
                unit
                value
              }
              category {
                name
                slug
              }
            }
          }
        }
        slug
      }
    }
  `;

  const variables = { channel: CHANNEL, slug, first };
  const data = await graphqlRequest<SingleCategoryConnection>(query, variables);
  return data.category;
}


export async function getCategoryBySlug(
  first: number,
  categorySlug: string,
  after?: string | null
): Promise<SingleCategoryConnection['category']> {
  const query = `
    query getProductsByCategorySlug(
      $categorySlug: String!,
      $channel: String,
      $first: Int,
      $after: String
    ) {
      category(slug: $categorySlug) {
        id
        name
        description
        products(first: $first, after: $after, channel: $channel, where: { isPublished: true, isVisibleInListing: true }) {
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
              thumbnail { url }
              media { url }
              defaultVariant {
                id
                name
                pricing {
                  price {
                    gross { amount }
                  }
                  priceUndiscounted {
                    gross { amount }
                  }
                  discount {
                    gross { amount }
                  }
                }
              }
              collections { id name slug }
              productVariants(first: 2) {
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
                      discount { gross { amount currency } }
                      price { gross { amount currency } }
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

  const variables = { channel: CHANNEL, categorySlug, first, after: after ?? null };
  const data = await graphqlRequest<SingleCategoryConnection>(query, variables);
  return data.category;
}



export async function getCategoryTabsBySlug(
  first: number,
  slug: string) {
  const query = `
    query CategoryTabs($slug: String!, $first: Int!) {
      category(slug: $slug) {
        id
        name
        children(first: $first) {
          edges {
            node {
              id
              name
              slug
            }
          }
        }
      }
    }
  `;
  const variables = {slug, first};
  const data = await graphqlRequest<{ category: any }>(query, variables);
  return data.category?.children?.edges?.map((e: any) => e.node) ?? [];
}
