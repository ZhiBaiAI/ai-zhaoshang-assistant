import { Lead } from '@ai-zhaoshang/shared';
import { FeishuOpenPlatformClient } from './client';

export interface FeishuLeadFieldMap {
  id: string;
  projectId: string;
  conversationId: string;
  status: string;
  intentLevel: string;
  summary: string;
  phone: string;
  wechat: string;
  city: string;
  budget: string;
  openingTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeishuLeadSyncerOptions {
  client: FeishuOpenPlatformClient;
  appToken: string;
  tableId: string;
  fieldMap?: Partial<FeishuLeadFieldMap>;
}

export class FeishuLeadSyncer {
  private readonly client: FeishuOpenPlatformClient;
  private readonly appToken: string;
  private readonly tableId: string;
  private readonly fieldMap: FeishuLeadFieldMap;

  constructor(options: FeishuLeadSyncerOptions) {
    this.client = options.client;
    this.appToken = options.appToken;
    this.tableId = options.tableId;
    this.fieldMap = {
      ...defaultLeadFieldMap,
      ...options.fieldMap,
    };
  }

  async syncLead(lead: Lead): Promise<unknown> {
    return this.client.createBitableRecord({
      appToken: this.appToken,
      tableId: this.tableId,
      fields: leadToBitableFields(lead, this.fieldMap),
    });
  }

  async listLeadStatusUpdates(): Promise<Array<{ leadId: string; status: Lead['status'] }>> {
    const payload = await this.client.listBitableRecords({
      appToken: this.appToken,
      tableId: this.tableId,
      pageSize: 500,
    });
    const items = extractRecordItems(payload);
    return items
      .map(item => {
        const fields = item.fields || {};
        return {
          leadId: String(fields[this.fieldMap.id] || '').trim(),
          status: String(fields[this.fieldMap.status] || '').trim() as Lead['status'],
        };
      })
      .filter(item => Boolean(item.leadId) && isLeadStatus(item.status));
  }
}

export const defaultLeadFieldMap: FeishuLeadFieldMap = {
  id: '线索ID',
  projectId: '项目ID',
  conversationId: '会话ID',
  status: '状态',
  intentLevel: '意向等级',
  summary: '摘要',
  phone: '手机号',
  wechat: '微信',
  city: '城市',
  budget: '预算',
  openingTime: '开店时间',
  createdAt: '创建时间',
  updatedAt: '更新时间',
};

export function leadToBitableFields(
  lead: Lead,
  fieldMap: FeishuLeadFieldMap = defaultLeadFieldMap,
): Record<string, unknown> {
  return {
    [fieldMap.id]: lead.id,
    [fieldMap.projectId]: lead.projectId,
    [fieldMap.conversationId]: lead.conversationId,
    [fieldMap.status]: lead.status,
    [fieldMap.intentLevel]: lead.profile.intentLevel,
    [fieldMap.summary]: lead.profile.summary,
    [fieldMap.phone]: lead.profile.phone || '',
    [fieldMap.wechat]: lead.profile.wechat || '',
    [fieldMap.city]: lead.profile.city || '',
    [fieldMap.budget]: lead.profile.budget || '',
    [fieldMap.openingTime]: lead.profile.openingTime || '',
    [fieldMap.createdAt]: lead.createdAt,
    [fieldMap.updatedAt]: lead.updatedAt,
  };
}

function extractRecordItems(payload: unknown): Array<{ fields?: Record<string, unknown> }> {
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? items as Array<{ fields?: Record<string, unknown> }> : [];
}

function isLeadStatus(value: string): value is Lead['status'] {
  return [
    'new',
    'chatting',
    'contact_pending',
    'contacted',
    'qualified',
    'invited',
    'visited',
    'deal',
    'invalid',
    'lost',
  ].includes(value);
}
