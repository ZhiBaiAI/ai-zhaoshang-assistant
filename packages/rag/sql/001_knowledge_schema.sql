create extension if not exists vector;

create table if not exists knowledge_documents (
  id uuid primary key,
  project_id uuid not null,
  title text not null,
  source_type text not null,
  source_uri text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_ingestion_jobs (
  id uuid primary key,
  project_id uuid not null,
  document_id uuid references knowledge_documents(id) on delete cascade,
  status text not null default 'pending',
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_chunks (
  id text primary key,
  project_id uuid not null,
  document_id uuid not null references knowledge_documents(id) on delete cascade,
  chunk_type text not null,
  title_path text[] not null default '{}',
  content text not null,
  content_hash text not null,
  token_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(array_to_string(title_path, ' '), '') || ' ' || content)
  ) stored,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, document_id, content_hash)
);

create table if not exists knowledge_chunk_embeddings (
  chunk_id text primary key references knowledge_chunks(id) on delete cascade,
  embedding_model text not null,
  embedding_dimension integer not null,
  embedding vector(1024) not null,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_faqs (
  id uuid primary key,
  project_id uuid not null,
  question text not null,
  answer text not null,
  aliases text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_rules (
  id uuid primary key,
  project_id uuid not null,
  rule_type text not null,
  title text not null,
  content text not null,
  priority integer not null default 100,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_knowledge_documents_project_id
  on knowledge_documents(project_id);

create index if not exists idx_knowledge_ingestion_jobs_project_id
  on knowledge_ingestion_jobs(project_id);

create index if not exists idx_knowledge_chunks_project_type
  on knowledge_chunks(project_id, chunk_type);

create index if not exists idx_knowledge_chunks_search_vector
  on knowledge_chunks using gin(search_vector);

create index if not exists idx_knowledge_chunk_embeddings_vector
  on knowledge_chunk_embeddings using hnsw (embedding vector_cosine_ops);

create index if not exists idx_knowledge_faqs_project_id
  on knowledge_faqs(project_id);

create index if not exists idx_knowledge_rules_project_type
  on knowledge_rules(project_id, rule_type)
  where enabled = true;
