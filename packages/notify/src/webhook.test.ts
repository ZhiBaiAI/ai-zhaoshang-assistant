import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CompositeNotifier,
  DingTalkWebhookNotifier,
  WeComWebhookNotifier,
} from './webhook';

test('WeComWebhookNotifier posts text message', async () => {
  const originalFetch = globalThis.fetch;
  let requestedBody = '';

  globalThis.fetch = (async (_url, init) => {
    requestedBody = String(init?.body);
    return new Response(JSON.stringify({ errcode: 0 }), { status: 200 });
  }) as typeof fetch;

  try {
    const notifier = new WeComWebhookNotifier('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx');
    await notifier.send({ title: '新线索', content: '客户咨询加盟', level: 'info' });

    const payload = JSON.parse(requestedBody);
    assert.equal(payload.msgtype, 'text');
    assert.match(payload.text.content, /新线索/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('DingTalkWebhookNotifier posts text message and signs when secret exists', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedBody = '';

  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedBody = String(init?.body);
    return new Response(JSON.stringify({ errcode: 0 }), { status: 200 });
  }) as typeof fetch;

  try {
    const notifier = new DingTalkWebhookNotifier(
      'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      'secret',
    );
    await notifier.send({ title: '人工接管', content: '客户询问合同风险' });

    const url = new URL(requestedUrl);
    assert.equal(url.searchParams.get('access_token'), 'xxx');
    assert.ok(url.searchParams.get('timestamp'));
    assert.ok(url.searchParams.get('sign'));
    const payload = JSON.parse(requestedBody);
    assert.equal(payload.msgtype, 'text');
    assert.match(payload.text.content, /人工接管/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('CompositeNotifier continues when one channel succeeds', async () => {
  let sent = 0;
  const notifier = new CompositeNotifier([
    { async send() { throw new Error('failed'); } },
    { async send() { sent += 1; } },
  ]);

  await notifier.send({ title: '新线索', content: '客户咨询加盟' });

  assert.equal(sent, 1);
});
