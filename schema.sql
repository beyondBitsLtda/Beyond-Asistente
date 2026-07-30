-- ============================================================
-- Beyond Bits — schema do cérebro (Supabase / Postgres + pgvector)
-- Rode este arquivo no SQL Editor do Supabase (uma vez).
-- ============================================================

-- 1) Extensão vetorial
create extension if not exists vector;

-- 2) Tabela de documentos (cada linha = um trecho indexável)
create table if not exists documents (
  id            text primary key,          -- id estável da origem (ex.: id do card do Trello + índice do chunk)
  source        text not null,             -- 'trello' | 'brain'
  board         text,                      -- nome do board/coluna de origem
  title         text,
  content       text not null,             -- o texto que foi embeddado
  url           text,                      -- link para a origem (card, nota)
  last_modified timestamptz,               -- usado para ordenar por recência (o HUD depende disso)
  metadata      jsonb default '{}'::jsonb,
  embedding     vector(768),               -- gemini-embedding-001 @ 768 dims
  updated_at    timestamptz default now()
);

-- 3) Índices
--    HNSW para busca vetorial rápida por cosseno
create index if not exists documents_embedding_idx
  on documents using hnsw (embedding vector_cosine_ops);
--    Ordenação por recência
create index if not exists documents_last_modified_idx
  on documents (last_modified desc);

-- 4) Função de busca por similaridade
--    Retorna os top_k mais próximos, opcionalmente filtrando por origem.
create or replace function match_documents(
  query_embedding vector(768),
  match_count     int   default 5,
  filter_source   text  default null
)
returns table (
  id            text,
  source        text,
  board         text,
  title         text,
  content       text,
  url           text,
  last_modified timestamptz,
  similarity    float
)
language sql stable
as $$
  select
    d.id, d.source, d.board, d.title, d.content, d.url, d.last_modified,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where filter_source is null or d.source = filter_source
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
