import {
  ReviewBatch,
  ReviewIngestionResult,
  ReviewReport,
  ReviewReportPeriod,
  ReviewReplySendResult,
  ReviewReplyTask,
  ReviewSource,
  SendableReviewReplyTask,
  StoredReview,
} from '@ai-zhaoshang/shared';
import { ReplyMode } from '@ai-zhaoshang/shared';
import { Pool, PoolConfig } from 'pg';
import {
  detectReviewSentiment,
  makeReviewInternalId,
  makeReviewReplyTaskId,
} from './review-analysis';
import { ReviewStore } from './review-store';

export class PgReviewStore implements ReviewStore {
  private pool: Pool;

  constructor(poolConfig: PoolConfig) {
    this.pool = new Pool(poolConfig);
  }

  async ingestReviewBatch(
    batch: ReviewBatch,
    options: { replyMode?: ReplyMode } = {},
  ): Promise<ReviewIngestionResult> {
    let inserted = 0;
    let duplicates = 0;

    for (const event of batch.events) {
      const id = makeReviewInternalId(batch.projectId, event.source, event.reviewId);
      const result = await this.pool.query(
        `
          insert into reviews (
            id, project_id, source, shop_id, shop_name, review_id, author_name, rating,
            content, sentiment, review_time, captured_at, url, metadata, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
          on conflict (project_id, source, review_id) do nothing
        `,
        [
          id,
          batch.projectId,
          event.source,
          event.shopId,
          event.shopName,
          event.reviewId,
          event.authorName,
          event.rating || null,
          event.content,
          detectReviewSentiment({ content: event.content, rating: event.rating }),
          event.reviewTime,
          event.capturedAt,
          event.url || null,
          event.metadata || {},
        ],
      );

      if (result.rowCount === 0) {
        duplicates += 1;
        continue;
      }

      inserted += 1;
      await this.pool.query(
        `
          insert into review_reply_tasks (
            id, project_id, source, review_id, status, mode
          )
          values ($1, $2, $3, $4, 'pending', $5)
          on conflict (id) do nothing
        `,
        [makeReviewReplyTaskId(id), batch.projectId, event.source, id, options.replyMode || getReplyMode()],
      );
    }

    const counts = await this.pool.query<{ review_count: string; task_count: string }>(
      `
        select
          (select count(*) from reviews where project_id = $1 and source = $2) as review_count,
          (select count(*) from review_reply_tasks where project_id = $1 and source = $2) as task_count
      `,
      [batch.projectId, batch.source],
    );

    return {
      projectId: batch.projectId,
      source: batch.source,
      received: batch.events.length,
      inserted,
      duplicates,
      reviewCount: Number(counts.rows[0]?.review_count || 0),
      replyTaskCount: Number(counts.rows[0]?.task_count || 0),
    };
  }

  async listReviews(input: { projectId: string; source?: ReviewSource; limit: number }): Promise<StoredReview[]> {
    const result = input.source
      ? await this.pool.query(
        'select * from reviews where project_id = $1 and source = $2 order by review_time desc limit $3',
        [input.projectId, input.source, input.limit],
      )
      : await this.pool.query(
        'select * from reviews where project_id = $1 order by review_time desc limit $2',
        [input.projectId, input.limit],
      );
    return result.rows.map(rowToReview);
  }

  async listReviewsInRange(input: {
    projectId: string;
    source: ReviewSource;
    periodStart: string;
    periodEnd: string;
  }): Promise<StoredReview[]> {
    const result = await this.pool.query(
      `
        select *
        from reviews
        where project_id = $1
          and source = $2
          and review_time >= $3
          and review_time < $4
        order by review_time asc
      `,
      [input.projectId, input.source, input.periodStart, input.periodEnd],
    );
    return result.rows.map(rowToReview);
  }

  async listReplyTasks(input: {
    projectId: string;
    status?: ReviewReplyTask['status'];
    limit: number;
  }): Promise<ReviewReplyTask[]> {
    const result = input.status
      ? await this.pool.query(
        'select * from review_reply_tasks where project_id = $1 and status = $2 order by created_at asc limit $3',
        [input.projectId, input.status, input.limit],
      )
      : await this.pool.query(
        'select * from review_reply_tasks where project_id = $1 order by created_at desc limit $2',
        [input.projectId, input.limit],
      );
    return result.rows.map(rowToTask);
  }

  async listSendableReplyTasks(input: {
    projectId: string;
    source?: ReviewSource;
    limit: number;
  }): Promise<SendableReviewReplyTask[]> {
    const result = await this.pool.query(
      `
        select
          task.*,
          review.shop_name,
          review.author_name,
          review.content
        from review_reply_tasks task
        join reviews review on review.id = task.review_id
        where task.project_id = $1
          and task.status = 'queued'
          and task.suggested_reply is not null
          and ($2::text is null or task.source = $2)
        order by task.updated_at asc
        limit $3
      `,
      [input.projectId, input.source || null, input.limit],
    );
    return result.rows.map(row => ({
      ...rowToTask(row),
      shopName: row.shop_name,
      authorName: row.author_name,
      reviewContent: row.content,
      replyText: row.suggested_reply,
    }));
  }

  async getReplyTask(taskId: string): Promise<ReviewReplyTask | undefined> {
    const result = await this.pool.query('select * from review_reply_tasks where id = $1', [taskId]);
    return result.rows[0] ? rowToTask(result.rows[0]) : undefined;
  }

