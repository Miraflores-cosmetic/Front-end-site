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
