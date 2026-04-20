import assert from 'node:assert/strict';
import test from 'node:test';
import { BasicTextParser, parseMarkdownBlocks, parsePlainTextBlocks } from './parser';

test('parseMarkdownBlocks keeps heading levels and paragraphs', () => {
  const blocks = parseMarkdownBlocks([
    '# 品牌介绍',
    '',
    '我们提供招商加盟支持。',
    '',
    '## 加盟费用',
    '加盟费 10 万。',
  ].join('\n'));

  assert.equal(blocks.length, 4);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[0].level, 1);
  assert.equal(blocks[2].type, 'heading');
  assert.equal(blocks[2].level, 2);
});

test('parsePlainTextBlocks infers rule block types', () => {
  const blocks = parsePlainTextBlocks('禁止承诺固定收益。\n\n请引导客户留下手机号。');

  assert.equal(blocks[0].chunkType, 'forbidden_rules');
  assert.equal(blocks[1].chunkType, 'lead_rules');
});

test('BasicTextParser returns document metadata', async () => {
  const parser = new BasicTextParser();
  const parsed = await parser.parse({
    id: 'doc-1',
    projectId: 'project-1',
    title: '招商资料',
    sourceType: 'markdown',
    content: '# 标题\n内容',
    sourceUri: 'local://doc-1',
    metadata: { category: 'manual' },
  });

  assert.equal(parsed.document.sourceUri, 'local://doc-1');
  assert.equal(parsed.document.metadata?.category, 'manual');
  assert.equal(parsed.blocks[0].type, 'heading');
});
