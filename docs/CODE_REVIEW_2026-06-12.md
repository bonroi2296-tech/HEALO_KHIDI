# healwith 전체 코드 리뷰 (2026-06-12)

> 작성: Claude (Cowork 세션). 방식: 보안/데이터/품질/테스트·운영 4축 병렬 탐색 → 핵심 발견은 코드 직접 재검증.
> 대상: PO. 기술용어 최소화, 우선순위(P0=즉시, P1=2주 내, P2=한 달 내)로 정리.

---

## 한 줄 총평

구조적 보안(인증·암호화·레이트리밋)은 **양호** — 1인+AI 개발 치고 이례적으로 잘 잡혀 있음.
지금 위험한 건 코드가 아니라 **"고장 났을 때 아무도 모르는 상태"** (에러 모니터링 꺼짐 + 조용한 실패 패턴).

---

## ✅ 잘 돼 있는 것 (안심해도 되는 부분)

- **인증**: 144개 API 중 보호 필요한 78개 전부 인증 헬퍼 적용. 공개/보호 분류 적절
- **레이트리밋**: 공개 POST 전수(24개) 적용 확인
- **암호화**: AES-256-GCM Fail-Closed(암호화 실패 시 저장 거부). first_name·email·raw_message 쓰기 경로 암호화 확인됨 (직접 검증)
- **권한**: app_metadata.role 기준 일관 적용. user_metadata 권한 체크 0건
- **시크릿**: 하드코딩 0건. CSP 헤더 상세 설정. 빌드 시 타입에러 무시 안 함
- **회귀 테스트**: AI 응답 품질을 매일 자동 채점하는 크론 — 흔치 않은 수준의 장치

---

## 🔴 P0 — 즉시 (이번 주)

### 1. Sentry(에러 모니터링)가 꺼져 있다 — 가장 중요
- `next.config.js:199` — 2026-05-19부터 withSentryConfig 주석 처리(OpenTelemetry 충돌). 설정 파일 3개는 있으나 수집 0
- **의미**: 실환자 받는 서비스에서 에러가 나도 아무도 모름. console 로그는 Vercel에서 휘발
- 조치: `serverExternalPackages` 설정으로 충돌 해결 시도 → 안 되면 Sentry 대신 경량 대안(Vercel 로그 드레인, 자체 operationalLog 알림 연결)이라도 활성화

### 2. API 에러 응답에 내부 에러 메시지 노출 — 5곳 (보안 규칙 위반)
- `app/api/chat/route.ts:432` — LLM 에러 원문을 클라이언트에 반환 (jsonError 3번째 인자) ★직접 확인
- `app/api/admin/analytics/route.ts:82`, `app/api/khidi/visa/.../invitation/route.ts:213`, `app/api/admin/reminders/[id]/retry/route.ts:63`, `app/api/cron/dispatch-reminders/route.ts:270` — detail/error 필드에 err.message
- 조치: 5곳 모두 `{ ok:false, error:"internal_error" }`로 통일, 원문은 console에만 (각 30분 작업)

### 3. 암호문이 RAG 학습 문서에 들어가는 기능 결함 (의심 → 확인 필요)
- `src/lib/rag/buildDocument.ts:117` — `Raw Message: ${row.raw_message}` 그대로 삽입
- normalize 저장 시 raw_message는 **암호화돼 저장**됨(직접 확인) → RAG 문서에 암호문 덩어리가 들어갈 가능성
- PII 유출은 아니지만(암호문) RAG 품질 오염. 호출부에서 복호화 후 전달하는지 1시간 추적 필요 — 복호화해서 넣고 있다면 반대로 "RAG 문서에 평문 PII" 문제이므로 마스킹 필요. **어느 쪽이든 손봐야 함**

---

## 🟠 P1 — 2주 내

### 4. "조용한 실패" 패턴 — 실패해도 운영자가 모름
- `adminNotifier.ts:293`(관리자 알림 실패 무시), `postResolveWorker.ts`(패턴 추출 실패 무시), `judge.ts:157`(코디 자동배정 스킵)
- 조치: 실패 시 operationalAlerts로 연결 (Sentry 살리면 자동 해결되는 부분 많음)

### 5. 중복 구현 정리 (혼선·버그 온상)
- Supabase 서버 클라이언트 3벌: `supabase/server.ts` vs `data/supabaseServerClient.ts` 등 → 1벌로
- 이메일 발송 2벌: `email/sendEmail.ts`(Resend+SES) vs `notifications/emailSender.ts`(SES) → 1벌로
- 실험용 번역 모듈(`experimental/translation.ts`)에 "import 금지" 가드 주석

### 6. RLS 정책 실적용 확인
- `normalized_inquiries`에 서로 다른 정책 2개가 다른 마이그레이션에 존재(20260124 vs 20260125), chat_threads·consultation_sessions는 정책 명시 미확인
- 조치: Supabase에서 `pg_policies` 조회 1회로 실태 확인 (10분) — CLAUDE.md의 self-QA 규칙 그대로

### 7. limit 없는 전체 테이블 조회 2곳
- `admin/hospitals/enrich/batch/route.ts:37`, `admin/playbook/analytics/route.ts:29` — 데이터 쌓이면 어드민 화면 느려짐/타임아웃. limit+날짜 필터 추가

---

## 🟡 P2 — 한 달 내

- **테스트 공백**: E2E 53개가 UI 중심 — "문의 접수→암호화 저장→정규화" 백엔드 통합 테스트 0건. 핵심 경로 1개라도 추가
- **타입 안전성**: 인증 모듈(`checkAdminAuth.ts:64` request:any)과 의료데이터 포맷팅(`chat/dbSearch.ts`)부터 strict 타입 전환
- **레거시 경계**: 피벗 전 크롤링 모듈(`hospitalOffers/`, `crawl/`)이 활성 경로인지 불명확 — deprecated 표시 또는 분리
- **의존성**: playwright가 prod dependencies에 있음(직접 확인) → devDependencies로 이동. exceljs도 검토
- **회귀 테스트 알림**: passRate 낮을 때 needsAlert 플래그만 세팅 — 실제 알림 전송 연결
- **스키마 드리프트 TODO**: `postResolveWorker.ts:236` — playbook_patterns 컬럼 불일치 경고 해소

---

## 에이전트 보고 중 오검출 (직접 재검증으로 기각)

- "KNOWN_ISSUES.md 없음" → **있음** (docs/)
- "헬스체크 엔드포인트 미구현" → **있음** (app/api/health)
- "first_name 평문 저장 가능성" → **기각**: step1·create 라우트 모두 암호화 후 저장 확인

---

## 사업계획서와의 연결

- 계획서의 보안 주장(암호화·접근통제·레이트리밋)은 코드로 **입증 가능** — 발표 질의 안전
- 단, "모니터링·관측 체계"를 강하게 주장하지 말 것 — Sentry 비활성 상태. RAG 질의 관측(rag_query_events)은 사실이므로 그쪽으로 표현
- P0 1·2번은 협약 후 "AI 인재 온보딩 첫 주 과제"로 쓰기 좋은 실무 항목이기도 함
