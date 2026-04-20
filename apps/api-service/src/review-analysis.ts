import {
  ReviewReport,
  ReviewReportPeriod,
  ReviewSentiment,
  ReviewSource,
  StoredReview,
} from '@ai-zhaoshang/shared';
import { createHash } from 'crypto';

const positiveWords = ['满意', '好吃', '不错', '推荐', '热情', '干净', '实惠', '喜欢', '划算', '专业'];
const negativeWords = ['差', '慢', '贵', '失望', '难吃', '冷', '脏', '投诉', '不好', '态度差', '排队'];

export function detectReviewSentiment(input: { content: string; rating?: number }): ReviewSentiment {
  if (typeof input.rating === 'number') {
    if (input.rating >= 4) return 'positive';
    if (input.rating <= 2) return 'negative';
  }
  const positive = positiveWords.some(word => input.content.includes(word));
  const negative = negativeWords.some(word => input.content.includes(word));
  if (negative && !positive) return 'negative';
  if (positive && !negative) return 'positive';
  return 'neutral';
}

export function buildReviewReport(input: {
  projectId: string;
  source: ReviewSource;
  period: ReviewReportPeriod;
  periodStart: string;
  periodEnd: string;
  reviews: StoredReview[];
}): ReviewReport {
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  let ratingSum = 0;
  let ratingCount = 0;

  for (const review of input.reviews) {
    sentiment[review.sentiment] += 1;
    if (typeof review.rating === 'number') {
      ratingSum += review.rating;
      ratingCount += 1;
    }
  }

  const risks = buildRisks(input.reviews, sentiment);
  const highlights = buildHighlights(input.reviews, sentiment);
  const suggestions = buildSuggestions(input.reviews, risks);
  const averageRating = ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(2)) : undefined;
  const periodName = input.period === 'daily' ? '日报' : '月报';
  const summary = [
    `${periodName}覆盖 ${input.reviews.length} 条评价。`,
    averageRating === undefined ? '暂无评分数据。' : `平均评分 ${averageRating}。`,
    `正向 ${sentiment.positive} 条，中性 ${sentiment.neutral} 条，负向 ${sentiment.negative} 条。`,
  ].join('');

  return {
    id: makeReportId(input.projectId, input.source, input.period, input.periodStart),
    projectId: input.projectId,
    source: input.source,
    period: input.period,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    reviewCount: input.reviews.length,
    averageRating,
    sentiment,
    highlights,
    risks,
    suggestions,
    summary,
    createdAt: new Date().toISOString(),
  };
}

export function buildDefaultReviewReply(review: StoredReview): string {
  if (review.sentiment === 'negative') {
    return [
      `${review.authorName}您好，非常抱歉这次体验没有达到您的期待。`,
      '我们已经记录您反馈的问题，会尽快复盘服务细节并改进。',
      '也欢迎您通过门店客服进一步说明情况，我们会认真跟进。',
    ].join('');
  }

  if (review.sentiment === 'positive') {
    return [
      `${review.authorName}您好，感谢您的认可和支持。`,
      '您的反馈对我们很重要，我们会继续保持产品和服务品质。',
      '期待您下次再来体验。',
    ].join('');
  }

  return [
    `${review.authorName}您好，感谢您留下评价。`,
    '我们会持续关注每一条反馈，也会不断优化门店体验。',
    '期待继续为您服务。',
  ].join('');
}

export function periodRange(period: ReviewReportPeriod, date = new Date()): {
  periodStart: string;
  periodEnd: string;
} {
  if (period === 'monthly') {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0));
    return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
  }

  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0));
  return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
}

export function makeReviewInternalId(projectId: string, source: ReviewSource, reviewId: string): string {
  const hash = createHash('sha1').update(`${projectId}:${source}:${reviewId}`).digest('hex');
  return `${source}_review_${hash}`;
}

export function makeReviewReplyTaskId(reviewInternalId: string): string {
  return `review_reply_${reviewInternalId}`;
}

function makeReportId(
  projectId: string,
  source: ReviewSource,
  period: ReviewReportPeriod,
  periodStart: string,
): string {
  const hash = createHash('sha1').update(`${projectId}:${source}:${period}:${periodStart}`).digest('hex');
  return `review_report_${hash}`;
}

function buildRisks(
  reviews: StoredReview[],
  sentiment: ReviewReport['sentiment'],
): string[] {
  const risks: string[] = [];
  if (sentiment.negative > 0) {
    risks.push(`存在 ${sentiment.negative} 条负向评价，需要优先跟进。`);
  }
  const slow = reviews.filter(review => /慢|等|排队/.test(review.content)).length;
  if (slow > 0) risks.push(`${slow} 条评价提到等待或服务效率。`);
  const price = reviews.filter(review => /贵|价格|性价比|不值/.test(review.content)).length;
  if (price > 0) risks.push(`${price} 条评价提到价格或性价比。`);
  return risks;
}

function buildHighlights(
  reviews: StoredReview[],
  sentiment: ReviewReport['sentiment'],
): string[] {
  const highlights: string[] = [];
  if (sentiment.positive > 0) highlights.push(`${sentiment.positive} 条正向评价可沉淀为门店口碑素材。`);
  const service = reviews.filter(review => /服务|热情|态度/.test(review.content)).length;
  if (service > 0) highlights.push(`${service} 条评价提到服务体验。`);
  const product = reviews.filter(review => /好吃|味道|产品|菜品|口味/.test(review.content)).length;
  if (product > 0) highlights.push(`${product} 条评价提到产品口味。`);
  return highlights;
}

function buildSuggestions(reviews: StoredReview[], risks: string[]): string[] {
  if (reviews.length === 0) return ['当期暂无评价，建议继续关注门店新增评论。'];
  const suggestions = ['及时回复新增评价，负向评价建议当天完成跟进。'];
  if (risks.some(risk => risk.includes('等待') || risk.includes('效率'))) {
    suggestions.push('复盘高峰期排队和出餐流程，明确改进负责人。');
  }
  if (risks.some(risk => risk.includes('价格') || risk.includes('性价比'))) {
    suggestions.push('针对价格敏感反馈，优化套餐说明和门店解释话术。');
  }
  suggestions.push('将高频好评关键词沉淀到招商案例和销售话术中。');
  return suggestions;
}
