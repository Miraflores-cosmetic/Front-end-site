// ==============================
// Types
// ==============================

export interface Review {
  id: string;
  rating: number;
  text: string;
  image1?: string | null;
  image2?: string | null;
  createdAt: string;
  user: {
    email: string | null;
  } | null;
}

export interface ReviewsResponse {
  productReviewsPublished: Review[];
}

export interface CreateReviewInput {
  productId: string;
  rating: number;
  text: string;
  image1?: string | null;
  image2?: string | null;
}

export interface CreateReviewResponse {
  productReviewCreate: {
    review: Review | null;
    errors: { field: string | null; message: string }[];
  };
}
