# HEALO — AI Project Map

> **One-liner:** HEALO는 해외 환자(미국·일본·중화권 중심)의 **시술/수술 기반 문의(Lead)** 를 받아 한국 병원과 매칭하는 의료관광 컨시어지 플랫폼. **예약·결제 기능 없음**, 병원 직접연락 유도 대신 **HEALO 문의 유도**가 핵심 목표.

---

## 1. Tech Stack & Runtime

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 16 App Router (`app/`) | `--webpack` 플래그 사용 |
| UI | React 18 + Tailwind CSS + Lucide icons | |
| DB / Auth | Supabase (Postgres + Auth + Storage) | `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts` |
| AI / LLM | Vercel AI SDK (`ai`), OpenAI, Google AI | 채팅·오퍼추출·RAG 등에 사용 |
| RAG / Vector | pgvector (Supabase 내장) | `src/lib/rag/**` |
| Email | AWS SES | `src/lib/notifications/emailSender.ts` |
| Monitoring | Sentry (`@sentry/nextjs`) | `NEXT_PUBLIC_SENTRY_DSN` 설정 시 활성화 |
| Testing | Vitest | |
| Language | TypeScript / JavaScript 혼용, `strict: false` | |

---

## 2. Directory Map

```
HEALO_Demo/
├── app/                          # Next.js App Router (라우트 + API)
│   ├── layout.jsx                # 루트 레이아웃
│   ├── page.jsx                  # 홈페이지
│   │
│   │
│   ├── inquiry/                  # 환자 문의 폼
│   ├── treatments/               # 시술 목록 & 상세 ([slug])
│   ├── hospitals/                # 병원 목록 & 상세 ([slug])
│   ├── specialties/              # 전문과목 (korean-medicine 등)
│   ├── search/                   # 검색
│   ├── about/                    # 소개 페이지
│   ├── terms/                    # 이용약관
│   ├── login/                    # 로그인
│   ├── auth/                     # 인증 래퍼
│   ├── list/                     # 공용 페이지네이션 리스트 클라이언트
│   ├── partner/                  # 병원 파트너 대시보드
│   │
│   ├── admin/                    # 관리자 UI
│   │   ├── page.jsx              # 대시보드
│   │   ├── inquiries/            # 문의 관리
│   │   ├── leads/                # 리드 관리
│   │   ├── hospitals/            # 병원 관리
│   │   ├── treatments/           # 시술 관리
│   │   ├── analytics/            # 분석
│   │   ├── observability/        # 운영 모니터링
│   │   ├── audit/                # 감사 로그
│   │   ├── playbook/             # 플레이북 관리
│   │   ├── rag/                  # RAG 문서/관리
│   │   ├── settings/             # 알림 수신자 설정 등
│   │   └── _shared/, _components/ # 공용 컴포넌트
│   │
│   └── api/                      # API Routes
│       ├── admin/                # 관리자 API (CRUD, 크롤, 업로드, 알림 등)
│       ├── inquiries/            # 문의 접수/이벤트
│       ├── partner/              # 파트너 API
│       ├── chat/                 # AI 채팅
│       ├── rag/                  # RAG 검색
│       ├── cron/                 # 크론 작업
│       ├── attachments/          # 첨부파일 서명
│       └── health/               # 헬스체크
│
├── src/                          # 공용 로직
│   ├── components.jsx            # 메인 공용 컴포넌트 (CardListSection, CTA 등)
│   ├── components/               # 개별 공용 컴포넌트
│   │   ├── CookieConsent.jsx
│   │   ├── GoogleMap.jsx
│   │   ├── Modals.jsx
│   │   ├── SEO.jsx
│   │   ├── AddressInput.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── Toast.jsx
│   │
│   └── lib/                      # 핵심 비즈니스 로직 (아래 §3 상세)
│
├── scripts/                      # 데이터 수집·백필·점검 스크립트
│   ├── data-collection/          # 병원 데이터 수집 파이프라인
│   │   ├── index.ts              # 진입점
│   │   ├── config.ts
│   │   ├── collectors/           # hospital-collector.ts
│   │   ├── sources/              # geo-api.ts, hira-api.ts
│   │   ├── transformers/         # normalize-hospital.ts
│   │   └── export/               # to-csv.ts
│   ├── crawl-hira.cjs            # HIRA 크롤
│   ├── enrich-google-places.*    # Google Places 보강
│   ├── rag_backfill_embeddings.mjs
│   ├── evaluation.ts             # 평가 스크립트
│   ├── check-env.js              # 환경변수 점검
│   ├── smoke-test-*.js           # 스모크 테스트
│   └── ...                       # 번역, 시드, 마이그레이션 유틸 등
│
├── migrations/                   # Supabase/Postgres 스키마 변경 (SQL)
├── middleware.ts                  # 루트 미들웨어 (i18n, auth 등)
├── .cursorrules                  # Cursor AI 룰 파일
├── docs/                         # 문서
├── output/                       # 스크립트 출력물
├── public/                       # 정적 파일
└── HEALO_full_snapshot/          # 스냅샷 참조용
```

