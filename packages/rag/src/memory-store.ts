import { rankHybridHits } from './retrieval';
import {
  EmbeddedKnowledgeChunk,
  KnowledgeDocument,
  KnowledgeIngestionJob,
  KnowledgeStore,
  RetrievalHit,
  RetrievalQuery,
} from './types';

export class MemoryKnowledgeStore implements KnowledgeStore {
  documents = new Map<string, KnowledgeDocument>();
  jobs = new Map<string, KnowledgeIngestionJob>();
  chunks = new Map<string, EmbeddedKnowledgeChunk>();

  async upsertDocument(document: KnowledgeDocument): Promise<void> {
    this.documents.set(document.id, document);
  }

  async createIngestionJob(job: KnowledgeIngestionJob): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async updateIngestionJob(jobId: string, patch: Partial<KnowledgeIngestionJob>): Promise<void> {
    const current = this.jobs.get(jobId);
    if (!current) throw new Error(`Ingestion job not found: ${jobId}`);
    this.jobs.set(jobId, { ...current, ...patch });
  }

  async replaceDocumentChunks(documentId: string, chunks: EmbeddedKnowledgeChunk[]): Promise<void> {
    for (const [id, chunk] of this.chunks) {
      if (chunk.documentId === documentId) {
        this.chunks.delete(id);
      }
    }

    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }
  }

  async searchHybrid(input: {
    query: RetrievalQuery;
    queryEmbedding: number[];
  }): Promise<RetrievalHit[]> {
    return rankHybridHits({
      query: input.query,
      queryEmbedding: input.queryEmbedding,
      chunks: [...this.chunks.values()],
    });
  }
}
