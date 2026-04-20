import { Pool, PoolClient, PoolConfig } from 'pg';
import { EmbeddingProvider } from './types';
import {
  EmbeddedKnowledgeChunk,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeIngestionJob,
  KnowledgeStore,
  RetrievalHit,
  RetrievalQuery,
} from './types';

export interface PgKnowledgeStoreOptions {
  pool?: Pool;
  poolConfig?: PoolConfig;
  embeddingProvider: EmbeddingProvider;
  vectorWeight?: number;
  keywordWeight?: number;
}

interface ChunkRow {
  id: string;
  project_id: string;
  document_id: string;
  chunk_type: string;
  title_path: string[];
  content: string;
  content_hash: string;
  token_count: number;
  metadata: Record<string, unknown>;
  vector_score?: number;
  keyword_score?: number;
  score?: number;
}

export class PgKnowledgeStore implements KnowledgeStore {
  private pool: Pool;
  private ownsPool: boolean;
  private embeddingProvider: EmbeddingProvider;
  private vectorWeight: number;
  private keywordWeight: number;

  constructor(options: PgKnowledgeStoreOptions) {
    this.pool = options.pool || new Pool(options.poolConfig);
    this.ownsPool = !options.pool;
    this.embeddingProvider = options.embeddingProvider;
    this.vectorWeight = options.vectorWeight ?? 0.7;
    this.keywordWeight = options.keywordWeight ?? 0.3;
  }

  async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  async upsertDocument(document: KnowledgeDocument): Promise<void> {
    await this.pool.query(
      `
        insert into knowledge_documents (id, project_id, title, source_type, source_uri, metadata, status, updated_at)
        values ($1, $2, $3, $4, $5, $6, 'ready', now())
        on conflict (id) do update set
          title = excluded.title,
          source_type = excluded.source_type,
          source_uri = excluded.source_uri,
          metadata = excluded.metadata,
          status = excluded.status,
          updated_at = now()
      `,
      [
        document.id,
        document.projectId,
        document.title,
        document.sourceType,
        document.sourceUri || null,
        document.metadata || {},
      ],
    );
  }

  async createIngestionJob(job: KnowledgeIngestionJob): Promise<void> {
    await this.pool.query(
      `
        insert into knowledge_ingestion_jobs (
          id, project_id, document_id, status, error_message, metadata, started_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, now(), now())
      `,
      [
        job.id,
        job.projectId,
        job.documentId,
        job.status,
        job.errorMessage || null,
        job.metadata || {},
      ],
    );
  }

  async updateIngestionJob(jobId: string, patch: Partial<KnowledgeIngestionJob>): Promise<void> {
    const status = patch.status;
    await this.pool.query(
      `
        update knowledge_ingestion_jobs set
          status = coalesce($2, status),
          error_message = coalesce($3, error_message),
          metadata = metadata || $4::jsonb,
          finished_at = case when $2 in ('completed', 'failed') then now() else finished_at end,
          updated_at = now()
        where id = $1
      `,
      [
        jobId,
        status || null,
        patch.errorMessage || null,
        patch.metadata || {},
      ],
    );
  }

  async replaceDocumentChunks(documentId: string, chunks: EmbeddedKnowledgeChunk[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from knowledge_chunks where document_id = $1', [documentId]);
      for (const chunk of chunks) {
        await insertChunk(client, chunk);
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async searchHybrid(input: {
    query: RetrievalQuery;
    queryEmbedding: number[];
  }): Promise<RetrievalHit[]> {
    const result = await this.pool.query<ChunkRow>(
      `
        with vector_hits as (
          select
            c.id,
            1 - (e.embedding <=> $2::vector) as vector_score
          from knowledge_chunk_embeddings e
          join knowledge_chunks c on c.id = e.chunk_id
          where c.project_id = $1
            and ($5::text[] is null or c.chunk_type = any($5::text[]))
          order by e.embedding <=> $2::vector
          limit $3
        ),
        keyword_hits as (
          select
            c.id,
            ts_rank_cd(c.search_vector, plainto_tsquery('simple', $4)) as keyword_score
          from knowledge_chunks c
          where c.project_id = $1
            and ($5::text[] is null or c.chunk_type = any($5::text[]))
            and c.search_vector @@ plainto_tsquery('simple', $4)
          order by keyword_score desc
          limit $3
        ),
        merged as (
          select
            c.*,
            coalesce(v.vector_score, 0) as vector_score,
            coalesce(k.keyword_score, 0) as keyword_score,
            coalesce(v.vector_score, 0) * $6 + coalesce(k.keyword_score, 0) * $7 as score
          from knowledge_chunks c
          left join vector_hits v on v.id = c.id
          left join keyword_hits k on k.id = c.id
          where v.id is not null or k.id is not null
        )
        select *
        from merged
        order by score desc
        limit $3
      `,
      [
        input.query.projectId,
        toPgVector(input.queryEmbedding),
        input.query.topK,
        input.query.query,
        input.query.chunkTypes || null,
        this.vectorWeight,
        this.keywordWeight,
      ],
    );

    return result.rows.map(row => ({
      chunk: rowToChunk(row),
      score: Number(row.score || 0),
      vectorScore: Number(row.vector_score || 0),
      keywordScore: Number(row.keyword_score || 0),
    }));
  }

  async retrieve(input: Omit<RetrievalQuery, 'topK'> & { topK?: number }): Promise<RetrievalHit[]> {
    const [queryEmbedding] = await this.embeddingProvider.embedTexts([input.query]);
    return this.searchHybrid({
      query: {
        projectId: input.projectId,
        query: input.query,
        topK: input.topK || 5,
        chunkTypes: input.chunkTypes,
      },
      queryEmbedding,
    });
  }
}

async function insertChunk(client: PoolClient, chunk: EmbeddedKnowledgeChunk): Promise<void> {
  await client.query(
    `
      insert into knowledge_chunks (
        id, project_id, document_id, chunk_type, title_path, content,
        content_hash, token_count, metadata, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
    `,
    [
      chunk.id,
      chunk.projectId,
      chunk.documentId,
      chunk.chunkType,
      chunk.titlePath,
      chunk.content,
      chunk.contentHash,
      chunk.tokenCount,
      chunk.metadata,
    ],
  );

  await client.query(
    `
      insert into knowledge_chunk_embeddings (
        chunk_id, embedding_model, embedding_dimension, embedding
      )
      values ($1, $2, $3, $4::vector)
    `,
    [
      chunk.id,
      chunk.embeddingModel,
      chunk.embeddingDimension,
      toPgVector(chunk.embedding),
    ],
  );
}

function rowToChunk(row: ChunkRow): KnowledgeChunk {
  return {
    id: row.id,
    projectId: row.project_id,
    documentId: row.document_id,
    chunkType: row.chunk_type as KnowledgeChunk['chunkType'],
    titlePath: row.title_path || [],
    content: row.content,
    contentHash: row.content_hash,
    tokenCount: row.token_count,
    metadata: row.metadata || {},
  };
}

export function toPgVector(vector: number[]): string {
  return `[${vector.map(value => Number.isFinite(value) ? value : 0).join(',')}]`;
}
