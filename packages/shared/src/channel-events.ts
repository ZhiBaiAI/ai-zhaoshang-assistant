export type ChannelSource = 'douyin';

export type ChannelMessageDirection = 'incoming' | 'outgoing' | 'system' | 'unknown';

export interface ChannelSessionSummary {
  name: string;
  unreadCount: number;
  lastMessage: string;
  time: string;
  index: number;
}

export interface ChannelMessage {
  direction: ChannelMessageDirection;
  text: string;
  time?: string;
  rawHtml?: string;
}

export interface DouyinMessageEvent {
  schemaVersion: 1;
  id: string;
  source: 'douyin';
  type: 'message.created';
  capturedAt: string;
  session: ChannelSessionSummary;
  message: ChannelMessage;
}

export interface DouyinMessageBatch {
  schemaVersion: 1;
  source: 'douyin';
  projectId: string;
  capturedAt: string;
  count: number;
  events: DouyinMessageEvent[];
}

export interface MessageIngestionResult {
  projectId: string;
  source: ChannelSource;
  received: number;
  inserted: number;
  duplicates: number;
  conversationCount: number;
  messageCount: number;
}

export function isDouyinMessageEvent(value: unknown): value is DouyinMessageEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<DouyinMessageEvent>;
  return event.schemaVersion === 1
    && event.source === 'douyin'
    && event.type === 'message.created'
    && typeof event.id === 'string'
    && typeof event.capturedAt === 'string'
    && Boolean(event.session)
    && Boolean(event.message);
}
