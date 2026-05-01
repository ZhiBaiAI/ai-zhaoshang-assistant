import assert from 'node:assert/strict';
import test from 'node:test';
import { loadWorkerConfig } from './config';

test('loadWorkerConfig reads env and defaults', () => {
  const config = loadWorkerConfig({
    PROJECT_ID: 'project-1',
    API_TOKEN: 'token-1',
    WORKER_ONCE: '1',
  });

  assert.equal(config.apiBaseUrl, 'http://127.0.0.1:3001');
  assert.equal(config.apiToken, 'token-1');
  assert.equal(config.projectId, 'project-1');
  assert.equal(config.apiTasksEnabled, true);
  assert.equal(config.intervalMs, 10000);
  assert.equal(config.batchSize, 5);
  assert.equal(config.reviewBatchSize, 5);
  assert.equal(config.runOnce, true);
  assert.equal(config.feishuSyncEnabled, false);
  assert.equal(config.reviewReportsEnabled, false);
  assert.deepEqual(config.dingtalkA1Sync, {
    enabled: false,
    baseUrl: 'https://api.dingtalk.com',
    accessToken: undefined,
    appKey: undefined,
    appSecret: undefined,
    snList: [],
    deviceType: 'A1',
    lookbackMs: 86400000,
    maxResults: 20,
    dataDir: 'data/dingtalk-a1',
    downloadAudio: false,
  });
});

test('loadWorkerConfig reads DingTalk A1 sync config', () => {
  const config = loadWorkerConfig({
    WORKER_API_TASKS: '0',
    WORKER_DINGTALK_A1_SYNC: '1',
    DINGTALK_A1_BASE_URL: 'https://api.dingtalk.test',
    DINGTALK_A1_ACCESS_TOKEN: 'token-1',
    DINGTALK_APP_KEY: 'app-key',
    DINGTALK_APP_SECRET: 'app-secret',
    DINGTALK_A1_SN_LIST: 'sn-1, sn-2',
    DINGTALK_A1_LOOKBACK_MS: '60000',
    DINGTALK_A1_MAX_RESULTS: '10',
    DINGTALK_A1_DATA_DIR: '/tmp/a1',
    DINGTALK_A1_DOWNLOAD_AUDIO: 'true',
  });

  assert.equal(config.projectId, '');
  assert.equal(config.apiTasksEnabled, false);
  assert.deepEqual(config.dingtalkA1Sync, {
    enabled: true,
    baseUrl: 'https://api.dingtalk.test',
    accessToken: 'token-1',
    appKey: 'app-key',
    appSecret: 'app-secret',
    snList: ['sn-1', 'sn-2'],
    deviceType: 'A1',
    lookbackMs: 60000,
    maxResults: 10,
    dataDir: '/tmp/a1',
    downloadAudio: true,
  });
});

test('loadWorkerConfig requires project id', () => {
  assert.throws(() => loadWorkerConfig({}), /PROJECT_ID/);
});

test('loadWorkerConfig does not require project id when API tasks are disabled', () => {
  const config = loadWorkerConfig({
    WORKER_API_TASKS: '0',
  });

  assert.equal(config.projectId, '');
  assert.equal(config.apiTasksEnabled, false);
});
