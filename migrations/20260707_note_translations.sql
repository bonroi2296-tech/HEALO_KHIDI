-- 코디 짧은 메모 자동번역 캐시 (진행 노트·타임라인·채팅 등)
-- 왜: 에이전시가 화면 언어를 바꿔도 코디가 쓴 한글 메모가 그대로 한글 → 상대 언어로 자동번역해 보여준다.
--     매 조회 Gemini 재호출을 없애려 (원문해시, 대상언어) 로 캐시. 짧은 텍스트라 비용 미미(무료티어+캐시).
-- 접근: service_role 전용(RLS on + 정책 없음). 브라우저 직접 접근 금지, 서버 API(supabaseAdmin) 경유.
-- 되돌리기: 순수 추가(테이블 신설)라 가역적.

create table if not exists public.note_translations (
  id           bigint generated always as identity primary key,
  source_hash  text not null,                -- sha256(원문) — 같은 문구 재번역 방지
  target_lang  text not null check (target_lang in ('en','ru','kz','zh','ja')),
  source_lang  text,                          -- 감지된 원문 언어(보통 ko)
  translated   text not null,                 -- 번역 결과
  model        text,
  created_at   timestamptz not null default now(),
  unique (source_hash, target_lang)
);

alter table public.note_translations enable row level security;
-- 정책 없음 = anon/authenticated 접근 차단. service_role 만 RLS 우회(서버 API 전용).

create index if not exists note_translations_lookup
  on public.note_translations (source_hash, target_lang);
