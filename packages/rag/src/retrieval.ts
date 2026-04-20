import { EmbeddedKnowledgeChunk, KnowledgeChunk, RetrievalHit, RetrievalQuery } from './types';
import { normalizeContent } from './hash';

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length) {
    throw new Error(`Vector dimension mismatch: ${left.length} !== ${right.length}`);
  }
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denominator === 0 ? 0 : dot / denominator;
}

export function keywordScore(query: string, content: string): number {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return 0;
  const normalizedContent = normalizeContent(content).toLowerCase();
  const matched = queryTerms.filter(term => normalizedContent.includes(term.toLowerCase())).length;
  return matched / queryTerms.length;
}

export function rankHybridHits(input: {
  query: RetrievalQuery;
  queryEmbedding: number[];
  chunks: EmbeddedKnowledgeChunk[];
  vectorWeight?: number;
  keywordWeight?: number;
}): RetrievalHit[] {
  const vectorWeight = input.vectorWeight ?? 0.7;
  const keywordWeight = input.keywordWeight ?? 0.3;
  const allowedTypes = input.query.chunkTypes ? new Set(input.query.chunkTypes) : null;

  return input.chunks
    .filter(chunk => chunk.projectId === input.query.projectId)
    .filter(chunk => !allowedTypes || allowedTypes.has(chunk.chunkType))
    .map(chunk => {
      const vectorScore = cosineSimilarity(input.queryEmbedding, chunk.embedding);
      const textScore = keywordScore(input.query.query, chunk.content);
      return {
        chunk: stripEmbedding(chunk),
        vectorScore,
        keywordScore: textScore,
        score: vectorScore * vectorWeight + textScore * keywordWeight,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, input.query.topK);
}

export function buildRetrievalContext(hits: RetrievalHit[], maxChars = 3000): string {
  const sections: string[] = [];
  let usedChars = 0;

  for (const hit of hits) {
    const title = hit.chunk.titlePath.length > 0 ? hit.chunk.titlePath.join(' / ') : hit.chunk.chunkType;
    const section = `【${title}】\n${hit.chunk.content}`;
    if (usedChars + section.length > maxChars) break;
    sections.push(section);
    usedChars += section.length;
  }

  return sections.join('\n\n');
}

function tokenize(value: string): string[] {
  const normalized = normalizeContent(value);
  const cjkTerms = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const latinTerms = normalized.match(/[A-Za-z0-9_]{2,}/g) || [];
  return [...cjkTerms, ...latinTerms];
}

function stripEmbedding(chunk: EmbeddedKnowledgeChunk): KnowledgeChunk {
  const { embedding: _embedding, embeddingModel: _model, embeddingDimension: _dimension, ...rest } = chunk;
  return rest;
}
