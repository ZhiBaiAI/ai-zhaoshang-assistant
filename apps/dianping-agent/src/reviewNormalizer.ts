import crypto from 'crypto';
import { ReviewEvent } from '@ai-zhaoshang/shared';
import { RawDianpingReview } from './types';

export function normalizeDianpingReview(
  raw: RawDianpingReview,
  capturedAt: string,
): ReviewEvent {
  return {
    schemaVersion: 1,
    id: makeReviewEventId(raw),
    source: 'dianping',
    type: 'review.created',
    capturedAt,
    shopId: raw.shopId,
    shopName: raw.shopName,
    reviewId: raw.reviewId,
    authorName: raw.authorName,
    rating: normalizeRating(raw.rating),
    content: normalizeText(raw.content),
    reviewTime: new Date(raw.reviewTime).toISOString(),
    url: raw.url,
    images: raw.images,
    metadata: raw.metadata,
  };
}

export function parseRawDianpingReviews(value: unknown): RawDianpingReview[] {
  if (!Array.isArray(value)) {
    throw new Error('Dianping review sample must be an array');
  }
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid review at index ${index}`);
    }
    const review = item as Partial<RawDianpingReview>;
    for (const key of ['shopId', 'shopName', 'reviewId', 'authorName', 'content', 'reviewTime'] as const) {
      if (typeof review[key] !== 'string' || !review[key]?.trim()) {
        throw new Error(`Missing required review field: ${key}`);
      }
    }
    return review as RawDianpingReview;
  });
}

function makeReviewEventId(raw: RawDianpingReview): string {
  const hash = crypto
    .createHash('sha1')
    .update(['dianping', raw.shopId, raw.reviewId].join(':'))
    .digest('hex');
  return `dianping_review_${hash}`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeRating(value: number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(5, value));
}
