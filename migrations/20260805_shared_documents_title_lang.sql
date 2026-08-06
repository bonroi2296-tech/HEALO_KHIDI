-- 환자에게 보낼 서류에 «보일 이름»과 «언어»를 붙인다.
--
-- 왜 (2026-08-05 PO): 한 케이스에 러시아어·카자흐어를 같이 보낸다. 파일명이
--   `SECOND OPINION_RU_AMANOV_TULEGEN.docx` 그대로 뜨면 ①환자가 뭘 눌러야 할지 모르고
--   ②같은 문서의 언어별 사본이 서로 다른 파일처럼 보인다.
--   → 코디가 「의사 소견서」 같은 이름을 붙이고 언어를 고르면, 환자 화면은
--     «자기 언어 것을 먼저» 보여주고 나머지 언어는 접어 둔다.
--
-- 둘 다 비어 있어도 된다(옛 행·급할 때) — 그러면 화면이 파일명을 그대로 쓴다.

ALTER TABLE case_shared_documents ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE case_shared_documents ADD COLUMN IF NOT EXISTS lang text;
