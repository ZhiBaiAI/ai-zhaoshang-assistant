import fs from 'fs';
import os from 'os';
import path from 'path';
import { Page } from 'playwright';
import {
  launchBrowser,
  openCreatorCenter,
  ensureLoggedIn,
} from './browser';
import {
  DOUYIN_CREATOR_URL,
  listSessions,
  sendReplyToSession,
  scrollChatToTop,
  sessionToSummary,
  switchToSession,
  Session,
} from './douyin';
import { extractChat } from './extractChat';
import { makeTimestamp } from './utils';
import {
  createDouyinMessageBatch,
  listSendableReplies,
  postAgentHeartbeat,
  reportReplySendResult,
  uploadDouyinMessageBatch,
} from './apiClient';
import {
  appendPendingUpload,
  flushPendingUploads,
  loadPendingUploads,
} from './pendingUpload';
import {
  buildMessageEvents,
  createInitialWatchState,
  parseBooleanFlag,
  parsePositiveInt,
  pruneSeenKeys,
  safeFilePart,
  selectSessions,
  WatchMessageEvent,
  WatchOptions,
  WatchState,
  WatchTickStatus,
} from './watch-core';

const STATE_DIR = path.join(process.cwd(), 'data/state');
const INBOX_DIR = path.join(process.cwd(), 'data/inbox');
const CAPTURE_DIR = path.join(process.cwd(), 'data/captures');
const SCREENSHOT_DIR = path.join(process.cwd(), 'data/screenshots');

function ensureWatchDirs(): void {
  [STATE_DIR, INBOX_DIR, CAPTURE_DIR, SCREENSHOT_DIR, 'debug'].forEach(dir => {
    fs.mkdirSync(path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir), { recursive: true });
  });
}

function loadOptions(): WatchOptions {
  return {
    intervalMs: parsePositiveInt(process.env.WATCH_INTERVAL_MS, 30000),
    maxSessions: parsePositiveInt(process.env.WATCH_MAX_SESSIONS, 50),
    scrolls: parsePositiveInt(process.env.WATCH_SCROLLS, 2),
    scanAllEachTick: parseBooleanFlag(process.env.WATCH_SCAN_ALL),
    emitBootstrapMessages: parseBooleanFlag(process.env.WATCH_BOOTSTRAP_EMIT, true),
    runOnce: parseBooleanFlag(process.env.WATCH_ONCE),
    apiBaseUrl: process.env.DOUYIN_API_BASE_URL || process.env.API_BASE_URL,
    apiToken: process.env.DOUYIN_API_TOKEN || process.env.API_TOKEN,
    projectId: process.env.DOUYIN_PROJECT_ID || process.env.PROJECT_ID,
    agentId: process.env.DOUYIN_AGENT_ID || `douyin-agent-${os.hostname()}`,
    sendEnabled: parseBooleanFlag(process.env.DOUYIN_SEND_ENABLED),
    sendDryRun: parseBooleanFlag(process.env.DOUYIN_SEND_DRY_RUN, true),
    sendLimit: parsePositiveInt(process.env.DOUYIN_SEND_LIMIT, 5),
    statePath: path.join(STATE_DIR, 'douyin-watch-state.json'),
    statusPath: path.join(STATE_DIR, 'douyin-watch-status.json'),
    pendingUploadPath: path.join(STATE_DIR, 'douyin-upload-pending.json'),
  };
}

function loadState(statePath: string): WatchState {
  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<WatchState>;
    return {
      schemaVersion: 1,
      source: 'douyin',
      seenMessageKeys: parsed.seenMessageKeys || {},
      lastRunAt: parsed.lastRunAt,
    };
  } catch {
    return createInitialWatchState();
  }
}

function saveState(statePath: string, state: WatchState): void {
  const tmpPath = `${statePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  fs.renameSync(tmpPath, statePath);
}

function saveStatus(statusPath: string, status: WatchTickStatus): void {
  const tmpPath = `${statusPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(status, null, 2));
  fs.renameSync(tmpPath, statusPath);
}

