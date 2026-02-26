import { graphqlRequest, CHANNEL } from '@/graphql/client';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

export interface PublishedReview {
  id: string;
  text: string;
  rating: number;
  createdAt: string;
  image1?: string | null;
  image2?: string | null;
  product: {
    name: string;
    slug?: string;
    thumbnail?: string | null;
  };
}

export async function getAllPublishedReviews(): Promise<PublishedReview[]> {
  const query = `
    query ReviewsAll($channel: String!) {
      products(first: 100, channel: $channel) {
        edges {
          node {
            id
            name
            slug
            thumbnail {
              url
            }
            reviews {
              id
              rating
              text
              createdAt
              image1
              image2
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<any>(query, { channel: CHANNEL });

  const allReviews: PublishedReview[] = [];

  if (data.products?.edges) {
    data.products.edges.forEach((edge: any) => {
      const product = edge.node;
      const productName = product.name;
      const thumbnail = product.thumbnail?.url || null;

      // Фильтруем только опубликованные отзывы (isPublished = true)
      if (product.reviews && Array.isArray(product.reviews)) {
        product.reviews.forEach((review: any) => {
          // В GraphQL запросе reviews уже возвращает только опубликованные
          allReviews.push({
            id: review.id,
            text: review.text,
            rating: review.rating,
            createdAt: review.createdAt,
            image1: normalizeMediaUrl(review.image1),
            image2: normalizeMediaUrl(review.image2),
            product: {
              name: productName,
              slug: product.slug ?? undefined,
              thumbnail: normalizeMediaUrl(thumbnail)
            }
          });
        });
      }
    });
  }

  // Сортируем по дате создания (новые первыми)
  return allReviews.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
