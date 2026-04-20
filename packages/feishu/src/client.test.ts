import assert from 'node:assert/strict';
import test from 'node:test';
import { FeishuOpenPlatformClient } from './client';

test('FeishuOpenPlatformClient caches tenant token and creates bitable record', async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];

  globalThis.fetch = (async (url, init) => {
    urls.push(String(url));
    if (String(url).includes('/auth/v3/tenant_access_token/internal')) {
      return new Response(JSON.stringify({
        code: 0,
        tenant_access_token: 'tenant-token',
        expire: 7200,
      }), { status: 200 });
    }
    assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer tenant-token');
    return new Response(JSON.stringify({ code: 0, data: { record: { record_id: 'rec1' } } }), { status: 200 });
  }) as typeof fetch;

  try {
    const client = new FeishuOpenPlatformClient({
      appId: 'app-id',
      appSecret: 'secret',
      baseUrl: 'https://open.feishu.test',
    });
    await client.createBitableRecord({
      appToken: 'appToken',
      tableId: 'tableId',
      fields: { 姓名: '张三' },
    });
    await client.createBitableRecord({
      appToken: 'appToken',
      tableId: 'tableId',
      fields: { 姓名: '李四' },
    });

    assert.equal(urls.filter(url => url.includes('/auth/')).length, 1);
    assert.equal(urls.filter(url => url.includes('/bitable/')).length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
