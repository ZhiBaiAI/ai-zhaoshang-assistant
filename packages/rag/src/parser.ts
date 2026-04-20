import {
  DocumentParser,
  KnowledgeChunkType,
  ParsedBlock,
  ParsedDocument,
  RawKnowledgeDocument,
} from './types';
import { normalizeContent } from './hash';

export class BasicTextParser implements DocumentParser {
  async parse(input: RawKnowledgeDocument): Promise<ParsedDocument> {
    const blocks = input.sourceType === 'markdown'
      ? parseMarkdownBlocks(input.content)
      : parsePlainTextBlocks(input.content);

    return {
      document: {
        id: input.id,
        projectId: input.projectId,
        title: input.title,
        sourceType: input.sourceType,
        sourceUri: input.sourceUri,
        metadata: input.metadata,
      },
      blocks,
    };
  }
}

export function parseMarkdownBlocks(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let buffer: string[] = [];

  const flushParagraph = () => {
    const text = normalizeContent(buffer.join('\n'));
    if (text) {
      blocks.push({
        type: 'paragraph',
        text,
        chunkType: inferBlockType(text),
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: normalizeContent(heading[2]),
      });
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph();
      continue;
    }

    buffer.push(line);
  }

  flushParagraph();
  return blocks;
}

export function parsePlainTextBlocks(content: string): ParsedBlock[] {
  return content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(text => normalizeContent(text))
    .filter(Boolean)
    .map(text => ({
      type: 'paragraph',
      text,
      chunkType: inferBlockType(text),
    }));
}

function inferBlockType(text: string): KnowledgeChunkType | undefined {
  if (/^问[:：]|^Q[:：]|常见问题|FAQ/i.test(text)) return 'faq';
  if (/禁用|禁止|不能|不要承诺/.test(text)) return 'forbidden_rules';
  if (/留资|手机号|微信|联系方式/.test(text)) return 'lead_rules';
  if (/转人工|人工接管|投诉|不确定/.test(text)) return 'handoff_rules';
  return undefined;
}
