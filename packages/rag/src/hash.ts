import crypto from 'crypto';

export function normalizeContent(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function makeChunkHash(input: {
  projectId: string;
  documentId: string;
  chunkType: string;
  titlePath: string[];
  content: string;
}): string {
  return sha256([
    input.projectId,
    input.documentId,
    input.chunkType,
    input.titlePath.join(' / '),
    normalizeContent(input.content),
  ].join('\n'));
}
