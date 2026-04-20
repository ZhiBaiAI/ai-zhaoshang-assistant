import { OperationLog, OperationLogLevel } from '@ai-zhaoshang/shared';
import { randomUUID } from 'crypto';

export interface CreateOperationLogInput {
  projectId: string;
  level: OperationLogLevel;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LogStore {
  createLog(input: CreateOperationLogInput): Promise<OperationLog>;
  listLogs(projectId: string, limit: number): Promise<OperationLog[]>;
}

export class MemoryLogStore implements LogStore {
  private logs: OperationLog[] = [];

  async createLog(input: CreateOperationLogInput): Promise<OperationLog> {
    const log: OperationLog = {
      id: randomUUID(),
      projectId: input.projectId,
      level: input.level,
      type: input.type,
      message: input.message,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };
    this.logs.push(log);
    return log;
  }

  async listLogs(projectId: string, limit: number): Promise<OperationLog[]> {
    return this.logs
      .filter(log => log.projectId === projectId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }
}
