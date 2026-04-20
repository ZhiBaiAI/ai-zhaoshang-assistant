import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRetrievalContext, keywordScore, rankHybridHits } from './retrieval';
import { EmbeddedKnowledgeChunk } from './types';

const baseChunk = {
  documentId: 'doc-1',
  contentHash: 'hash',
  tokenCount: 10,
  titlePath: ['招商政策'],
  metadata: {},
  embeddingModel: 'test',
  embeddingDimension: 3,
};

test('keywordScore matches Chinese business terms', () => {
  assert.equal(keywordScore('加盟费用', '这里介绍加盟费用和保证金'), 1);
  assert.equal(keywordScore('加盟费用', '这里介绍区域保护'), 0);
});

test('rankHybridHits filters project and combines vector and keyword signals', () => {
  const chunks: EmbeddedKnowledgeChunk[] = [
    {
      ...baseChunk,
      id: 'a',
      projectId: 'project-1',
      chunkType: 'cost_info',
      content: '加盟费用 10 万，保证金 2 万',
      embedding: [1, 0, 0],
    },
    {
      ...baseChunk,
      id: 'b',
      projectId: 'project-1',
      chunkType: 'support_policy',
      content: '总部提供培训和运营支持',
      embedding: [0, 1, 0],
    },
    {
      ...baseChunk,
      id: 'c',
      projectId: 'project-2',
      chunkType: 'cost_info',
      content: '其他项目费用',
      embedding: [1, 0, 0],
    },
  ];

  const hits = rankHybridHits({
    query: { projectId: 'project-1', query: '加盟费用', topK: 2 },
    queryEmbedding: [1, 0, 0],
    chunks,
  });

  assert.equal(hits.length, 2);
  assert.equal(hits[0].chunk.id, 'a');
  assert.ok(hits[0].score > hits[1].score);
});

test('buildRetrievalContext includes titles and respects char budget', () => {
  const context = buildRetrievalContext([
    {
      score: 1,
      chunk: {
        id: 'a',
        projectId: 'project-1',
        documentId: 'doc-1',
        chunkType: 'cost_info',
        titlePath: ['加盟费用'],
        content: '加盟费 10 万',
        contentHash: 'hash-a',
        tokenCount: 5,
        metadata: {},
      },
    },
  ], 100);

  assert.match(context, /【加盟费用】/);
  assert.match(context, /加盟费 10 万/);
});
