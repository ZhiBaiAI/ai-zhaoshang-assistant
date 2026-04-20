export type KnowledgeChunkType =
  | 'brand_intro'
  | 'investment_policy'
  | 'cost_info'
  | 'joining_condition'
  | 'region_policy'
  | 'support_policy'
  | 'profit_info'
  | 'customer_pain'
  | 'selling_points'
  | 'success_cases'
  | 'faq'
  | 'forbidden_rules'
  | 'lead_rules'
  | 'handoff_rules'
  | 'general'
  | 'table_row';

export type ParsedBlockType = 'heading' | 'paragraph' | 'list' | 'table' | 'faq' | 'rule';

export interface KnowledgeDocument {
  id: string;
  projectId: string;
  title: string;
  sourceType: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'markdown' | 'html' | 'text' | 'manual';
  sourceUri?: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedTable {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export interface ParsedBlock {
  type: ParsedBlockType;
  text?: string;
  level?: number;
  table?: ParsedTable;
  chunkType?: KnowledgeChunkType;
  metadata?: Record<string, unknown>;
}

export interface ChunkingOptions {
  minChars: number;
  maxChars: number;
  overlapChars: number;
}

export interface KnowledgeChunk {
  id: string;
  projectId: string;
  documentId: string;
  chunkType: KnowledgeChunkType;
  titlePath: string[];
  content: string;
  contentHash: string;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

export interface EmbeddingProvider {
  model: string;
  dimension: number;
  embedTexts(texts: string[]): Promise<number[][]>;
}

export interface EmbeddedKnowledgeChunk extends KnowledgeChunk {
  embeddingModel: string;
  embeddingDimension: number;
  embedding: number[];
}

export interface RetrievalQuery {
  projectId: string;
  query: string;
  topK: number;
  chunkTypes?: KnowledgeChunkType[];
}

export interface RetrievalHit {
  chunk: KnowledgeChunk;
  score: number;
  vectorScore?: number;
  keywordScore?: number;
}

export interface ParsedDocument {
  document: KnowledgeDocument;
  blocks: ParsedBlock[];
}

export interface DocumentParser {
  parse(input: RawKnowledgeDocument): Promise<ParsedDocument>;
}

export interface RawKnowledgeDocument {
  id: string;
  projectId: string;
  title: string;
  sourceType: KnowledgeDocument['sourceType'];
  content: string;
  sourceUri?: string;
  metadata?: Record<string, unknown>;
}

export type IngestionJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface KnowledgeIngestionJob {
  id: string;
  projectId: string;
  documentId: string;
  status: IngestionJobStatus;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeStore {
  upsertDocument(document: KnowledgeDocument): Promise<void>;
  createIngestionJob(job: KnowledgeIngestionJob): Promise<void>;
  updateIngestionJob(jobId: string, patch: Partial<KnowledgeIngestionJob>): Promise<void>;
  replaceDocumentChunks(documentId: string, chunks: EmbeddedKnowledgeChunk[]): Promise<void>;
  searchHybrid(input: {
    query: RetrievalQuery;
    queryEmbedding: number[];
  }): Promise<RetrievalHit[]>;
}

export interface IngestionResult {
  jobId: string;
  documentId: string;
  chunkCount: number;
  embeddingModel: string;
  embeddingDimension: number;
}
