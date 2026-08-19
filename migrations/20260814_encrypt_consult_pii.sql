-- 상담 PII 암호화 칸 추가 (2026-08-14 보안감사)
--
-- 배경: 프로젝트 규칙은 "환자 PII 는 AES-256-GCM 으로 *_encrypted 컬럼"인데
--   ① consultation_translations.speaker_name (대화록 화자 = 환자 실명) 2,020행
--   ② consultation_admissions.display_name (대기실 입장자 이름) 288행
--   이 둘이 평문으로 쌓이고 있었다(내용 source_text/translated_text 는 이미 암호화).
--
-- 이 마이그레이션은 «암호문 칸만 추가»한다 — 가역적(ADD COLUMN)이라 데이터 손실 없음.
-- 실제 값 이전은 서버 코드가 조회 시 기회주의적으로(평문 발견 → 암호화 후 평문 삭제) 처리하고,
-- 기존 대량 행은 별도 백필 스크립트(PO 확인 후)로 옮긴다.
--
-- ⚠️ requester_ip 는 제외했다: guest-join 이 「같은 IP 재입장」 판정에 평문 매칭(.eq)을 쓰므로
--    암호화하면 그 기능이 깨진다. IP 는 해시 인덱스가 필요한 별건(KNOWN_ISSUES).

alter table public.consultation_translations add column if not exists speaker_name_encrypted text;
alter table public.consultation_admissions   add column if not exists display_name_encrypted  text;
