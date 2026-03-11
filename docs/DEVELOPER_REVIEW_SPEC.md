# HEALO 개발자 검토 명세 (Developer Review Spec)

> **목적:** 실제 구현된 소스 구조, DB 구조, 인증/API 설계를 개발자가 검토·검증할 수 있도록 기술 문서로 정리한다.  
> **대상:** 신규 합류 개발자, 코드 리뷰어, 아키텍처 검토자.

---

## 1. 스택 및 실행 환경

| 항목 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript + JavaScript (JSX) 혼용 |
| DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth + custom role (admin / hospital_users) |
| Styling | Tailwind CSS |
| AI/LLM | Vercel AI SDK + @ai-sdk/google, @ai-sdk/openai |
| 배포 | Vercel (vercel.json: cron 포함) |

**주요 스크립트:**
- `npm run dev` — 로컬 개발 (Next dev + webpack)
- `npm run build` — 프로덕션 빌드
- `npm run test` / `npm run test:run` — Vitest
- `npm run verify:rag` — RAG 회귀 검증 (CI에서 사용)

---

## 2. 소스 코드 구조

### 2.1 디렉터리 레이아웃

```
HEALO_Demo/
├── app/                    # Next.js App Router
│   ├── layout.jsx          # Root layout (metadata, ClientShell)
│   ├── page.jsx            # Public home
│   ├── ClientShell.jsx     # 공통: Header/Footer/PortalTopBar, 하단 네비, 라우팅
│   ├── (public)            # /treatments, /hospitals, /inquiry, /login, /signup, /search ...
│   ├── admin/              # 관리자 포털 (layout: AdminGateClient + AdminNav)
│   │   ├── _components/    # AdminNav, AdminGuideModal 등
│   │   ├── hospitals/      # 병원관리 (HospitalManager, 시술 자동생성 등)
│   │   ├── inquiries/, leads/, treatments/, rag/, playbook/, crawl/, ...
│   ├── partner/            # 병원 포털 (layout: HospitalGateClient + HospitalNav)
│   │   ├── _components/    # HospitalNav, HospitalGateClient
│   │   ├── leads/, profile/, treatments/
│   └── api/                # API Routes (REST)
├── src/
│   ├── components.jsx      # 공통 UI: Header, MobileBottomNav, HeroSection, CardListSection, ...
│   ├── components/         # Modals, Toast, ErrorBoundary, SEO
│   ├── lib/
│   │   ├── rag/            # RAG: supabaseAdmin, ingest, chunker, safeSearch, ...
│   │   ├── auth/           # requireAdminAuth, checkAdminAuth, checkHospitalAuth
│   │   ├── supabase/       # browser.ts, server.ts (createClient)
│   │   ├── data/           # supabaseClient.js, supabaseServer.js (public anon)
│   │   ├── hospitalOffers/ # 시술 자동생성: crawlPipeline, extractOffersLLM, ssrfSafeFetch, types
│   │   ├── crawl/          # crawl jobs, job-runner, job-review, sources (HIRA, Google, ...)
│   │   ├── enrichment/     # pipeline, registry, sources (google-places, ai-generator, ...)
│   │   ├── validation/     # admin.ts (Zod: HospitalCreateSchema, TreatmentCreateSchema, ...)
│   │   ├── audit/          # adminAuditLog
│   │   ├── rateLimit.ts    # IP 기반 rate limit (RATE_LIMITS.ADMIN 등)
│   │   ├── security/       # encryption, attachmentAuth, maskPii, piiJson
│   │   ├── notifications/  # adminNotifier, emailSender, recipients
│   │   ├── automation/     # playbookAutoImprove, playbookDailyEval, playbookAbFinalize
│   │   ├── chat/           # generateReply (AI 챗봇)
│   │   ├── i18n/           # 다국어 키-값, getLangCodeFromCookie, t()
│   │   └── ...
│   └── index.css           # Tailwind 진입, safe-area 유틸, 터치 타겟
├── migrations/             # SQL 마이그레이션 (순서대로 적용 필요)
├── middleware.ts           # /admin, /partner 경로 보호 (admin 체크, 세션 갱신)
├── next.config.js          # webpack splitChunks, headers, optimizePackageImports
├── tailwind.config.js
└── vercel.json             # cron: /api/cron/crawl
```

