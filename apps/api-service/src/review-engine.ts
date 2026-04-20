import { ChatModelProvider } from '@ai-zhaoshang/llm-providers';
import {
  ReviewReport,
  ReviewReportPeriod,
  ReviewReplyGenerationResult,
  ReviewReplyTask,
  ReviewSource,
} from '@ai-zhaoshang/shared';
import {
  buildDefaultReviewReply,
  buildReviewReport,
  periodRange,
} from './review-analysis';
import { ReviewStore } from './review-store';

export interface ReviewEngineDependencies {
  reviewStore: ReviewStore;
  llmProvider: ChatModelProvider;
}

export async function generateReviewReplyForTask(
  task: ReviewReplyTask,
  dependencies: ReviewEngineDependencies,
): Promise<ReviewReplyGenerationResult> {
  await dependencies.reviewStore.updateReplyTask(task.id, { status: 'processing' });
  const review = await dependencies.reviewStore.getReview(task.reviewId);
  if (!review) {
    const updated = await dependencies.reviewStore.updateReplyTask(task.id, {
      status: 'failed',
      errorMessage: 'Review not found',
    });
    throw new Error(`Review not found for task ${updated.id}`);
  }

  let reply = buildDefaultReviewReply(review);
  try {
    const result = await dependencies.llmProvider.complete({
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: [
            '你是门店评价运营助手。',
            '回复必须真诚、简洁、不能承诺无法确认的补偿。',
            '差评要先致歉，再说明会跟进改进；好评要表达感谢。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: `门店：${review.shopName}\n评分：${review.rating ?? '无'}\n情绪：${review.sentiment}\n评价：${review.content}`,
        },
      ],
    });
    reply = sanitizeReply(result.content) || reply;
  } catch {
    reply = buildDefaultReviewReply(review);
  }

  const nextStatus = task.mode === 'auto' ? 'queued' : 'suggested';
  const updated = await dependencies.reviewStore.updateReplyTask(task.id, {
    status: nextStatus,
    suggestedReply: reply,
  });

  return {
    task: updated,
    review,
    reply,
  };
}

export async function generateReviewReport(input: {
  projectId: string;
  source: ReviewSource;
  period: ReviewReportPeriod;
  date?: string;
  reviewStore: ReviewStore;
}): Promise<ReviewReport> {
  const range = periodRange(input.period, input.date ? new Date(input.date) : new Date());
  const reviews = await input.reviewStore.listReviewsInRange({
    projectId: input.projectId,
    source: input.source,
    periodStart: range.periodStart,
    periodEnd: range.periodEnd,
  });
  const report = buildReviewReport({
    projectId: input.projectId,
    source: input.source,
    period: input.period,
    periodStart: range.periodStart,
    periodEnd: range.periodEnd,
    reviews,
  });
  return input.reviewStore.saveReport(report);
}

function sanitizeReply(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
