-- 접수 «이후»에 들어오는 추가 정보(글)를 문의에 붙인다.
--
-- 왜 필요한가 (2026-08-03, 문의 #60):
--   접수는 끝났는데 그 뒤로도 환자·에이전시가 계속 정보를 준다 —
--   *"현재 온몸이 심하게 부어 있고, 허리 양쪽은 물이 든 주머니 같습니다"* 같은 것.
--   서류(첨부)로는 못 받는 내용이고, 코디 개인 메모(short_memo)에 적으면
--   **소견을 주는 의료진에게 안 간다.** 그래서 문의에 붙는 «추가 정보» 칸을 따로 만든다.
--
-- 모양: [{ "at": ISO시각, "by": "누가", "text_encrypted": "{...AES-256-GCM...}" }]
--   본문은 환자 건강정보라 평문으로 두지 않는다(첨부·인테이크와 같은 규칙).
--
-- 되돌리기: 컬럼 추가만 — 기존 행은 NULL 이고 읽는 쪽이 빈 배열로 취급한다.
alter table public.inquiries
  add column if not exists follow_ups jsonb;

comment on column public.inquiries.follow_ups is
  '접수 후 추가로 들어온 정보(글). [{at, by, text_encrypted}] — 본문은 AES-256-GCM 암호문.';
