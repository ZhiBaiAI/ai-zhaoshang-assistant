import { AgentHeartbeat, AgentStatus } from '@ai-zhaoshang/shared';

export interface AgentStatusStore {
  upsertHeartbeat(heartbeat: AgentHeartbeat): Promise<AgentStatus>;
  listStatuses(projectId: string): Promise<AgentStatus[]>;
}

export class MemoryAgentStatusStore implements AgentStatusStore {
  private readonly statuses = new Map<string, AgentStatus>();

  async upsertHeartbeat(heartbeat: AgentHeartbeat): Promise<AgentStatus> {
    const now = new Date().toISOString();
    const status: AgentStatus = {
      ...heartbeat,
      lastSeenAt: now,
      stale: false,
    };
    this.statuses.set(makeKey(heartbeat.projectId, heartbeat.agentId), status);
    return status;
  }

  async listStatuses(projectId: string): Promise<AgentStatus[]> {
    const now = Date.now();
    return Array.from(this.statuses.values())
      .filter(status => status.projectId === projectId)
      .map(status => ({
        ...status,
        stale: isStale(status, now),
      }))
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }
}

function makeKey(projectId: string, agentId: string): string {
  return `${projectId}:${agentId}`;
}

function isStale(status: AgentStatus, now: number): boolean {
  const lastSeenAt = Date.parse(status.lastSeenAt);
  if (!Number.isFinite(lastSeenAt)) return true;
  return now - lastSeenAt > 120000;
}
