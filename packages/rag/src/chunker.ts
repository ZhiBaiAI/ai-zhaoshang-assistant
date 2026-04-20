import {
  ChunkingOptions,
  KnowledgeChunk,
  KnowledgeChunkType,
  KnowledgeDocument,
  ParsedBlock,
} from './types';
import { makeChunkHash, normalizeContent, sha256 } from './hash';

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  minChars: 120,
  maxChars: 800,
  overlapChars: 80,
};

export function chunkParsedBlocks(
  document: KnowledgeDocument,
  blocks: ParsedBlock[],
  options: Partial<ChunkingOptions> = {},
): KnowledgeChunk[] {
  const resolved = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
  const chunks: KnowledgeChunk[] = [];
  const titlePath: string[] = [];
  let textBuffer: Array<{ text: string; chunkType: KnowledgeChunkType; metadata: Record<string, unknown> }> = [];

  const flushTextBuffer = () => {
    if (textBuffer.length === 0) return;
    const chunkType = pickChunkType(textBuffer.map(item => item.chunkType));
    const metadata = mergeMetadata(textBuffer.map(item => item.metadata));
    const content = textBuffer.map(item => item.text).join('\n\n');
    chunks.push(...splitTextIntoChunks(document, content, titlePath, chunkType, metadata, resolved));
    textBuffer = [];
  };

  for (const block of blocks) {
    if (block.type === 'heading') {
      flushTextBuffer();
      updateTitlePath(titlePath, block.text || '', block.level || 1);
      continue;
    }

    if (block.type === 'table' && block.table) {
      flushTextBuffer();
      chunks.push(...tableToChunks(document, block, titlePath));
      continue;
    }

    const text = normalizeContent(block.text || '');
    if (!text) continue;

    const chunkType = block.chunkType || inferChunkType(titlePath, text);
    const metadata = block.metadata || {};
    textBuffer.push({ text, chunkType, metadata });

    const bufferedLength = textBuffer.reduce((sum, item) => sum + item.text.length + 2, 0);
    if (bufferedLength >= resolved.maxChars) {
      flushTextBuffer();
    }
  }

  flushTextBuffer();
  return dedupeChunks(chunks);
}

function splitTextIntoChunks(
  document: KnowledgeDocument,
  content: string,
  titlePath: string[],
  chunkType: KnowledgeChunkType,
  metadata: Record<string, unknown>,
  options: ChunkingOptions,
): KnowledgeChunk[] {
  const normalized = normalizeContent(content);
  if (!normalized) return [];

  if (normalized.length <= options.maxChars) {
    return [makeChunk(document, normalized, titlePath, chunkType, metadata)];
  }

  const chunks: KnowledgeChunk[] = [];
  let offset = 0;
  while (offset < normalized.length) {
    const hardEnd = Math.min(offset + options.maxChars, normalized.length);
    const end = findSemanticBreak(normalized, offset, hardEnd, options.minChars);
    const slice = normalized.slice(offset, end).trim();
    if (slice) {
      chunks.push(makeChunk(document, slice, titlePath, chunkType, { ...metadata, offset }));
    }
    if (end >= normalized.length) break;
    offset = Math.max(offset + 1, end - options.overlapChars);
  }

  return chunks;
}

function tableToChunks(
  document: KnowledgeDocument,
  block: ParsedBlock,
  titlePath: string[],
): KnowledgeChunk[] {
  const table = block.table;
  if (!table) return [];

  return table.rows
    .map((row, index) => {
      const lines = table.headers
        .map(header => [header, row[header] || ''])
        .filter(([, value]) => normalizeContent(value).length > 0)
        .map(([header, value]) => `${header}: ${normalizeContent(value)}`);
      return makeChunk(
        document,
        lines.join('\n'),
        titlePath,
        block.chunkType || 'table_row',
        { ...(block.metadata || {}), rowIndex: index },
      );
    })
    .filter(chunk => chunk.content.length > 0);
}

function makeChunk(
  document: KnowledgeDocument,
  content: string,
  titlePath: string[],
  chunkType: KnowledgeChunkType,
  metadata: Record<string, unknown>,
): KnowledgeChunk {
  const normalized = normalizeContent(content);
  const contentHash = makeChunkHash({
    projectId: document.projectId,
    documentId: document.id,
    chunkType,
    titlePath,
    content: normalized,
  });

  return {
    id: `chunk_${contentHash.slice(0, 24)}`,
    projectId: document.projectId,
    documentId: document.id,
    chunkType,
    titlePath: [...titlePath],
    content: normalized,
    contentHash,
    tokenCount: estimateTokenCount(normalized),
    metadata: {
      ...document.metadata,
      ...metadata,
      sourceType: document.sourceType,
      documentTitle: document.title,
    },
  };
}

function updateTitlePath(titlePath: string[], text: string, level: number): void {
  const normalized = normalizeContent(text);
  if (!normalized) return;
  const index = Math.max(0, level - 1);
  titlePath.splice(index);
  titlePath[index] = normalized;
}

function findSemanticBreak(text: string, start: number, hardEnd: number, minChars: number): number {
  const minEnd = Math.min(start + minChars, hardEnd);
  const candidates = ['\n\n', '\n', '。', '；', ';', '.', '，', ','];
  for (const marker of candidates) {
    const position = text.lastIndexOf(marker, Math.max(start, hardEnd - marker.length));
    if (position >= minEnd && position + marker.length <= hardEnd) {
      return position + marker.length;
    }
  }
  return hardEnd;
}

function inferChunkType(titlePath: string[], text: string): KnowledgeChunkType {
  const combined = `${titlePath.join(' ')} ${text}`;
  if (/费用|加盟费|保证金|设备费|投资|成本|价格/.test(combined)) return 'cost_info';
  if (/区域|城市|省份|保护|代理/.test(combined)) return 'region_policy';
  if (/条件|资质|要求/.test(combined)) return 'joining_condition';
  if (/扶持|支持|培训|运营|督导/.test(combined)) return 'support_policy';
  if (/利润|回本|收益|盈利/.test(combined)) return 'profit_info';
  if (/案例|门店|成功/.test(combined)) return 'success_cases';
  if (/禁用|不能|禁止|不要承诺/.test(combined)) return 'forbidden_rules';
  return 'general';
}

function pickChunkType(types: KnowledgeChunkType[]): KnowledgeChunkType {
  const nonGeneral = types.find(type => type !== 'general');
  return nonGeneral || 'general';
}

function mergeMetadata(items: Array<Record<string, unknown>>): Record<string, unknown> {
  return Object.assign({}, ...items);
}

function dedupeChunks(chunks: KnowledgeChunk[]): KnowledgeChunk[] {
  const seen = new Set<string>();
  return chunks.filter(chunk => {
    const key = sha256(`${chunk.chunkType}\n${chunk.titlePath.join('/')}\n${chunk.content}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function estimateTokenCount(text: string): number {
  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinWords = (text.match(/[A-Za-z0-9_]+/g) || []).length;
  return cjkChars + latinWords;
}
