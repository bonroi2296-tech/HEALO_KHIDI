-- 첨부 의료문서 번역: 캐시 + 코디 수정본 + 학습 용어사전
-- 왜: (1) 매 요청 Gemini 재호출 비용 제거 (2) 코디 수정본 영구 보존 (3) 수정→사전 축적으로 품질 자가개선.
-- 접근: service_role 전용(RLS on + 정책 없음). 브라우저 직접 접근 금지, 서버 API(supabaseAdmin) 경유 — inquiries 와 동일 신뢰수준.
-- 되돌리기: 순수 추가(테이블 신설)라 가역적.

create table if not exists public.attachment_translations (
  id          bigint generated always as identity primary key,
  path        text not null,                 -- storage 경로(inquiry/...)
  lang        text not null check (lang in ('ko','en','ru')),
  doc         jsonb not null,                -- 모델 원출력(TranslatedDoc)
  edited_doc  jsonb,                          -- 코디 수정본(있으면 표시 우선)
  model       text,
  edited_by   uuid references auth.users(id) on delete set null,
  edited_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (path, lang)
);

alter table public.attachment_translations enable row level security;
-- 정책 없음 = anon/authenticated 접근 차단. service_role 만 RLS 우회(서버 API 전용).

-- 학습 용어사전 — 코디가 번역을 수정하며 등록한 (원문→대상언어) 용어. seed(코드) 와 병합해 프롬프트 주입.
create table if not exists public.doc_glossary_terms (
  id          bigint generated always as identity primary key,
  src         text not null,                 -- 원문 용어(키릴/라틴)
  ko          text,
  en          text,
  ru          text,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.doc_glossary_terms enable row level security;
