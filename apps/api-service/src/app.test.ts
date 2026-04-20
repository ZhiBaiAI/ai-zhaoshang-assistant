import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DeterministicEmbeddingProvider,
  MemoryKnowledgeStore,
} from '@ai-zhaoshang/rag';
import { StaticChatProvider } from '@ai-zhaoshang/llm-providers';
import { createApp } from './app';
import { MemoryConversationStore } from './conversation-store';
import { MemoryLeadStore } from './lead-store';
import { MemoryAgentStatusStore } from './agent-status-store';
import { MemoryProjectStore } from './project-store';
import { MemoryLogStore } from './log-store';
import { MemoryReviewStore } from './review-store';

function testDependencies() {
  return {
    store: new MemoryKnowledgeStore(),
    embeddingProvider: new DeterministicEmbeddingProvider(8),
    conversationStore: new MemoryConversationStore(),
    leadStore: new MemoryLeadStore(),
    llmProvider: new StaticChatProvider('您好，可以先了解您的城市和预算吗？'),
    agentStatusStore: new MemoryAgentStatusStore(),
    projectStore: new MemoryProjectStore(),
    logStore: new MemoryLogStore(),
    reviewStore: new MemoryReviewStore(),
  };
}

test('health returns service status', async () => {
  const handle = createApp(testDependencies());

  const response = await handle({ method: 'GET', path: '/health' });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true, service: 'api-service' });
});

test('ingests knowledge document and retrieves context', async () => {
  const embeddingProvider = new DeterministicEmbeddingProvider(8);
  const handle = createApp({
    store: new MemoryKnowledgeStore(),
    embeddingProvider,
    conversationStore: new MemoryConversationStore(),
    leadStore: new MemoryLeadStore(),
    llmProvider: new StaticChatProvider(),
    agentStatusStore: new MemoryAgentStatusStore(),
    projectStore: new MemoryProjectStore(),
    logStore: new MemoryLogStore(),
    reviewStore: new MemoryReviewStore(),
  });

  const ingest = await handle({
    method: 'POST',
    path: '/knowledge/documents/ingest',
    body: {
      id: 'doc-1',
      projectId: 'project-1',
      title: '招商手册',
      sourceType: 'markdown',
      content: '# 加盟费用\n加盟费 10 万，保证金 2 万。\n\n# 扶持政策\n总部提供培训。',
    },
  });

  assert.equal(ingest.status, 201);
  assert.equal((ingest.body as { chunkCount: number }).chunkCount, 2);

  const retrieve = await handle({
    method: 'POST',
    path: '/knowledge/retrieve',
    body: {
      projectId: 'project-1',
      query: '加盟费用',
      topK: 2,
    },
  });

  assert.equal(retrieve.status, 200);
  const body = retrieve.body as { hits: Array<{ chunk: { content: string } }>; context: string };
  assert.equal(body.hits.length, 2);
  assert.match(body.context, /加盟费 10 万/);
});

test('requires bearer token when API_TOKEN is configured', async () => {
  const handle = createApp(testDependencies(), { apiToken: 'secret-token' });

  const rejected = await handle({
    method: 'POST',
    path: '/conversations',
    body: { projectId: 'project-1' },
  });
  assert.equal(rejected.status, 401);

  const accepted = await handle({
    method: 'POST',
    path: '/conversations',
    headers: { authorization: 'Bearer secret-token' },
    body: { projectId: 'project-1' },
  });
  assert.equal(accepted.status, 200);
});

test('stores and lists agent heartbeat status', async () => {
  const handle = createApp(testDependencies());

  const heartbeat = await handle({
    method: 'POST',
    path: '/agents/heartbeat',
    body: {
      schemaVersion: 1,
      projectId: 'project-1',
      agentId: 'douyin-agent-local',
      source: 'douyin',
      status: 'running',
      observedAt: '2026-04-17T10:00:00.000Z',
      totalSessions: 12,
      scannedSessions: 3,
      newMessages: 2,
      pendingUploads: 0,
    },
  });
  assert.equal(heartbeat.status, 202);

  const status = await handle({
    method: 'POST',
    path: '/agents/status',
    body: { projectId: 'project-1' },
  });
  assert.equal(status.status, 200);
  const body = status.body as { statuses: Array<{ agentId: string; status: string }> };
  assert.equal(body.statuses.length, 1);
  assert.equal(body.statuses[0].agentId, 'douyin-agent-local');
  assert.equal(body.statuses[0].status, 'running');
});

test('returns validation error for missing fields', async () => {
  const handle = createApp(testDependencies());

  const response = await handle({
    method: 'POST',
    path: '/knowledge/documents/ingest',
    body: { projectId: 'project-1' },
  });

  assert.equal(response.status, 400);
  assert.match((response.body as { error: string }).error, /Missing required string field/);
});

