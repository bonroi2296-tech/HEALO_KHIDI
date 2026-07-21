-- 백업 테이블 암호화 (2026-07-21, PO 결정 "백업도 암호화해라")
--
-- 배경: 2026-07-20 에 본 테이블(consultation_translations·consultation_messages)을
--   암호화하면서 되돌리기용 스냅샷 `_backup_*_20260720` 을 떴는데, **그 백업이 평문**이었다.
--   본 테이블은 잠그고 옆에 안 잠긴 사본을 둔 꼴 = 암호화 목적(DB 통째 유출 대비)이 반쪽.
--   PO 가 "지우지 말고 백업도 암호화" 를 택함(행수·시각 기록은 남기고 내용만 못 읽게).
--
-- 노출 실측(조치 전): anon·authenticated 둘 다 SELECT 0행 — RLS 켜짐 + 정책 0개라 전면 차단.
--   즉 외부 유출은 없었고, 이건 service_role·DB덤프 경로에 대한 심층방어다.
--
-- 이 파일은 컬럼 추가(DDL)만 담는다. 실제 평문→암호문 이전은 앱과 같은 AES-256-GCM
-- 형식이 필요해 SQL 로 못 하고 스크립트가 한다:
--   npx tsx scripts/backfill-backup-tables-encryption.ts --dry   # 대상 확인
--   npx tsx scripts/backfill-backup-tables-encryption.ts         # 실제 이전
-- (2026-07-21 실행 완료: transcripts 561건 · messages 10건 → 평문 잔존 0 실측)

ALTER TABLE public._backup_transcripts_20260720
  ADD COLUMN IF NOT EXISTS source_text_encrypted     text,
  ADD COLUMN IF NOT EXISTS translated_text_encrypted text;

ALTER TABLE public._backup_messages_20260720
  ADD COLUMN IF NOT EXISTS message_encrypted         text;

-- 평문 컬럼은 스크립트가 NULL 로 비운다(컬럼 자체는 남긴다 — drop 은 되돌리기 불가라
-- 백업 테이블 전체를 지울 때 같이 사라지게 두는 편이 안전).
