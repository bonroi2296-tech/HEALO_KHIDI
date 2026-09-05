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

### 8. 개인정보처리방침 보강 (PIPA 대응) — **🟡 부분 완료 + 법무 리뷰 필요**

> ⚠️ **경로 정정 (2026-08-27)** — 아래 「추가됨」이 가리키는 `app/signup/SignupPremium.jsx` 는 **없는 파일**이다
> (폐기된 premium 가입 화면. 프리미엄 전면 폐기 커밋 `825d61e3` / PR #288 에서 화면째 삭제).
> **현재 국외이전 동의는 문의 폼**(`app/inquiry/_components/UnifiedInquiryFunnel.jsx`, `crossBorder` 필수)**에서 받는다.**
> 가입 화면이 그걸 안 받는 것은 **누락이 아니라 의도된 설계**다(`src/lib/legal/consentForms.js` 「문 앞 마찰 0 유지」).
> 🔎 **이 §8 항목 전체가 낡았다.** 국외이전·제3자 제공의 최신 판단은 `src/lib/legal/privacyPolicy.js` 머리 주석에 있고
> (2026-08-20 실측으로 진짜 문의 6건 전부에 `cross_border_kr` 동의 기록 확인), 남은 행동은 **에이전시 데이터 공유 계약 서명** 하나다.

**(이하는 삭제된 화면의 당시 구현 기록 — 이력):**
- 이전 목적, 이전 항목, 수탁자/국가/목적, 이전 방법, 보유·이용 기간, 거부권 6가지 항목
- 체크박스 + 세부 내용 펼침 모달
- 한국어/영어 기본 제공 (다른 언어 추가 필요)
- 동의 시각 + 언어 + 버전 `user_metadata` 에 기록

**남은 작업** (제가 못 함):
- `/privacy` 페이지 본문 국외이전 조항 추가 (동일 내용)
- 법무팀 최종 문구 검토
- 다른 언어 (ru / kz / zh / ja) 번역 추가
- 인테이크 폼에도 추가 (환자가 회원가입 전 인테이크 작성 시)

### ~~9. KHIDI consultation 미인증 엔드포인트 결정~~ ✅ **완료** (커밋 다음)

`/api/khidi/consultation/*` 8 개 라우트 일괄 잠금:
- `requireConsultationAccess` 헬퍼 신설 (참가자 검증 + IDOR 차단)
- POST(create) — 인증 필수, `patient_user_id` 강제 = `auth.userId` (admin 제외)
- GET(list) — 본인 참여 세션만 조회 (admin 제외)
- GET/PATCH/messages/translate/documents — 참가자만 (admin/doctor/coordinator/translator/patient)
- token — 공개 → 인증 + 참가자 + 역할별 권한 분리 (patient/doctor 만 publish, admin canPublishData=false), TTL 2h
- translate-realtime — Origin 화이트리스트 + 인증 + (consultationId 시) 참가자 검증
- schedule — 인증된 사용자만

### ~~10. `inquiries` plaintext 컬럼 제거~~ ✅ **마이그레이션 파일 준비됨**

- 코드에서 `email` 평문 사용처 전부 제거 확인됨 (encrypted_email jsonb 로 전환)
- 마이그레이션: `migrations/20260420_drop_inquiries_plaintext_email.sql`
- 안전장치: DROP 전에 `email IS NOT NULL AND encrypted_email IS NULL` row 존재 시 RAISE EXCEPTION
- **사용자 실행 필요**: Supabase Dashboard → SQL Editor 에서 수동 실행 + 백업 확보

추가로 `cancer_patient_intakes` 평문 컬럼(first_name / current_treatment / diagnosis_date) DROP 도 동일 패턴 준비됨: `migrations/20260420_drop_cancer_intake_plaintext.sql`

### ~~11. `xlsx` 취약점~~ ✅ **완료**

`exceljs` 로 교체 완료 (`app/admin/import/page.jsx`). npm audit: xlsx 관련 취약점 0.

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

## 참고 — 이후 커밋 (DB 타입 / Sentry / 테스트 / PIPA UI) 에서 처리된 것

- **Supabase DB 타입 생성** (`src/types/database.types.ts`, 3007줄) + 모든 클라이언트 팩토리에 `SupabaseClient<Database>` 타입 바인딩
- **`tsconfig.json` `strictNullChecks: true`** (292 → 232 type error, discriminated union 내러잉 복구 — admin auth 60건 해소)
- **`npm run typecheck` 스크립트 추가** (`tsc --noEmit`)
- **Sentry 활성화** — `instrumentation.ts` (onRequestError 캡처) + `app/error.jsx` / `app/global-error.jsx` 에 Sentry dynamic import captureException
- **webpack Prisma/OpenTelemetry ignore** (next.config.js) — Sentry 번들 critical warning 제거 → `✓ Compiled successfully` 무경고
- **Consultation API 보안 회귀 테스트** (`src/lib/auth/requireConsultationAccess.test.ts`) — 12개 시나리오 (401/403/404/429, 참가자 5종, requireRole 게이트) 전부 통과
- **xlsx → exceljs 교체** (`app/admin/import/page.jsx`) — prototype pollution 취약점 해소
- **DROP 마이그레이션 파일** 2종 — inquiries.email, cancer_patient_intakes 평문 3컬럼 (안전장치 포함, 사용자 수동 실행)
- **PIPA §28조의8 국외이전 동의 UI** (가입 폼) — 6항목 고지 + 별도 체크박스 + 동의 메타데이터 기록
- `.gitignore` 에 `*.tsbuildinfo` 추가 (빌드 캐시 커밋 방지)

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
