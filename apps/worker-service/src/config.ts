export interface WorkerConfig {
  apiBaseUrl: string;
  apiToken?: string;
  projectId: string;
  apiTasksEnabled: boolean;
  intervalMs: number;
  batchSize: number;
  reviewBatchSize: number;
  runOnce: boolean;
  feishuSyncEnabled: boolean;
  reviewReportsEnabled: boolean;
  dingtalkA1Sync: DingTalkA1SyncConfig;
}

export interface DingTalkA1SyncConfig {
  enabled: boolean;
  baseUrl: string;
  accessToken?: string;
  appKey?: string;
  appSecret?: string;
  snList: string[];
  deviceType: string;
  lookbackMs: number;
  maxResults: number;
  dataDir: string;
  downloadAudio: boolean;
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const apiTasksEnabled = env.WORKER_API_TASKS === undefined ? true : parseBooleanFlag(env.WORKER_API_TASKS);
  const projectId = nonEmpty(env.WORKER_PROJECT_ID) || nonEmpty(env.PROJECT_ID);
  if (apiTasksEnabled && !projectId) {
    throw new Error('WORKER_PROJECT_ID or PROJECT_ID is required');
  }

  return {
    apiBaseUrl: nonEmpty(env.WORKER_API_BASE_URL) || nonEmpty(env.API_BASE_URL) || 'http://127.0.0.1:3001',
    apiToken: nonEmpty(env.WORKER_API_TOKEN) || nonEmpty(env.API_TOKEN),
    projectId: projectId || '',
    apiTasksEnabled,
    intervalMs: parsePositiveInt(env.WORKER_INTERVAL_MS, 10000),
    batchSize: parsePositiveInt(env.WORKER_BATCH_SIZE, 5),
    reviewBatchSize: parsePositiveInt(env.WORKER_REVIEW_BATCH_SIZE, 5),
    runOnce: parseBooleanFlag(env.WORKER_ONCE),
    feishuSyncEnabled: parseBooleanFlag(env.WORKER_FEISHU_SYNC),
    reviewReportsEnabled: parseBooleanFlag(env.WORKER_REVIEW_REPORTS),
    dingtalkA1Sync: {
      enabled: parseBooleanFlag(env.WORKER_DINGTALK_A1_SYNC),
      baseUrl: nonEmpty(env.DINGTALK_A1_BASE_URL) || 'https://api.dingtalk.com',
      accessToken: nonEmpty(env.DINGTALK_A1_ACCESS_TOKEN),
      appKey: nonEmpty(env.DINGTALK_APP_KEY),
      appSecret: nonEmpty(env.DINGTALK_APP_SECRET),
      snList: parseCsv(env.DINGTALK_A1_SN_LIST),
      deviceType: nonEmpty(env.DINGTALK_A1_DEVICE_TYPE) || 'A1',
      lookbackMs: parsePositiveInt(env.DINGTALK_A1_LOOKBACK_MS, 24 * 60 * 60 * 1000),
      maxResults: parsePositiveInt(env.DINGTALK_A1_MAX_RESULTS, 20),
      dataDir: nonEmpty(env.DINGTALK_A1_DATA_DIR) || 'data/dingtalk-a1',
      downloadAudio: parseBooleanFlag(env.DINGTALK_A1_DOWNLOAD_AUDIO),
    },
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

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}
