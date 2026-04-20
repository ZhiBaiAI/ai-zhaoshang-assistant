import { ChatModelProvider } from '@ai-zhaoshang/llm-providers';
import { buildRetrievalContext, EmbeddingProvider, KnowledgeStore } from '@ai-zhaoshang/rag';
import { Notifier } from '@ai-zhaoshang/notify';
import { Lead, ReplyGenerationResult, ReplyTask } from '@ai-zhaoshang/shared';
import { ConversationStore } from './conversation-store';
import { extractLeadProfile } from './lead-extractor';
import { LeadStore } from './lead-store';

export interface ReplyEngineDependencies {
  conversationStore: ConversationStore;
  knowledgeStore: KnowledgeStore;
  embeddingProvider: EmbeddingProvider;
  llmProvider: ChatModelProvider;
  leadStore: LeadStore;
  notifier?: Notifier;
  leadSyncer?: LeadSyncer;
}

export interface LeadSyncer {
  syncLead(lead: Lead): Promise<unknown>;
}

export async function generateReplyForTask(
  task: ReplyTask,
  dependencies: ReplyEngineDependencies,
): Promise<ReplyGenerationResult> {
  await dependencies.conversationStore.updateReplyTask(task.id, { status: 'processing' });
  const messages = await dependencies.conversationStore.listMessages(task.conversationId);
  const latestUserMessage = [...messages].reverse().find(message => message.direction === 'incoming');
  if (!latestUserMessage) {
    const updated = await dependencies.conversationStore.updateReplyTask(task.id, {
      status: 'failed',
      errorMessage: 'No incoming message found',
    });
    throw new Error(`No incoming message found for task ${task.id}: ${updated.id}`);
  }

  const risk = detectHandoffRisk(latestUserMessage.text);
  const profile = extractLeadProfile(messages);
  const lead = profile.intentLevel === 'high'
    ? await dependencies.leadStore.upsertLead({
      projectId: task.projectId,
      conversationId: task.conversationId,
      profile,
      status: 'new',
    })
    : undefined;

  const [queryEmbedding] = await dependencies.embeddingProvider.embedTexts([latestUserMessage.text]);
  const hits = await dependencies.knowledgeStore.searchHybrid({
    query: {
      projectId: task.projectId,
      query: latestUserMessage.text,
      topK: 5,
    },
    queryEmbedding,
  });
  const context = buildRetrievalContext(hits);
  if (lead) {
    await syncLeadSafely(lead, dependencies);
  }

  if (risk) {
    const updated = await dependencies.conversationStore.updateReplyTask(task.id, {
      status: 'handoff',
      handoffReason: risk,
    });
    await dependencies.notifier?.send({
      level: 'warning',
      title: '需要人工接管',
      content: `会话 ${task.conversationId}\n原因：${risk}\n消息：${latestUserMessage.text}`,
    });
    return {
      task: updated,
      reply: '',
      context,
      lead,
      handoff: true,
      handoffReason: risk,
    };
  }

  const result = await dependencies.llmProvider.complete({
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: [
          '你是招商加盟客服，只能基于知识库上下文回答。',
          '不得承诺收益、不得编造政策、不确定时建议人工跟进。',
          '回复要简洁、自然，并适度引导客户留下手机号或微信。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `知识库上下文：\n${context || '暂无命中资料'}\n\n客户消息：${latestUserMessage.text}`,
      },
    ],
  });
  const reply = sanitizeReply(result.content);
  const nextStatus = task.mode === 'auto' ? 'queued' : 'suggested';
  const updated = await dependencies.conversationStore.updateReplyTask(task.id, {
    status: nextStatus,
    suggestedReply: reply,
  });

  if (lead) {
    await dependencies.notifier?.send({
      level: lead.profile.intentLevel === 'high' ? 'critical' : 'info',
      title: '新招商线索',
      content: `${lead.profile.summary}\n会话：${task.conversationId}`,
    });
  }

  return {
    task: updated,
    reply,
    context,
    lead,
    handoff: false,
  };
}

export function detectHandoffRisk(text: string): string | undefined {
  if (/投诉|举报|律师|赔偿/.test(text)) return '投诉或纠纷风险';
  if (/保证.*赚钱|一定.*回本|承诺.*收益/.test(text)) return '收益承诺风险';
  if (/合同|法务|退费|违约/.test(text)) return '合同或法务问题';
  return undefined;
}

function sanitizeReply(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

async function syncLeadSafely(
  lead: Lead,
  dependencies: Pick<ReplyEngineDependencies, 'leadSyncer' | 'notifier'>,
): Promise<void> {
  if (!dependencies.leadSyncer) return;
  try {
    await dependencies.leadSyncer.syncLead(lead);
  } catch (error) {
    await dependencies.notifier?.send({
      level: 'warning',
      title: '飞书线索同步失败',
      content: `线索 ${lead.id}\n原因：${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
