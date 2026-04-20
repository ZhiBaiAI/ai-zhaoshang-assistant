import assert from 'node:assert/strict';
import test from 'node:test';
import { DeterministicEmbeddingProvider, embedChunks } from './embeddings';

test('deterministic embedding provider returns stable normalized vectors', async () => {
  const provider = new DeterministicEmbeddingProvider(8);
  const [first, second] = await provider.embedTexts(['加盟费用', '加盟费用']);

  assert.deepEqual(first, second);
  assert.equal(first.length, 8);
  const norm = Math.sqrt(first.reduce((sum, value) => sum + value * value, 0));
  assert.ok(Math.abs(norm - 1) < 0.000001);
});

test('embedChunks attaches model metadata', async () => {
  const provider = new DeterministicEmbeddingProvider(4);
  const chunks = await embedChunks([
    { id: 'chunk-1', content: '招商政策' },
  ], provider);

  assert.equal(chunks[0].embeddingModel, 'deterministic-local-test');
  assert.equal(chunks[0].embeddingDimension, 4);
  assert.equal(chunks[0].embedding.length, 4);
});
