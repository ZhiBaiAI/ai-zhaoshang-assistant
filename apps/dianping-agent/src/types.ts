export interface RawDianpingReview {
  shopId: string;
  shopName: string;
  reviewId: string;
  authorName: string;
  rating?: number;
  content: string;
  reviewTime: string;
  url?: string;
  images?: string[];
  metadata?: Record<string, unknown>;
}
