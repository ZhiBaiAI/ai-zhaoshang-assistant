import assert from 'node:assert/strict';
import test from 'node:test';
import type { DingTalkA1SyncConfig } from './config';
import { WorkerApiClient } from './apiClient';
import { runWorkerMaintenance, runWorkerOnce } from './worker';

const disabledDingTalkA1Sync: DingTalkA1SyncConfig = {
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
};

test('runWorkerOnce generates each pending task', async () => {
  const generated: string[] = [];
  const client = {
    async listPendingReplyTasks() {
      return [
        { id: 'task-1' },
        { id: 'task-2' },
      ];
    },
    async generateReply(taskId: string) {
      generated.push(taskId);
      return {
        task: { id: taskId },
        reply: '您好',
        context: '',
        handoff: false,
      };
    },
    async listPendingReviewReplyTasks() {
      return [
        { id: 'review-task-1' },
      ];
    },
    async generateReviewReply(taskId: string) {
      generated.push(taskId);
      return {
        task: { id: taskId },
        review: { id: 'review-1' },
        reply: '感谢评价',
      };
    },
  } as unknown as WorkerApiClient;

  const result = await runWorkerOnce(
    { projectId: 'project-1', batchSize: 2, reviewBatchSize: 2 },
    client,
    { info() {}, warn() {}, error() {} },
  );

  assert.deepEqual(generated, ['task-1', 'task-2', 'review-task-1']);
  assert.deepEqual(result, {
    pending: 2,
    generated: 2,
    failed: 0,
    reviewPending: 1,
    reviewGenerated: 1,
    reviewFailed: 0,
    feishuUpdated: 0,
  });
});

test('runWorkerMaintenance syncs Feishu lead status when enabled', async () => {
  const client = {
    async syncFeishuLeadStatus() {
      return { updated: [{ id: 'lead-1' }] };
    },
    async generateReviewReport() {
      return { id: 'report-1' };
    },
  } as unknown as WorkerApiClient;

  const result = await runWorkerMaintenance(
    {
      projectId: 'project-1',
      feishuSyncEnabled: true,
      reviewReportsEnabled: true,
      dingtalkA1Sync: disabledDingTalkA1Sync,
    },
    client,
    { info() {}, warn() {}, error() {} },
  );

  assert.deepEqual(result, {
    feishuUpdated: 1,
    dingtalkA1: {
      listed: 0,
      saved: 0,
      created: 0,
      updated: 0,
      audioDownloaded: 0,
      failed: 0,
    },
  });
});
