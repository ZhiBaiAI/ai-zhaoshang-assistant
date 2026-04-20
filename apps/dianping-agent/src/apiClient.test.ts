import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDianpingReviewBatch,
  listSendableReviewReplies,
  reportReviewReplySendResult,
  uploadDianpingReviewBatch,
} from './apiClient';

const event = {
  schemaVersion: 1 as const,
  id: 'dianping_review_1',
  source: 'dianping' as const,
  type: 'review.created' as const,
  capturedAt: '2026-04-18T09:00:00.000Z',
  shopId: 'shop-1',
  shopName: '测试门店',
  reviewId: 'review-1',
  authorName: '用户A',
  rating: 4,
  content: '服务不错',
  reviewTime: '2026-04-18T08:00:00.000Z',
};

test('createDianpingReviewBatch builds shared payload', () => {
  const batch = createDianpingReviewBatch({
    projectId: 'project-1',
    capturedAt: '2026-04-18T09:00:00.000Z',
    events: [event],
  });

  assert.equal(batch.source, 'dianping');
  assert.equal(batch.count, 1);
});

test('Dianping api client calls review endpoints', async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];

  globalThis.fetch = (async (url) => {
    urls.push(String(url));
    if (String(url).endsWith('/review-reply-tasks/sendable')) {
      return new Response(JSON.stringify({ tasks: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 202 });
  }) as typeof fetch;

  try {
    const batch = createDianpingReviewBatch({
      projectId: 'project-1',
      capturedAt: '2026-04-18T09:00:00.000Z',
      events: [event],
    });
    await uploadDianpingReviewBatch({
      apiBaseUrl: 'http://127.0.0.1:3001',
      batch,
    });
    const tasks = await listSendableReviewReplies({
      apiBaseUrl: 'http://127.0.0.1:3001',
      projectId: 'project-1',
      limit: 5,
    });
    await reportReviewReplySendResult({
      apiBaseUrl: 'http://127.0.0.1:3001',
      result: {
        taskId: 'task-1',
        success: true,
        sentAt: '2026-04-18T10:00:00.000Z',
      },
    });

    assert.deepEqual(tasks, []);
    assert.equal(urls[0], 'http://127.0.0.1:3001/channels/dianping/reviews');
    assert.equal(urls[1], 'http://127.0.0.1:3001/review-reply-tasks/sendable');
    assert.equal(urls[2], 'http://127.0.0.1:3001/review-reply-tasks/send-result');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
