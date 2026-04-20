export type ReplyTaskStatus =
  | 'pending'
  | 'processing'
  | 'suggested'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'handoff'
  | 'failed';

export type ReplyMode = 'readonly' | 'assisted' | 'auto';

export type LeadStatus =
  | 'new'
  | 'chatting'
  | 'contact_pending'
  | 'contacted'
  | 'qualified'
  | 'invited'
  | 'visited'
  | 'deal'
  | 'invalid'
  | 'lost';

export interface ReplyTask {
  id: string;
  projectId: string;
  conversationId: string;
  messageId: string;
  status: ReplyTaskStatus;
  mode: ReplyMode;
  suggestedReply?: string;
  handoffReason?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendableReplyTask extends ReplyTask {
  source: 'douyin';
  sessionName: string;
  replyText: string;
}

export interface ReplySendResult {
  taskId: string;
  success: boolean;
  sentAt: string;
  errorMessage?: string;
}

export interface LeadProfile {
  phone?: string;
  wechat?: string;
  city?: string;
  budget?: string;
  openingTime?: string;
  intentLevel: 'low' | 'medium' | 'high';
  summary: string;
}

export interface Lead {
  id: string;
  projectId: string;
  conversationId: string;
  status: LeadStatus;
  profile: LeadProfile;
  createdAt: string;
  updatedAt: string;
}

export interface ReplyGenerationResult {
  task: ReplyTask;
  reply: string;
  context: string;
  lead?: Lead;
  handoff: boolean;
  handoffReason?: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  replyMode: ReplyMode;
  autoSendEnabled: boolean;
  handoffEnabled: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OperationLogLevel = 'info' | 'warning' | 'error';

export interface OperationLog {
  id: string;
  projectId: string;
  level: OperationLogLevel;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