---

## 3. Key Modules (`src/lib/`)

| 모듈 | 경로 | 역할 |
|------|------|------|
| **Auth / Gate** | `src/lib/auth/` | Admin·Hospital 인증 가드 (`requireAdminAuth.ts`, `checkAdminAuth.ts`, `checkHospitalAuth.ts`, `sessionGuard.ts`) |
| **Crawl (수집)** | `src/lib/crawl/` | 외부 소스 크롤링 (`sources/google-places-search.ts`, `hira.ts`, `kakao-local.ts`, `naver-local.ts`), 작업 실행(`job-runner.ts`) |
| **Enrichment (보강)** | `src/lib/enrichment/` | 병원 메타데이터 보강 파이프라인 (`pipeline.ts`, `registry.ts`, `sources/google-places.ts`, `sources/kakao-map.ts`, `sources/ai-generator.ts`) |
| **Hospital Offers** | `src/lib/hospitalOffers/` | 대표시술·가격 추출 핵심 (`extractOffersFromTables.ts`, `extractOffersLLM.ts`, `extractProgramOffers.ts`, `normalizeOffer.ts`, `offerQualityFilter.ts`, `representativeOffers.ts`, `representativeCandidates.ts`, `priceIndex.ts`, `priceHints.ts`, `crawlPipeline.ts` 등) |
| **RAG** | `src/lib/rag/` | 문서 수집→청킹→임베딩→검색 (`ingest.ts`, `chunker.ts`, `buildDocument.ts`, `safeSearch.ts`, `ragQueryEvents.ts`, `supabaseAdmin.ts`) |
| **Chat** | `src/lib/chat/` | AI 채팅 응답 생성 (`generateReply.ts`, `dbSearch.ts`, `externalSearch.ts`) |
| **Notifications** | `src/lib/notifications/` | 이메일 알림 (`emailSender.ts`, `adminNotifier.ts`, `recipients.ts`) |
| **Security** | `src/lib/security/` | 암호화·PII 마스킹·첨부파일 인증 (`encryption.ts`, `encryptionV2.ts`, `maskPii.ts`, `piiJson.ts`, `attachmentAuth.ts`, `decryptForAdmin.ts`) |
| **Audit** | `src/lib/audit/` | 관리자 감사 로그 (`adminAuditLog.ts`) |
| **Alerts** | `src/lib/alerts/` | 운영 알림 (`operationalAlerts.ts`) |
| **Lead Quality** | `src/lib/leadQuality/` | 리드 품질 스코어링 (`scoring.ts`) |
| **Automation / Playbook** | `src/lib/automation/`, `src/lib/playbook/` | 플레이북 자동 개선·평가 (`playbookDailyEval.ts`, `playbookAutoImprove.ts`, `playbookAbFinalize.ts`, `sanitize.ts`, `extractPattern.ts`) |
| **Referral** | `src/lib/referral/` | 병원 레퍼럴 요약 (`buildReferralSummary.ts`) |
| **Hospital** | `src/lib/hospital/` | 병원 관련 유틸 (`templates.ts`, `leadSummary.ts`) |
| **Events** | `src/lib/events/` | 퍼널 트래킹 (`funnelTracking.ts`) |
| **i18n** | `src/lib/i18n/` | 다국어 번역 (`index.js` — DICTIONARY 기반, `LangContext.jsx`, `format.js`) |
| **Data** | `src/lib/data/` | Supabase 클라이언트 & 데이터 유틸 (`supabaseClient.js`, `supabaseServer.js`, `hospitals.js`, `treatments.js`) |
| **Validation** | `src/lib/validation/` | 입력 검증 (`admin.ts`) |
| **Utils** | `src/lib/utils/` | 슬러그·전화번호·이미지 폴백 (`slug.ts`, `phoneFormat.ts`, `imageFallback.ts`) |
| **기타** | `src/lib/` | `mapper.js` (DB→UI 매핑), `language.js`, `translate.ts`, `intakeExtract.ts`, `intakeSchema.ts`, `inquiryStatus.ts`, `policies.js`, `policyContent.js`, `siteSettings.js`, `logger.ts`, `rateLimit.ts`, `operationalLog.ts`, `ga.ts` |

