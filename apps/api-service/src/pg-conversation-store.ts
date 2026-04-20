import {
  DouyinMessageBatch,
  DouyinMessageEvent,
  MessageIngestionResult,
  ReplyMode,
  ReplySendResult,
  SendableReplyTask,
  ReplyTask,
} from '@ai-zhaoshang/shared';
import { Pool, PoolConfig } from 'pg';
import {
  ConversationStore,
  StoredChannelMessage,
  StoredConversation,
} from './conversation-store';

export class PgConversationStore implements ConversationStore {
  private pool: Pool;

  constructor(poolConfig: PoolConfig) {
    this.pool = new Pool(poolConfig);
  }

  async ingestDouyinMessages(
    batch: DouyinMessageBatch,
    options: { replyMode?: ReplyMode } = {},
  ): Promise<MessageIngestionResult> {
    let inserted = 0;
    let duplicates = 0;

    for (const event of batch.events) {
      const existingMessage = await this.pool.query('select 1 from channel_messages where id = $1', [event.id]);
      if ((existingMessage.rowCount || 0) > 0) {
        duplicates += 1;
        continue;
      }

      const conversationId = makeConversationId(batch.projectId, event);
      const result = await this.pool.query(
        `
          insert into conversations (
            id, project_id, source, session_name, last_message, last_message_at, message_count, updated_at
          )
          values ($1, $2, 'douyin', $3, $4, $5, 1, now())
          on conflict (id) do update set
            last_message = excluded.last_message,
            last_message_at = excluded.last_message_at,
            message_count = conversations.message_count + 1,
            updated_at = now()
        `,
        [conversationId, batch.projectId, event.session.name, event.message.text, event.capturedAt],
      );
      void result;

      const messageInsert = await this.pool.query(
        `
          insert into channel_messages (
            id, conversation_id, project_id, source, direction, text, captured_at, message_time, raw_html
          )
          values ($1, $2, $3, 'douyin', $4, $5, $6, $7, $8)
          on conflict (id) do nothing
        `,
        [
          event.id,
          conversationId,
          batch.projectId,
          event.message.direction,
          event.message.text,
          event.capturedAt,
          event.message.time || null,
          event.message.rawHtml || null,
        ],
      );

      if (messageInsert.rowCount === 0) {
        duplicates += 1;
        continue;
      }

      inserted += 1;
      if (event.message.direction === 'incoming') {
        await this.pool.query(
          `
            insert into reply_tasks (
              id, project_id, conversation_id, message_id, status, mode
            )
            values ($1, $2, $3, $4, 'pending', $5)
            on conflict (id) do nothing
          `,
          [`reply_task_${event.id}`, batch.projectId, conversationId, event.id, options.replyMode || getReplyMode()],
        );
      }
    }

    const counts = await this.pool.query<{ conversation_count: string; message_count: string }>(
      `
        select
          (select count(*) from conversations where project_id = $1) as conversation_count,
          (select count(*) from channel_messages where project_id = $1) as message_count
      `,
      [batch.projectId],
    );

    return {
      projectId: batch.projectId,
      source: 'douyin',
      received: batch.events.length,
      inserted,
      duplicates,
      conversationCount: Number(counts.rows[0]?.conversation_count || 0),
      messageCount: Number(counts.rows[0]?.message_count || 0),
    };
  }

