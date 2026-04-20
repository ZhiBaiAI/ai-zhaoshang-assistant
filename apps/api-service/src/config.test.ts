import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from './config';

test('loadConfig applies defaults', () => {
  const config = loadConfig({});

  assert.equal(config.port, 3001);
  assert.equal(config.apiToken, undefined);
  assert.equal(config.databaseUrl, undefined);
  assert.equal(config.embeddingModel, 'BAAI/bge-m3');
  assert.equal(config.embeddingDimension, 1024);
  assert.equal(config.llmModel, 'deepseek-chat');
  assert.equal(config.feishuNotifyReceiveIdType, 'chat_id');
});

test('loadConfig reads database and embedding env', () => {
  const config = loadConfig({
    API_PORT: '3002',
    API_TOKEN: 'secret-token',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    EMBEDDING_ENDPOINT: 'http://127.0.0.1:8000/v1/embeddings',
    EMBEDDING_MODEL: 'BAAI/bge-small-zh-v1.5',
    EMBEDDING_DIMENSION: '512',
    LLM_BASE_URL: 'https://api.deepseek.com/v1',
    LLM_API_KEY: 'key',
    LLM_MODEL: 'deepseek-chat',
    FEISHU_WEBHOOK_URL: 'https://open.feishu.cn/webhook',
    FEISHU_APP_ID: 'cli_xxx',
    FEISHU_APP_SECRET: 'secret',
    FEISHU_NOTIFY_RECEIVE_ID: 'oc_xxx',
    FEISHU_NOTIFY_RECEIVE_ID_TYPE: 'chat_id',
    FEISHU_BITABLE_APP_TOKEN: 'app_token',
    FEISHU_LEADS_TABLE_ID: 'tbl_xxx',
    WECOM_WEBHOOK_URL: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
    DINGTALK_WEBHOOK_URL: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
    DINGTALK_SECRET: 'dingtalk_secret',
  });

  assert.equal(config.port, 3002);
  assert.equal(config.apiToken, 'secret-token');
  assert.equal(config.databaseUrl, 'postgres://user:pass@localhost:5432/db');
  assert.equal(config.embeddingEndpoint, 'http://127.0.0.1:8000/v1/embeddings');
  assert.equal(config.embeddingModel, 'BAAI/bge-small-zh-v1.5');
  assert.equal(config.embeddingDimension, 512);
  assert.equal(config.llmBaseUrl, 'https://api.deepseek.com/v1');
  assert.equal(config.llmApiKey, 'key');
  assert.equal(config.feishuWebhookUrl, 'https://open.feishu.cn/webhook');
  assert.equal(config.feishuAppId, 'cli_xxx');
  assert.equal(config.feishuAppSecret, 'secret');
  assert.equal(config.feishuNotifyReceiveId, 'oc_xxx');
  assert.equal(config.feishuNotifyReceiveIdType, 'chat_id');
  assert.equal(config.feishuBitableAppToken, 'app_token');
  assert.equal(config.feishuLeadsTableId, 'tbl_xxx');
  assert.equal(config.wecomWebhookUrl, 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx');
  assert.equal(config.dingtalkWebhookUrl, 'https://oapi.dingtalk.com/robot/send?access_token=xxx');
  assert.equal(config.dingtalkSecret, 'dingtalk_secret');
});
