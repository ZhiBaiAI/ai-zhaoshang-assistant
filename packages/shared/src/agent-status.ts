export type AgentSource = 'douyin';

export interface AgentHeartbeat {
  schemaVersion: 1;
  projectId: string;
  agentId: string;
  source: AgentSource;
  status: 'starting' | 'running' | 'idle' | 'error' | 'stopped';
  observedAt: string;
  totalSessions?: number;
  scannedSessions?: number;
  newMessages?: number;
  pendingUploads?: number;
  lastError?: string;
}

export interface AgentStatus extends AgentHeartbeat {
  lastSeenAt: string;
  stale: boolean;
}

export function isAgentHeartbeat(value: unknown): value is AgentHeartbeat {
  if (!value || typeof value !== 'object') return false;
  const heartbeat = value as Partial<AgentHeartbeat>;
  return heartbeat.schemaVersion === 1
    && typeof heartbeat.projectId === 'string'
    && heartbeat.projectId.trim().length > 0
    && typeof heartbeat.agentId === 'string'
    && heartbeat.agentId.trim().length > 0
    && heartbeat.source === 'douyin'
    && typeof heartbeat.status === 'string'
    && ['starting', 'running', 'idle', 'error', 'stopped'].includes(heartbeat.status)
    && typeof heartbeat.observedAt === 'string';
}