### 2.2 컨벤션

- **API Route:** `app/api/**/route.ts` (또는 `.js`). GET/POST 등 export.
- **Admin API:** 대부분 `requireAdminAuth(request)` 사용 후 `supabaseAdmin` (service_role)으로 DB 접근.
- **Partner API:** `checkHospitalAuth(request)` 후 `hospital_id` 스코프로 제한.
- **Public API:** anon 또는 쿠키 세션만 사용 (예: `/api/chat`, `/api/inquiries/create`).
- **Supabase 클라이언트:**
  - **브라우저(공개):** `src/lib/data/supabaseClient.js` (anon key) — RLS 적용.
  - **서버(anon):** `src/lib/supabase/server.ts` → `createSupabaseServerClient()` — 쿠키 세션.
  - **서버(admin/backend):** `src/lib/rag/supabaseAdmin.ts` → `supabaseAdmin` (service_role, RLS 우회). `assertSupabaseEnv()` 필수 호출.

---

## 3. 데이터베이스 구조

### 3.1 핵심 테이블 (공개·비즈니스)

| 테이블 | 용도 |
|--------|------|
| `hospitals` | 병원 마스터. `slug`, `name`, `website`, `is_published`, `is_partner`, `i18n`(jsonb), `enrichment_log`, `data_source`, `last_crawled_at` 등. |
| `treatments` | 시술. `hospital_id` FK, `slug`, `name`, `price_min/max`, `i18n`, `display_order`, `is_published` 등. |
| `treatment_sources` | 시술 출처(자동생성). `treatment_id`, `hospital_id`, `captured_at`, `sources`(jsonb), `evidence`(jsonb), `raw_hash`. |
| `inquiries` | 고객 문의 원본. `status`, `status_reason`, PII 암호화 등. |
| `normalized_inquiries` | 정규화된 문의. 리드 배정·품질 점수·채널 등. |
| `hospital_leads` | 병원별 리드. `normalized_inquiry_id`, `hospital_id`, `status`(queued/sent/viewed/replied/converted/rejected/expired). |
| `hospital_users` | 병원 담당자. `user_id`(auth.users), `hospital_id`, `role`(owner/manager/viewer), `is_active`. |

### 3.2 운영·시스템 테이블

| 테이블 | 용도 |
|--------|------|
| `site_settings` | 로고, 히어로 배경, 크롤 스케줄 등. |
| `admin_audit_logs` | 관리자 행동 로그. |
| `admin_notification_recipients` | 알림 수신자. |
| `admin_notification_logs` | 알림 발송 로그. |
| `rag_documents` / `rag_chunks` | RAG 문서·unk, vector 등. |
| `playbook_patterns` / `playbook_usage_events` | 플레이북 패턴·사용 이벤트. |
| `crawl_jobs` / `crawl_raw_items` | 크롤링 작업·원본 아이템. |
| `chat_threads` 등 | 채팅 스레드/메시지. |

### 3.3 RLS 정책 요약

- **hospitals / treatments:**  
  - `anon`, `authenticated`: `is_published = true`인 행만 SELECT.  
  - `service_role`: ALL (Admin API에서만 사용).
- **inquiries / normalized_inquiries:** 별도 RLS 파일 참고 (암호화·역할별 접근).
- **hospital_leads:** 병원 사용자는 자신의 `hospital_id`만 접근하도록 정책 적용.
- **treatment_sources:** `service_role`만 전체 접근 (정책명: `treatment_sources_all_service_role`).

### 3.4 마이그레이션 적용 순서

- `migrations/*.sql`은 **날짜·의존성 순서**대로 적용해야 함.  
- Supabase Dashboard SQL Editor 또는 CLI로 실행.  
- 롤백이 필요한 테이블(예: `treatment_sources`)은 해당 마이그레이션 파일 하단에 DROP 주석으로 문서화되어 있음.

