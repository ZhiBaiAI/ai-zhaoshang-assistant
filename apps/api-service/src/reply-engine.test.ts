import assert from 'node:assert/strict';
import test from 'node:test';
import { StaticChatProvider } from '@ai-zhaoshang/llm-providers';
import { DeterministicEmbeddingProvider, MemoryKnowledgeStore } from '@ai-zhaoshang/rag';
import { MemoryConversationStore } from './conversation-store';
import { MemoryLeadStore } from './lead-store';
import { extractLeadProfile } from './lead-extractor';
import { detectHandoffRisk, generateReplyForTask } from './reply-engine';

test('extractLeadProfile detects phone and high intent', () => {
  const profile = extractLeadProfile([
    { text: '我在上海市，想加盟，手机号 13800138000' },
  ]);

  assert.equal(profile.phone, '13800138000');
  assert.equal(profile.intentLevel, 'high');
});

test('detectHandoffRisk detects earnings promise risk', () => {
  assert.equal(detectHandoffRisk('你们能保证赚钱吗'), '收益承诺风险');
});

test('generateReplyForTask creates suggested reply and lead', async () => {
  const conversationStore = new MemoryConversationStore();
  await conversationStore.ingestDouyinMessages({
    schemaVersion: 1,
    source: 'douyin',
    projectId: 'project-1',
    capturedAt: '2026-04-17T10:00:00.000Z',
    count: 1,
    events: [{
      schemaVersion: 1,
      id: 'msg-1',
      source: 'douyin',
      type: 'message.created',
      capturedAt: '2026-04-17T10:00:00.000Z',
      session: { name: '客户A', unreadCount: 1, lastMessage: '想加盟', time: '10:00', index: 0 },
      message: { direction: 'incoming', text: '想加盟，手机号13800138000' },
    }],
  });
  const [task] = await conversationStore.listPendingReplyTasks('project-1', 1);
  const syncedLeads: string[] = [];

  const result = await generateReplyForTask(task, {
    conversationStore,
    knowledgeStore: new MemoryKnowledgeStore(),
    embeddingProvider: new DeterministicEmbeddingProvider(8),
    llmProvider: new StaticChatProvider('您好，可以先了解您的城市和预算吗？'),
    leadStore: new MemoryLeadStore(),
    leadSyncer: {
      async syncLead(lead) {
        syncedLeads.push(lead.id);
      },
    },
  });

  assert.equal(result.handoff, false);
  assert.match(result.reply, /城市和预算/);
  assert.equal(result.lead?.profile.phone, '13800138000');
  assert.equal(result.task.status, 'suggested');
  assert.deepEqual(syncedLeads, [result.lead?.id]);
});
