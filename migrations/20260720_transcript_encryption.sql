-- ============================================================
-- 상담 대화 내용 암호화 — 평문 컬럼 NOT NULL 해제 (POSTMORTEMS #102)
--
-- 배경: 프로젝트 규칙은 "환자 PII 는 AES-256-GCM 으로 *_encrypted 컬럼"인데
--   **대화 내용 전체가 평문**으로 쌓이고 있었다(2026-07-20 실측:
--   consultation_translations 460건 / consultation_messages 10건 전부 평문,
--   같은 테이블의 코디 메모 notes_encrypted 는 28건 암호화 — 규칙은 세워놓고 이 경로만 빠짐).
--   상담 대화엔 진단·병기·투약이 그대로 들어간다.
--
-- 왜 이 마이그레이션이 필요한가: 쓰기 경로를 "암호문만 저장(평문 컬럼 null)"으로 바꾸려는데
--   평문 컬럼이 NOT NULL 이라 그대로 두면 **INSERT 가 런타임에 실패**한다.
--   (타입 검사에서 먼저 걸려 배포 전에 발견 — TS2769)
--
-- 안전성: NOT NULL 해제는 **제약을 푸는 방향**이라 기존 행·기존 코드에 영향이 없다.
--   기존 460건은 평문 그대로 남고, 읽기 경로가 "암호문 우선, 없으면 평문 폴백"이라
--   화면도 그대로 보인다. 실제 재암호화는 별도 백필 스크립트로(무중단).
-- ============================================================

ALTER TABLE public.consultation_translations ALTER COLUMN source_text DROP NOT NULL;
ALTER TABLE public.consultation_translations ALTER COLUMN translated_text DROP NOT NULL;
ALTER TABLE public.consultation_messages     ALTER COLUMN message DROP NOT NULL;

-- 무결성 보강: 평문·암호문 둘 다 비어 있는 행은 의미가 없다(빈 기록).
-- 어느 한쪽에는 값이 있어야 한다 — 백필 도중에도 항상 참이므로 지금 걸어도 안전하다.
ALTER TABLE public.consultation_translations
  DROP CONSTRAINT IF EXISTS consultation_translations_source_present;
ALTER TABLE public.consultation_translations
  ADD CONSTRAINT consultation_translations_source_present
  CHECK (source_text IS NOT NULL OR source_text_encrypted IS NOT NULL);

ALTER TABLE public.consultation_messages
  DROP CONSTRAINT IF EXISTS consultation_messages_message_present;
ALTER TABLE public.consultation_messages
  ADD CONSTRAINT consultation_messages_message_present
  CHECK (message IS NOT NULL OR message_encrypted IS NOT NULL);