---

## 4. 인증·권한

### 4.1 역할 구분

| 역할 | 판정 | 접근 범위 |
|------|------|------------|
| **Admin** | `user_metadata.role` / `app_metadata.role` === `"admin"` 또는 `ADMIN_EMAIL_ALLOWLIST` 포함 이메일 | `/admin/*`, Admin API 전부 |
| **Hospital (Partner)** | `hospital_users`에 활성 행 존재 (`user_id`, `is_active=true`) | `/partner/*`, Partner API (자기 `hospital_id`만) |
| **Anonymous / Authenticated** | 로그인 없음 또는 일반 Auth 유저 | 공개 페이지, 문의 생성, 채팅 등 |

### 4.2 미들웨어

- **파일:** `middleware.ts`  
- **동작:** 요청이 `/admin` 또는 `/partner`일 때 Supabase 세션 조회 후, admin/partner가 아니면 `/login`으로 리다이렉트.  
- Admin 판정은 `checkAdminAuth`와 동일한 기준(metadata.role, ADMIN_EMAIL_ALLOWLIST).

### 4.3 API에서의 사용

- **Admin API:** `requireAdminAuth(request)` — 실패 시 403, rate limit(ADMIN) 적용.  
- **Partner API:** `checkHospitalAuth(request)` — 실패 시 401/403, 응답에 `hospitalId` 등 포함.  
- **Public API:** 세션 없이 또는 anon으로 호출 가능. Rate limit은 라우트별로 상이.

---

## 5. API 라우트 개요

### 5.1 공개·고객

- `POST /api/inquiries/create` — 문의 생성.  
- `POST /api/inquiries/intake` — 인테이크 폼.  
- `POST /api/chat` — AI 챗봇 (streaming).  
- `POST /api/public/chat/start`, `POST /api/public/chat/message` — 공개 채팅.  
- `GET/POST /api/rag/search` — RAG 검색 (내부/챗봇용).  
- `GET /api/attachments/sign` — 업로드 서명 등.

### 5.2 Admin (`/api/admin/*`)

- **인증:** `requireAdminAuth(request)` + (선택) `assertSupabaseEnv()`.  
- **예시:**  
  - `GET/POST/PATCH/DELETE /api/admin/hospitals`  
  - `GET/POST /api/admin/hospitals/[id]/offers/preview` — 시술 자동생성 미리보기  
  - `POST /api/admin/hospitals/[id]/offers/apply` — 시술 자동생성 DB 반영  
  - `GET/POST/PATCH/DELETE /api/admin/treatments`  
  - `GET/POST /api/admin/inquiries`, `GET/PATCH /api/admin/inquiries/[id]`  
  - `GET/POST /api/admin/leads`, `GET/PATCH /api/admin/leads/[id]`, `POST /api/admin/leads/assign`  
  - RAG, 플레이북, 크롤, 감사로그, 알림, 브랜딩, 사이트 설정, 업로드 등.

### 5.3 Partner (`/api/partner/*`)

- **인증:** `checkHospitalAuth(request)` → `hospitalId` 스코프.  
- **예시:**  
  - `GET /api/partner/whoami` — 병원 사용자 여부·병원 정보  
  - `GET /api/partner/dashboard` — 대시보드 통계  
  - `GET/PATCH /api/partner/leads`, `GET/PATCH /api/partner/leads/[id]`  
  - `GET/POST/PATCH/DELETE /api/partner/treatments`  
  - `GET/PATCH /api/partner/profile`

### 5.4 Cron

- `GET /api/cron/crawl` — Vercel cron에서 호출 (vercel.json에 스케줄 정의).

---

## 6. 주요 데이터 플로우

1. **고객 문의**  
   - 고객이 문의/인테이크 제출 → `inquiries` (원본) → 정규화 → `normalized_inquiries`.  
   - 관리자가 리드 배정 → `hospital_leads` 행 생성 (normalized_inquiry_id, hospital_id, status).  
   - 병원 포털에서 `hospital_leads`를 자신의 hospital_id로 조회·상태 변경.

