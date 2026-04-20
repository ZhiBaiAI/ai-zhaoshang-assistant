import {
  DouyinMessageBatch,
  isDouyinMessageEvent,
  isAgentHeartbeat,
  isReviewEvent,
  MessageIngestionResult,
  ReviewBatch,
  ReviewReportPeriod,
  ReviewSource,
} from '@ai-zhaoshang/shared';
import {
  ChatModelProvider,
  OpenAICompatibleProvider,
  StaticChatProvider,
} from '@ai-zhaoshang/llm-providers';
import {
  CompositeNotifier,
  DingTalkWebhookNotifier,
  FeishuWebhookNotifier,
  FeishuOpenPlatformNotifier,
  Notifier,
  WeComWebhookNotifier,
} from '@ai-zhaoshang/notify';
import { FeishuLeadSyncer, FeishuOpenPlatformClient } from '@ai-zhaoshang/feishu';
import {
  BasicTextParser,
  buildRetrievalContext,
  DeterministicEmbeddingProvider,
  EmbeddingProvider,
  ingestKnowledgeDocument,
  KnowledgeDocument,
  KnowledgeStore,
  LocalEmbeddingEndpoint,
  MemoryKnowledgeStore,
  PgKnowledgeStore,
} from '@ai-zhaoshang/rag';
import { randomUUID } from 'crypto';
import {
  ApiRequest,
  ApiResponse,
  asObject,
  getHeader,
  HttpError,
  optionalBoolean,
  optionalNumber,
  optionalRecord,
  optionalString,
  requireString,
} from './http';
import { loadConfig } from './config';
import { ConversationStore, MemoryConversationStore } from './conversation-store';
import { PgConversationStore } from './pg-conversation-store';
import { LeadStore, MemoryLeadStore } from './lead-store';
import { PgLeadStore } from './pg-lead-store';
import { generateReplyForTask } from './reply-engine';
import { AgentStatusStore, MemoryAgentStatusStore } from './agent-status-store';
import { defaultProjectConfig, MemoryProjectStore, ProjectStore } from './project-store';
import { PgProjectStore } from './pg-project-store';
import { LogStore, MemoryLogStore } from './log-store';
import { PgLogStore } from './pg-log-store';
import { LeadStatus, ReplyMode, ReplyTaskStatus } from '@ai-zhaoshang/shared';
import { MemoryReviewStore, ReviewStore } from './review-store';
import { PgReviewStore } from './pg-review-store';
import {
  generateReviewReplyForTask,
  generateReviewReport,
} from './review-engine';

export interface AppDependencies {
  store: KnowledgeStore;
  embeddingProvider: EmbeddingProvider;
  conversationStore: ConversationStore;
  leadStore: LeadStore;
  llmProvider: ChatModelProvider;
  notifier?: Notifier;
  agentStatusStore: AgentStatusStore;
  leadSyncer?: FeishuLeadSyncer;
  projectStore: ProjectStore;
  logStore: LogStore;
  reviewStore: ReviewStore;
}

export interface AppOptions {
  apiToken?: string;
}

export function createDefaultDependencies(): AppDependencies {
  const config = loadConfig();
  const embeddingProvider = config.embeddingEndpoint
    ? new LocalEmbeddingEndpoint({
      endpoint: config.embeddingEndpoint,
      model: config.embeddingModel,
      dimension: config.embeddingDimension,
    })
    : new DeterministicEmbeddingProvider(config.databaseUrl ? config.embeddingDimension : 16);
  const llmProvider = config.llmBaseUrl && config.llmApiKey
    ? new OpenAICompatibleProvider({
      baseUrl: config.llmBaseUrl,
      apiKey: config.llmApiKey,
      model: config.llmModel,
    })
    : new StaticChatProvider();
  const notifier = createNotifier(config);
  const leadSyncer = createLeadSyncer(config);

  return {
    store: config.databaseUrl
      ? new PgKnowledgeStore({
        poolConfig: { connectionString: config.databaseUrl },
        embeddingProvider,
      })
      : new MemoryKnowledgeStore(),
    embeddingProvider,
    conversationStore: config.databaseUrl
      ? new PgConversationStore({ connectionString: config.databaseUrl })
      : new MemoryConversationStore(),
    leadStore: config.databaseUrl
      ? new PgLeadStore({ connectionString: config.databaseUrl })
      : new MemoryLeadStore(),
    llmProvider,
    notifier,
    agentStatusStore: new MemoryAgentStatusStore(),
    leadSyncer,
    projectStore: config.databaseUrl
      ? new PgProjectStore({ connectionString: config.databaseUrl })
      : new MemoryProjectStore(),
    logStore: config.databaseUrl
      ? new PgLogStore({ connectionString: config.databaseUrl })
      : new MemoryLogStore(),
    reviewStore: config.databaseUrl
      ? new PgReviewStore({ connectionString: config.databaseUrl })
      : new MemoryReviewStore(),
  };
}

