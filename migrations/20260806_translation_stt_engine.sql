-- 자막 한 줄이 「어느 길로 왔는지」를 남긴다 (2026-08-06)
--
-- 왜: 자막을 만드는 길이 3개인데 DB 에 구분이 없어 **실사용 품질을 길별로 못 쟀다.**
--   ① 브라우저 받아쓰기(Web Speech) → /translate-realtime
--   ② 서버 받아쓰기(Gemini 멀티모달) → /[id]/stt
--   ③ 맞장구 사전(받아쓰기는 ①, 번역만 사전) → /[id]/translate
--   세 길이 같은 표에 같은 모양으로 저장한다. `confidence` 칸이 있지만 **아무도 안 채워**
--   전 구간 0건이라 구분자로 못 쓴다(2026-08-06 조회로 확인).
--
-- 무엇이 걸려 있나: 2026-08-06 실측에서 ②가 조용한 구간에 **없는 말을 지어내는 것**이
--   확인됐다(무음·잡음 12회 중 10회). ②는 카자흐어 발화가 «반드시» 타는 길이고,
--   08-04 회의에선 그 회의 자막의 47%가 카자흐어였다. 그런데 «전체 자막 중 몇 %가 ②냐»를
--   지금은 셀 수가 없다 → 위험의 크기를 모른 채 추정만 하게 된다.
--
-- 형식: 자유 텍스트가 아니라 정해진 값만. 값 정의·검증의 단일 SoR = src/lib/consultation/sttEngine.ts
--   (클라이언트가 보내는 값이므로 서버에서 반드시 검증한 뒤 넣는다 — 검증 실패 시 null.)
--   기존 줄은 전부 null = 「어느 길인지 모름」(소급 추정 금지 — 추측을 데이터로 만들면 안 된다).
alter table public.consultation_translations
  add column if not exists stt_engine text;

comment on column public.consultation_translations.stt_engine is
  '이 자막 줄을 만든 받아쓰기 경로. browser_webspeech | server_gemini | backchannel_dict | live_translate. null = 미상(2026-08-06 이전 기록). 값 정의 = src/lib/consultation/sttEngine.ts';

-- 「길별로 몇 줄인가」가 가장 잦은 조회라 그 축으로만 인덱스. 부분 인덱스로 옛 null 줄은 제외.
create index if not exists idx_consultation_translations_stt_engine
  on public.consultation_translations (stt_engine)
  where stt_engine is not null;
