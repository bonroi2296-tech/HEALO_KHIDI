# HEALO 보안 체크리스트

> 기능 개발 시 동시 적용 — "나중에 몰아서" 금지 (2026-04-17 교훈)

## 새 API 라우트

- [ ] 인증 헬퍼 추가
  - Admin: `requireAdminAuth` (`src/lib/auth/requireAdminAuth.ts`)
  - Consultation 참가자: `requireConsultationAccess` (`src/lib/auth/requireConsultationAccess.ts`)
  - 일반: `checkAdminAuth` → `authResult.userId` 체크
- [ ] 공개 POST면 rate limit (`checkRateLimit(ip, config)` from `src/lib/rateLimit`)
- [ ] catch 블록에서 error.message 응답 노출 금지 (`"internal_error"` 코드형만)
- [ ] 환자 PII 다루면 `encryptStringNullable()` 암호화

## 새 DB 테이블/컬럼

- [ ] RLS 활성화 + 정책 추가 (기본: service_role only)
- [ ] PII 컬럼이면 `*_encrypted` 컬럼 같이 추가
- [ ] 마이그레이션 파일에 RLS 포함

## 새 페이지

- [ ] 인증 필요하면 `middleware.ts`에 경로 보호 추가
- [ ] 클라이언트에서 service_role 키 접근 안 하는지 확인

## 항상 지킬 것

- `.env`, 시크릿 파일 수정/커밋 절대 금지
- `import "server-only"` — service_role 키 접근하는 서버 모듈에 필수
- 권한은 `app_metadata.role` 기준 (user_metadata 금지 — 클라이언트 조작 가능)
- 평문 PII 응답 시 마스킹 필수 (예: `first_name[0] + "***"`)
- Storage RLS: `attachments`/`documents` = service_role only, `images`/`public-assets` = anon SELECT
