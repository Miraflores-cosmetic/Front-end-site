import { graphqlRequest } from "@/graphql/client";
import type { OrdersData, OrderNode } from "../types/core.types";

export async function getOrders(first = 20): Promise<OrdersData["orders"]> {
  const query = `
    query Orders($first: Int!) {
      me {
        orders(first: $first) {
          edges {
            node {
              id
              number
              created
              status
              statusDisplay
              isPaid
              paymentStatus
              paymentStatusDisplay
              total {
                gross { amount currency }
              }
              userEmail
              lines {
                id
                productName
                quantity
                variantName
                unitPrice {
                  gross { amount currency }
                }
                thumbnail {
                  url
                }
                variant {
                  product {
                    id
                    slug
                    thumbnail {
                      url
                    }
                  }
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;

  const variables = { first };
  const data = await graphqlRequest<{ me: { orders: OrdersData["orders"] } }>(query, variables);
  return data.me?.orders || { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
}
