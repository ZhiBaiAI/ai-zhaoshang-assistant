import { WorkerApiClient } from './apiClient';
import { WorkerConfig } from './config';
import type { DingTalkA1PollResult } from './dingtalkA1';
import { pollDingTalkA1 } from './dingtalkA1';

export interface WorkerRunResult {
  pending: number;
  generated: number;
  failed: number;
  reviewPending: number;
  reviewGenerated: number;
  reviewFailed: number;
  feishuUpdated: number;
}

export interface WorkerLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export async function runWorkerOnce(
  config: Pick<WorkerConfig, 'projectId' | 'batchSize' | 'reviewBatchSize'>,
  client: WorkerApiClient,
  logger: WorkerLogger = console,
): Promise<WorkerRunResult> {
  const tasks = await client.listPendingReplyTasks({
    projectId: config.projectId,
    limit: config.batchSize,
  });
  let generated = 0;
  let failed = 0;
  let reviewGenerated = 0;
  let reviewFailed = 0;

  if (tasks.length === 0) {
    logger.info('No pending reply tasks.');
  }

  for (const task of tasks) {
    try {
      const result = await client.generateReply(task.id);
      generated += 1;
      logger.info(`Generated reply task ${task.id}, handoff=${result.handoff ? 'yes' : 'no'}.`);
    } catch (error) {
      failed += 1;
      logger.error(`Failed to generate reply task ${task.id}: ${String(error)}`);
    }
  }

  const reviewTasks = await client.listPendingReviewReplyTasks({
    projectId: config.projectId,
    limit: config.reviewBatchSize,
  });
  if (reviewTasks.length === 0) {
    logger.info('No pending review reply tasks.');
  }

  for (const task of reviewTasks) {
    try {
      await client.generateReviewReply(task.id);
      reviewGenerated += 1;
      logger.info(`Generated review reply task ${task.id}.`);
    } catch (error) {
      reviewFailed += 1;
      logger.error(`Failed to generate review reply task ${task.id}: ${String(error)}`);
    }
  }

  return {
    pending: tasks.length,
    generated,
    failed,
    reviewPending: reviewTasks.length,
    reviewGenerated,
    reviewFailed,
    feishuUpdated: 0,
  };
}

export async function runWorkerMaintenance(
  config: Pick<WorkerConfig, 'projectId' | 'feishuSyncEnabled' | 'reviewReportsEnabled' | 'dingtalkA1Sync'>,
  client: WorkerApiClient,
  logger: WorkerLogger = console,
): Promise<{ feishuUpdated: number; dingtalkA1: DingTalkA1PollResult }> {
  let feishuUpdated = 0;
  if (config.feishuSyncEnabled) {
    const result = await client.syncFeishuLeadStatus(config.projectId);
    feishuUpdated = result.updated.length;
    logger.info(`Synced ${result.updated.length} lead status update(s) from Feishu.`);
  }
  if (config.reviewReportsEnabled) {
    await client.generateReviewReport({ projectId: config.projectId, period: 'daily' });
    await client.generateReviewReport({ projectId: config.projectId, period: 'monthly' });
    logger.info('Generated review daily and monthly reports.');
  }
  const dingtalkA1 = await pollDingTalkA1(config.dingtalkA1Sync, undefined, logger);
  if (config.dingtalkA1Sync.enabled) {
    logger.info(
      `Synced DingTalk A1 audio: listed=${dingtalkA1.listed}, saved=${dingtalkA1.saved}, created=${dingtalkA1.created}, updated=${dingtalkA1.updated}, audioDownloaded=${dingtalkA1.audioDownloaded}, failed=${dingtalkA1.failed}.`,
    );
  }
  return { feishuUpdated, dingtalkA1 };
}

export async function runWorkerLoop(
  config: WorkerConfig,
  client = new WorkerApiClient({
    apiBaseUrl: config.apiBaseUrl,
    apiToken: config.apiToken,
  }),
  logger: WorkerLogger = console,
): Promise<void> {
  let shouldStop = false;
  const stop = () => {
    shouldStop = true;
    logger.warn('Stopping worker after current cycle...');
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    do {
      if (config.apiTasksEnabled) {
        await runWorkerOnce(config, client, logger);
      }
      await runWorkerMaintenance(config, client, logger).catch(error => {
        logger.error(`Worker maintenance failed: ${String(error)}`);
      });
      if (!config.runOnce && !shouldStop) {
        await delay(config.intervalMs);
      }
    } while (!config.runOnce && !shouldStop);
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
