import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDouyinMessageBatch,
  listSendableReplies,
  postAgentHeartbeat,
  reportReplySendResult,
  uploadDouyinMessageBatch,
} from './apiClient';

const event = {
  schemaVersion: 1 as const,
  id: 'douyin_msg_1',
  source: 'douyin' as const,
  type: 'message.created' as const,
  capturedAt: '2026-04-17T10:00:00.000Z',
  session: {
    name: '客户A',
    unreadCount: 1,
    lastMessage: '想了解加盟',
    time: '10:00',
    index: 0,
  },
  message: {
    direction: 'incoming' as const,
    text: '想了解加盟',
  },
};

test('createDouyinMessageBatch builds shared API payload', () => {
  const batch = createDouyinMessageBatch({
    projectId: 'project-1',
    capturedAt: '2026-04-17T10:00:00.000Z',
    events: [event],
  });

  assert.equal(batch.schemaVersion, 1);
  assert.equal(batch.projectId, 'project-1');
  assert.equal(batch.count, 1);
  assert.equal(batch.events[0].id, 'douyin_msg_1');
});

test('listSendableReplies posts project and limit', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedBody = '';

  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedBody = String(init?.body);
    return new Response(JSON.stringify({
      tasks: [{
        id: 'task-1',
        projectId: 'project-1',
        conversationId: 'conv-1',
        messageId: 'msg-1',
        status: 'queued',
        mode: 'auto',
        source: 'douyin',
        sessionName: '客户A',
        suggestedReply: '您好',
        replyText: '您好',
        createdAt: '2026-04-17T10:00:00.000Z',
        updatedAt: '2026-04-17T10:00:00.000Z',
      }],
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const tasks = await listSendableReplies({
      apiBaseUrl: 'http://127.0.0.1:3001',
      projectId: 'project-1',
      limit: 3,
    });

    assert.equal(requestedUrl, 'http://127.0.0.1:3001/reply-tasks/sendable');
    assert.equal(JSON.parse(requestedBody).limit, 3);
    assert.equal(tasks[0].sessionName, '客户A');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reportReplySendResult posts send result', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedBody = '';

  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedBody = String(init?.body);
    return new Response(JSON.stringify({ task: { id: 'task-1', status: 'sent' } }), { status: 200 });
  }) as typeof fetch;

  try {
    await reportReplySendResult({
      apiBaseUrl: 'http://127.0.0.1:3001',
      result: {
        taskId: 'task-1',
        success: true,
        sentAt: '2026-04-17T10:00:00.000Z',
      },
    });

    assert.equal(requestedUrl, 'http://127.0.0.1:3001/reply-tasks/send-result');
    assert.equal(JSON.parse(requestedBody).success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('postAgentHeartbeat posts collector status to api-service', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedBody = '';

  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedBody = String(init?.body);
    return new Response(JSON.stringify({ ok: true }), { status: 202 });
  }) as typeof fetch;

  try {
    await postAgentHeartbeat({
      apiBaseUrl: 'http://127.0.0.1:3001/',
      heartbeat: {
        schemaVersion: 1,
        projectId: 'project-1',
        agentId: 'douyin-agent-local',
        source: 'douyin',
        status: 'running',
        observedAt: '2026-04-17T10:00:00.000Z',
        totalSessions: 10,
      },
    });

    assert.equal(requestedUrl, 'http://127.0.0.1:3001/agents/heartbeat');
    assert.equal(JSON.parse(requestedBody).agentId, 'douyin-agent-local');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uploadDouyinMessageBatch posts to api-service endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedBody = '';
  let requestedAuth = '';

  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedBody = String(init?.body);
    requestedAuth = String((init?.headers as Record<string, string>).authorization);
    return new Response(JSON.stringify({ inserted: 1 }), { status: 202 });
  }) as typeof fetch;

  try {
    const batch = createDouyinMessageBatch({
      projectId: 'project-1',
      capturedAt: '2026-04-17T10:00:00.000Z',
      events: [event],
    });
    const result = await uploadDouyinMessageBatch({
      apiBaseUrl: 'http://127.0.0.1:3001',
      apiToken: 'token-1',
      batch,
    });

    assert.equal(requestedUrl, 'http://127.0.0.1:3001/channels/douyin/messages');
    assert.equal(requestedAuth, 'Bearer token-1');
    assert.equal(JSON.parse(requestedBody).projectId, 'project-1');
    assert.deepEqual(result, { inserted: 1 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
