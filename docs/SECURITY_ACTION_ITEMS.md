# HEALO 보안 액션 아이템 — 사용자 직접 처리 필요

> 생성: 2026-04-16
> 커밋 `bd4ab59` (security: 전수 보안 감사) 직후 작성.
> 코드/DB 레벨 조치는 커밋에 들어갔고, 아래는 **외부 콘솔 · 비밀 회전 등 Claude 가 직접 못 건드리는 작업**만 남긴 것.

---

## 🔴 P0 — 48 시간 내 반드시

### 1. Supabase 키 회전 (service_role + anon)

Git 히스토리에 박혀 있던 값이 있고, 과거 문서에도 평문으로 유출돼 있었음 (이번에 스크럽됐지만 히스토리는 남아 있음).

- Supabase Dashboard → 프로젝트 `hvwwlkawaxabhtumjhrg` (healo-khidi) → **Settings → API** → **Reset service_role** → 새 키 복사
- Vercel Project `healo-khidi` → **Settings → Environment Variables** →
  - `SUPABASE_SERVICE_ROLE_KEY` 교체
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 도 같이 회전 권장
- 로컬 `.env.local` 업데이트
- Vercel 재배포 트리거

### 2. Google Maps Browser Key 회전 + HTTP Referrer 제한

- GCP Console → **APIs & Services → Credentials** → 기존 키 삭제, 새 키 발급
- **Application restrictions → HTTP referrers (web sites)** 로 설정하고 아래만 허용:
  - `https://healo-khidi.com/*`
  - `https://*.healo-khidi.com/*`
  - `https://*.vercel.app/*`
  - `http://localhost:3000/*`
