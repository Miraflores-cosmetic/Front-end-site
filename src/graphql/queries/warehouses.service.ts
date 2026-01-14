import { graphqlRequest } from "@/graphql/client";
import type { WarehousesData, WarehouseNode } from "../types/core.types";

export async function getWarehouses(first = 50): Promise<WarehousesData["warehouses"]> {
  const query = `
    query Warehouses($first: Int!) {
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