test('ingests Douyin message batch and deduplicates events', async () => {
  const handle = createApp(testDependencies());
  const event = {
    schemaVersion: 1,
    id: 'douyin_msg_1',
    source: 'douyin',
    type: 'message.created',
    capturedAt: '2026-04-17T10:00:00.000Z',
    session: {
      name: '客户A',
      unreadCount: 1,
      lastMessage: '想了解加盟',
      time: '10:00',
      index: 0,
    },
    message: {
      direction: 'incoming',
      text: '想了解加盟',
      time: '10:00',
    },
  };

  const first = await handle({
    method: 'POST',
    path: '/channels/douyin/messages',
    body: {
      projectId: 'project-1',
      capturedAt: '2026-04-17T10:00:00.000Z',
      events: [event],
    },
  });

  assert.equal(first.status, 202);
  assert.equal((first.body as { inserted: number }).inserted, 1);

  const second = await handle({
    method: 'POST',
    path: '/channels/douyin/messages',
    body: {
      projectId: 'project-1',
      capturedAt: '2026-04-17T10:01:00.000Z',
      events: [event],
    },
  });

  assert.equal(second.status, 202);
  assert.equal((second.body as { duplicates: number }).duplicates, 1);

  const conversations = await handle({
    method: 'POST',
    path: '/conversations',
    body: { projectId: 'project-1' },
  });

  assert.equal(conversations.status, 200);
  assert.equal((conversations.body as { conversations: unknown[] }).conversations.length, 1);
});

test('lists pending reply task and generates suggested reply', async () => {
  const handle = createApp(testDependencies());
  await handle({
    method: 'POST',
    path: '/channels/douyin/messages',
    body: {
      projectId: 'project-1',
      capturedAt: '2026-04-17T10:00:00.000Z',
      events: [{
        schemaVersion: 1,
        id: 'douyin_msg_2',
        source: 'douyin',
        type: 'message.created',
        capturedAt: '2026-04-17T10:00:00.000Z',
        session: {
          name: '客户B',
          unreadCount: 1,
          lastMessage: '想加盟',
          time: '10:00',
          index: 0,
        },
        message: {
          direction: 'incoming',
          text: '我想加盟，手机号13800138000',
          time: '10:00',
        },
      }],
    },
  });

  const pending = await handle({
    method: 'POST',
    path: '/reply-tasks/pending',
    body: { projectId: 'project-1', limit: 5 },
  });
  const taskId = (pending.body as { tasks: Array<{ id: string }> }).tasks[0].id;

  const generated = await handle({
    method: 'POST',
    path: '/reply-tasks/generate',
    body: { taskId },
  });

  assert.equal(generated.status, 200);
  assert.match((generated.body as { reply: string }).reply, /城市和预算/);

  const leads = await handle({
    method: 'POST',
    path: '/leads',
    body: { projectId: 'project-1' },
  });
  assert.equal((leads.body as { leads: unknown[] }).leads.length, 1);
});

test('upserts project config and lists operation overview', async () => {
  const handle = createApp(testDependencies());

  const upsert = await handle({
    method: 'POST',
    path: '/projects/upsert',
    body: {
      id: 'project-1',
      name: '测试项目',
      replyMode: 'auto',
      autoSendEnabled: true,
      handoffEnabled: true,
      enabled: true,
    },
  });
  assert.equal(upsert.status, 200);
  assert.equal((upsert.body as { project: { replyMode: string } }).project.replyMode, 'auto');

  const overview = await handle({
    method: 'POST',
    path: '/ops/overview',
    body: { projectId: 'project-1' },
  });
  assert.equal(overview.status, 200);
  assert.equal((overview.body as { overview: { projectId: string } }).overview.projectId, 'project-1');
});

test('queues generated auto reply and records send result', async () => {
  const handle = createApp(testDependencies());
  await handle({
    method: 'POST',
    path: '/projects/upsert',
    body: {
      id: 'project-1',
      name: '测试项目',
      replyMode: 'auto',
      autoSendEnabled: true,
    },
  });
  await handle({
    method: 'POST',
    path: '/channels/douyin/messages',
    body: {
      projectId: 'project-1',
      capturedAt: '2026-04-17T10:00:00.000Z',
      events: [{
        schemaVersion: 1,
        id: 'douyin_msg_auto_1',
        source: 'douyin',
        type: 'message.created',
        capturedAt: '2026-04-17T10:00:00.000Z',
        session: { name: '客户C', unreadCount: 1, lastMessage: '加盟', time: '10:00', index: 0 },
        message: { direction: 'incoming', text: '我想加盟，手机号13800138000' },
      }],
    },
  });
  const pending = await handle({
    method: 'POST',
    path: '/reply-tasks/pending',
    body: { projectId: 'project-1', limit: 1 },
  });
  const taskId = (pending.body as { tasks: Array<{ id: string }> }).tasks[0].id;

  const generated = await handle({
    method: 'POST',
    path: '/reply-tasks/generate',
    body: { taskId },
  });
  assert.equal((generated.body as { task: { status: string } }).task.status, 'queued');

  const sendable = await handle({
    method: 'POST',
    path: '/reply-tasks/sendable',
    body: { projectId: 'project-1', limit: 5 },
  });
  const sendableTask = (sendable.body as { tasks: Array<{ id: string; sessionName: string }> }).tasks[0];
  assert.equal(sendableTask.id, taskId);
  assert.equal(sendableTask.sessionName, '客户C');

  const sent = await handle({
    method: 'POST',
    path: '/reply-tasks/send-result',
    body: {
      taskId,
      success: true,
      sentAt: '2026-04-17T10:01:00.000Z',
    },
  });
  assert.equal((sent.body as { task: { status: string } }).task.status, 'sent');
});

