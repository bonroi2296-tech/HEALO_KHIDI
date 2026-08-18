-- 환자 의료문서: ① 같은 파일이 두 줄로 저장되는 것 차단 ② 소프트 삭제 칸
--
-- 사고(2026-08-18): 환자가 137MB PDF 1개를 올렸는데 목록에 2줄. 저장소 파일은 1개(같은 storage_path),
-- 브라우저가 commit 요청을 0.4초 간격으로 2번 보냈고(연결 끊김 재전송으로 추정) 서버는 그대로 2번 insert.
-- 재전송은 브라우저·프록시·모바일망 어디서든 나므로 서버가 «같은 경로는 한 줄»을 DB로 보장한다.
-- 삭제는 소프트(기록 보존 원칙, docs/rules/SELF_QA.md) — deleted_at 만 찍고 파일·행은 남긴다.
--
-- ⚠️ 적용 전제: 살아있는 줄(deleted_at is null) 중 storage_path 중복이 없어야 인덱스가 만들어진다.
--    이미 들어간 중복은 화면의 삭제 버튼(소프트 삭제)으로 접은 뒤 적용한다.

alter table public.consultation_documents
  add column if not exists deleted_at timestamptz;

-- 누가 올렸나(계정 id). 환자는 «본인이 올린 것»만 지울 수 있다 — 코디·의사가 상담방에 공유한
-- 자료를 환자가 지우면 의사 화면에서도 사라지기 때문. 게스트(초대링크)·옛 줄은 null(=출처 미상, 삭제 허용).
alter table public.consultation_documents
  add column if not exists uploaded_by uuid;

-- 살아있는 줄 기준으로 경로 유일. 소프트 삭제된 줄은 제외(부분 인덱스).
create unique index if not exists uq_consultation_documents_live_path
  on public.consultation_documents (storage_path)
  where deleted_at is null;