async function saveWatchScreenshot(page: Page, ts: string): Promise<void> {
  const screenshotPath = path.join(SCREENSHOT_DIR, `watch-error-${ts}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(error => {
    console.warn(`Failed to save watch error screenshot: ${String(error)}`);
  });
}

async function captureSession(
  page: Page,
  session: Session,
  state: WatchState,
  options: WatchOptions,
): Promise<WatchMessageEvent[]> {
  await switchToSession(page, session);
  if (options.scrolls > 0) {
    await scrollChatToTop(page, options.scrolls);
  }

  const capture = await extractChat(page);
  const summary = sessionToSummary(session);
  const capturedAt = new Date().toISOString();
  const events = buildMessageEvents({
    session: summary,
    messages: capture.messages,
    state,
    capturedAt,
    emitEvents: options.emitBootstrapMessages || Boolean(state.lastRunAt),
  });

  if (events.length > 0) {
    const ts = makeTimestamp();
    const capturePath = path.join(CAPTURE_DIR, `watch-${safeFilePart(session.name)}-${ts}.json`);
    fs.writeFileSync(capturePath, JSON.stringify({
      ...capture,
      session: summary,
      newMessageIds: events.map(event => event.id),
    }, null, 2));
    console.log(`  Saved capture: ${capturePath}`);
  }

  return events;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function flushPendingIfConfigured(options: WatchOptions): Promise<{
  uploaded: number;
  pending: number;
  error?: string;
}> {
  if (!options.apiBaseUrl) {
    return {
      uploaded: 0,
      pending: loadPendingUploads(options.pendingUploadPath).entries.length,
    };
  }

  const result = await flushPendingUploads({
    pendingPath: options.pendingUploadPath,
    apiBaseUrl: options.apiBaseUrl,
    apiToken: options.apiToken,
    maxBatches: 20,
  });
  return {
    uploaded: result.uploaded,
    pending: result.remaining,
    error: result.lastError,
  };
}

async function sendHeartbeat(options: WatchOptions, status: WatchTickStatus): Promise<void> {
  if (!options.apiBaseUrl || !options.projectId) return;
  await postAgentHeartbeat({
    apiBaseUrl: options.apiBaseUrl,
    apiToken: options.apiToken,
    heartbeat: {
      schemaVersion: 1,
      projectId: options.projectId,
      agentId: options.agentId,
      source: 'douyin',
      status: status.lastError || status.uploadError || status.sendError
        ? 'error'
        : status.newMessages > 0 ? 'running' : 'idle',
      observedAt: status.lastTickAt,
      totalSessions: status.totalSessions,
      scannedSessions: status.scannedSessions,
      newMessages: status.newMessages,
      pendingUploads: status.pendingUploads,
      lastError: status.lastError || status.uploadError || status.sendError,
    },
  });
}

async function processSendQueue(
  page: Page,
  sessions: Session[],
  options: WatchOptions,
): Promise<{ sent: number; error?: string }> {
  if (!options.sendEnabled || !options.apiBaseUrl || !options.projectId) {
    return { sent: 0 };
  }

  const tasks = await listSendableReplies({
    apiBaseUrl: options.apiBaseUrl,
    apiToken: options.apiToken,
    projectId: options.projectId,
    limit: options.sendLimit,
  });
  let sent = 0;
  let lastError: string | undefined;

  for (const task of tasks) {
    const session = sessions.find(candidate => candidate.name === task.sessionName);
    if (!session) {
      lastError = `Session not found for reply task ${task.id}: ${task.sessionName}`;
      await reportReplySendResult({
        apiBaseUrl: options.apiBaseUrl,
        apiToken: options.apiToken,
        result: {
          taskId: task.id,
          success: false,
          sentAt: new Date().toISOString(),
          errorMessage: lastError,
        },
      });
      continue;
    }

    try {
      console.log(`Sending reply task ${task.id} to ${task.sessionName}${options.sendDryRun ? ' (dry-run)' : ''}.`);
      await sendReplyToSession(page, session, task.replyText, { dryRun: options.sendDryRun });
      if (!options.sendDryRun) {
        await reportReplySendResult({
          apiBaseUrl: options.apiBaseUrl,
          apiToken: options.apiToken,
          result: {
            taskId: task.id,
            success: true,
            sentAt: new Date().toISOString(),
          },
        });
        sent += 1;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await reportReplySendResult({
        apiBaseUrl: options.apiBaseUrl,
        apiToken: options.apiToken,
        result: {
          taskId: task.id,
          success: false,
          sentAt: new Date().toISOString(),
          errorMessage: lastError,
        },
      });
    }
  }

  return {
    sent,
    error: lastError,
  };
}

export async function runWatch(): Promise<void> {
  ensureWatchDirs();

  const options = loadOptions();
  const state = loadState(options.statePath);
  let shouldStop = false;
  let firstLoop = true;
  let lastStatus: WatchTickStatus | undefined;

  const stop = () => {
    shouldStop = true;
    console.log('\nStopping watch after current step...');
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  const browserSession = await launchBrowser();
  const { page } = browserSession;

  try {
    await openCreatorCenter(page, DOUYIN_CREATOR_URL);
    await ensureLoggedIn(page);

    console.log('\n--- Douyin watch mode ---');
    console.log(`Polling interval: ${options.intervalMs} ms`);
    console.log(`Max sessions per tick: ${options.maxSessions}`);
    console.log(`Scan all sessions each tick: ${options.scanAllEachTick ? 'yes' : 'no'}`);
    console.log(`Emit bootstrap messages: ${options.emitBootstrapMessages ? 'yes' : 'no'}`);
    console.log(`Run once: ${options.runOnce ? 'yes' : 'no'}`);
    console.log(`API upload: ${options.apiBaseUrl ? 'enabled' : 'disabled'}`);
    console.log(`Agent id: ${options.agentId}`);
    console.log(`Reply sending: ${options.sendEnabled ? 'enabled' : 'disabled'}`);
    console.log(`Reply send dry-run: ${options.sendDryRun ? 'yes' : 'no'}`);
    console.log(`State file: ${options.statePath}`);
    console.log(`Status file: ${options.statusPath}`);
    console.log('Read-only mode: no messages will be sent.\n');

    while (!shouldStop) {
      const tickStartedAt = new Date().toISOString();
      console.log(`[${tickStartedAt}] Checking Douyin sessions...`);

      try {
        const pendingFlush = await flushPendingIfConfigured(options);
        if (pendingFlush.uploaded > 0) {
          console.log(`Uploaded ${pendingFlush.uploaded} queued message(s) to api-service.`);
        }
        if (pendingFlush.error) {
          console.warn(`Pending upload retry still has errors: ${pendingFlush.error}`);
        }

        const sessions = await listSessions(page);
        const targetSessions = selectSessions(sessions, firstLoop, options);
        const allEvents: WatchMessageEvent[] = [];
        let sentReplies: number | undefined;
        let sendError: string | undefined;

        console.log(`Found ${sessions.length} session(s), scanning ${targetSessions.length}.`);

        for (const session of targetSessions) {
          if (shouldStop) break;
          console.log(`- ${session.name} unread=${session.unreadCount}`);
          try {
            const events = await captureSession(page, session, state, options);
            allEvents.push(...events);
          } catch (error) {
            console.error(`  Failed to capture session "${session.name}": ${String(error)}`);
          }
        }

        if (allEvents.length > 0) {
          const ts = makeTimestamp();
          const capturedAt = new Date().toISOString();
          let uploadedMessages: number | undefined;
          let uploadError: string | undefined;
          const batch = options.projectId
            ? createDouyinMessageBatch({
              projectId: options.projectId,
              capturedAt,
              events: allEvents,
            })
            : undefined;
          const inboxPath = path.join(INBOX_DIR, `douyin-messages-${ts}.json`);
          fs.writeFileSync(inboxPath, JSON.stringify({
            schemaVersion: 1,
            source: 'douyin',
            projectId: options.projectId,
            capturedAt,
            count: allEvents.length,
            events: allEvents,
          }, null, 2));
          console.log(`Saved ${allEvents.length} new message(s): ${inboxPath}`);

          if (options.apiBaseUrl && batch) {
            try {
              await uploadDouyinMessageBatch({
                apiBaseUrl: options.apiBaseUrl,
                apiToken: options.apiToken,
                batch,
              });
              uploadedMessages = allEvents.length;
              console.log(`Uploaded ${uploadedMessages} new message(s) to api-service.`);
            } catch (error) {
              uploadError = error instanceof Error ? error.message : String(error);
              appendPendingUpload(options.pendingUploadPath, batch, uploadError);
              console.error(`Failed to upload messages: ${uploadError}`);
              console.error(`Queued failed batch for retry: ${options.pendingUploadPath}`);
            }
          } else if (options.apiBaseUrl && !options.projectId) {
            uploadError = 'API upload skipped: DOUYIN_PROJECT_ID or PROJECT_ID is required.';
            console.warn(uploadError);
          }
          lastStatus = {
            ...(lastStatus || {
              schemaVersion: 1,
              source: 'douyin',
              running: true,
              lastTickAt: new Date().toISOString(),
              totalSessions: sessions.length,
              scannedSessions: targetSessions.length,
            newMessages: allEvents.length,
            pendingUploads: loadPendingUploads(options.pendingUploadPath).entries.length,
          }),
          uploadedMessages,
          uploadError,
          };
        } else {
          console.log('No new non-system messages captured.');
        }

        const sendResult = await processSendQueue(page, sessions, options).catch(error => ({
          sent: 0,
          error: error instanceof Error ? error.message : String(error),
        }));
        sentReplies = sendResult.sent;
        sendError = sendResult.error;
        if (sentReplies > 0) {
          console.log(`Sent ${sentReplies} queued reply/replies.`);
        }
        if (sendError) {
          console.warn(`Reply send queue error: ${sendError}`);
        }

        state.lastRunAt = new Date().toISOString();
        pruneSeenKeys(state);
        saveState(options.statePath, state);
        lastStatus = {
          schemaVersion: 1,
          source: 'douyin',
          running: true,
          lastTickAt: state.lastRunAt,
          totalSessions: sessions.length,
          scannedSessions: targetSessions.length,
          newMessages: allEvents.length,
          uploadedMessages: lastStatus?.uploadedMessages,
          pendingUploads: loadPendingUploads(options.pendingUploadPath).entries.length,
          uploadError: lastStatus?.uploadError,
          sentReplies,
          sendError,
        };
        saveStatus(options.statusPath, lastStatus);
        await sendHeartbeat(options, lastStatus).catch(error => {
          console.warn(`Failed to send agent heartbeat: ${String(error)}`);
        });
        firstLoop = false;

        if (options.runOnce) {
          shouldStop = true;
        }
      } catch (error) {
        const ts = makeTimestamp();
        console.error(`Watch tick failed: ${String(error)}`);
        await saveWatchScreenshot(page, ts);
        lastStatus = {
          schemaVersion: 1,
          source: 'douyin',
          running: true,
          lastTickAt: new Date().toISOString(),
          totalSessions: 0,
          scannedSessions: 0,
          newMessages: 0,
          pendingUploads: loadPendingUploads(options.pendingUploadPath).entries.length,
          lastError: error instanceof Error ? error.message : String(error),
        };
        saveStatus(options.statusPath, lastStatus);
        await sendHeartbeat(options, lastStatus).catch(heartbeatError => {
          console.warn(`Failed to send agent heartbeat: ${String(heartbeatError)}`);
        });
        if (options.runOnce) {
          shouldStop = true;
        }
      }

      if (!shouldStop) {
        await delay(options.intervalMs);
      }
    }
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    saveState(options.statePath, state);
    saveStatus(options.statusPath, {
      ...(lastStatus || {
        schemaVersion: 1,
        source: 'douyin',
        totalSessions: 0,
        scannedSessions: 0,
        newMessages: 0,
      }),
      running: false,
      lastTickAt: new Date().toISOString(),
    });
    await browserSession.cleanup();
  }
}
