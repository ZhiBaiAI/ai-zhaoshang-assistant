import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkerApiClient } from './apiClient';

test('WorkerApiClient posts with bearer token', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; auth?: string; body: string }> = [];

  globalThis.fetch = (async (url, init) => {
    requests.push({
      url: String(url),
      auth: (init?.headers as Record<string, string>).authorization,
      body: String(init?.body),
    });
    if (String(url).endsWith('/reply-tasks/pending')) {
      return new Response(JSON.stringify({
        tasks: [{
          id: 'task-1',
          projectId: 'project-1',
          conversationId: 'conv-1',
          messageId: 'msg-1',
          status: 'pending',
          mode: 'readonly',
          createdAt: '2026-04-17T10:00:00.000Z',
          updatedAt: '2026-04-17T10:00:00.000Z',
        }],
      }), { status: 200 });
    }
    if (String(url).endsWith('/integrations/feishu/sync-lead-status')) {
      return new Response(JSON.stringify({ updated: [] }), { status: 200 });
    }
    if (String(url).endsWith('/review-reply-tasks/pending')) {
      return new Response(JSON.stringify({
        tasks: [{
          id: 'review-task-1',
          projectId: 'project-1',
          source: 'dianping',
          reviewId: 'review-1',
          status: 'pending',
          mode: 'readonly',
          createdAt: '2026-04-18T10:00:00.000Z',
          updatedAt: '2026-04-18T10:00:00.000Z',
        }],
      }), { status: 200 });
    }
    if (String(url).endsWith('/review-reply-tasks/generate')) {
      return new Response(JSON.stringify({
        task: { id: 'review-task-1' },
        review: { id: 'review-1' },
        reply: '感谢评价',
      }), { status: 200 });
    }
    if (String(url).endsWith('/review-reports/generate')) {
      return new Response(JSON.stringify({
        report: { id: 'report-1', reviewCount: 0 },
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      task: { id: 'task-1' },
      reply: '您好',
      context: '',
      handoff: false,
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const client = new WorkerApiClient({
      apiBaseUrl: 'http://127.0.0.1:3001',
      apiToken: 'token-1',
    });
    const tasks = await client.listPendingReplyTasks({ projectId: 'project-1', limit: 1 });
    const reply = await client.generateReply(tasks[0].id);
    const sync = await client.syncFeishuLeadStatus('project-1');
    const reviewTasks = await client.listPendingReviewReplyTasks({ projectId: 'project-1', limit: 1 });
    const reviewReply = await client.generateReviewReply(reviewTasks[0].id);
    const report = await client.generateReviewReport({ projectId: 'project-1', period: 'daily' });

    assert.equal(requests[0].url, 'http://127.0.0.1:3001/reply-tasks/pending');
    assert.equal(requests[0].auth, 'Bearer token-1');
    assert.equal(JSON.parse(requests[0].body).projectId, 'project-1');
    assert.equal(reply.reply, '您好');
    assert.deepEqual(sync.updated, []);
    assert.equal(reviewReply.reply, '感谢评价');
    assert.equal(report.id, 'report-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
