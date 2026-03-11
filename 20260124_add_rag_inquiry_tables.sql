-- HEALO: RAG-ready inquiry storage (STEP 1)
-- Adds new tables only. Does NOT modify existing tables.

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- A) normalized_inquiries
create table if not exists public.normalized_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  source_type text not null, -- 'ai_agent' | 'inquiry_form' | 'human_agent'
  source_inquiry_id bigint null references public.inquiries(id),
  language text not null, -- en / ja / ko
  country text null,
  treatment_id uuid null references public.treatments(id),
  treatment_slug text null,
  objective text null,
  constraints jsonb not null default '{}'::jsonb,
  raw_message text null,
  extraction_confidence numeric null,
  missing_fields text[] null,
  contact jsonb null -- { email, messenger_channel, messenger_handle }
);

create index if not exists normalized_inquiries_created_at_idx
  on public.normalized_inquiries (created_at desc);

create index if not exists normalized_inquiries_treatment_id_idx
  on public.normalized_inquiries (treatment_id);

create index if not exists normalized_inquiries_constraints_gin_idx
  on public.normalized_inquiries using gin (constraints);

-- B) human_touchpoints
create table if not exists public.human_touchpoints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  normalized_inquiry_id uuid references public.normalized_inquiries(id),
  channel text, -- whatsapp / line / kakao
  started_at timestamptz,
  status text, -- active / closed
  outcome text, -- connected / no_show / converted
  notes text null
);

-- C) RAG layer
create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  source_type text not null, -- treatment / hospital / review / normalized_inquiry / policy / faq
  source_id uuid not null,
  lang text not null,
  title text,
  content text not null,
  version int default 1
);

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.rag_documents(id) on delete cascade,
  chunk_index int,
  content text not null,
  metadata jsonb default '{}'::jsonb
);

-- Optional: pgvector support
-- If pgvector is available, you can add an embeddings table like this:
-- create extension if not exists vector;
-- create table public.rag_embeddings (
--   id uuid primary key default gen_random_uuid(),
--   document_id uuid references public.rag_documents(id) on delete cascade,
--   chunk_id uuid references public.rag_chunks(id) on delete cascade,
--   embedding vector(1536),
--   created_at timestamptz default now()
-- );

-- RLS
alter table public.normalized_inquiries enable row level security;
alter table public.human_touchpoints enable row level security;
alter table public.rag_documents enable row level security;
alter table public.rag_chunks enable row level security;

-- Service role only (normalized_inquiries, human_touchpoints)
drop policy if exists normalized_inquiries_service_only on public.normalized_inquiries;
create policy normalized_inquiries_service_only
  on public.normalized_inquiries
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists human_touchpoints_service_only on public.human_touchpoints;
create policy human_touchpoints_service_only
  on public.human_touchpoints
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Public read for selected source types (rag_documents, rag_chunks)
drop policy if exists rag_documents_public_read on public.rag_documents;
create policy rag_documents_public_read
  on public.rag_documents
  for select
  using (source_type in ('treatment','hospital','review','faq','policy'));

drop policy if exists rag_chunks_public_read on public.rag_chunks;
create policy rag_chunks_public_read
  on public.rag_chunks
  for select
  using (
    exists (
      select 1
      from public.rag_documents d
      where d.id = rag_chunks.document_id
        and d.source_type in ('treatment','hospital','review','faq','policy')
    )
  );
