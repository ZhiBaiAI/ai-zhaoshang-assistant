import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkParsedBlocks } from './chunker';
import { KnowledgeDocument, ParsedBlock } from './types';

const document: KnowledgeDocument = {
  id: 'doc-1',
  projectId: 'project-1',
  title: '招商手册',
  sourceType: 'manual',
};

test('chunks paragraphs with title path and inferred type', () => {
  const blocks: ParsedBlock[] = [
    { type: 'heading', level: 1, text: '加盟费用' },
    { type: 'paragraph', text: '加盟费 10 万，保证金 2 万，设备费根据门店面积计算。' },
  ];

  const chunks = chunkParsedBlocks(document, blocks);

  assert.equal(chunks.length, 1);
  assert.deepEqual(chunks[0].titlePath, ['加盟费用']);
  assert.equal(chunks[0].chunkType, 'cost_info');
  assert.match(chunks[0].content, /加盟费/);
  assert.equal(chunks[0].metadata.documentTitle, '招商手册');
});

test('keeps table rows as independent structured chunks', () => {
  const blocks: ParsedBlock[] = [
    { type: 'heading', level: 1, text: '区域政策' },
    {
      type: 'table',
      chunkType: 'region_policy',
      table: {
        headers: ['城市级别', '加盟费', '保护范围'],
        rows: [
          { 城市级别: '一线城市', 加盟费: '20 万', 保护范围: '3 公里' },
          { 城市级别: '二线城市', 加盟费: '12 万', 保护范围: '5 公里' },
        ],
      },
    },
  ];

  const chunks = chunkParsedBlocks(document, blocks);

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].chunkType, 'region_policy');
  assert.match(chunks[0].content, /城市级别: 一线城市/);
  assert.match(chunks[0].content, /保护范围: 3 公里/);
  assert.equal(chunks[1].metadata.rowIndex, 1);
});

test('splits long text with bounded chunk size', () => {
  const text = Array.from({ length: 30 }, (_, index) => `第${index}段内容，介绍招商支持政策和培训服务。`).join('');
  const chunks = chunkParsedBlocks(
    document,
    [
      { type: 'heading', level: 1, text: '扶持政策' },
      { type: 'paragraph', text },
    ],
    { maxChars: 120, minChars: 60, overlapChars: 20 },
  );

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.content.length <= 120));
  assert.ok(chunks.every(chunk => chunk.chunkType === 'support_policy'));
});
