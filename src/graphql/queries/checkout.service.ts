import { graphqlRequest } from '@/graphql/client';
import { CheckoutCreateInput } from '@/types/checkout';

export async function createCheckout(input: CheckoutCreateInput): Promise<any> {
  const mutation = `
    mutation checkoutCreate($input: CheckoutCreateInput!) {
  checkoutCreate(input: $input) {
    checkout {
      id
      token
    }
    errors {
      message
      field
    }
  }
}
  `;
  return graphqlRequest<any>(mutation, { input });
}

export async function getCheckoutById(id: string): Promise<any> {
  const query = `
query getCheckoutById($id: ID!){
  checkout(id: $id){
    id
    created
    token
    lines{
      id
      variant{
        id
        name
      }
    }
  }
}
`;

  return graphqlRequest<any>(query, { id });
}

export async function checkoutLinesAdd(
  id: string,
  lines: { quantity: number; variantId: string }[]
): Promise<any> {
  const mutation = `
    mutation checkoutLinesAdd($id: ID!, $lines: [CheckoutLineInput!]!) {
      checkoutLinesAdd(id: $id, lines: $lines) {
        checkout {
          id
        }
        errors {
          field
          message
        }
      }
    }
  `;

  return graphqlRequest(mutation, { id, lines });
}
export async function checkoutLinesUpdate(
  id: string,
  lines: { lineId: string; quantity?: number; price?: number; variantId?: string }[]
): Promise<any> {
  const mutation = `
    mutation checkoutLinesUpdate($id: ID!, $lines: [CheckoutLineUpdateInput!]!) {
      checkoutLinesUpdate(id: $id, lines: $lines) {
        checkout {
          id
        }
        errors {
          field
          message
        }
      }
    }
  `;

  return graphqlRequest(mutation, { id, lines });
}
export async function checkoutLineDelete(
  id: string,
  lineId: string,
  token?: string
): Promise<any> {
  const mutation = `
    mutation checkoutLineDelete($id: ID!, $lineId: ID!, $token: UUID) {
      checkoutLineDelete(id: $id, lineId: $lineId, token: $token) {
        checkout {
          id
        }
        errors {
          field
          message
        }
      }
    }
  `;

  return graphqlRequest(mutation, { id, lineId, token });
}
export async function checkoutLinesDelete(
  id: string,
  linesIds: string[]
): Promise<any> {
  const mutation = `
    mutation checkoutLinesDelete($id: ID!, $linesIds: [ID!]!) {
      checkoutLinesDelete(id: $id, linesIds: $linesIds) {
        checkout {
          id
        }
        errors {
          field
          message
        }
      }
    }
  `;

  return graphqlRequest(mutation, { id, linesIds });
}
