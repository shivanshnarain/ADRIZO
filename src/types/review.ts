export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CustomerReview {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  userId: string;
  customerName: string;
  rating: number; // 1 to 5
  reviewText: string;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface ProductRatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ReviewSubmissionPayload {
  productId: string;
  productSlug?: string;
  productName?: string;
  customerName: string;
  rating: number;
  reviewText: string;
}
