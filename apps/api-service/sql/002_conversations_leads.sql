create table if not exists projects (
  id text primary key,
  name text not null,
  reply_mode text not null default 'readonly',
  auto_send_enabled boolean not null default false,
  handoff_enabled boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id text primary key,
  project_id text not null,
  source text not null,
  session_name text not null,
  last_message text not null default '',
  last_message_at timestamptz not null,
  message_count integer not null default 0,
  handoff boolean not null default false,
  handoff_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists channel_messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  project_id text not null,
  source text not null,
  direction text not null,
  text text not null,
  captured_at timestamptz not null,
  message_time text,
  raw_html text,
  created_at timestamptz not null default now()
);

create table if not exists reply_tasks (
  id text primary key,
  project_id text not null,
  conversation_id text not null references conversations(id) on delete cascade,
  message_id text not null references channel_messages(id) on delete cascade,
  status text not null default 'pending',
  mode text not null default 'readonly',
  suggested_reply text,
  handoff_reason text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key,
  project_id text not null,
  conversation_id text not null references conversations(id) on delete cascade,
  status text not null default 'new',
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, conversation_id)
);

create table if not exists operation_logs (
  id uuid primary key,
  project_id text not null,
  level text not null,
  type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id text primary key,
  project_id text not null,
  source text not null,
  shop_id text not null,
  shop_name text not null,
  review_id text not null,
  author_name text not null,
  rating numeric,
  content text not null,
  sentiment text not null,
  review_time timestamptz not null,
  captured_at timestamptz not null,
  url text,
  replied boolean not null default false,
  reply_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, source, review_id)
);

create table if not exists review_reply_tasks (
  id text primary key,
  project_id text not null,
  source text not null,
  review_id text not null references reviews(id) on delete cascade,
  status text not null default 'pending',
  mode text not null default 'readonly',
  suggested_reply text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists review_reports (
  id text primary key,
  project_id text not null,
  source text not null,
  period text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  review_count integer not null default 0,
  average_rating numeric,
  sentiment jsonb not null default '{}'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  summary text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, source, period, period_start)
);

alter table conversations
  add column if not exists handoff boolean not null default false;

alter table conversations
  add column if not exists handoff_reason text;

alter table reply_tasks
  add column if not exists sent_at timestamptz;

create index if not exists idx_conversations_project_updated
  on conversations(project_id, updated_at desc);

create index if not exists idx_channel_messages_conversation_time
  on channel_messages(conversation_id, captured_at asc);

create index if not exists idx_reply_tasks_project_status
  on reply_tasks(project_id, status, created_at asc);

create index if not exists idx_leads_project_updated
  on leads(project_id, updated_at desc);

create index if not exists idx_operation_logs_project_created
  on operation_logs(project_id, created_at desc);

create index if not exists idx_reviews_project_time
  on reviews(project_id, review_time desc);

create index if not exists idx_review_reply_tasks_project_status
  on review_reply_tasks(project_id, status, created_at asc);

create index if not exists idx_review_reports_project_period
  on review_reports(project_id, period, period_start desc);
