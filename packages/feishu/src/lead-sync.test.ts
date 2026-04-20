import assert from 'node:assert/strict';
import test from 'node:test';
import { Lead } from '@ai-zhaoshang/shared';
import { FeishuLeadSyncer, leadToBitableFields } from './lead-sync';

const lead: Lead = {
  id: 'lead-1',
  projectId: 'project-1',
  conversationId: 'conv-1',
  status: 'new',
  profile: {
    phone: '13800138000',
    city: '上海',
    intentLevel: 'high',
    summary: '客户想加盟，已留手机号',
  },
  createdAt: '2026-04-17T10:00:00.000Z',
  updatedAt: '2026-04-17T10:00:00.000Z',
};

test('leadToBitableFields maps lead profile to default Chinese fields', () => {
  const fields = leadToBitableFields(lead);

  assert.equal(fields['线索ID'], 'lead-1');
  assert.equal(fields['项目ID'], 'project-1');
  assert.equal(fields['手机号'], '13800138000');
  assert.equal(fields['城市'], '上海');
  assert.equal(fields['意向等级'], 'high');
});

test('leadToBitableFields supports custom field names', () => {
  const fields = leadToBitableFields(lead, {
    id: 'id',
    projectId: 'project',
    conversationId: 'conversation',
    status: 'status',
    intentLevel: 'intent',
    summary: 'summary',
    phone: 'phone',
    wechat: 'wechat',
    city: 'city',
    budget: 'budget',
    openingTime: 'openingTime',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  });

  assert.equal(fields.id, 'lead-1');
  assert.equal(fields.phone, '13800138000');
});

test('FeishuLeadSyncer lists lead status updates from bitable records', async () => {
  const client = {
    async listBitableRecords() {
      return {
        data: {
          items: [
            { fields: { 线索ID: 'lead-1', 状态: 'contacted' } },
            { fields: { 线索ID: 'lead-2', 状态: 'unknown' } },
          ],
        },
      };
    },
  };

  const syncer = new FeishuLeadSyncer({
    client: client as never,
    appToken: 'app_xxx',
    tableId: 'tbl_xxx',
  });
  const updates = await syncer.listLeadStatusUpdates();

  assert.deepEqual(updates, [{ leadId: 'lead-1', status: 'contacted' }]);
});
