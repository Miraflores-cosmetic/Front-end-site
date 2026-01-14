import { graphqlRequest } from "@/graphql/client";
import type {
  Cart,
  GetCartData,
  CreateCartResponse,
  CheckoutLineInput,
  AddLineResponse,
  UpdateLineResponse,
  RemoveLineResponse,
} from "../types/cart.types";

const CART_FIELDS = `
  id
  totalPrice {
    gross {
      amount
      currency
    }
  }
  lines {
    id
    quantity
    variant {
      id
      name
      product {
        id
        name
        slug
        rating
        thumbnail { url alt }
      }
    }
    totalPrice {
      gross {
        amount
        currency
      }
    }
  }
`;

export async function getCart(cartId: string): Promise<Cart | null> {
    const query = `
    query CheckoutDetails($cartId: ID!) {
      checkout(id: $cartId) {
        ${CART_FIELDS}
      }
    }
  `;

    const variables = { cartId };
  const data = await graphqlRequest<GetCartData>(query, variables);
  return data.checkout;
}

export async function createCart(
    lines: CheckoutLineInput[] = []
): Promise<CreateCartResponse> {
    const mutation = `
    mutation CheckoutCreate($lines: [CheckoutLineInput!]) {
      checkoutCreate(input: { lines: $lines }) {
        checkout {
          ${CART_FIELDS}
        }
        errors {
          message
          code
        }
      }
    }
  `;

    const variables = { lines };
  return graphqlRequest<CreateCartResponse>(mutation, variables);
}

export async function addCartLine(
    cartId: string,
    variantId: string,
    quantity: number
): Promise<AddLineResponse> {
    const mutation = `
    mutation CheckoutLinesAdd($cartId: ID!, $lines: [CheckoutLineInput!]!) {
      checkoutLinesAdd(
        checkoutId: $cartId
        lines: $lines
      ) {
        checkout {
          ${CART_FIELDS}
        }
        errors {
          message
          code
        }
      }
    }
  `;

    const variables = {
        cartId,
        lines: [{ variantId, quantity }],
    };
  return graphqlRequest<AddLineResponse>(mutation, variables);
}

export async function updateCartLine(
    cartId: string,
    lineId: string,
    quantity: number
): Promise<UpdateLineResponse> {
    const mutation = `
    mutation CheckoutLinesUpdate($cartId: ID!, $lineId: ID!, $quantity: Int!) {
      checkoutLinesUpdate(
        checkoutId: $cartId
        lines: [{ lineId: $lineId, quantity: $quantity }]
      ) {
        checkout {
          ${CART_FIELDS}
        }
        errors {
          message
          code
        }
      }
    }
  `;

    const variables = { cartId, lineId, quantity };
  return graphqlRequest<UpdateLineResponse>(mutation, variables);
}

export async function removeCartLine(
    cartId: string,
    lineIds: string[]
): Promise<RemoveLineResponse> {
    const mutation = `
    mutation CheckoutLinesDelete($cartId: ID!, $lineIds: [ID!]!) {
      checkoutLinesDelete(
        checkoutId: $cartId
        linesIds: $lineIds
      ) {
        checkout {
          ${CART_FIELDS}
        }
        errors {
          message
          code
        }
      }
    }
  `;

    const variables = { cartId, lineIds };
  return graphqlRequest<RemoveLineResponse>(mutation, variables);
}