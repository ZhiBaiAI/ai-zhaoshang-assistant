export type MessageDirection = 'incoming' | 'outgoing' | 'system' | 'unknown';

export interface ChatMessage {
  direction: MessageDirection;
  text: string;
  time?: string;
  rawHtml?: string;
}

export interface ChatSessionSummary {
  name: string;
  unreadCount: number;
  lastMessage: string;
  time: string;
  index: number;
}

export interface CaptureResult {
  sessionTitle: string;
  messages: ChatMessage[];
  timestamp: string;
  sessions?: ChatSessionSummary[];
}
