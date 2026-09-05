import { apiFetch, apiJson, ApiError, getAccessToken } from '@/api/apiClient';

export interface ProductReviewCreateInput {
  product: string;
  order?: string;
  rating: number;
  text: string;
  image1?: File | null;
  image2?: File | null;
}

export type CreateProductReviewResult = {
  id: string;
  rating: number;
  text: string;
  imagesAttached: boolean;
  imagesError?: string;
};

export async function createProductReview(
  input: ProductReviewCreateInput,
): Promise<CreateProductReviewResult> {
  const files = [input.image1, input.image2].filter(Boolean) as File[];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      throw new ApiError('Размер фото — максимум 5 МБ', 400);
    }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      throw new ApiError('Фото: только JPEG, PNG, WebP или GIF', 400);
    }
  }

  const created = await apiJson<{ id: string; rating: number; text: string }>('/reviews', 'POST', {
    productId: input.product,
    orderId: input.order,
    rating: input.rating,
    text: input.text,
  });

  const hasImages = Boolean(input.image1 || input.image2);
  if (!hasImages) {
    return { ...created, imagesAttached: false };
  }

  const fd = new FormData();
  if (input.image1) fd.append('files', input.image1);
  if (input.image2) fd.append('files', input.image2);
  const token = getAccessToken();
  const res = await fetch(`/api/v1/reviews/${encodeURIComponent(created.id)}/images`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = String(body.message);
    } catch {
      /* keep status */
    }
    if (res.status === 401) {
      throw new ApiError(message || 'Требуется вход', 401);
    }
    return {
      ...created,
      imagesAttached: false,
      imagesError: message || 'Не удалось загрузить фото',
    };
  }

  return { ...created, imagesAttached: true };
}

export async function getProductReviews(
  slug: string,
  page = 1,
  limit = 20,
): Promise<ProductReviewsListResponse> {
  return apiFetch(`/reviews/product/${encodeURIComponent(slug)}`, {
    query: { page, limit },
  });
}

export type ProductReviewsListResponse = {
  product: {
    id: string;
    slug: string;
    name: string;
    imageUrl?: string | null;
    shortDescription?: string | null;
  } | null;
  ratingAvg: number | null;
  ratingCount: number;
  items: Array<{
    id: string;
    rating: number;
    text: string;
    createdAt?: string;
    authorName?: string | null;
    image1?: string | null;
    image2?: string | null;
    image1Url?: string | null;
    image2Url?: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
};