test('conversation handoff and lead status update APIs work', async () => {
  const handle = createApp(testDependencies());
  await handle({
    method: 'POST',
    path: '/channels/douyin/messages',
    body: {
      projectId: 'project-1',
      capturedAt: '2026-04-17T10:00:00.000Z',
      events: [{
        schemaVersion: 1,
        id: 'douyin_msg_handoff_1',
        source: 'douyin',
        type: 'message.created',
        capturedAt: '2026-04-17T10:00:00.000Z',
        session: { name: '客户D', unreadCount: 1, lastMessage: '加盟', time: '10:00', index: 0 },
        message: { direction: 'incoming', text: '我想加盟，手机号13800138000' },
      }],
    },
  });

  const conversations = await handle({
    method: 'POST',
    path: '/conversations',
    body: { projectId: 'project-1' },
  });
  const conversationId = (conversations.body as { conversations: Array<{ id: string }> }).conversations[0].id;
  const handoff = await handle({
    method: 'POST',
    path: '/conversations/handoff',
    body: { conversationId, handoff: true, reason: '人工处理' },
  });
  assert.equal((handoff.body as { conversation: { handoff: boolean } }).conversation.handoff, true);

  const pending = await handle({
    method: 'POST',
    path: '/reply-tasks/pending',
    body: { projectId: 'project-1', limit: 1 },
  });
  await handle({
    method: 'POST',
    path: '/reply-tasks/generate',
    body: { taskId: (pending.body as { tasks: Array<{ id: string }> }).tasks[0].id },
  });
  const leads = await handle({
    method: 'POST',
    path: '/leads',
    body: { projectId: 'project-1' },
  });
  const leadId = (leads.body as { leads: Array<{ id: string }> }).leads[0].id;
  const updated = await handle({
    method: 'POST',
    path: '/leads/update-status',
    body: { leadId, status: 'contacted' },
  });
  assert.equal((updated.body as { lead: { status: string } }).lead.status, 'contacted');
});

test('ingests Dianping reviews, generates reply task and report', async () => {
  const handle = createApp(testDependencies());
  const reviewEvent = {
    schemaVersion: 1,
    id: 'dianping_review_event_1',
    source: 'dianping',
    type: 'review.created',
    capturedAt: '2026-04-18T09:00:00.000Z',
    shopId: 'shop-1',
    shopName: '测试门店',
    reviewId: 'review-1',
    authorName: '用户A',
    rating: 2,
    content: '排队太慢了，体验不好',
    reviewTime: '2026-04-18T08:00:00.000Z',
  };

  const ingest = await handle({
    method: 'POST',
    path: '/channels/dianping/reviews',
    body: {
      schemaVersion: 1,
      source: 'dianping',
      projectId: 'project-1',
      capturedAt: '2026-04-18T09:00:00.000Z',
      events: [reviewEvent],
    },
  });
  assert.equal(ingest.status, 202);
  assert.equal((ingest.body as { inserted: number }).inserted, 1);

  const reviews = await handle({
    method: 'POST',
    path: '/reviews/list',
    body: { projectId: 'project-1', source: 'dianping', limit: 10 },
  });
  assert.equal((reviews.body as { reviews: Array<{ sentiment: string }> }).reviews[0].sentiment, 'negative');

  const pending = await handle({
    method: 'POST',
    path: '/review-reply-tasks/pending',
    body: { projectId: 'project-1', limit: 10 },
  });
  const taskId = (pending.body as { tasks: Array<{ id: string }> }).tasks[0].id;

  const generated = await handle({
    method: 'POST',
    path: '/review-reply-tasks/generate',
    body: { taskId },
  });
  assert.equal(generated.status, 200);
  assert.match((generated.body as { reply: string }).reply, /城市和预算|抱歉|感谢/);

  const queued = await handle({
    method: 'POST',
    path: '/review-reply-tasks/queue-send',
    body: { taskId },
  });
  assert.equal((queued.body as { task: { status: string } }).task.status, 'queued');

  const report = await handle({
    method: 'POST',
    path: '/review-reports/generate',
    body: {
      projectId: 'project-1',
      source: 'dianping',
      period: 'daily',
      date: '2026-04-18T12:00:00.000Z',
    },
  });
  const reportBody = report.body as { report: { reviewCount: number; sentiment: { negative: number } } };
  assert.equal(reportBody.report.reviewCount, 1);
  assert.equal(reportBody.report.sentiment.negative, 1);
});
