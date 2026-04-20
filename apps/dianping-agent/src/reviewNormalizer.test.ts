import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDianpingReview,
  parseRawDianpingReviews,
} from './reviewNormalizer';

test('parseRawDianpingReviews validates required fields', () => {
  const reviews = parseRawDianpingReviews([{
    shopId: 'shop-1',
    shopName: '测试门店',
    reviewId: 'review-1',
    authorName: '用户A',
    content: ' 服务不错 ',
    reviewTime: '2026-04-18T08:00:00.000Z',
  }]);

  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].shopName, '测试门店');
});

test('normalizeDianpingReview builds stable shared review event', () => {
  const event = normalizeDianpingReview({
    shopId: 'shop-1',
    shopName: '测试门店',
    reviewId: 'review-1',
    authorName: '用户A',
    rating: 6,
    content: ' 服务\n不错 ',
    reviewTime: '2026-04-18T08:00:00.000Z',
  }, '2026-04-18T09:00:00.000Z');

  assert.equal(event.schemaVersion, 1);
  assert.equal(event.source, 'dianping');
  assert.equal(event.rating, 5);
  assert.equal(event.content, '服务 不错');
  assert.match(event.id, /^dianping_review_/);
});
