import { ReplyMode, ReplyTaskStatus } from './business';

export type ReviewSource = 'dianping';

export type ReviewSentiment = 'positive' | 'neutral' | 'negative';

export type ReviewReportPeriod = 'daily' | 'monthly';

export interface ReviewEvent {
  schemaVersion: 1;
  id: string;
  source: ReviewSource;
  type: 'review.created';
  capturedAt: string;
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

export interface ReviewBatch {
  schemaVersion: 1;
  source: ReviewSource;
  projectId: string;
  capturedAt: string;
  count: number;
  events: ReviewEvent[];
}

export interface ReviewIngestionResult {
  projectId: string;
  source: ReviewSource;
  received: number;
  inserted: number;
  duplicates: number;
  reviewCount: number;
  replyTaskCount: number;
}

export interface StoredReview {
  id: string;
  projectId: string;
  source: ReviewSource;
  shopId: string;
  shopName: string;
  reviewId: string;
  authorName: string;
  rating?: number;
  content: string;
  sentiment: ReviewSentiment;
  reviewTime: string;
  capturedAt: string;
  url?: string;
  replied: boolean;
  replyText?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewReplyTask {
  id: string;
  projectId: string;
  source: ReviewSource;
  reviewId: string;
  status: ReplyTaskStatus;
  mode: ReplyMode;
  suggestedReply?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendableReviewReplyTask extends ReviewReplyTask {
  shopName: string;
  authorName: string;
  reviewContent: string;
  replyText: string;
}

export interface ReviewReplyGenerationResult {
  task: ReviewReplyTask;
  review: StoredReview;
  reply: string;
}

export interface ReviewReport {
  id: string;
  projectId: string;
  source: ReviewSource;
  period: ReviewReportPeriod;
  periodStart: string;
  periodEnd: string;
  reviewCount: number;
  averageRating?: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  highlights: string[];
  risks: string[];
  suggestions: string[];
  summary: string;
  createdAt: string;
}

export interface ReviewReplySendResult {
  taskId: string;
  success: boolean;
  sentAt: string;
  replyText?: string;
  errorMessage?: string;
}

export function isReviewEvent(value: unknown): value is ReviewEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<ReviewEvent>;
  return event.schemaVersion === 1
    && event.type === 'review.created'
    && event.source === 'dianping'
    && typeof event.id === 'string'
    && typeof event.capturedAt === 'string'
    && typeof event.shopId === 'string'
    && typeof event.shopName === 'string'
    && typeof event.reviewId === 'string'
    && typeof event.authorName === 'string'
    && typeof event.content === 'string'
    && typeof event.reviewTime === 'string';
}
