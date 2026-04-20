import { OperationLog, OperationLogLevel } from '@ai-zhaoshang/shared';
import { randomUUID } from 'crypto';
import { Pool, PoolConfig } from 'pg';
import { CreateOperationLogInput, LogStore } from './log-store';

export class PgLogStore implements LogStore {
  private pool: Pool;

  constructor(poolConfig: PoolConfig) {
    this.pool = new Pool(poolConfig);
  }

  async createLog(input: CreateOperationLogInput): Promise<OperationLog> {
    const result = await this.pool.query(
      `
        insert into operation_logs (id, project_id, level, type, message, metadata)
        values ($1, $2, $3, $4, $5, $6)
        returning *
      `,
      [
        randomUUID(),
        input.projectId,
        input.level,
        input.type,
        input.message,
        input.metadata || {},
      ],
    );
    return rowToLog(result.rows[0]);
  }

  async listLogs(projectId: string, limit: number): Promise<OperationLog[]> {
    const result = await this.pool.query(
      `
        select *
        from operation_logs
        where project_id = $1
        order by created_at desc
        limit $2
      `,
      [projectId, limit],
    );
    return result.rows.map(rowToLog);
  }
}

function rowToLog(row: any): OperationLog {
  return {
    id: row.id,
    projectId: row.project_id,
    level: row.level as OperationLogLevel,
    type: row.type,
    message: row.message,
    metadata: row.metadata || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}
