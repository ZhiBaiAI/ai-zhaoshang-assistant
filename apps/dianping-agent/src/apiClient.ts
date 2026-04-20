import { ReviewBatch, ReviewEvent, ReviewReplySendResult, SendableReviewReplyTask } from '@ai-zhaoshang/shared';

export interface CreateReviewBatchInput {
  projectId: string;
  capturedAt: string;
  events: ReviewEvent[];
}

export interface ApiOptions {
  apiBaseUrl: string;
  apiToken?: string;
}

export function createDianpingReviewBatch(input: CreateReviewBatchInput): ReviewBatch {
  return {
    schemaVersion: 1,
    source: 'dianping',
    projectId: input.projectId,
    capturedAt: input.capturedAt,
    count: input.events.length,
    events: input.events,
  };
}

export async function uploadDianpingReviewBatch(
  options: ApiOptions & { batch: ReviewBatch },
): Promise<unknown> {
  return postJson({
    ...options,
    path: '/channels/dianping/reviews',
    body: options.batch,
    failureLabel: 'Dianping review upload failed',
  });
}

export async function listSendableReviewReplies(
  options: ApiOptions & { projectId: string; limit: number },
): Promise<SendableReviewReplyTask[]> {
  const response = await postJson<{ tasks: SendableReviewReplyTask[] }>({
    ...options,
    path: '/review-reply-tasks/sendable',
    body: {
      projectId: options.projectId,
      source: 'dianping',
      limit: options.limit,
    },
    failureLabel: 'Dianping sendable review replies failed',
  });
  return response.tasks;
}

export async function reportReviewReplySendResult(
  options: ApiOptions & { result: ReviewReplySendResult },
): Promise<unknown> {
  return postJson({
    ...options,
    path: '/review-reply-tasks/send-result',
    body: options.result,
    failureLabel: 'Dianping review reply result failed',
  });
}

async function postJson<T = unknown>(options: ApiOptions & {
  path: string;
  body: unknown;
  failureLabel: string;
}): Promise<T> {
  const response = await fetch(new URL(options.path, normalizeBaseUrl(options.apiBaseUrl)), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(options.apiToken ? { authorization: `Bearer ${options.apiToken}` } : {}),
    },
    body: JSON.stringify(options.body),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) as unknown : undefined;
  if (!response.ok) {
    throw new Error(`${options.failureLabel}: ${response.status} ${text}`);
  }
  return body as T;
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}
