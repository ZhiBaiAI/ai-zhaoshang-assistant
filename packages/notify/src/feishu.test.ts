import assert from 'node:assert/strict';
import test from 'node:test';
import { FeishuOpenPlatformNotifier, FeishuWebhookNotifier, formatNotification } from './feishu';

test('formatNotification includes level and title', () => {
  assert.equal(formatNotification({
    level: 'warning',
    title: '新线索',
    content: '客户留下手机号',
  }), '[warning] 新线索\n客户留下手机号');
});

test('FeishuOpenPlatformNotifier sends text through client', async () => {
  let receiveIdType = '';
  let receiveId = '';
  let text = '';
  const client = {
    async sendTextMessage(input: { receiveIdType: string; receiveId: string; text: string }) {
      receiveIdType = input.receiveIdType;
      receiveId = input.receiveId;
      text = input.text;
    },
  };

  const notifier = new FeishuOpenPlatformNotifier(
    client as never,
    'ou_xxx',
    'open_id',
  );
  await notifier.send({ title: '人工接管', content: '客户询问合同风险', level: 'critical' });

  assert.equal(receiveIdType, 'open_id');
  assert.equal(receiveId, 'ou_xxx');
  assert.match(text, /人工接管/);
});

test('FeishuWebhookNotifier posts text message', async () => {
  const originalFetch = globalThis.fetch;
  let requestedBody = '';

  globalThis.fetch = (async (_url, init) => {
    requestedBody = String(init?.body);
    return new Response(JSON.stringify({ code: 0 }), { status: 200 });
  }) as typeof fetch;

  try {
    const notifier = new FeishuWebhookNotifier('https://open.feishu.test/webhook');
    await notifier.send({ title: '新线索', content: '客户咨询加盟' });

    const payload = JSON.parse(requestedBody);
    assert.equal(payload.msg_type, 'text');
    assert.match(payload.content.text, /新线索/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
