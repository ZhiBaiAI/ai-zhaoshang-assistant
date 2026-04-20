import { Lead, LeadProfile, LeadStatus } from '@ai-zhaoshang/shared';
import { randomUUID } from 'crypto';
import { Pool, PoolConfig } from 'pg';
import { LeadStore } from './lead-store';

export class PgLeadStore implements LeadStore {
  private pool: Pool;

  constructor(poolConfig: PoolConfig) {
    this.pool = new Pool(poolConfig);
  }

  async upsertLead(input: {
    projectId: string;
    conversationId: string;
    profile: LeadProfile;
    status?: LeadStatus;
  }): Promise<Lead> {
    const id = randomUUID();
    const result = await this.pool.query(
      `
        insert into leads (id, project_id, conversation_id, status, profile, updated_at)
        values ($1, $2, $3, $4, $5, now())
        on conflict (project_id, conversation_id) do update set
          status = coalesce($4, leads.status),
          profile = leads.profile || $5::jsonb,
          updated_at = now()
        returning *
      `,
      [id, input.projectId, input.conversationId, input.status || 'new', input.profile],
    );
    return rowToLead(result.rows[0]);
  }

  async listLeads(projectId: string): Promise<Lead[]> {
    const result = await this.pool.query(
      'select * from leads where project_id = $1 order by updated_at desc',
      [projectId],
    );
    return result.rows.map(rowToLead);
  }

  async getLead(leadId: string): Promise<Lead | undefined> {
    const result = await this.pool.query('select * from leads where id = $1', [leadId]);
    return result.rows[0] ? rowToLead(result.rows[0]) : undefined;
  }

  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<Lead> {
    const result = await this.pool.query(
      'update leads set status = $2, updated_at = now() where id = $1 returning *',
      [leadId, status],
    );
    if (!result.rows[0]) throw new Error(`Lead not found: ${leadId}`);
    return rowToLead(result.rows[0]);
  }
}

function rowToLead(row: any): Lead {
  return {
    id: row.id,
    projectId: row.project_id,
    conversationId: row.conversation_id,
    status: row.status,
    profile: row.profile,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
