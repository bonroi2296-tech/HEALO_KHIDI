-- 코디가 받은 «음성 메모»를 쌓아 두는 표.
--
-- 왜 (2026-09-04 PO): 「한번만 쓰는 게 아니고 계속 여러 번 올릴 수 있는데? 그럼 여러 음성파일을
--   관리할 수 있어야 하잖아. 그리고 이거는 어디 에이전시 아니면 어느 환자가 보내준 음성 파일이라고
--   기록도 남기면 좋겠는데」
--   처음엔 «화면에만 띄우고 안 남기는» 도구로 만들었는데, 실무는 여러 건을 쌓아 두고
--   「이건 누가 보낸 것」을 되짚는 일이었다.
--
-- 🔒 개인정보: 전사본·요약·출처에는 환자 병력·이름·연락처가 그대로 들어간다.
--    inquiries 와 같은 방식으로 «AES-256-GCM 암호화 후 저장»하고, 표 자체는 service_role 전용으로 잠근다.
--    (평문 컬럼을 만들지 마라 — 2026 상반기에 평문 PII 22칸을 걷어내느라 크게 고생했다.)

create table if not exists public.voice_notes (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  created_by    uuid,                       -- 올린 코디(auth.users.id). 계정이 지워져도 기록은 남긴다.

  storage_path  text not null,              -- attachments 버킷 안의 경로
  file_name     text not null,              -- 코디가 알아보는 원래 파일 이름
  byte_size     integer,
  duration_sec  integer,                    -- 아직 안 채운다(나중에 재생 길이를 넣을 자리)

  -- 「누가 보낸 음성인가」 — 에이전시 이름·환자 이름 등 자유 입력. 사람 이름이 들어오므로 암호화.
  source_label_encrypted text,
  -- 문의로 이어졌으면 연결(선택). 접수 전 단계에서 받는 것이 대부분이라 널 허용.
  inquiry_id    bigint references public.inquiries(id) on delete set null,

  language      text,                       -- 판독기가 감지한 말(ru·ko…). 민감정보 아님
  transcript_encrypted text,                -- 들린 그대로(원어)
  summary_encrypted    text,                -- 한국어 요약
  uncertain     jsonb not null default '[]'::jsonb,   -- 확실하지 않은 것(사람 이름 없음 — 값의 «모호함»만)
  ask_next      jsonb not null default '[]'::jsonb,   -- 다음에 확인할 것
  fields        jsonb not null default '{}'::jsonb,   -- 뽑아낸 값(성·이름 포함 가능 → 화면에서만 쓴다)
  -- 음성에 나온 의료 용어를 쉬운 말로 (2026-09-04 PO: 「우리는 전문 의료인이 아니니깐」).
  -- 🛑 «용어 뜻»만 담는다 — 이 환자에게 어떤 의미인지·무엇을 해야 하는지는 담지 않는다(의료 조언 금지).
  glossary      jsonb not null default '[]'::jsonb
);

comment on table public.voice_notes is
  '코디가 받은 음성 메모와 그 판독 결과. 전사본·요약·출처는 AES-256-GCM 암호화 저장(service_role 전용).';

-- 목록은 「최근 것부터」가 기본이고, 문의별로 되짚는 일도 있다.
create index if not exists idx_voice_notes_created_at on public.voice_notes (created_at desc);
create index if not exists idx_voice_notes_inquiry on public.voice_notes (inquiry_id) where inquiry_id is not null;

-- 🔒 service_role 전용. 화면은 반드시 서버 창구를 거친다(브라우저가 직접 못 읽는다).
alter table public.voice_notes enable row level security;
