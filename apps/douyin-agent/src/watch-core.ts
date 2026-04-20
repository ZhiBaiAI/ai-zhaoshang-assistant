import crypto from 'crypto';
import { ChatMessage, ChatSessionSummary } from './types';

export interface WatchOptions {
  intervalMs: number;
  maxSessions: number;
  scrolls: number;
  scanAllEachTick: boolean;
  emitBootstrapMessages: boolean;
  runOnce: boolean;
  apiBaseUrl?: string;
  apiToken?: string;
  projectId?: string;
  agentId: string;
  sendEnabled: boolean;
  sendDryRun: boolean;
  sendLimit: number;
  statePath: string;
  statusPath: string;
  pendingUploadPath: string;
}

export interface WatchState {
  schemaVersion: 1;
  source: 'douyin';
  seenMessageKeys: Record<string, string>;
  lastRunAt?: string;
}

export interface WatchMessageEvent {
  schemaVersion: 1;
  id: string;
  source: 'douyin';
  type: 'message.created';
  capturedAt: string;
  session: ChatSessionSummary;
  message: ChatMessage;
}

export interface WatchTickStatus {
  schemaVersion: 1;
  source: 'douyin';
  running: boolean;
  lastTickAt: string;
  totalSessions: number;
  scannedSessions: number;
  newMessages: number;
  uploadedMessages?: number;
  pendingUploads?: number;
  sentReplies?: number;
  sendError?: string;
  lastError?: string;
  uploadError?: string;
}

export interface BuildMessageEventsInput {
  session: ChatSessionSummary;
  messages: ChatMessage[];
  state: WatchState;
  capturedAt: string;
  emitEvents: boolean;
}

export function createInitialWatchState(): WatchState {
  return {
    schemaVersion: 1,
    source: 'douyin',
    seenMessageKeys: {},
  };
}

export function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseBooleanFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function normalizeMessageText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function safeFilePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80) || 'session';
}

export function makeMessageKey(session: ChatSessionSummary, message: ChatMessage): string {
  const source = [
    session.name,
    message.direction,
    message.time || '',
    normalizeMessageText(message.text),
  ].join('\n');
  return crypto.createHash('sha1').update(source).digest('hex');
}

export function makeWatchEventId(messageKey: string): string {
  return `douyin_msg_${messageKey}`;
}

export function buildMessageEvents(input: BuildMessageEventsInput): WatchMessageEvent[] {
  const events: WatchMessageEvent[] = [];

  for (const message of input.messages) {
    if (message.direction === 'system') continue;

    const normalizedText = normalizeMessageText(message.text);
    if (!normalizedText) continue;

    const normalizedMessage: ChatMessage = {
      ...message,
      text: normalizedText,
    };
    const messageKey = makeMessageKey(input.session, normalizedMessage);
    if (input.state.seenMessageKeys[messageKey]) continue;

    input.state.seenMessageKeys[messageKey] = input.capturedAt;

    if (input.emitEvents) {
      events.push({
        schemaVersion: 1,
        id: makeWatchEventId(messageKey),
        source: 'douyin',
        type: 'message.created',
        capturedAt: input.capturedAt,
        session: input.session,
        message: normalizedMessage,
      });
    }
  }

  return events;
}

export function pruneSeenKeys(state: WatchState, maxKeys = 10000): void {
  const entries = Object.entries(state.seenMessageKeys);
  if (entries.length <= maxKeys) return;
  entries
    .sort((a, b) => a[1].localeCompare(b[1]))
    .slice(0, entries.length - maxKeys)
    .forEach(([key]) => {
      delete state.seenMessageKeys[key];
    });
}

export function selectSessions<T extends { unreadCount: number }>(
  sessions: T[],
  firstLoop: boolean,
  options: Pick<WatchOptions, 'scanAllEachTick' | 'maxSessions'>,
): T[] {
  const candidates = firstLoop || options.scanAllEachTick
    ? sessions
    : sessions.filter(session => session.unreadCount > 0);

  return candidates.slice(0, options.maxSessions);
}