  async listConversations(projectId: string): Promise<StoredConversation[]> {
    const result = await this.pool.query<{
      id: string;
      project_id: string;
      source: 'douyin';
      session_name: string;
      last_message: string;
      last_message_at: Date;
      message_count: number;
      handoff: boolean;
      handoff_reason?: string;
    }>(
      `
        select *
        from conversations
        where project_id = $1
        order by last_message_at desc
      `,
      [projectId],
    );
    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      source: row.source,
      sessionName: row.session_name,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at.toISOString(),
      messageCount: row.message_count,
      handoff: row.handoff,
      handoffReason: row.handoff_reason || undefined,
    }));
  }

  async getConversation(conversationId: string): Promise<StoredConversation | undefined> {
    const result = await this.pool.query<{
      id: string;
      project_id: string;
      source: 'douyin';
      session_name: string;
      last_message: string;
      last_message_at: Date;
      message_count: number;
      handoff: boolean;
      handoff_reason?: string;
    }>('select * from conversations where id = $1', [conversationId]);
    const row = result.rows[0];
    return row ? {
      id: row.id,
      projectId: row.project_id,
      source: row.source,
      sessionName: row.session_name,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at.toISOString(),
      messageCount: row.message_count,
      handoff: row.handoff,
      handoffReason: row.handoff_reason || undefined,
    } : undefined;
  }

  async listMessages(conversationId: string): Promise<StoredChannelMessage[]> {
    const result = await this.pool.query<{
      id: string;
      conversation_id: string;
      project_id: string;
      source: 'douyin';
      direction: StoredChannelMessage['direction'];
      text: string;
      captured_at: Date;
      message_time?: string;
      raw_html?: string;
    }>(
      `
        select *
        from channel_messages
        where conversation_id = $1
        order by captured_at asc
      `,
      [conversationId],
    );
    return result.rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      projectId: row.project_id,
      source: row.source,
      direction: row.direction,
      text: row.text,
      capturedAt: row.captured_at.toISOString(),
      time: row.message_time,
      rawHtml: row.raw_html,
    }));
  }

  async listPendingReplyTasks(projectId: string, limit: number): Promise<ReplyTask[]> {
    return this.listReplyTasks(projectId, 'pending', limit);
  }

  async listReplyTasks(
    projectId: string,
    status: ReplyTask['status'] | undefined,
    limit: number,
  ): Promise<ReplyTask[]> {
    const result = status
      ? await this.pool.query(
        'select * from reply_tasks where project_id = $1 and status = $2 order by created_at asc limit $3',
        [projectId, status, limit],
      )
      : await this.pool.query(
        'select * from reply_tasks where project_id = $1 order by created_at desc limit $2',
        [projectId, limit],
      );
    return result.rows.map(rowToReplyTask);
  }

  async listSendableReplyTasks(projectId: string, limit: number): Promise<SendableReplyTask[]> {
    const result = await this.pool.query(
      `
        select
          rt.*,
          c.source,
          c.session_name
        from reply_tasks rt
        join conversations c on c.id = rt.conversation_id
        where rt.project_id = $1
          and rt.status = 'queued'
          and rt.suggested_reply is not null
          and c.handoff = false
        order by rt.updated_at asc
        limit $2
      `,
      [projectId, limit],
    );
    return result.rows.map(row => ({
      ...rowToReplyTask(row),
      source: row.source,
      sessionName: row.session_name,
      replyText: row.suggested_reply,
    }));
  }

  async getReplyTask(taskId: string): Promise<ReplyTask | undefined> {
    const result = await this.pool.query('select * from reply_tasks where id = $1', [taskId]);
    return result.rows[0] ? rowToReplyTask(result.rows[0]) : undefined;
  }

  async updateReplyTask(taskId: string, patch: Partial<ReplyTask>): Promise<ReplyTask> {
    const result = await this.pool.query(
      `
        update reply_tasks set
          status = coalesce($2, status),
          mode = coalesce($3, mode),
          suggested_reply = coalesce($4, suggested_reply),
          handoff_reason = coalesce($5, handoff_reason),
          error_message = coalesce($6, error_message),
          sent_at = coalesce($7, sent_at),
          updated_at = now()
        where id = $1
        returning *
      `,
      [
        taskId,
        patch.status || null,
        patch.mode || null,
        patch.suggestedReply || null,
        patch.handoffReason || null,
        patch.errorMessage || null,
        patch.sentAt || null,
      ],
    );
    if (!result.rows[0]) throw new Error(`Reply task not found: ${taskId}`);
    return rowToReplyTask(result.rows[0]);
  }

  async queueReplyTask(taskId: string, replyText?: string): Promise<ReplyTask> {
    const current = await this.getReplyTask(taskId);
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
    const result = await this.pool.query(
      `
        update conversations set
          handoff = $2,
          handoff_reason = $3,
          updated_at = now()
        where id = $1
        returning *
      `,
      [conversationId, handoff, handoff ? reason || null : null],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Conversation not found: ${conversationId}`);
    return {
      id: row.id,
      projectId: row.project_id,
      source: row.source,
      sessionName: row.session_name,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at instanceof Date ? row.last_message_at.toISOString() : row.last_message_at,
      messageCount: row.message_count,
      handoff: row.handoff,
      handoffReason: row.handoff_reason || undefined,
    };
  }
}

function makeConversationId(projectId: string, event: DouyinMessageEvent): string {
  return `douyin:${projectId}:${event.session.name}`;
}

function getReplyMode(): ReplyMode {
  const mode = process.env.REPLY_MODE;
  return mode === 'assisted' || mode === 'auto' ? mode : 'readonly';
}

function rowToReplyTask(row: any): ReplyTask {
  return {
    id: row.id,
    projectId: row.project_id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    status: row.status,
    mode: row.mode,
    suggestedReply: row.suggested_reply || undefined,
    handoffReason: row.handoff_reason || undefined,
    errorMessage: row.error_message || undefined,
    sentAt: row.sent_at
      ? row.sent_at instanceof Date ? row.sent_at.toISOString() : row.sent_at
      : undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
