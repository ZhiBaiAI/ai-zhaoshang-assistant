import { randomUUID } from 'crypto';
import { chunkParsedBlocks, DEFAULT_CHUNKING_OPTIONS } from './chunker';
import { embedChunks } from './embeddings';
import {
  ChunkingOptions,
  DocumentParser,
  EmbeddingProvider,
  IngestionResult,
  KnowledgeStore,
  RawKnowledgeDocument,
} from './types';

export interface IngestKnowledgeDocumentOptions {
  input: RawKnowledgeDocument;
  parser: DocumentParser;
  embeddingProvider: EmbeddingProvider;
  store: KnowledgeStore;
  jobId?: string;
  chunking?: Partial<ChunkingOptions>;
}

export async function ingestKnowledgeDocument(
  options: IngestKnowledgeDocumentOptions,
): Promise<IngestionResult> {
  const jobId = options.jobId || randomUUID();
  const parsed = await options.parser.parse(options.input);
  const chunking = { ...DEFAULT_CHUNKING_OPTIONS, ...options.chunking };

  await options.store.upsertDocument(parsed.document);
  await options.store.createIngestionJob({
    id: jobId,
    projectId: parsed.document.projectId,
    documentId: parsed.document.id,
    status: 'running',
  });

  try {
    const chunks = chunkParsedBlocks(parsed.document, parsed.blocks, chunking);
    const embedded = await embedChunks(chunks, options.embeddingProvider);
    await options.store.replaceDocumentChunks(parsed.document.id, embedded);
    await options.store.updateIngestionJob(jobId, {
      status: 'completed',
      metadata: {
        chunkCount: embedded.length,
        embeddingModel: options.embeddingProvider.model,
        embeddingDimension: options.embeddingProvider.dimension,
      },
    });

    return {
      jobId,
      documentId: parsed.document.id,
      chunkCount: embedded.length,
      embeddingModel: options.embeddingProvider.model,
      embeddingDimension: options.embeddingProvider.dimension,
    };
  } catch (error) {
    await options.store.updateIngestionJob(jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