---

## 4. Key Flows

### A) Patient Inquiry → Lead 생성

```
[환자] 문의 폼 작성 (app/inquiry/)
  → InquiryClient.jsx → useInquiryForm hook
  → POST app/api/inquiries/intake/
  → intakeExtract.ts (정규화/스키마 변환)
  → Supabase inquiries 테이블 저장
  → leadQuality/scoring.ts (품질 평가)
  → notifications/ (관리자 이메일 알림)
  → [Admin] app/admin/inquiries/ 에서 처리
  → hospital/leadSummary.ts → referral/buildReferralSummary.ts
  → 병원에 레퍼럴 전달
```

### B) Hospital Offers 추출 → 대표시술 생성

```
[Admin] 오퍼 추출 트리거
  → app/api/admin/hospitals/[id]/offers/enrich/
  → hospitalOffers/crawlPipeline.ts (페이지 수집)
  → selectRepresentativePages.ts → chunkPages.ts
  → extractOffersFromTables.ts / extractOffersLLM.ts / extractProgramOffers.ts
  → normalizeOffer.ts (정규화)
  → offerQualityFilter.ts (품질 필터)
  → classifyMedicalProcedures.ts (시술 분류)
  → representativeCandidates.ts → representativeOffers.ts (대표 선정)
  → priceIndex.ts / priceHints.ts (가격 정보)
  → Supabase 저장
```

### C) Crawl / Enrichment → 병원 메타데이터

```
[Cron/Manual] 크롤 트리거
  → app/api/cron/crawl/ 또는 scripts/data-collection/
  → crawl/job-runner.ts
  → crawl/sources/ (Google Places, HIRA, Kakao, Naver)
  → enrichment/pipeline.ts
  → enrichment/sources/ (google-places, kakao-map, ai-generator)
  → enrichment/registry.ts (소스 관리)
  → Supabase hospitals 테이블 업데이트
```

### D) RAG Ingest → Query

```
[Admin] 문서 등록 (app/admin/rag/)
  → rag/ingest.ts (문서 수집)
  → rag/buildDocument.ts (문서 구성)
  → rag/chunker.ts (청크 분할)
  → Supabase pgvector 저장 (임베딩)
  → [사용자 질의] rag/safeSearch.ts (검색)
  → rag/ragQueryEvents.ts (쿼리 로깅/관찰)
  → app/api/rag/search/ (API)
```

