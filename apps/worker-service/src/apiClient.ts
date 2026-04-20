import {
  ReplyGenerationResult,
  ReplyTask,
  ReviewReport,
  ReviewReplyGenerationResult,
  ReviewReplyTask,
} from '@ai-zhaoshang/shared';

export interface WorkerApiClientOptions {
  apiBaseUrl: string;
  apiToken?: string;
}

export class WorkerApiClient {
  constructor(private options: WorkerApiClientOptions) {}

  async listPendingReplyTasks(input: { projectId: string; limit: number }): Promise<ReplyTask[]> {
    const response = await this.post<{ tasks: ReplyTask[] }>('/reply-tasks/pending', {
      projectId: input.projectId,
      limit: input.limit,
    });
    return response.tasks;
  }

  async generateReply(taskId: string): Promise<ReplyGenerationResult> {
    return this.post<ReplyGenerationResult>('/reply-tasks/generate', { taskId });
  }

  async syncFeishuLeadStatus(projectId: string): Promise<{ updated: unknown[] }> {
    return this.post<{ updated: unknown[] }>('/integrations/feishu/sync-lead-status', { projectId });
  }

  async listPendingReviewReplyTasks(input: { projectId: string; limit: number }): Promise<ReviewReplyTask[]> {
    const response = await this.post<{ tasks: ReviewReplyTask[] }>('/review-reply-tasks/pending', {
      projectId: input.projectId,
      limit: input.limit,
    });
    return response.tasks;
  }

  async generateReviewReply(taskId: string): Promise<ReviewReplyGenerationResult> {
    return this.post<ReviewReplyGenerationResult>('/review-reply-tasks/generate', { taskId });
  }

  async generateReviewReport(input: {
    projectId: string;
    period: 'daily' | 'monthly';
    source?: 'dianping';
  }): Promise<ReviewReport> {
    const response = await this.post<{ report: ReviewReport }>('/review-reports/generate', {
      projectId: input.projectId,
      period: input.period,
      source: input.source || 'dianping',
    });
    return response.report;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(new URL(path, normalizeBaseUrl(this.options.apiBaseUrl)), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.options.apiToken ? { authorization: `Bearer ${this.options.apiToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) as unknown : undefined;
    if (!response.ok) {
      throw new Error(`worker api request failed: ${response.status} ${text}`);
    }
    return payload as T;
  }
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}
