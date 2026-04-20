import { Lead, LeadProfile, LeadStatus } from '@ai-zhaoshang/shared';
import { randomUUID } from 'crypto';

export interface LeadStore {
  upsertLead(input: {
    projectId: string;
    conversationId: string;
    profile: LeadProfile;
    status?: LeadStatus;
  }): Promise<Lead>;
  listLeads(projectId: string): Promise<Lead[]>;
  getLead(leadId: string): Promise<Lead | undefined>;
  updateLeadStatus(leadId: string, status: LeadStatus): Promise<Lead>;
}

export class MemoryLeadStore implements LeadStore {
  private leads = new Map<string, Lead>();

  async upsertLead(input: {
    projectId: string;
    conversationId: string;
    profile: LeadProfile;
    status?: LeadStatus;
  }): Promise<Lead> {
    const existing = [...this.leads.values()].find(lead =>
      lead.projectId === input.projectId && lead.conversationId === input.conversationId,
    );
    const now = new Date().toISOString();
    const lead: Lead = {
      id: existing?.id || randomUUID(),
      projectId: input.projectId,
      conversationId: input.conversationId,
      status: input.status || existing?.status || 'new',
      profile: {
        ...(existing?.profile || {}),
        ...input.profile,
        intentLevel: maxIntent(existing?.profile.intentLevel, input.profile.intentLevel),
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.leads.set(lead.id, lead);
    return lead;
  }

  async listLeads(projectId: string): Promise<Lead[]> {
    return [...this.leads.values()]
      .filter(lead => lead.projectId === projectId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getLead(leadId: string): Promise<Lead | undefined> {
    return this.leads.get(leadId);
  }

  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<Lead> {
    const current = this.leads.get(leadId);
    if (!current) throw new Error(`Lead not found: ${leadId}`);
    const updated: Lead = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.leads.set(leadId, updated);
    return updated;
  }
}

function maxIntent(
  left: LeadProfile['intentLevel'] | undefined,
  right: LeadProfile['intentLevel'],
): LeadProfile['intentLevel'] {
  const rank = { low: 0, medium: 1, high: 2 };
  if (!left) return right;
  return rank[right] >= rank[left] ? right : left;
}