2. **병원·시술 데이터**  
   - Admin이 병원/시술 CRUD → `hospitals`, `treatments`.  
   - “시술 자동생성”: Admin이 병원 선택 후 Preview → 크롤/LLM 추출 → Apply 시 `treatments` upsert + `treatment_sources` insert.

3. **RAG**  
   - 문서 등록 → chunking → `rag_documents`, `rag_chunks` (벡터 포함).  
   - 챗봇/검색 시 RAG 검색 후 LLM에 컨텍스트로 전달.

4. **플레이북**  
   - 패턴 등록/승인 → `playbook_patterns`.  
   - 사용 이벤트 → `playbook_usage_events`.  
   - 자동화/AB 테스트 등은 `src/lib/automation/` 참고.

---

## 7. 환경 변수 (검토 시 확인)

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.  
- **Admin:** `ADMIN_EMAIL_ALLOWLIST` (쉼표 구분 이메일).  
- **AI:** `GOOGLE_GENERATIVE_AI_API_KEY` 또는 `OPENAI_API_KEY`, (선택) `LLM_PROVIDER`.  
- **이메일:** AWS SES 등 (알림 발송).  
- **기타:** Sentry, Vercel cron 등은 배포 환경에 맞게 설정.

---

## 8. 개발자 검토 체크리스트

아래 항목을 기준으로 구현이 명세·보안·일관성에 맞는지 검토할 수 있다.

### 8.1 소스 구조

- [ ] App Router 페이지와 API 라우트가 일관된 경로 규칙을 따르는가?  
- [ ] Admin 전용 로직이 `app/admin`, `src/lib/auth`, `src/lib/audit` 등에만 집중되어 있는가?  
- [ ] Partner 전용 로직이 `app/partner`, `src/lib/auth/checkHospitalAuth.ts`, Partner API에만 있는가?  
- [ ] 공개 클라이언트용 Supabase는 anon key만 사용하고, service_role은 서버 전용(`supabaseAdmin`)인가?

### 8.2 DB

- [ ] 마이그레이션 파일이 날짜/의존성 순으로 적용 가능한가?  
- [ ] `hospitals`, `treatments` RLS가 anon/authenticated는 읽기만(is_published), 쓰기는 service_role만 허용하는가?  
- [ ] `hospital_leads`는 normalized_inquiry + hospital 조합이 유일(UNIQUE)한가?  
- [ ] `treatment_sources`가 treatment당 출처를 안전하게 보관하고, RLS가 service_role만 허용하는가?

### 8.3 인증·보안

- [ ] 모든 Admin API가 `requireAdminAuth`(또는 동등한 검사)를 사용하는가?  
- [ ] Partner API가 `checkHospitalAuth` 후 해당 `hospital_id`만 노출/수정하는가?  
- [ ] PII/문의 데이터 접근 시 복호화 권한이 admin으로 제한되어 있는가?  
- [ ] 외부 URL fetch(크롤, 시술 자동생성)에 SSRF 방지(스킴, 사설 IP 차단, 타임아웃/크기 제한)가 적용되어 있는가?

### 8.4 API

- [ ] Admin API 응답이 일관된 형식(예: `{ ok, error?, detail?, ... }`)을 따르는가?  
- [ ] Partner API가 401/403 시 명확한 메시지를 반환하는가?  
- [ ] Rate limit이 Admin 등 민감 경로에 적용되어 있는가?

### 8.5 운영·배포

- [ ] `assertSupabaseEnv()`가 DB를 쓰는 Admin/백엔드 API에서 호출되는가?  
- [ ] Cron 경로(`/api/cron/crawl`)가 인증/시크릿으로 보호되는가(Vercel cron은 서버에서 호출)?  
- [ ] 빌드가 `npm run build`로 성공하고, `verify:rag` 등 CI 스크립트가 실패 시 배포 차단에 사용 가능한가?

---

이 문서는 실제 디렉터리·마이그레이션·auth/API 패턴을 기준으로 작성되었다. 코드 변경 시 이 명세와 체크리스트를 함께 갱신하는 것을 권장한다.
