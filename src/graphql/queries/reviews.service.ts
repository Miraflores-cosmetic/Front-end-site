import { graphqlRequest, CHANNEL } from '@/graphql/client';

export interface ProductReviewCreateInput {
  product: string; // Global ID продукта
  rating: number; // 1-5
  text: string;
  image1?: File | null;
  image2?: File | null;
}

export interface ProductReviewCreateResponse {
  productReviewCreate: {
    review: {
      id: string;
      rating: number;
      text: string;
    } | null;
    errors: Array<{
      field: string | null;
      message: string;
      code: string;
    }>;
  };
}

/**
 * Создать отзыв на товар
 */
export async function createProductReview(input: ProductReviewCreateInput): Promise<ProductReviewCreateResponse> {
  // Для загрузки файлов нужно использовать multipart/form-data
  // GraphQL с файлами требует специальной обработки
  const mutation = `
    mutation ProductReviewCreate($input: ProductReviewCreateInput!) {
      productReviewCreate(input: $input) {
        review {
          id
          rating
          text
        }
        errors {
          field
          message
          code
        }
      }
    }
  `;

  // Если есть файлы, нужно использовать FormData
  if (input.image1 || input.image2) {
    const formData = new FormData();

    // Создаем operations для GraphQL multipart request
    const operations = JSON.stringify({
      query: mutation,
      variables: {
        input: {
          product: input.product,
          rating: input.rating,
          text: input.text
        }
      }
    });

    formData.append('operations', operations);

    // Маппинг файлов
    const map: Record<string, string[]> = {};
    let fileIndex = 0;

    if (input.image1) {
      formData.append(`${fileIndex}`, input.image1);
      map[`${fileIndex}`] = ['variables.input.image_1'];
      fileIndex++;
    }

    if (input.image2) {
      formData.append(`${fileIndex}`, input.image2);
      map[`${fileIndex}`] = ['variables.input.image_2'];
    }

    formData.append('map', JSON.stringify(map));

    const endpoint = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8000/graphql/';
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Необходимо авторизоваться для отправки отзыва');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // НЕ добавляем Content-Type для FormData - браузер сам установит с boundary
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  } else {
    // Без файлов используем обычный запрос
    const variables = {
      input: {
        product: input.product,
        rating: input.rating,
        text: input.text
      }
    };

    const data = await graphqlRequest<ProductReviewCreateResponse>(mutation, variables);
    return data;
  }
}
