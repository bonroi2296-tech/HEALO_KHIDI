-- 실시간 통역 자막을 기록에 남길 수 있게 «빈 줄 방지» 제약을 정확히 고친다.
--
-- 왜 (2026-08-28 실측):
--   자막 3,553건을 세어 보니 실시간 통역(agents/live-translate) 경로가 **0건**이었다.
--   통역봇은 화면에 자막을 뿌리지만 기록에는 한 줄도 안 들어가고 있었다. 회의록과
--   상담 요약이 그 기록을 근거로 만들어지므로, 통역을 켜고 한 상담은 내용이 통째로 빈다.
--
--   진범은 두 겹이었다: ①화면이 저장 API 를 아예 안 불렀다 ②이 제약이 «원문»을 요구했다.
--   통역 모델은 번역된 자막만 주고 원문을 안 준다(원문 자막은 별도 기능이라 아직 안 켰다).
--
--   원래 의도(20260720_transcript_encryption.sql)는 «평문·암호문 둘 다 비어 있는 행은
--   의미가 없다»였다. 번역문이 있으면 빈 줄이 아니다. 그래서 의도는 그대로 두고
--   «원문 또는 번역 중 하나는 있어야 한다»로 정확히 다시 적는다.
--
--   되돌리려면: 아래 CHECK 를 (source_text IS NOT NULL OR source_text_encrypted IS NOT NULL)
--   로 되돌리면 된다. 기존 행은 전부 새 제약도 만족하므로 지금 걸어도 안전하다.

ALTER TABLE public.consultation_translations
  DROP CONSTRAINT IF EXISTS consultation_translations_source_present;

ALTER TABLE public.consultation_translations
  ADD CONSTRAINT consultation_translations_source_present
  CHECK (
    source_text IS NOT NULL
    OR source_text_encrypted IS NOT NULL
    OR translated_text IS NOT NULL
    OR translated_text_encrypted IS NOT NULL
  );
