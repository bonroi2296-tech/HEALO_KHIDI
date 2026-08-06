-- 번역 저장표에 「한국어」를 대상 언어로 추가
--
-- 왜 (2026-08-06 PO): 지금은 «한국어 → 외국어» 한 방향만 저장된다(대상 언어 목록에 ko 가 없다).
--   그래서 환자가 러시아어로 쓴 글·의료진이 러시아어로 낸 소견을 **우리가 읽을 방법이 없었다.**
--   PO 화면에 뜨는 글의 대부분이 그 경우다.
--
-- 비용: 한 번 번역하면 (원문해시, 대상언어)로 여기 남아 다시 안 부른다 — 같은 글을 몇 번 눌러도 0원.
--   PO 확인 질문: *"누를때마다 돈 나가는거야? 그냥 한번 딱하면 기록되게 하면 낭비 없지 않나?"* → 그렇게 돈다.
--
-- 되돌리기: 검사 조건을 «넓히는» 것뿐이라 가역적(기존 행은 전부 그대로 통과한다).

alter table public.note_translations
  drop constraint if exists note_translations_target_lang_check;

alter table public.note_translations
  add constraint note_translations_target_lang_check
  check (target_lang in ('ko', 'en', 'ru', 'kz', 'zh', 'ja'));
