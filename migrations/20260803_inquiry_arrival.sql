-- 문의 유입 기록 (2026-08-03)
--
-- 왜: 지금 문의에 남는 언어는 폼에서 고른 «답변 희망 언어» 하나뿐이라
--     «러시아어 화면이 실제로 문의를 데려왔나», «검색인가 에이전시인가 광고인가»,
--     «어느 페이지를 보고 문의했나»를 셀 수 없다. 다국어·콘텐츠 투자가 실적으로
--     이어졌는지 증명하려면(중간평가 정성근거 포함) 이 네 칸이 필요하다.
--
-- 개인정보: 유입 주소를 통째로 저장하지 않고 호스트·경로·캠페인 파라미터만 남긴다.
--           개인 식별자가 아니므로 암호화 대상이 아니다.
--
-- 되돌리기: 전부 컬럼 «추가»뿐이라 기존 동작에 영향 없음. 되돌리려면 drop column.

alter table public.inquiries
  add column if not exists source_locale text,
  add column if not exists referrer_host text,
  add column if not exists landing_path  text,
  add column if not exists utm           jsonb;

comment on column public.inquiries.source_locale is '문의 제출 시점의 화면 언어. 폼에서 고른 답변 희망 언어와 다를 수 있다';
comment on column public.inquiries.referrer_host is '첫 진입 시 유입 호스트. 직접 방문·내부 이동이면 NULL';
comment on column public.inquiries.landing_path  is '첫 진입 경로 — 어느 콘텐츠가 문의를 데려왔는지';
comment on column public.inquiries.utm           is 'utm_source / utm_medium / utm_campaign (광고·캠페인 유입)';