  async getReview(reviewInternalId: string): Promise<StoredReview | undefined> {
    const result = await this.pool.query('select * from reviews where id = $1', [reviewInternalId]);
    return result.rows[0] ? rowToReview(result.rows[0]) : undefined;
  }

  async updateReplyTask(taskId: string, patch: Partial<ReviewReplyTask>): Promise<ReviewReplyTask> {
    const result = await this.pool.query(
      `
        update review_reply_tasks set
          status = coalesce($2, status),
          mode = coalesce($3, mode),
          suggested_reply = coalesce($4, suggested_reply),
          error_message = coalesce($5, error_message),
          sent_at = coalesce($6, sent_at),
          updated_at = now()
        where id = $1
        returning *
      `,
      [
        taskId,
        patch.status || null,
        patch.mode || null,
        patch.suggestedReply || null,
        patch.errorMessage || null,
        patch.sentAt || null,
      ],
    );
    if (!result.rows[0]) throw new Error(`Review reply task not found: ${taskId}`);
    return rowToTask(result.rows[0]);
  }

  async queueReplyTask(taskId: string, replyText?: string): Promise<ReviewReplyTask> {
    const current = await this.getReplyTask(taskId);
    if (!current) throw new Error(`Review reply task not found: ${taskId}`);
    const finalReply = replyText || current.suggestedReply;
    if (!finalReply) throw new Error(`Review reply task has no reply text: ${taskId}`);
    return this.updateReplyTask(taskId, {
      status: 'queued',
      suggestedReply: finalReply,
    });
  }

  async recordReplySendResult(result: ReviewReplySendResult): Promise<ReviewReplyTask> {
    const updated = await this.updateReplyTask(result.taskId, result.success
      ? {
        status: 'sent',
        sentAt: result.sentAt,
        errorMessage: undefined,
      }
      : {
        status: 'failed',
        errorMessage: result.errorMessage || 'Review reply send failed',
      });

    if (result.success) {
      await this.pool.query(
        `
          update reviews set
            replied = true,
            reply_text = $2,
            updated_at = now()
          where id = $1
        `,
        [updated.reviewId, result.replyText || updated.suggestedReply || null],
      );
    }

    return updated;
  }

  async saveReport(report: ReviewReport): Promise<ReviewReport> {
    const result = await this.pool.query(
      `
        insert into review_reports (
          id, project_id, source, period, period_start, period_end, review_count,
          average_rating, sentiment, highlights, risks, suggestions, summary
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        on conflict (project_id, source, period, period_start) do update set
          period_end = excluded.period_end,
          review_count = excluded.review_count,
          average_rating = excluded.average_rating,
          sentiment = excluded.sentiment,
          highlights = excluded.highlights,
          risks = excluded.risks,
          suggestions = excluded.suggestions,
          summary = excluded.summary,
          created_at = now()
        returning *
      `,
      [
        report.id,
        report.projectId,
        report.source,
        report.period,
        report.periodStart,
        report.periodEnd,
        report.reviewCount,
        report.averageRating || null,
        report.sentiment,
        report.highlights,
        report.risks,
        report.suggestions,
        report.summary,
      ],
    );
    return rowToReport(result.rows[0]);
  }

  async listReports(input: {
    projectId: string;
    source?: ReviewSource;
    period?: ReviewReportPeriod;
    limit: number;
  }): Promise<ReviewReport[]> {
    const result = await this.pool.query(
      `
        select *
        from review_reports
        where project_id = $1
          and ($2::text is null or source = $2)
          and ($3::text is null or period = $3)
        order by period_start desc
        limit $4
      `,
      [input.projectId, input.source || null, input.period || null, input.limit],
    );
    return result.rows.map(rowToReport);
  }
}

function getReplyMode(): ReplyMode {
  const mode = process.env.REPLY_MODE;
  return mode === 'assisted' || mode === 'auto' ? mode : 'readonly';
}

function rowToReview(row: any): StoredReview {
  return {
    id: row.id,
    projectId: row.project_id,
    source: row.source,
    shopId: row.shop_id,
    shopName: row.shop_name,
    reviewId: row.review_id,
    authorName: row.author_name,
    rating: row.rating === null || row.rating === undefined ? undefined : Number(row.rating),
    content: row.content,
    sentiment: row.sentiment,
    reviewTime: toIso(row.review_time),
    capturedAt: toIso(row.captured_at),
    url: row.url || undefined,
    replied: row.replied,
    replyText: row.reply_text || undefined,
    metadata: row.metadata || undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToTask(row: any): ReviewReplyTask {
  return {
    id: row.id,
    projectId: row.project_id,
    source: row.source,
    reviewId: row.review_id,
    status: row.status,
    mode: row.mode,
    suggestedReply: row.suggested_reply || undefined,
    errorMessage: row.error_message || undefined,
    sentAt: row.sent_at ? toIso(row.sent_at) : undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToReport(row: any): ReviewReport {
  return {
    id: row.id,
    projectId: row.project_id,
    source: row.source,
    period: row.period,
    periodStart: toIso(row.period_start),
    periodEnd: toIso(row.period_end),
    reviewCount: row.review_count,
    averageRating: row.average_rating === null || row.average_rating === undefined ? undefined : Number(row.average_rating),
    sentiment: row.sentiment,
    highlights: row.highlights,
    risks: row.risks,
    suggestions: row.suggestions,
    summary: row.summary,
    createdAt: toIso(row.created_at),
  };
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