---

## 5. Where to Change What

| 변경 대상 | 위치 |
|-----------|------|
| Admin API (CRUD, 크롤, 업로드 등) | `app/api/admin/**` |
| Admin UI (대시보드, 관리 화면) | `app/admin/**` |
| Auth 인증/권한 문제 | `src/lib/auth/**`, `middleware.ts` |
| 대표시술/가격 추출 로직 | `src/lib/hospitalOffers/**` |
| 크롤/수집 소스 추가·수정 | `src/lib/crawl/**`, `scripts/data-collection/**` |
| 병원 메타데이터 보강 | `src/lib/enrichment/**` |
| RAG 파이프라인 | `src/lib/rag/**` |
| AI 채팅 응답 | `src/lib/chat/**` |
| 이메일 알림 | `src/lib/notifications/**` |
| 보안/암호화/PII | `src/lib/security/**` |
| 감사 로그 | `src/lib/audit/**` |
| 리드 품질 평가 | `src/lib/leadQuality/**` |
| 플레이북/자동화 | `src/lib/automation/**`, `src/lib/playbook/**` |
| 다국어 번역 | `src/lib/i18n/index.js` (DICTIONARY) |
| DB→UI 데이터 매핑 | `src/lib/mapper.js` |
| DB 스키마 변경 | `migrations/` (새 SQL 파일 추가) |
| 환자 문의 폼/스키마 | `app/inquiry/**`, `src/lib/intakeExtract.ts`, `src/lib/intakeSchema.ts` |
| 시술/병원 목록 페이지 | `app/treatments/`, `app/hospitals/`, `app/list/PaginatedListClient.jsx` |
| 파트너 병원 대시보드 | `app/partner/**`, `app/api/partner/**` |
| 공용 UI 컴포넌트 | `src/components.jsx`, `src/components/**` |

---

## 6. Guardrails (절대 위반 금지)

1. **예약·결제 기능 없음** — 리드 생성(문의 수집)만 수행
2. **병원 직접연락 유도 금지** — 반드시 HEALO 문의 폼으로 유도
3. **근거 없는 의료정보 생성 금지** — evidence 기반만 허용
4. **"HEALO = 병원/의료기관" 오인 유발 금지** — HEALO는 플랫폼/컨시어지
5. **Supabase가 단일 진실 원천(Single Source of Truth)** — 프론트엔드 mock data·fallback 상수 사용 금지
6. **상세 페이지는 반드시 URL param(id/slug)으로 DB 직접 조회** — 클라이언트 캐시 의존 금지

---

## 7. Quick Commands (`package.json` scripts)

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 시작 (Next.js + webpack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 시작 |
| `npm run lint` | ESLint 검사 |
| `npm run lint:fix` | ESLint 자동 수정 |
| `npm run format` | Prettier 포맷팅 (`src/**/*.{js,jsx}`) |
| `npm run test` | Vitest 실행 (watch 모드) |
| `npm run test:ui` | Vitest UI 모드 |
| `npm run test:run` | Vitest 단일 실행 |
| `npm run test:coverage` | Vitest 커버리지 리포트 |
| `npm run check:env` | 환경변수 점검 |
| `npm run eval` | 평가 스크립트 실행 (`scripts/evaluation.ts`) |
| `npm run test:smoke:inquiry` | 문의 스모크 테스트 |
| `npm run test:smoke:auth` | 인증 스모크 테스트 |
| `npm run collect` | 데이터 수집 파이프라인 실행 |
| `npm run collect:hospitals` | 병원 데이터 수집 |
| `npm run collect:template` | 템플릿 수집 |
| `npm run verify:rag` | RAG 검증 |
| `npm run audit:playbook-rag` | 플레이북 RAG 감사 |
| `npm run loadtest:rag` | RAG 부하 테스트 |

### 환경변수

필수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
점검: `npm run check:env` 으로 전체 목록 확인 가능