- **API restrictions → Restrict key** → Maps JavaScript API, Places API 등 실제 쓰는 것만 허용
- Vercel env `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 교체

### 3. 서버 시크릿 일제 회전

Vercel Project env 에서 아래 모두 새 값으로 갱신 (strong random, 32+ bytes):

- `INTERNAL_ADMIN_SECRET`
- `INTERNAL_API_SECRET`
- `CRON_SECRET`
- `ADMIN_SETUP_SECRET` (있으면)

로컬 `.env.local` 도 동기화.

### 4. 외부 API 키 회전

모두 각 콘솔에서 revoke → 재발급 → Vercel env 교체:

- `GOOGLE_GENERATIVE_AI_API_KEY` (Google AI Studio)
- `HIRA_API_KEY` (HIRA 공공데이터포털)
- `KAKAO_REST_API_KEY` (Kakao Developers)
- `NAVER_CLIENT_SECRET` (Naver Developers)
- `LIVEKIT_API_SECRET` (LiveKit Cloud)

### 5. `ENCRYPTION_KEY_V1` 회전 — **⚠ 주의**

이 키는 `inquiries.email_ciphertext`, `phone_ciphertext` 등을 복호화하는 데 쓰임.
**단순 교체하면 기존 데이터 복호화 불가.** 재암호화 마이그레이션 필요:

1. 새 키 생성해서 `ENCRYPTION_KEY_V2` 로 Vercel env 추가 (V1 은 당분간 남겨둠)
2. 암호화 모듈이 V2 쓰기 + V1/V2 둘 다 읽기 지원하도록 패치 (이미 key versioning 구조면 OK)
3. 배치 스크립트로 기존 row 재암호화 (V1 으로 복호 → V2 로 재암호)
4. 완료 후 V1 env 삭제

현재는 유출 징후 없으면 **우선순위 낮춰도 됨**. 진짜 유출 확인되면 그때 즉시.

---

## 🟠 P1 — 1 주일 내

### 6. Supabase Leaked Password Protection 활성화

Supabase Dashboard → **Authentication → Policies / Password** →
**"Leaked password protection"** 토글 ON.
(HaveIBeenPwned 체크로 털린 비번 가입 차단)

### 7. `vector` extension public → `extensions` 스키마 이동

Advisor 가 경고 중. 재마이그레이션 필요:

```sql
-- 마이그레이션으로 처리 (운영 중이라 다운타임 주의)
CREATE SCHEMA IF NOT EXISTS extensions;
-- pgvector 의존 인덱스/컬럼 재생성 필요 → 직접 플랜 수립 후 적용
```

복잡해서 별도 마이그레이션 PR 로 처리 권장.

### 8. 개인정보처리방침 보강 (PIPA 대응)

`src/lib/policies.js` / `/privacy` 페이지에 현재 빠진 내용 추가:

- 국외이전 수탁자 명시: **Google (Gemini LLM)**, **LiveKit (비디오/오디오 중계, US)**, **AWS (인프라, US)**, **HIRA (공공데이터, KR)**
- PIPA **제28조의8 국외이전 동의 항목** (민감정보 포함 시)
- 보관 기간 명시 (inquiries, cancer_patient_intakes, consultation 녹화 등)
- 파기 절차

암환자 대상이라 민감정보 처리가 많으므로 **법무 리뷰 필수**.

### ~~9. KHIDI consultation 미인증 엔드포인트 결정~~ ✅ **완료** (커밋 다음)

`/api/khidi/consultation/*` 8 개 라우트 일괄 잠금:
- `requireConsultationAccess` 헬퍼 신설 (참가자 검증 + IDOR 차단)
- POST(create) — 인증 필수, `patient_user_id` 강제 = `auth.userId` (admin 제외)
- GET(list) — 본인 참여 세션만 조회 (admin 제외)
- GET/PATCH/messages/translate/documents — 참가자만 (admin/doctor/coordinator/translator/patient)
- token — 공개 → 인증 + 참가자 + 역할별 권한 분리 (patient/doctor 만 publish, admin canPublishData=false), TTL 2h
- translate-realtime — Origin 화이트리스트 + 인증 + (consultationId 시) 참가자 검증
- schedule — 인증된 사용자만

### 10. `inquiries` plaintext 컬럼 제거 결정

`inquiries` 테이블에는 `email`, `phone` 평문 컬럼과 `email_ciphertext`, `phone_ciphertext` 암호화 컬럼이 공존. Ciphertext 만 남기는 마이그레이션 `20260125` 이 scaffold 됐지만 아직 적용 안 됨.

- 기존 관리자 도구가 평문 컬럼에 의존하는지 확인
- 의존하면 먼저 `requireAdminAuth` + 복호화 헬퍼로 전환
- 그 후 plaintext 컬럼 DROP

### 11. `xlsx` 취약점 — 의존성 교체

`app/admin/import/page.jsx` 에서 xlsx 사용. prototype pollution + ReDoS 있으나 SheetJS 공식 수정본은 npm 이 아닌 자체 CDN. 옵션:

- `exceljs` 로 교체 (권장, 유지보수 활발)
- SheetJS CE 를 CDN 에서 직접 받아 pin

관리자 전용이라 P0 는 아니지만 6개월 내 처리 권장.

---

## 🟡 P2 — 이번 분기 내

### 12. `ai@5` (Vercel AI SDK) → `ai@6` 업그레이드

`jsondiffpatch` XSS 의존성 체인. `ai@6` 는 breaking change (streaming API 변경 등) 라 테스트 커버리지 확보 후 진행.

### ~~13. `cancer_patient_intakes` 암호화 레이어 추가~~ ✅ **완료** (커밋 다음)

`first_name_encrypted`, `current_treatment_encrypted`, `diagnosis_date_encrypted` 컬럼 추가 (AES-256-GCM via `encryptionV2`).
- POST 시 자유서술 + PII 자동 암호화
- GET 은 admin only, 기본 마스킹, `?decrypt=1` 명시 시만 복호화
- 평문 컬럼은 backward-compat 으로 유지 (다음 마이그레이션에서 DROP 예정)
- 마이그레이션: `harden_cancer_intake_consultation_encryption_and_rls`

### 14. CSP `unsafe-inline` 제거

`next.config.js` 의 CSP 에 아직 `unsafe-inline` 이 있으면 nonce 기반으로 전환.

### 15. Rate limit persistence

현재 rate limit 은 Vercel isolate 메모리 내 — 같은 IP 가 다른 isolate 히트하면 리셋. Upstash Redis 또는 Supabase edge 테이블로 이전 고려.

---

## ✅ 완료 확인용 체크리스트

외부 콘솔에서 처리 후 체크:

- [ ] Supabase service_role 회전 + Vercel/.env.local 반영 + 재배포
- [ ] Supabase anon key 회전 + 반영
- [ ] Google Maps key 회전 + HTTP referrer 제한
- [ ] `INTERNAL_ADMIN_SECRET` / `INTERNAL_API_SECRET` / `CRON_SECRET` 회전
- [ ] Gemini / HIRA / Kakao / Naver / LiveKit 키 회전
- [ ] Supabase Leaked Password Protection ON
- [ ] 개인정보처리방침 국외이전 조항 보강
- [ ] `ENCRYPTION_KEY_V1` 회전 계획 수립 (즉시 or 유출 탐지 시)

---

## 참고 — 다음 커밋 (LiveKit/intake 강화) 에서 처리된 것

- `requireConsultationAccess` / `requireAuthenticatedUser` 헬퍼 신설 (`src/lib/auth/requireConsultationAccess.ts`)
- KHIDI consultation 8 라우트 IDOR + 인증 잠금 (위 #9 참고)
- LiveKit 토큰 발급 — 참가자 검증 + 역할별 권한 + TTL 2h
- `cancer_patient_intakes` AES-256-GCM 암호화 (위 #13 참고)
- `consultation_sessions` / `consultation_messages` / `consultation_translations` 암호화 컬럼 + 서비스롤 전용 RLS
- 40+ 테이블 service_role-only RLS, profiles/user_roles self-select 정책
- `/coordinator` 경로 미들웨어 세션 게이트 추가
- `/api/admin/leads/assign` 디버그 로그에서 supabase_url / project_ref / key_type / has_service_role_key 누설 제거
- tsconfig `@/*` path alias 추가
- 마이그레이션: `harden_cancer_intake_consultation_encryption_and_rls`

## 참고 — 이전 커밋 (`bd4ab59`) 에서 이미 처리된 것

- user_metadata.role 권한 상승 경로 제거 (앱메타데이터 이관 완료)
- /api/admin/doctors, /api/admin/branches 에 requireAdminAuth 게이트
- /api/rag/inquiries, /api/rag/ingest 인증 게이트 (기존 익명 접근 불가)
- /api/attachments/upload rate limit + 랜덤 경로
- /api/translate-text Origin 화이트리스트 + rate limit
- /api/inquiries/rotate-token 시크릿 헤더화 + timingSafeEqual
- storage.objects + admin_audit_logs RLS 정책 명시화 (Supabase 마이그레이션 `explicit_storage_and_admin_audit_rls_policies` 적용됨)
- `import "server-only"` 가드 (service_role 클라이언트 누출 방지)
- 문서 시크릿 스크럽 + 테스트 비밀번호 env 필수화
- npm audit fix (18 → 3)
- temp_audit.txt / healo_project_context.txt 저장소에서 제거
