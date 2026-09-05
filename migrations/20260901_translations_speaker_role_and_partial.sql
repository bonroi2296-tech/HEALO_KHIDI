-- 자막 기록에 «누가 말했나(역할)»와 «중간 자막인가»를 남긴다.
--
-- 왜 speaker_role:
--   라우트는 speakerRole 을 받아놓고 insert 에 안 넣고 있었다(컬럼 자체가 없었다).
--   그래서 화면을 새로고침하면 모든 줄이 speaker_role="unknown" 으로 돌아와,
--   내가 한 말과 상대가 한 말이 구분되지 않았다(2026-09-01 PO 제보 «화자 구분이 안 된다»).
--   화면은 이미 trans.speaker_role 을 읽고 있다 — 저장만 빠져 있었다.
--
-- 왜 is_partial:
--   말하는 중에 흐르는 «중간 자막»은 지금까지 저장하지 않았다(같은 발화가 두 번 남는 것 방지).
--   그 결과 하단 자막에 실제로 뭐가 떴는지 나중에 되짚을 방법이 없었다.
--   품질을 재려면 남겨야 한다(2026-09-01 PO 지시, 당분간). 확정 자막과 섞이면 실적·회의록이
--   오염되므로 «칸을 갈라» 저장하고, 회의록·통계는 is_partial=false 만 본다.
--
-- 가역적 추가(컬럼 2개)만 한다 — 기존 행·조회는 그대로 돈다.

alter table public.consultation_translations
  add column if not exists speaker_role text,
  add column if not exists is_partial boolean not null default false;

comment on column public.consultation_translations.speaker_role is
  '누가 말했나: self(나) / other(상대) / unknown. 화면의 화자 구분(색·이름)이 이 값을 읽는다.';
comment on column public.consultation_translations.is_partial is
  '말하는 중 흐른 중간 자막이면 true. 확정 자막만 세는 곳(회의록·KPI·번역 기록)은 false 만 본다.';

-- 중간 자막이 쌓여도 확정 자막 조회가 느려지지 않게 — 대부분의 조회가 false 만 본다.
create index if not exists consultation_translations_session_final_idx
  on public.consultation_translations (session_id, created_at)
  where is_partial = false;