function createNotifier(config: ReturnType<typeof loadConfig>): Notifier | undefined {
  const notifiers: Notifier[] = [];

  if (config.feishuAppId && config.feishuAppSecret && config.feishuNotifyReceiveId) {
    notifiers.push(new FeishuOpenPlatformNotifier(
      new FeishuOpenPlatformClient({
        appId: config.feishuAppId,
        appSecret: config.feishuAppSecret,
        baseUrl: config.feishuBaseUrl,
      }),
      config.feishuNotifyReceiveId,
      config.feishuNotifyReceiveIdType,
    ));
  } else if (config.feishuWebhookUrl) {
    notifiers.push(new FeishuWebhookNotifier(config.feishuWebhookUrl));
  }

  if (config.wecomWebhookUrl) {
    notifiers.push(new WeComWebhookNotifier(config.wecomWebhookUrl));
  }

  if (config.dingtalkWebhookUrl) {
    notifiers.push(new DingTalkWebhookNotifier(
      config.dingtalkWebhookUrl,
      config.dingtalkSecret,
    ));
  }

  if (notifiers.length === 0) return undefined;
  if (notifiers.length === 1) return notifiers[0];
  return new CompositeNotifier(notifiers);
}

function createLeadSyncer(config: ReturnType<typeof loadConfig>): FeishuLeadSyncer | undefined {
  if (
    !config.feishuAppId
    || !config.feishuAppSecret
    || !config.feishuBitableAppToken
    || !config.feishuLeadsTableId
  ) {
    return undefined;
  }

  return new FeishuLeadSyncer({
    client: new FeishuOpenPlatformClient({
      appId: config.feishuAppId,
      appSecret: config.feishuAppSecret,
      baseUrl: config.feishuBaseUrl,
    }),
    appToken: config.feishuBitableAppToken,
    tableId: config.feishuLeadsTableId,
  });
}

