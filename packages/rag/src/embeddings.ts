import { EmbeddingProvider } from './types';
import { normalizeContent, sha256 } from './hash';

export interface LocalEmbeddingEndpointOptions {
  endpoint: string;
  model: string;
  dimension: number;
  headers?: Record<string, string>;
}

export class LocalEmbeddingEndpoint implements EmbeddingProvider {
  model: string;
  dimension: number;
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(options: LocalEmbeddingEndpointOptions) {
    this.endpoint = options.endpoint;
    this.model = options.model;
    this.dimension = options.dimension;
    this.headers = options.headers || {};
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding request failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as {
      data?: Array<{ embedding: number[] }>;
      embeddings?: number[][];
    };
    const vectors = payload.data?.map(item => item.embedding) || payload.embeddings || [];
    validateEmbeddingDimensions(vectors, this.dimension);
    return vectors;
  }
}

export class DeterministicEmbeddingProvider implements EmbeddingProvider {
  model = 'deterministic-local-test';
  dimension: number;

  constructor(dimension = 16) {
    this.dimension = dimension;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return texts.map(text => deterministicVector(text, this.dimension));
  }
}

export async function embedChunks<T extends { content: string }>(
  chunks: T[],
  provider: EmbeddingProvider,
): Promise<Array<T & { embeddingModel: string; embeddingDimension: number; embedding: number[] }>> {
  const vectors = await provider.embedTexts(chunks.map(chunk => chunk.content));
  validateEmbeddingDimensions(vectors, provider.dimension);
  return chunks.map((chunk, index) => ({
    ...chunk,
    embeddingModel: provider.model,
    embeddingDimension: provider.dimension,
    embedding: vectors[index],
  }));
}

function validateEmbeddingDimensions(vectors: number[][], dimension: number): void {
  for (const vector of vectors) {
    if (vector.length !== dimension) {
      throw new Error(`Embedding dimension mismatch: expected ${dimension}, got ${vector.length}`);
    }
  }
}

function deterministicVector(text: string, dimension: number): number[] {
  const normalized = normalizeContent(text);
  const values = Array.from({ length: dimension }, (_, index) => {
    const hash = sha256(`${index}:${normalized}`);
    const integer = Number.parseInt(hash.slice(0, 8), 16);
    return (integer / 0xffffffff) * 2 - 1;
  });
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map(value => value / norm);
}
