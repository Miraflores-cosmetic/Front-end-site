import { graphqlRequest } from "@/graphql/client";
import {
    OrderNode,
    OrdersData,
    Connection,
    OrderFulfillMutationResponse
} from "../types/core.types";
import { ProductNode, ProductsData } from "@/types/products";

// -----------------------------------------------------------
// Original Function: Get List of Products (Basic Fetch)
// -----------------------------------------------------------
export async function getProducts(): Promise<ProductNode[]> {
    const query = `
    query Products {
      products(first: 20, channel: "default-channel") {
        edges {
          node {
            id
            name
            slug
            rating
            thumbnail { url alt }
            media { id alt url }
          }
        }
      }
    }
  `;

    const data = await graphqlRequest<ProductsData>(query);
    return data.products.edges.map(e => e.node);
}

// -----------------------------------------------------------
// 1. Single Fetch Function (Get Product Details by Slug)
//    - Uses the 'product' query with a required variable ($slug).
// -----------------------------------------------------------
interface ProductDetailsData {
    product: ProductNode & {
        description: string;
        pricing: {
            priceRange: {
                start: { net: { amount: number } };
            };
        };
    };
}

export async function getProductBySlug(slug: string): Promise<ProductNode> {
    // Uses the 'product' query to fetch a single item[cite: 71731].
    const query = `
    query ProductBySlug($slug: String!) {
      product(slug: $slug, channel: "default-channel") {
        id
        name
        slug
        rating
        description
        metadata { key value }
        thumbnail { url alt }
        media { id alt url }
        pricing {
          priceRange {
            start { net { amount currency } }
            stop { net { amount currency } }
          }
        }
        productVariants(first: 5) {
          edges { node { id name sku pricing { price { gross { amount currency } } priceUndiscounted { gross { amount currency } } } } }
          totalCount
        }
      }
    }
  `;

    const variables = { slug };
    const data = await graphqlRequest<ProductDetailsData>(query, variables);
    return data.product;
}

// -----------------------------------------------------------
// 2. Filter Fetch Function (Get Products by Category ID)
//    - Uses the 'products' query with a 'where' filter on 'categories'.
// -----------------------------------------------------------
export async function getProductsByCategory(categoryId: string): Promise<ProductNode[]> {
    // Uses the 'products' query with the recommended 'where' filter input[cite: 71733].
    const query = `
    query ProductsByCategory($category: ID!) {
      products(
        first: 100, 
        channel: "default-channel",
        where: {
          categories: { 
            ids: [$category] 
          }
        }
      ) {
        edges {
          node {
            id
            name
            slug
          }
        }
      }
    }
  `;

    const variables = { category: categoryId };
    const data = await graphqlRequest<ProductsData>(query, variables);
    return data.products.edges.map(e => e.node);
}

// -----------------------------------------------------------
// 3. Mutation Function (Delete an Address)
//    - Uses the 'addressDelete' mutation.
// -----------------------------------------------------------
interface DeleteAddressResponse {
    addressDelete: {
        user: { id: string };
        errors: Array<{ field: string; message: string }>;
    };
}

export async function deleteAddress(addressId: string): Promise<DeleteAddressResponse> {
    // Uses a mutation to perform a write operation.
    const mutation = `
    mutation DeleteAddress($id: ID!) {
      addressDelete(id: $id) {
        user {
          id
        }
        errors {
          field
          message
        }
      }
    }
  `;

    const variables = { id: addressId };
    const data = await graphqlRequest<DeleteAddressResponse>(mutation, variables);

    if (data.addressDelete.errors.length > 0) {
        throw new Error(`Address deletion failed: ${data.addressDelete.errors.map(e => e.message).join(', ')}`);
    }

    return data;
}

// NOTE: You would also need to update `product.types.ts` to include 
// the new `ProductDetailsData` structure

// -----------------------------------------------------------
// A. Order Queries (orders, draftOrders, order)
// -----------------------------------------------------------

/**
 * QUERY: Fetches a list of all fulfilled orders, demonstrating filtering by status.
 * SERVICE NAME: orders (Filtered Fetch)
 */
export async function getFulfilledOrders(first = 20): Promise<Connection<OrderNode>> {
    const query = `
        query FulfilledOrders($first: Int!) {
            orders(
                first: $first, 
                filter: { status: FULFILLED }
            ) {
                edges {
                    node {
                        id
                        number
                        created
                        status
                        userEmail
                        total {
                            gross { amount currency }
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
    const data = await graphqlRequest<OrdersData>(query, variables);
    return data.orders;
}

/**
 * QUERY: Fetches a list of all draft orders (orders not yet finalized).
 * SERVICE NAME: draftOrders (List Fetch)
 */
export async function getDraftOrders(first = 20): Promise<Connection<OrderNode>> {
    const query = `
        query DraftOrders($first: Int!) {
            orders(
                first: $first, 
                filter: { status: DRAFT } // Assuming DRAFT is a valid filter status
            ) {
                edges {
                    node {
                        id
                        number
                        created
                        status
                        userEmail
                        total {
                            gross { amount currency }
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
    const data = await graphqlRequest<OrdersData>(query, variables);
    return data.orders;
}


/**
 * QUERY: Fetches a single order by its public token (useful for unauthenticated users).
 * SERVICE NAME: orderByToken (Single Fetch)
 */
export async function getOrderByToken(token: string): Promise<OrderNode | null> {
    const query = `
        query OrderByToken($token: UUID!) {
            orderByToken(token: $token) {
                id
                number
                created
                status
                total {
                    gross { amount currency }
                }
                userEmail
            }
        }
    `;

    interface OrderByTokenData {
        orderByToken: OrderNode | null;
    }

    const variables = { token };
    const data = await graphqlRequest<OrderByTokenData>(query, variables);
    return data.orderByToken;
}

// -----------------------------------------------------------
// B. Order Mutation (orderFulfill)
// -----------------------------------------------------------

/**
 * MUTATION: Fulfills a previously paid order, changing its status.
 * SERVICE NAME: orderFulfill
 */
export async function fulfillOrder(orderId: string): Promise<OrderNode> {
    const mutation = `
        mutation FulfillOrder($orderId: ID!) {
            orderFulfill(order: $orderId) {
                order {
                    id
                    number
                    status
                    created
                    total {
                        gross { amount currency }
                    }
                }
                errors {
                    field
                    message
                    code
                }
            }
        }
    `;

    const variables = { orderId };
    const result = await graphqlRequest<OrderFulfillMutationResponse>(mutation, variables);

    if (result.orderFulfill.errors.length > 0) {
        // Throws an error with detailed message if mutation failed
        throw new Error(`Order fulfillment failed: ${result.orderFulfill.errors.map(e => e.message).join(', ')}`);
    }

    return result.orderFulfill.order as OrderNode;
}