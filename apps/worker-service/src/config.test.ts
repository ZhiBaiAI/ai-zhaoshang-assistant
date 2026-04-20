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
  assert.equal(config.intervalMs, 10000);
  assert.equal(config.batchSize, 5);
  assert.equal(config.reviewBatchSize, 5);
  assert.equal(config.runOnce, true);
  assert.equal(config.feishuSyncEnabled, false);
  assert.equal(config.reviewReportsEnabled, false);
});

test('loadWorkerConfig requires project id', () => {
  assert.throws(() => loadWorkerConfig({}), /PROJECT_ID/);
});
