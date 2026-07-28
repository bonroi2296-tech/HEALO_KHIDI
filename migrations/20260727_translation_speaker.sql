-- 자막·번역 기록에 「누가 말했나」를 남긴다 (2026-07-27)
--
-- 왜: consultation_translations 에 화자 컬럼이 아예 없었다. 그래서 상담방 「자막 기록」
--   패널이 서버에서 끌어온 줄을 전부 이름 없는 "게스트" 로 표시하고, 색도 1번 화자와
--   같은 teal 로 찍혔다 → 한 사람만 말해도 두 사람처럼 보였다(2026-07-27 실회의 PO 제보).
--   회의록 요약(summarize) 입력에도 화자가 없어 "누가 무슨 말을 했는지"가 통째로 유실됐다.
--
-- 형식: 표시 이름(게스트가 입장할 때 입력한 이름)만 저장한다.
--   consultation_admissions.display_name 이 이미 평문이라 같은 수준으로 맞춘다.
--   대화 내용(source_text/translated_text)은 기존대로 암호문 전용.
alter table public.consultation_translations
  add column if not exists speaker_name text;

comment on column public.consultation_translations.speaker_name is
  '발화자 표시 이름 (LiveKit participant name). null = 화자 미상(옛 기록·수동 입력).';
