import { ProjectConfig, ReplyMode } from '@ai-zhaoshang/shared';
import { Pool, PoolConfig } from 'pg';
import { ProjectStore, UpsertProjectInput } from './project-store';

export class PgProjectStore implements ProjectStore {
  private pool: Pool;

  constructor(poolConfig: PoolConfig) {
    this.pool = new Pool(poolConfig);
  }

  async upsertProject(input: UpsertProjectInput): Promise<ProjectConfig> {
    const result = await this.pool.query(
      `
        insert into projects (
          id, name, reply_mode, auto_send_enabled, handoff_enabled, enabled, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, now())
        on conflict (id) do update set
          name = excluded.name,
          reply_mode = excluded.reply_mode,
          auto_send_enabled = excluded.auto_send_enabled,
          handoff_enabled = excluded.handoff_enabled,
          enabled = excluded.enabled,
          updated_at = now()
        returning *
      `,
      [
        input.id,
        input.name,
        input.replyMode || 'readonly',
        input.autoSendEnabled ?? false,
        input.handoffEnabled ?? true,
        input.enabled ?? true,
      ],
    );
    return rowToProject(result.rows[0]);
  }

  async getProject(projectId: string): Promise<ProjectConfig | undefined> {
    const result = await this.pool.query('select * from projects where id = $1', [projectId]);
    return result.rows[0] ? rowToProject(result.rows[0]) : undefined;
  }

  async listProjects(): Promise<ProjectConfig[]> {
    const result = await this.pool.query('select * from projects order by updated_at desc');
    return result.rows.map(rowToProject);
  }
}

function rowToProject(row: any): ProjectConfig {
  return {
    id: row.id,
    name: row.name,
    replyMode: row.reply_mode as ReplyMode,
    autoSendEnabled: row.auto_send_enabled,
    handoffEnabled: row.handoff_enabled,
    enabled: row.enabled,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
