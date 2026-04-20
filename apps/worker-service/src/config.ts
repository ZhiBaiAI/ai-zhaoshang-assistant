export interface WorkerConfig {
  apiBaseUrl: string;
  apiToken?: string;
  projectId: string;
  intervalMs: number;
  batchSize: number;
  reviewBatchSize: number;
  runOnce: boolean;
  feishuSyncEnabled: boolean;
  reviewReportsEnabled: boolean;
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const projectId = nonEmpty(env.WORKER_PROJECT_ID) || nonEmpty(env.PROJECT_ID);
  if (!projectId) {
    throw new Error('WORKER_PROJECT_ID or PROJECT_ID is required');
  }

  return {
    apiBaseUrl: nonEmpty(env.WORKER_API_BASE_URL) || nonEmpty(env.API_BASE_URL) || 'http://127.0.0.1:3001',
    apiToken: nonEmpty(env.WORKER_API_TOKEN) || nonEmpty(env.API_TOKEN),
    projectId,
    intervalMs: parsePositiveInt(env.WORKER_INTERVAL_MS, 10000),
    batchSize: parsePositiveInt(env.WORKER_BATCH_SIZE, 5),
    reviewBatchSize: parsePositiveInt(env.WORKER_REVIEW_BATCH_SIZE, 5),
    runOnce: parseBooleanFlag(env.WORKER_ONCE),
    feishuSyncEnabled: parseBooleanFlag(env.WORKER_FEISHU_SYNC),
    reviewReportsEnabled: parseBooleanFlag(env.WORKER_REVIEW_REPORTS),
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBooleanFlag(value: string | undefined): boolean {
  if (value === undefined) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