export function createApp(
  dependencies = createDefaultDependencies(),
  options: AppOptions = {},
) {
  const parser = new BasicTextParser();

  return async function handle(request: ApiRequest): Promise<ApiResponse> {
    try {
      if (request.method === 'GET' && request.path === '/health') {
        return json(200, { ok: true, service: 'api-service' });
      }

      requireAuthenticated(request, options.apiToken);

      if (request.method === 'POST' && request.path === '/projects/upsert') {
        const body = asObject(request.body);
        const project = await dependencies.projectStore.upsertProject({
          id: requireString(body, 'id'),
          name: requireString(body, 'name'),
          replyMode: optionalReplyMode(body, 'replyMode'),
          autoSendEnabled: optionalBoolean(body, 'autoSendEnabled', false),
          handoffEnabled: optionalBoolean(body, 'handoffEnabled', true),
          enabled: optionalBoolean(body, 'enabled', true),
        });
        await dependencies.logStore.createLog({
          projectId: project.id,
          level: 'info',
          type: 'project.upsert',
          message: `Project ${project.name} saved`,
        });
        return json(200, { project });
      }

      if (request.method === 'POST' && request.path === '/projects') {
        const projects = await dependencies.projectStore.listProjects();
        return json(200, { projects });
      }

      if (request.method === 'POST' && request.path === '/projects/get') {
        const body = asObject(request.body);
        const projectId = requireString(body, 'projectId');
        const project = await getProjectConfig(dependencies, projectId);
        return json(200, { project });
      }

      if (request.method === 'POST' && request.path === '/knowledge/documents/ingest') {
        const body = asObject(request.body);
        const documentId = optionalString(body, 'id') || randomUUID();
        const sourceType = requireSourceType(body);
        const result = await ingestKnowledgeDocument({
          input: {
            id: documentId,
            projectId: requireString(body, 'projectId'),
            title: requireString(body, 'title'),
            sourceType,
            content: requireString(body, 'content'),
            sourceUri: optionalString(body, 'sourceUri'),
            metadata: optionalRecord(body, 'metadata'),
          },
          parser,
          embeddingProvider: dependencies.embeddingProvider,
          store: dependencies.store,
        });

        return json(201, result);
      }

      if (request.method === 'POST' && request.path === '/knowledge/retrieve') {
        const body = asObject(request.body);
        const projectId = requireString(body, 'projectId');
        const query = requireString(body, 'query');
        const topK = optionalNumber(body, 'topK', 5);
        const [queryEmbedding] = await dependencies.embeddingProvider.embedTexts([query]);
        const hits = await dependencies.store.searchHybrid({
          query: {
            projectId,
            query,
            topK,
          },
          queryEmbedding,
        });

        return json(200, {
          hits,
          context: buildRetrievalContext(hits),
        });
      }

      if (request.method === 'POST' && request.path === '/channels/douyin/messages') {
        const batch = parseDouyinMessageBatch(request.body);
        const project = await getProjectConfig(dependencies, batch.projectId);
        if (!project.enabled) {
          throw new HttpError(409, 'Project is disabled');
        }
        const result = await dependencies.conversationStore.ingestDouyinMessages(batch, {
          replyMode: project.replyMode,
        });
        await dependencies.logStore.createLog({
          projectId: batch.projectId,
          level: result.inserted > 0 ? 'info' : 'warning',
          type: 'douyin.messages.ingest',
          message: `Received ${result.received} Douyin event(s), inserted ${result.inserted}`,
          metadata: result as unknown as Record<string, unknown>,
        });
        return json(202, result);
      }

      if (
        request.method === 'POST'
        && (request.path === '/channels/reviews' || request.path === '/channels/dianping/reviews')
      ) {
        const batch = parseReviewBatch(request.body);
        const project = await getProjectConfig(dependencies, batch.projectId);
        if (!project.enabled) {
          throw new HttpError(409, 'Project is disabled');
        }
        const result = await dependencies.reviewStore.ingestReviewBatch(batch, {
          replyMode: project.replyMode,
        });
        await dependencies.logStore.createLog({
          projectId: batch.projectId,
          level: result.inserted > 0 ? 'info' : 'warning',
          type: `${batch.source}.reviews.ingest`,
          message: `Received ${result.received} review event(s), inserted ${result.inserted}`,
          metadata: result as unknown as Record<string, unknown>,
        });
        return json(202, result);
      }

      if (request.method === 'POST' && request.path === '/agents/heartbeat') {
        if (!isAgentHeartbeat(request.body)) {
          throw new HttpError(400, 'Invalid agent heartbeat');
        }
        const status = await dependencies.agentStatusStore.upsertHeartbeat(request.body);
        return json(202, { status });
      }

      if (request.method === 'POST' && request.path === '/agents/status') {
        const body = asObject(request.body);
        const statuses = await dependencies.agentStatusStore.listStatuses(
          requireString(body, 'projectId'),
        );
        return json(200, { statuses });
      }

      if (request.method === 'POST' && request.path === '/conversations') {
        const body = asObject(request.body);
        const conversations = await dependencies.conversationStore.listConversations(
          requireString(body, 'projectId'),
        );
        return json(200, { conversations });
      }

      if (request.method === 'POST' && request.path === '/conversations/detail') {
        const body = asObject(request.body);
        const conversationId = requireString(body, 'conversationId');
        const conversation = await dependencies.conversationStore.getConversation(conversationId);
        if (!conversation) {
          throw new HttpError(404, 'Conversation not found');
        }
        const messages = await dependencies.conversationStore.listMessages(conversationId);
        return json(200, { conversation, messages });
      }

      if (request.method === 'POST' && request.path === '/conversations/handoff') {
        const body = asObject(request.body);
        const conversation = await dependencies.conversationStore.setConversationHandoff(
          requireString(body, 'conversationId'),
          optionalBoolean(body, 'handoff', true),
          optionalString(body, 'reason'),
        );
        await dependencies.logStore.createLog({
          projectId: conversation.projectId,
          level: conversation.handoff ? 'warning' : 'info',
          type: 'conversation.handoff',
          message: conversation.handoff
            ? `Conversation ${conversation.id} switched to handoff`
            : `Conversation ${conversation.id} resumed`,
          metadata: { reason: conversation.handoffReason },
        });
        return json(200, { conversation });
      }

      if (request.method === 'POST' && request.path === '/reply-tasks/pending') {
        const body = asObject(request.body);
        const tasks = await dependencies.conversationStore.listPendingReplyTasks(
          requireString(body, 'projectId'),
          optionalNumber(body, 'limit', 20),
        );
        return json(200, { tasks });
      }

      if (request.method === 'POST' && request.path === '/reply-tasks/list') {
        const body = asObject(request.body);
        const tasks = await dependencies.conversationStore.listReplyTasks(
          requireString(body, 'projectId'),
          optionalReplyTaskStatus(body, 'status'),
          optionalNumber(body, 'limit', 20),
        );
        return json(200, { tasks });
      }

      if (request.method === 'POST' && request.path === '/reply-tasks/generate') {
        const body = asObject(request.body);
        const task = await dependencies.conversationStore.getReplyTask(requireString(body, 'taskId'));
        if (!task) {
          throw new HttpError(404, 'Reply task not found');
        }
        const result = await generateReplyForTask(task, {
          conversationStore: dependencies.conversationStore,
          knowledgeStore: dependencies.store,
          embeddingProvider: dependencies.embeddingProvider,
          llmProvider: dependencies.llmProvider,
          leadStore: dependencies.leadStore,
          notifier: dependencies.notifier,
          leadSyncer: dependencies.leadSyncer,
        });
        await dependencies.logStore.createLog({
          projectId: task.projectId,
          level: result.handoff ? 'warning' : 'info',
          type: 'reply.generate',
          message: result.handoff
            ? `Reply task ${task.id} requires handoff`
            : `Reply task ${task.id} generated`,
          metadata: { handoff: result.handoff, leadId: result.lead?.id },
        });
        return json(200, result);
      }

      if (request.method === 'POST' && request.path === '/reply-tasks/queue-send') {
        const body = asObject(request.body);
        const task = await dependencies.conversationStore.queueReplyTask(
          requireString(body, 'taskId'),
          optionalString(body, 'replyText'),
        );
        await dependencies.logStore.createLog({
          projectId: task.projectId,
          level: 'info',
          type: 'reply.queue',
          message: `Reply task ${task.id} queued for sending`,
        });
        return json(200, { task });
      }

      if (request.method === 'POST' && request.path === '/reply-tasks/sendable') {
        const body = asObject(request.body);
        const tasks = await dependencies.conversationStore.listSendableReplyTasks(
          requireString(body, 'projectId'),
          optionalNumber(body, 'limit', 10),
        );
        return json(200, { tasks });
      }

      if (request.method === 'POST' && request.path === '/reply-tasks/send-result') {
        const body = asObject(request.body);
        const task = await dependencies.conversationStore.recordReplySendResult({
          taskId: requireString(body, 'taskId'),
          success: optionalBoolean(body, 'success', false),
          sentAt: optionalString(body, 'sentAt') || new Date().toISOString(),
          errorMessage: optionalString(body, 'errorMessage'),
        });
        await dependencies.logStore.createLog({
          projectId: task.projectId,
          level: task.status === 'sent' ? 'info' : 'error',
          type: 'reply.send_result',
          message: task.status === 'sent'
            ? `Reply task ${task.id} sent`
            : `Reply task ${task.id} send failed`,
          metadata: { errorMessage: task.errorMessage },
        });
        return json(200, { task });
      }

      if (request.method === 'POST' && request.path === '/leads') {
        const body = asObject(request.body);
        const leads = await dependencies.leadStore.listLeads(requireString(body, 'projectId'));
        return json(200, { leads });
      }

      if (request.method === 'POST' && request.path === '/reviews/list') {
        const body = asObject(request.body);
        const reviews = await dependencies.reviewStore.listReviews({
          projectId: requireString(body, 'projectId'),
          source: optionalReviewSource(body, 'source'),
          limit: optionalNumber(body, 'limit', 50),
        });
        return json(200, { reviews });
      }

      if (request.method === 'POST' && request.path === '/review-reply-tasks/pending') {
        const body = asObject(request.body);
        const tasks = await dependencies.reviewStore.listReplyTasks({
          projectId: requireString(body, 'projectId'),
          status: 'pending',
          limit: optionalNumber(body, 'limit', 20),
        });
        return json(200, { tasks });
      }

      if (request.method === 'POST' && request.path === '/review-reply-tasks/list') {
        const body = asObject(request.body);
        const tasks = await dependencies.reviewStore.listReplyTasks({
          projectId: requireString(body, 'projectId'),
          status: optionalReplyTaskStatus(body, 'status'),
          limit: optionalNumber(body, 'limit', 20),
        });
        return json(200, { tasks });
      }

      if (request.method === 'POST' && request.path === '/review-reply-tasks/generate') {
        const body = asObject(request.body);
        const task = await dependencies.reviewStore.getReplyTask(requireString(body, 'taskId'));
        if (!task) {
          throw new HttpError(404, 'Review reply task not found');
        }
        const result = await generateReviewReplyForTask(task, {
          reviewStore: dependencies.reviewStore,
          llmProvider: dependencies.llmProvider,
        });
        await dependencies.logStore.createLog({
          projectId: task.projectId,
          level: 'info',
          type: 'review.reply.generate',
          message: `Review reply task ${task.id} generated`,
          metadata: { reviewId: task.reviewId, source: task.source },
        });
        return json(200, result);
      }

      if (request.method === 'POST' && request.path === '/review-reply-tasks/queue-send') {
        const body = asObject(request.body);
        const task = await dependencies.reviewStore.queueReplyTask(
          requireString(body, 'taskId'),
          optionalString(body, 'replyText'),
        );
        await dependencies.logStore.createLog({
          projectId: task.projectId,
          level: 'info',
          type: 'review.reply.queue',
          message: `Review reply task ${task.id} queued for sending`,
        });
        return json(200, { task });
      }

      if (request.method === 'POST' && request.path === '/review-reply-tasks/sendable') {
        const body = asObject(request.body);
        const tasks = await dependencies.reviewStore.listSendableReplyTasks({
          projectId: requireString(body, 'projectId'),
          source: optionalReviewSource(body, 'source'),
          limit: optionalNumber(body, 'limit', 10),
        });
        return json(200, { tasks });
      }

      if (request.method === 'POST' && request.path === '/review-reply-tasks/send-result') {
        const body = asObject(request.body);
        const task = await dependencies.reviewStore.recordReplySendResult({
          taskId: requireString(body, 'taskId'),
          success: optionalBoolean(body, 'success', false),
          sentAt: optionalString(body, 'sentAt') || new Date().toISOString(),
          replyText: optionalString(body, 'replyText'),
          errorMessage: optionalString(body, 'errorMessage'),
        });
        await dependencies.logStore.createLog({
          projectId: task.projectId,
          level: task.status === 'sent' ? 'info' : 'error',
          type: 'review.reply.send_result',
          message: task.status === 'sent'
            ? `Review reply task ${task.id} sent`
            : `Review reply task ${task.id} send failed`,
          metadata: { errorMessage: task.errorMessage, source: task.source },
        });
        return json(200, { task });
      }

      if (request.method === 'POST' && request.path === '/review-reports/generate') {
        const body = asObject(request.body);
        const report = await generateReviewReport({
          projectId: requireString(body, 'projectId'),
          source: optionalReviewSource(body, 'source') || 'dianping',
          period: requireReviewReportPeriod(body, 'period'),
          date: optionalString(body, 'date'),
          reviewStore: dependencies.reviewStore,
        });
        await dependencies.logStore.createLog({
          projectId: report.projectId,
          level: 'info',
          type: 'review.report.generate',
          message: `${report.source} ${report.period} review report generated`,
          metadata: { reportId: report.id, reviewCount: report.reviewCount },
        });
        return json(200, { report });
      }

      if (request.method === 'POST' && request.path === '/review-reports/list') {
        const body = asObject(request.body);
        const reports = await dependencies.reviewStore.listReports({
          projectId: requireString(body, 'projectId'),
          source: optionalReviewSource(body, 'source'),
          period: optionalReviewReportPeriod(body, 'period'),
          limit: optionalNumber(body, 'limit', 20),
        });
        return json(200, { reports });
      }

      if (request.method === 'POST' && request.path === '/leads/update-status') {
        const body = asObject(request.body);
        const lead = await dependencies.leadStore.updateLeadStatus(
          requireString(body, 'leadId'),
          requireLeadStatus(body, 'status'),
        );
        await dependencies.logStore.createLog({
          projectId: lead.projectId,
          level: 'info',
          type: 'lead.status_update',
          message: `Lead ${lead.id} status changed to ${lead.status}`,
        });
        return json(200, { lead });
      }

      if (request.method === 'POST' && request.path === '/integrations/feishu/sync-lead-status') {
        const body = asObject(request.body);
        const projectId = requireString(body, 'projectId');
        if (!dependencies.leadSyncer) {
          throw new HttpError(409, 'Feishu lead syncer is not configured');
        }
        const updates = await dependencies.leadSyncer.listLeadStatusUpdates();
        const updated = [];
        for (const update of updates) {
          const lead = await dependencies.leadStore.getLead(update.leadId);
          if (!lead || lead.projectId !== projectId || lead.status === update.status) continue;
          updated.push(await dependencies.leadStore.updateLeadStatus(update.leadId, update.status));
        }
        await dependencies.logStore.createLog({
          projectId,
          level: 'info',
          type: 'feishu.lead_status_sync',
          message: `Synced ${updated.length} lead status update(s) from Feishu`,
        });
        return json(200, { updated });
      }

      if (request.method === 'POST' && request.path === '/logs') {
        const body = asObject(request.body);
        const logs = await dependencies.logStore.listLogs(
          requireString(body, 'projectId'),
          optionalNumber(body, 'limit', 50),
        );
        return json(200, { logs });
      }

      if (request.method === 'POST' && request.path === '/ops/overview') {
        const body = asObject(request.body);
        const projectId = requireString(body, 'projectId');
        const [conversations, leads, pending, queued, reviews, reviewTasks, agents, logs] = await Promise.all([
          dependencies.conversationStore.listConversations(projectId),
          dependencies.leadStore.listLeads(projectId),
          dependencies.conversationStore.listReplyTasks(projectId, 'pending', 1000),
          dependencies.conversationStore.listReplyTasks(projectId, 'queued', 1000),
          dependencies.reviewStore.listReviews({ projectId, limit: 1000 }),
          dependencies.reviewStore.listReplyTasks({ projectId, status: 'pending', limit: 1000 }),
          dependencies.agentStatusStore.listStatuses(projectId),
          dependencies.logStore.listLogs(projectId, 10),
        ]);
        return json(200, {
          overview: {
            projectId,
            conversations: conversations.length,
            leads: leads.length,
            pendingReplyTasks: pending.length,
            queuedReplyTasks: queued.length,
            reviews: reviews.length,
            pendingReviewReplyTasks: reviewTasks.length,
            staleAgents: agents.filter(agent => agent.stale).length,
            recentWarnings: logs.filter(log => log.level !== 'info').length,
          },
        });
      }

      return json(404, { error: 'Not found' });
    } catch (error) {
      if (error instanceof HttpError) {
        return json(error.status, { error: error.message });
      }
      return json(500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

async function getProjectConfig(
  dependencies: Pick<AppDependencies, 'projectStore'>,
  projectId: string,
) {
  return (await dependencies.projectStore.getProject(projectId)) || defaultProjectConfig(projectId);
}

function parseDouyinMessageBatch(value: unknown): DouyinMessageBatch {
  const body = asObject(value);
  const projectId = requireString(body, 'projectId');
  const capturedAt = requireString(body, 'capturedAt');
  const events = body.events;

  if (!Array.isArray(events)) {
    throw new HttpError(400, 'Field must be an array: events');
  }

  const parsedEvents = events.map(event => {
    if (!isDouyinMessageEvent(event)) {
      throw new HttpError(400, 'Invalid Douyin message event');
    }
    return event;
  });

  return {
    schemaVersion: 1,
    source: 'douyin',
    projectId,
    capturedAt,
    count: parsedEvents.length,
    events: parsedEvents,
  };
}

function parseReviewBatch(value: unknown): ReviewBatch {
  const body = asObject(value);
  const source = requireReviewSource(body, 'source');
  const projectId = requireString(body, 'projectId');
  const capturedAt = requireString(body, 'capturedAt');
  const events = body.events;

  if (!Array.isArray(events)) {
    throw new HttpError(400, 'Field must be an array: events');
  }

  const parsedEvents = events.map(event => {
    if (!isReviewEvent(event)) {
      throw new HttpError(400, 'Invalid review event');
    }
    if (event.source !== source) {
      throw new HttpError(400, 'Review event source mismatch');
    }
    return event;
  });

  return {
    schemaVersion: 1,
    source,
    projectId,
    capturedAt,
    count: parsedEvents.length,
    events: parsedEvents,
  };
}

function json(status: number, body: unknown): ApiResponse {
  return { status, body };
}

function requireAuthenticated(request: ApiRequest, apiToken: string | undefined): void {
  if (!apiToken) return;
  const authorization = getHeader(request.headers, 'authorization');
  if (authorization !== `Bearer ${apiToken}`) {
    throw new HttpError(401, 'Unauthorized');
  }
}

function requireSourceType(body: Record<string, unknown>): KnowledgeDocument['sourceType'] {
  const value = requireString(body, 'sourceType');
  const allowed: KnowledgeDocument['sourceType'][] = [
    'pdf',
    'docx',
    'xlsx',
    'pptx',
    'markdown',
    'html',
    'text',
    'manual',
  ];
  if (!allowed.includes(value as KnowledgeDocument['sourceType'])) {
    throw new HttpError(400, `Unsupported sourceType: ${value}`);
  }
  return value as KnowledgeDocument['sourceType'];
}

function requireReviewSource(body: Record<string, unknown>, key: string): ReviewSource {
  const value = requireString(body, key);
  if (value !== 'dianping') {
    throw new HttpError(400, `Unsupported review source: ${value}`);
  }
  return value;
}

function optionalReviewSource(body: Record<string, unknown>, key: string): ReviewSource | undefined {
  const value = optionalString(body, key);
  if (!value) return undefined;
  if (value !== 'dianping') {
    throw new HttpError(400, `Unsupported review source: ${value}`);
  }
  return value;
}

function requireReviewReportPeriod(body: Record<string, unknown>, key: string): ReviewReportPeriod {
  const value = requireString(body, key);
  if (value !== 'daily' && value !== 'monthly') {
    throw new HttpError(400, `Unsupported review report period: ${value}`);
  }
  return value;
}

function optionalReviewReportPeriod(
  body: Record<string, unknown>,
  key: string,
): ReviewReportPeriod | undefined {
  const value = optionalString(body, key);
  if (!value) return undefined;
  if (value !== 'daily' && value !== 'monthly') {
    throw new HttpError(400, `Unsupported review report period: ${value}`);
  }
  return value;
}

function optionalReplyMode(body: Record<string, unknown>, key: string): ReplyMode | undefined {
  const value = optionalString(body, key);
  if (!value) return undefined;
  if (value !== 'readonly' && value !== 'assisted' && value !== 'auto') {
    throw new HttpError(400, `Unsupported replyMode: ${value}`);
  }
  return value;
}

function optionalReplyTaskStatus(
  body: Record<string, unknown>,
  key: string,
): ReplyTaskStatus | undefined {
  const value = optionalString(body, key);
  if (!value) return undefined;
  const allowed: ReplyTaskStatus[] = [
    'pending',
    'processing',
    'suggested',
    'queued',
    'sending',
    'sent',
    'handoff',
    'failed',
  ];
  if (!allowed.includes(value as ReplyTaskStatus)) {
    throw new HttpError(400, `Unsupported reply task status: ${value}`);
  }
  return value as ReplyTaskStatus;
}

function requireLeadStatus(body: Record<string, unknown>, key: string): LeadStatus {
  const value = requireString(body, key);
  const allowed: LeadStatus[] = [
    'new',
    'chatting',
    'contact_pending',
    'contacted',
    'qualified',
    'invited',
    'visited',
    'deal',
    'invalid',
    'lost',
  ];
  if (!allowed.includes(value as LeadStatus)) {
    throw new HttpError(400, `Unsupported lead status: ${value}`);
  }
  return value as LeadStatus;
}
