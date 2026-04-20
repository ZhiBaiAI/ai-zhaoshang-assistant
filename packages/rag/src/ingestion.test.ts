import assert from 'node:assert/strict';
import test from 'node:test';
import { DeterministicEmbeddingProvider } from './embeddings';
import { ingestKnowledgeDocument } from './ingestion';
import { MemoryKnowledgeStore } from './memory-store';
import { BasicTextParser } from './parser';

test('ingestKnowledgeDocument parses, chunks, embeds and stores document', async () => {
  const store = new MemoryKnowledgeStore();
  const result = await ingestKnowledgeDocument({
    jobId: 'job-1',
    input: {
      id: 'doc-1',
      projectId: 'project-1',
      title: '招商手册',
      sourceType: 'markdown',
      content: '# 加盟费用\n加盟费 10 万，保证金 2 万。',
    },
    parser: new BasicTextParser(),
    embeddingProvider: new DeterministicEmbeddingProvider(8),
    store,
  });

  assert.equal(result.jobId, 'job-1');
  assert.equal(result.chunkCount, 1);
  assert.equal(store.documents.get('doc-1')?.title, '招商手册');
  assert.equal(store.jobs.get('job-1')?.status, 'completed');
  assert.equal([...store.chunks.values()][0].embedding.length, 8);
});

test('MemoryKnowledgeStore can search ingested chunks', async () => {
  const store = new MemoryKnowledgeStore();
  const embeddingProvider = new DeterministicEmbeddingProvider(8);
  await ingestKnowledgeDocument({
    jobId: 'job-1',
    input: {
      id: 'doc-1',
      projectId: 'project-1',
      title: '招商手册',
      sourceType: 'markdown',
      content: '# 加盟费用\n加盟费 10 万，保证金 2 万。\n\n# 扶持政策\n总部提供培训。',
    },
    parser: new BasicTextParser(),
    embeddingProvider,
    store,
  });

  const costChunk = [...store.chunks.values()].find(chunk => chunk.chunkType === 'cost_info');
  assert.ok(costChunk);
  const hits = await store.searchHybrid({
    query: { projectId: 'project-1', query: '加盟费用', topK: 2 },
    queryEmbedding: costChunk.embedding,
  });

  assert.equal(hits.length, 2);
  assert.equal(hits[0].chunk.chunkType, 'cost_info');
});
