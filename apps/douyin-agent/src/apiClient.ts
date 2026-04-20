import {
  AgentHeartbeat,
  DouyinMessageBatch,
  ReplySendResult,
  SendableReplyTask,
} from '@ai-zhaoshang/shared';
import { WatchMessageEvent } from './watch-core';

export interface CreateDouyinBatchInput {
  projectId: string;
  capturedAt: string;
  events: WatchMessageEvent[];
}

export interface UploadDouyinBatchOptions {
  apiBaseUrl: string;
  apiToken?: string;
  batch: DouyinMessageBatch;
}

export interface PostAgentHeartbeatOptions {
  apiBaseUrl: string;
  apiToken?: string;
  heartbeat: AgentHeartbeat;
}

export interface ListSendableRepliesOptions {
  apiBaseUrl: string;
  apiToken?: string;
  projectId: string;
  limit: number;
}

export interface ReportReplySendResultOptions {
  apiBaseUrl: string;
  apiToken?: string;
  result: ReplySendResult;
}

export function createDouyinMessageBatch(input: CreateDouyinBatchInput): DouyinMessageBatch {
  return {
    schemaVersion: 1,
    source: 'douyin',
    projectId: input.projectId,
    capturedAt: input.capturedAt,
    count: input.events.length,
    events: input.events,
  };
}

export async function uploadDouyinMessageBatch(
  options: UploadDouyinBatchOptions,
): Promise<unknown> {
  return postJson({
    apiBaseUrl: options.apiBaseUrl,
    apiToken: options.apiToken,
    path: '/channels/douyin/messages',
    body: options.batch,
    failureLabel: 'API upload failed',
  });
}

export async function postAgentHeartbeat(
  options: PostAgentHeartbeatOptions,
): Promise<unknown> {
  return postJson({
    apiBaseUrl: options.apiBaseUrl,
    apiToken: options.apiToken,
    path: '/agents/heartbeat',
    body: options.heartbeat,
    failureLabel: 'API heartbeat failed',
  });
}

export async function listSendableReplies(
  options: ListSendableRepliesOptions,
): Promise<SendableReplyTask[]> {
  const response = await postJson<{ tasks: SendableReplyTask[] }>({
    apiBaseUrl: options.apiBaseUrl,
    apiToken: options.apiToken,
    path: '/reply-tasks/sendable',
    body: {
      projectId: options.projectId,
      limit: options.limit,
    },
    failureLabel: 'API sendable replies failed',
  });
  return response.tasks;
}

export async function reportReplySendResult(
  options: ReportReplySendResultOptions,
): Promise<unknown> {
  return postJson({
    apiBaseUrl: options.apiBaseUrl,
    apiToken: options.apiToken,
    path: '/reply-tasks/send-result',
    body: options.result,
    failureLabel: 'API send result failed',
  });
}

async function postJson<T = unknown>(options: {
  apiBaseUrl: string;
  apiToken?: string;
  path: string;
  body: unknown;
  failureLabel: string;
}): Promise<T> {
  const endpoint = new URL(options.path, normalizeBaseUrl(options.apiBaseUrl));
  const response = await fetch(endpoint, {
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
