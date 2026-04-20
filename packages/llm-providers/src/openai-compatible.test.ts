import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAICompatibleProvider } from './openai-compatible';

test('OpenAICompatibleProvider calls chat completions endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedBody = '';

  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    requestedBody = String(init?.body);
    return new Response(JSON.stringify({
      model: 'test-model',
      choices: [{ message: { content: '测试回复' } }],
      usage: { total_tokens: 12 },
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'key',
      model: 'test-model',
    });
    const result = await provider.complete({
      messages: [{ role: 'user', content: '你好' }],
    });

    assert.equal(requestedUrl, 'https://api.example.com/v1/chat/completions');
    assert.equal(JSON.parse(requestedBody).model, 'test-model');
    assert.equal(result.content, '测试回复');
    assert.equal(result.usage?.totalTokens, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
