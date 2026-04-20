export interface ApiConfig {
  port: number;
  apiToken?: string;
  databaseUrl?: string;
  embeddingEndpoint?: string;
  embeddingModel: string;
  embeddingDimension: number;
  llmBaseUrl?: string;
  llmApiKey?: string;
  llmModel: string;
  feishuWebhookUrl?: string;
  feishuAppId?: string;
  feishuAppSecret?: string;
  feishuBaseUrl?: string;
  feishuNotifyReceiveId?: string;
  feishuNotifyReceiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'email';
  feishuBitableAppToken?: string;
  feishuLeadsTableId?: string;
  wecomWebhookUrl?: string;
  dingtalkWebhookUrl?: string;
  dingtalkSecret?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    port: parsePositiveInt(env.API_PORT, 3001),
    apiToken: nonEmpty(env.API_TOKEN),
    databaseUrl: nonEmpty(env.DATABASE_URL),
    embeddingEndpoint: nonEmpty(env.EMBEDDING_ENDPOINT),
    embeddingModel: env.EMBEDDING_MODEL || 'BAAI/bge-m3',
    embeddingDimension: parsePositiveInt(env.EMBEDDING_DIMENSION, 1024),
    llmBaseUrl: nonEmpty(env.LLM_BASE_URL),
    llmApiKey: nonEmpty(env.LLM_API_KEY),
    llmModel: env.LLM_MODEL || 'deepseek-chat',
    feishuWebhookUrl: nonEmpty(env.FEISHU_WEBHOOK_URL),
    feishuAppId: nonEmpty(env.FEISHU_APP_ID),
    feishuAppSecret: nonEmpty(env.FEISHU_APP_SECRET),
    feishuBaseUrl: nonEmpty(env.FEISHU_BASE_URL),
    feishuNotifyReceiveId: nonEmpty(env.FEISHU_NOTIFY_RECEIVE_ID),
    feishuNotifyReceiveIdType: parseFeishuReceiveIdType(env.FEISHU_NOTIFY_RECEIVE_ID_TYPE),
    feishuBitableAppToken: nonEmpty(env.FEISHU_BITABLE_APP_TOKEN),
    feishuLeadsTableId: nonEmpty(env.FEISHU_LEADS_TABLE_ID),
    wecomWebhookUrl: nonEmpty(env.WECOM_WEBHOOK_URL),
    dingtalkWebhookUrl: nonEmpty(env.DINGTALK_WEBHOOK_URL),
    dingtalkSecret: nonEmpty(env.DINGTALK_SECRET),
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseFeishuReceiveIdType(
  value: string | undefined,
): 'chat_id' | 'open_id' | 'user_id' | 'email' {
  if (value === 'open_id' || value === 'user_id' || value === 'email') return value;
  return 'chat_id';
}
