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
import {
  detectReviewSentiment,
  makeReviewInternalId,
  makeReviewReplyTaskId,
} from './review-analysis';

export interface ReviewStore {
  ingestReviewBatch(batch: ReviewBatch, options?: { replyMode?: ReplyMode }): Promise<ReviewIngestionResult>;
  listReviews(input: { projectId: string; source?: ReviewSource; limit: number }): Promise<StoredReview[]>;
  listReviewsInRange(input: {
    projectId: string;
    source: ReviewSource;
    periodStart: string;
    periodEnd: string;
  }): Promise<StoredReview[]>;
  listReplyTasks(input: {
    projectId: string;
    status?: ReviewReplyTask['status'];
    limit: number;
  }): Promise<ReviewReplyTask[]>;
  listSendableReplyTasks(input: {
    projectId: string;
    source?: ReviewSource;
    limit: number;
  }): Promise<SendableReviewReplyTask[]>;
  getReplyTask(taskId: string): Promise<ReviewReplyTask | undefined>;
  getReview(reviewInternalId: string): Promise<StoredReview | undefined>;
  updateReplyTask(taskId: string, patch: Partial<ReviewReplyTask>): Promise<ReviewReplyTask>;
  queueReplyTask(taskId: string, replyText?: string): Promise<ReviewReplyTask>;
  recordReplySendResult(result: ReviewReplySendResult): Promise<ReviewReplyTask>;
  saveReport(report: ReviewReport): Promise<ReviewReport>;
  listReports(input: {
    projectId: string;
    source?: ReviewSource;
    period?: ReviewReportPeriod;
    limit: number;
  }): Promise<ReviewReport[]>;
}

export class MemoryReviewStore implements ReviewStore {
  private reviews = new Map<string, StoredReview>();
  private replyTasks = new Map<string, ReviewReplyTask>();
  private reports = new Map<string, ReviewReport>();

  async ingestReviewBatch(
    batch: ReviewBatch,
    options: { replyMode?: ReplyMode } = {},
  ): Promise<ReviewIngestionResult> {
    let inserted = 0;
    let duplicates = 0;

    for (const event of batch.events) {
      const reviewInternalId = makeReviewInternalId(batch.projectId, event.source, event.reviewId);
      if (this.reviews.has(reviewInternalId)) {
        duplicates += 1;
        continue;
      }

      const now = new Date().toISOString();
      const review: StoredReview = {
        id: reviewInternalId,
        projectId: batch.projectId,
        source: event.source,
        shopId: event.shopId,
        shopName: event.shopName,
        reviewId: event.reviewId,
        authorName: event.authorName,
        rating: event.rating,
        content: event.content,
        sentiment: detectReviewSentiment({ content: event.content, rating: event.rating }),
        reviewTime: event.reviewTime,
        capturedAt: event.capturedAt,
        url: event.url,
        replied: false,
        metadata: event.metadata,
        createdAt: now,
        updatedAt: now,
      };
      this.reviews.set(review.id, review);

      const taskId = makeReviewReplyTaskId(review.id);
      this.replyTasks.set(taskId, {
        id: taskId,
        projectId: batch.projectId,
        source: event.source,
        reviewId: review.id,
        status: 'pending',
        mode: options.replyMode || getReplyMode(),
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }

    return {
      projectId: batch.projectId,
      source: batch.source,
      received: batch.events.length,
      inserted,
      duplicates,
      reviewCount: [...this.reviews.values()].filter(review => review.projectId === batch.projectId).length,
      replyTaskCount: [...this.replyTasks.values()].filter(task => task.projectId === batch.projectId).length,
    };
  }

  async listReviews(input: { projectId: string; source?: ReviewSource; limit: number }): Promise<StoredReview[]> {
    return [...this.reviews.values()]
      .filter(review => review.projectId === input.projectId && (!input.source || review.source === input.source))
      .sort((left, right) => right.reviewTime.localeCompare(left.reviewTime))
      .slice(0, input.limit);
  }

  async listReviewsInRange(input: {
    projectId: string;
    source: ReviewSource;
    periodStart: string;
    periodEnd: string;
  }): Promise<StoredReview[]> {
    return [...this.reviews.values()]
      .filter(review =>
        review.projectId === input.projectId
        && review.source === input.source
        && review.reviewTime >= input.periodStart
        && review.reviewTime < input.periodEnd,
      )
      .sort((left, right) => left.reviewTime.localeCompare(right.reviewTime));
  }

  async listReplyTasks(input: {
    projectId: string;
    status?: ReviewReplyTask['status'];
    limit: number;
  }): Promise<ReviewReplyTask[]> {
    return [...this.replyTasks.values()]
      .filter(task => task.projectId === input.projectId && (!input.status || task.status === input.status))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, input.limit);
  }

  async listSendableReplyTasks(input: {
    projectId: string;
    source?: ReviewSource;
    limit: number;
  }): Promise<SendableReviewReplyTask[]> {
    return [...this.replyTasks.values()]
      .filter(task =>
        task.projectId === input.projectId
        && task.status === 'queued'
        && Boolean(task.suggestedReply)
        && (!input.source || task.source === input.source),
      )
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      .slice(0, input.limit)
      .map(task => {
        const review = this.reviews.get(task.reviewId);
        if (!review) return undefined;
        return {
          ...task,
          shopName: review.shopName,
          authorName: review.authorName,
          reviewContent: review.content,
          replyText: task.suggestedReply || '',
        };
      })
      .filter((task): task is SendableReviewReplyTask => Boolean(task));
  }

  async getReplyTask(taskId: string): Promise<ReviewReplyTask | undefined> {
    return this.replyTasks.get(taskId);
  }

  async getReview(reviewInternalId: string): Promise<StoredReview | undefined> {
    return this.reviews.get(reviewInternalId);
  }

  async updateReplyTask(taskId: string, patch: Partial<ReviewReplyTask>): Promise<ReviewReplyTask> {
    const current = this.replyTasks.get(taskId);
    if (!current) throw new Error(`Review reply task not found: ${taskId}`);
    const updated: ReviewReplyTask = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.replyTasks.set(taskId, updated);
    return updated;
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
      const review = this.reviews.get(updated.reviewId);
      if (review) {
        this.reviews.set(review.id, {
          ...review,
          replied: true,
          replyText: result.replyText || updated.suggestedReply,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return updated;
  }

  async saveReport(report: ReviewReport): Promise<ReviewReport> {
    this.reports.set(report.id, report);
    return report;
  }

  async listReports(input: {
    projectId: string;
    source?: ReviewSource;
    period?: ReviewReportPeriod;
    limit: number;
  }): Promise<ReviewReport[]> {
    return [...this.reports.values()]
      .filter(report =>
        report.projectId === input.projectId
        && (!input.source || report.source === input.source)
        && (!input.period || report.period === input.period),
      )
      .sort((left, right) => right.periodStart.localeCompare(left.periodStart))
      .slice(0, input.limit);
  }
}

function getReplyMode(): ReplyMode {
  const mode = process.env.REPLY_MODE;
  return mode === 'assisted' || mode === 'auto' ? mode : 'readonly';
}
