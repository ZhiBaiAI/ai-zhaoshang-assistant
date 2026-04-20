import {
  DouyinMessageBatch,
  DouyinMessageEvent,
  MessageIngestionResult,
  ReplyMode,
  ReplySendResult,
  SendableReplyTask,
  ReplyTask,
} from '@ai-zhaoshang/shared';

export interface StoredConversation {
  id: string;
  projectId: string;
  source: 'douyin';
  sessionName: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  handoff: boolean;
  handoffReason?: string;
}

export interface StoredChannelMessage {
  id: string;
  conversationId: string;
  projectId: string;
  source: 'douyin';
  direction: DouyinMessageEvent['message']['direction'];
  text: string;
  capturedAt: string;
  time?: string;
  rawHtml?: string;
}

export interface ConversationStore {
  ingestDouyinMessages(batch: DouyinMessageBatch, options?: { replyMode?: ReplyMode }): Promise<MessageIngestionResult>;
  listConversations(projectId: string): Promise<StoredConversation[]>;
  getConversation(conversationId: string): Promise<StoredConversation | undefined>;
  listMessages(conversationId: string): Promise<StoredChannelMessage[]>;
  listPendingReplyTasks(projectId: string, limit: number): Promise<ReplyTask[]>;
  listReplyTasks(projectId: string, status: ReplyTask['status'] | undefined, limit: number): Promise<ReplyTask[]>;
  listSendableReplyTasks(projectId: string, limit: number): Promise<SendableReplyTask[]>;
  getReplyTask(taskId: string): Promise<ReplyTask | undefined>;
  updateReplyTask(taskId: string, patch: Partial<ReplyTask>): Promise<ReplyTask>;
  queueReplyTask(taskId: string, replyText?: string): Promise<ReplyTask>;
  recordReplySendResult(result: ReplySendResult): Promise<ReplyTask>;
  setConversationHandoff(conversationId: string, handoff: boolean, reason?: string): Promise<StoredConversation>;
}

export class MemoryConversationStore implements ConversationStore {
  private conversations = new Map<string, StoredConversation>();
  private messages = new Map<string, StoredChannelMessage>();
  private replyTasks = new Map<string, ReplyTask>();

  async ingestDouyinMessages(
    batch: DouyinMessageBatch,
    options: { replyMode?: ReplyMode } = {},
  ): Promise<MessageIngestionResult> {
    let inserted = 0;
    let duplicates = 0;

    for (const event of batch.events) {
      if (this.messages.has(event.id)) {
        duplicates += 1;
        continue;
      }

      const conversationId = makeConversationId(batch.projectId, event);
      const current = this.conversations.get(conversationId);
      const nextConversation: StoredConversation = {
        id: conversationId,
        projectId: batch.projectId,
        source: 'douyin',
        sessionName: event.session.name,
        lastMessage: event.message.text,
        lastMessageAt: event.capturedAt,
        messageCount: (current?.messageCount || 0) + 1,
        handoff: current?.handoff || false,
        handoffReason: current?.handoffReason,
      };
      this.conversations.set(conversationId, nextConversation);
      this.messages.set(event.id, {
        id: event.id,
        conversationId,
        projectId: batch.projectId,
        source: 'douyin',
        direction: event.message.direction,
        text: event.message.text,
        capturedAt: event.capturedAt,
        time: event.message.time,
        rawHtml: event.message.rawHtml,
      });
      if (event.message.direction === 'incoming') {
        const now = new Date().toISOString();
        const taskId = `reply_task_${event.id}`;
        this.replyTasks.set(taskId, {
          id: taskId,
          projectId: batch.projectId,
          conversationId,
          messageId: event.id,
          status: 'pending',
          mode: options.replyMode || getReplyMode(),
          createdAt: now,
          updatedAt: now,
        });
      }
      inserted += 1;
    }

    return {
      projectId: batch.projectId,
      source: 'douyin',
      received: batch.events.length,
      inserted,
      duplicates,
      conversationCount: this.conversations.size,
      messageCount: this.messages.size,
    };
  }

  async listConversations(projectId: string): Promise<StoredConversation[]> {
    return [...this.conversations.values()]
      .filter(conversation => conversation.projectId === projectId)
      .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
  }

  async getConversation(conversationId: string): Promise<StoredConversation | undefined> {
    return this.conversations.get(conversationId);
  }

  async listMessages(conversationId: string): Promise<StoredChannelMessage[]> {
    return [...this.messages.values()]
      .filter(message => message.conversationId === conversationId)
      .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt));
  }

  async listPendingReplyTasks(projectId: string, limit: number): Promise<ReplyTask[]> {
    return this.listReplyTasks(projectId, 'pending', limit);
  }

  async listReplyTasks(
    projectId: string,
    status: ReplyTask['status'] | undefined,
    limit: number,
  ): Promise<ReplyTask[]> {
    return [...this.replyTasks.values()]
      .filter(task => task.projectId === projectId && (!status || task.status === status))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);
  }

  async listSendableReplyTasks(projectId: string, limit: number): Promise<SendableReplyTask[]> {
    return [...this.replyTasks.values()]
      .filter(task => task.projectId === projectId && task.status === 'queued' && Boolean(task.suggestedReply))
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      .slice(0, limit)
      .map(task => {
        const conversation = this.conversations.get(task.conversationId);
        return {
          ...task,
          source: 'douyin' as const,
          sessionName: conversation?.sessionName || '',
          replyText: task.suggestedReply || '',
        };
      })
      .filter(task => task.sessionName && task.replyText);
  }

  async getReplyTask(taskId: string): Promise<ReplyTask | undefined> {
    return this.replyTasks.get(taskId);
  }

  async updateReplyTask(taskId: string, patch: Partial<ReplyTask>): Promise<ReplyTask> {
    const current = this.replyTasks.get(taskId);
    if (!current) throw new Error(`Reply task not found: ${taskId}`);
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.replyTasks.set(taskId, updated);
    return updated;
  }

  async queueReplyTask(taskId: string, replyText?: string): Promise<ReplyTask> {
    const current = this.replyTasks.get(taskId);
    if (!current) throw new Error(`Reply task not found: ${taskId}`);
    const finalReply = replyText || current.suggestedReply;
    if (!finalReply) throw new Error(`Reply task has no reply text: ${taskId}`);
    return this.updateReplyTask(taskId, {
      status: 'queued',
      suggestedReply: finalReply,
    });
  }

  async recordReplySendResult(result: ReplySendResult): Promise<ReplyTask> {
    return this.updateReplyTask(result.taskId, result.success
      ? {
        status: 'sent',
        sentAt: result.sentAt,
        errorMessage: undefined,
      }
      : {
        status: 'failed',
        errorMessage: result.errorMessage || 'Reply send failed',
      });
  }

  async setConversationHandoff(
    conversationId: string,
    handoff: boolean,
    reason?: string,
  ): Promise<StoredConversation> {
    const current = this.conversations.get(conversationId);
    if (!current) throw new Error(`Conversation not found: ${conversationId}`);
    const updated: StoredConversation = {
      ...current,
      handoff,
      handoffReason: handoff ? reason : undefined,
    };
    this.conversations.set(conversationId, updated);
    return updated;
  }
}

function makeConversationId(projectId: string, event: DouyinMessageEvent): string {
  return `douyin:${projectId}:${event.session.name}`;
}

function getReplyMode(): ReplyMode {
  const mode = process.env.REPLY_MODE;
  return mode === 'assisted' || mode === 'auto' ? mode : 'readonly';
}
