# 사후분석 (Post-mortems) — 반복 방지 로그

> 버그·누락·사고가 나오면 **여기에 한 건씩 기록**한다. 형식: 무슨 일 / 왜 못 잡았나(근본원인) / 어떻게 고쳤나 / 재발 방지(시스템 적용).
> 목적: 같은 실수를 두 번 안 하게 + PO가 화면에서 직접 찾아야 하는 일을 없앤다.
>
> **루틴(상시):** 콘텐츠/브랜드 변경 또는 버그 발견 시 → ①`npm run check:content` 통과 확인(CI 자동)
> ②발견된 버그는 아래에 반성문 1건 추가 ③유사 이슈 추가 스캔 ④가능하면 **검사기(`scripts/check-content-consistency.mjs`)에 새 룰 추가**해 재발 차단.

---

## #1 — 옛 모델 콘텐츠 잔재가 PO가 찾을 때까지 남음 (2026-06-16)

**무슨 일**
리브랜딩(HEALO→healwith) 후에도 옛 모델이 만든 콘텐츠 오류가 곳곳에 남아, PO가 스크린샷으로 하나씩 발견해 지시해야 했음:
- About/FAQ "지원 언어"가 4개(영·한·일·중)만 — 핵심 타겟 **러시아어·카자흐어 누락**
- 연락 이메일이 옛 도메인(immunelab / healo.com)으로 분산
- specialty `<title>`에 옛 브랜드 `HEALO-KHIDI`
- 번역 API 출처 허용목록이 **우리가 안 쓰는 도메인(healo.com·healo-khidi.com)** 을 허용하고 실도메인은 누락
- 약관 §5 법 조항(§15) 오류 의심

**왜 못 잡았나 (근본원인)**
1. 리브랜딩을 **"문자열 치환"으로만** 처리하고, 사실관계/의미 검토를 안 함.
2. 콘텐츠가 i18n(21개 로케일)·법률·PDF·FAQ·라우트 등 **사방에 분산** → 누락이 숨음.
3. **자동 가드 부재** → 사람(PO)이 화면에서 볼 때까지 남음.
4. 스크린샷마다 **반응형 수정** → 같은 부류(class)가 계속 재발.

**어떻게 고쳤나**
- 이메일 전면 통일(admin@healwith.co.kr), FAQ/About 6개 언어, specialty 제목·legal README 정리, 허용목록·URL 폴백 실도메인화, §15 변호사 플래그.

**재발 방지 (시스템 적용)**
- `scripts/check-content-consistency.mjs` 신설 → **CI 매 PR 자동 실행**:
  - 금지 토큰(immunelab·healo.com·@healo.·HEALO-KHIDI)이 제품 코드에 있으면 **빌드 실패**.
  - i18n 활성 6개 언어(ko·en·ru·kz·zh·ja) **키 패리티** 검사(누락 차단).
- 기존 `check:i18n`(ru/kz 커버리지)도 CI 편입.
- 본 루틴(반성문+유사스캔+가드룰 추가)을 `CLAUDE.md`에 상시 규칙으로 명시.
- **앞으로 새 부류 오류가 나오면** → 고치고 끝내지 말고 **검사기에 룰 1개 추가**해서 영구 차단.

---

## #2 — 개인정보처리방침 KO만 갱신되고 외국어 5개는 옛 버전에 멈춤 (2026-06-17)

**무슨 일**
약관·개인정보방침 검토 중, KO(한국어)는 나중에 확장됐는데 번역 5개(en·ru·kz·zh·ja)가 옛 버전에 멈춰 있었음:
- **자동화된 결정 고지(§37-2)** 섹션이 KO에만 있고 **5개 언어 통째 누락** — 법 의무 고지인데 정작 외국 환자(주 독자)가 못 봄.
- **카자흐 관할 조항**: KO 24줄(상세) vs 번역 6줄(옛 stub). 핵심타깃 러·카 환자의 KZ판조차 stub.
- **국외이전 안전조치**: KO에 EU 적정성·SCC·카자흐 참조 상세, 번역은 축약(20 vs 17줄).
- 이메일 불일치: 대부분 admin@healwith.co.kr인데 자동화결정 섹션만 privacy@(1곳).
- user_rights에서 KO 교차참조 오류(§15 책임자 → 실제 §14).
- (약관은 깨끗했음 — 6개 언어 정합.)

**왜 못 잡았나 (근본원인)**
1. 번역을 "그 시점 KO 스냅샷"으로 한 번 떠놓고, **이후 KO가 커져도 번역 동기화를 강제하는 장치가 없었음**.
2. 법률 문서가 1,780줄 단일 파일에 6개 언어 × 20여 섹션 → **눈으로는 섹션 누락이 안 보임**.
3. `check:content`(브랜드·i18n 키)는 **법률 문서의 섹션/줄수 패리티는 검사 안 함** → 사각지대.

**어떻게 고쳤나**
- KO를 단일 기준(SoR)으로 5개 언어의 4개 섹션 동기화(자동화결정 신규 삽입 + 카자흐/국외이전 확장 + user_rights 정합), 이메일 admin@ 통일, §14 교차참조 수정.
- ⚠️ 번역은 **기계 수준** — 파일 헤더의 "변호사 최종검토 필요" 캐비엇 유지(특히 RU·KZ).

**재발 방지 (시스템 적용)**
- `scripts/check-legal-parity.mjs` 신설 → **CI 매 PR 자동 실행**(`npm run check:legal`, ci.yml 편입):
  - 6개 언어 **섹션 id 집합·순서 일치** 검사.
  - 섹션별 **body 줄수 패리티**(번역 누락·잘림 차단).
  - 금지 토큰(옛 브랜드·TODO·stub) + 핵심사실(등록번호·이메일) 누락 검사.
- 이후 KO에 섹션/줄 추가 시 번역 5개를 안 맞추면 **빌드 실패** → PO가 화면에서 찾을 일 없음.

---

## #3 — 영어 화면에 한국어가 새는 부류, 전수조사로도 반복 누락 (2026-06-17)

**무슨 일**
PO가 /treatments에서 "제목은 영어인데 칩은 한국어" 섞임을 또 스크린샷으로 발견. 파보니 빙산의 일각 — **렌더된 영어 화면에 한국어가 새는 부류**가 8개 라우트에 ~150건:
- 6개 암종 상세페이지: 합병증(name/desc)·통계·FAQ·칩·수술후관리 제목이 한국어로만 박힘(데이터/클라이언트 양쪽).
- /telemedicine 데모 자막, /privacy·/terms·/medical-disclaimer 하단 고지(legacy 변형), /terms 목차 헤더.

**왜 못 잡았나 (근본원인)**
1. **자동검사가 i18n "키"와 브랜드 토큰만 봄** — i18n 시스템을 안 거치고 데이터/JSX에 박힌 한국어 raw 문자열은 전부 사각지대. 키가 없으니 키누락으로도 안 잡힘.
2. **"전수조사"가 실제 렌더 출력 레벨에서 이뤄진 적 없음** — 사람(PO) 눈이 유일한 검증이었음.
3. `[slug]` 동적 라우트(암종 6개)는 한 번 안 열어보면 누락이 안 보임.
4. 폴백 체인 lang→en→ko라, en 번역이 없으면 **조용히 한국어로 폴백** → 빌드·기존 검사 다 통과하는데 화면엔 한국어.

**어떻게 고쳤나**
- 칩·합병증·통계·FAQ·수술후관리를 전부 `{ko,en,ru,kz,zh,ja}` 6개 언어 객체로(렌더 `l()` 통과). FAQ는 클라이언트→데이터 파일로 이동(검사 가능하게). 페이지 4곳 고지/자막 6개 언어화(legacy 변형 포함).
- 약 330개 셀 번역(에이전트). **기계 수준 — 의료/법률 최종검토는 별개.**

**재발 방지 (시스템 — 이 부류를 통째로 차단)**
- **`e2e/i18n-no-korean-leak.spec.ts`** (`@smoke`): 공개 25개 라우트를 영어로 렌더해 화면(body)에 한글(가-힣) 남으면 실패. **출처가 데이터든 JSX든 i18n키든 불문하고** 잡음 → 키 검사의 사각지대를 메움. **PR마다 자동 실행.** (적법한 용어 병기는 ALLOW 등록.)
- **`scripts/check-cancer-i18n.mjs`** (`npm run check:cancer-i18n`, CI 편입): 암종 콘텐츠 6개 언어 완성 강제(en 폴백이 가리는 "미완성"까지 잡음 — 누출검사가 못 보는 빈칸).
- 두 검사가 짝: 누출검사=화면에 한글 없나, 완성검사=번역이 실제 다 찼나.

---

## #4 — 홈 화면에 옛 도메인 이메일 `contact@healo.kr` 잔존 (2026-06-18)

**무슨 일**
홈 "긴급 연락" 버튼이 `contact@healo.kr`(옛 도메인)을 표시·링크. 사이트 나머지(법률·개인정보·FAQ·로그인·siteSettings)는 전부 `admin@healwith.co.kr`로 통일됐는데 홈만 누락. 사용자가 보고 누르는 버튼.

**왜 못 잡았나 (근본원인)**
- `check:content`의 금지토큰에 `@healo.com`·`healo.com`만 있고 **`@healo.kr`이 없었음.** `.com`만 막고 `.kr` 변형은 안 막은 구멍 → 검사 통과.
- 리브랜드 일괄치환(HEALO→healwith)이 "이메일 도메인" 변형(`healo.kr`)까지는 안 훑음.

**어떻게 고쳤나**
- `app/home/HomeClient.jsx` 2곳 `contact@healo.kr` → `admin@healwith.co.kr`(siteSettings.contactEmail과 일치).

**재발 방지 (가드 룰)**
- `scripts/check-content-consistency.mjs` FORBIDDEN에 `{ re: /@healo\.kr/i }` 추가 → 옛 도메인 이메일 영구 차단. **현 사이트 도메인 `khidi.healo.kr`(@ 없음)·api 호스트 allowlist(`.healo.kr`)는 안 걸리게 `@healo.kr`만 정밀 매칭**(회귀 1줄 검증 완료).

---

## #5 — AI 챗 답변이 문장 중간에 잘리고 가격부터 들이미는 "이론식" 응답으로 망가짐 (2026-06-19)

**무슨 일**
PO가 스크린샷 제보: 친구 유방암 상담을 자연스럽게 물었는데 AI가 ① "1,800만 원) 선이며…(출처: healwith" 처럼 **앞뒤가 잘린 문장 조각**을 내놓고 ② 인사·공감 없이 **가격 숫자부터** 들이미는 textbook 응답. ("뭐가 1800만원 선인데 짧게 얘기하랫더고 이론식으로 대답하면 어떻햐")

**왜 못 잡았나 (근본원인)**
1. **모델 thinking 토큰이 `maxOutputTokens`에 포함되는 걸 몰랐다.** 같은 날 가독성 개선 커밋(`6470e5d`)에서 `maxOutputTokens` 2048→768로 낮췄는데, `gemini-flash-latest`(2.5 Flash)는 기본 thinking(추론)이 켜져 있고 그 토큰이 출력 상한에 같이 잡힌다 → 추론이 예산을 거의 다 먹고 **실제 답변이 문장 중간에 잘림**. 빌드·테스트는 통과(런타임 모델 동작은 검사 안 함).
2. **프롬프트가 "가격 한 줄로 답하라"를 무조건 적용.** 같은 날 견적자료 주입 커밋(`f1d8d87`)의 INTAKE&ESTIMATE 규칙이 "○○암 얼마"가 아닌 **일반/감정 질문에도** 가격을 토해내게 만듦. 짧게(70단어) 규칙과 겹쳐 **공감 한 줄 없는 숫자 나열**이 됨.
3. AI 응답 품질은 **자동검사 사각지대** — 사람(PO)이 화면에서 볼 때까지 안 잡힘.

**어떻게 고쳤나**
- `src/lib/chat/generateReply.ts`(비스트리밍 공개 챗) + `app/api/chat/route.ts`(스트리밍): `providerOptions.google.thinkingConfig.thinkingBudget = 0`으로 **추론 끔** → 출력 예산 전부 답변에 할당(컨시어지 짧은 답변엔 추론 불필요·지연·비용도 감소). 공개 챗 상한 768→1024.
- 프롬프트: "실제 질문에 따뜻하게 답하라 / **가격은 명시적으로 물을 때만**, 그것도 문장에 녹여서 / 일반·감정 질문엔 숫자 금지하고 어떻게 돕는지+무엇이 궁금한지 되묻기"로 교정. INTAKE&ESTIMATE 가격 규칙을 "EXPLICIT 가격 질문일 때만"으로 한정.

**재발 방지 (시스템 적용)**
- **유사 스캔**: 같은 thinking-토큰 함정이 있는 LLM 호출 전수 확인 → 스트리밍 `/api/chat`도 동일 패치. (그 외 `translate`·`stt`·배치 요약 등은 상한이 충분히 크거나 thinking 불필요한 입출력이라 영향 적음.)
- **가드 룰**: `scripts/check-content-consistency.mjs`에 "`gemini-flash`/2.5 계열 호출에서 `maxOutputTokens`가 작으면(<1024) `thinkingConfig.thinkingBudget:0`이 같은 호출에 없으면 경고/실패" 룰 추가 검토(다음 가드 작업으로). 우선은 본 반성문으로 함정 기록.

---

## #6 — 마이그레이션 다수가 재실행 시 하드 실패(멱등성 가드 누락) (2026-06-19)

**무슨 일**
서버 클라 통합(#89) 중 `kpi.ts`를 타입 박힌 정본으로 위임하자 숨은 버그가 드러난 것처럼, DB 마이그레이션 80개를 전수 점검하니 **19개 파일**이 재실행(re-apply) 시 `duplicate_object(42710)` 로 하드 실패하는 상태였음: `CREATE POLICY` 39건·`CREATE TRIGGER` 4건이 앞에 `DROP ... IF EXISTS` 가드가 없고, 일부 `CREATE INDEX` 10건이 `IF NOT EXISTS` 누락, `ADD CONSTRAINT` 2건이 가드 없음. 새 Supabase 브랜치·로컬 개발·재해복구처럼 마이그레이션을 처음부터 다시 적용하는 상황에서 중간에 깨짐.

**왜 못 잡았나 (근본원인)**
1. 마이그레이션을 **수동 추적**(supabase 마이그레이션 히스토리/체크섬 아님)으로 운영 → "한 번 적용되면 끝"이라 재실행 안전성을 아무도 안 봄.
2. 일부 파일은 처음부터 멱등 패턴(`DROP POLICY IF EXISTS` 후 `CREATE`)을 잘 지켰지만(예: `20260225_chat_threads.sql`), **표준이 강제되지 않아** 파일마다 들쭉날쭉.
3. **자동 가드 부재** → 새 마이그레이션이 비멱등이어도 CI가 안 막음.

**어떻게 고쳤나**
- 19개 파일에 가드 추가: 각 `CREATE POLICY/TRIGGER` 앞에 같은 이름·테이블의 `DROP ... IF EXISTS`, bare `CREATE INDEX`에 `IF NOT EXISTS`, `ADD CONSTRAINT` 앞에 `DROP CONSTRAINT IF EXISTS`. **스키마 결과는 불변**(이미 적용된 DB엔 영향 없음) — 재실행 안전성만 추가. 실제 DB 재적용은 하지 않음(파일만).

**재발 방지 (시스템 적용)**
- **가드 룰 신설**: `scripts/check-migration-idempotency.mjs` → CI 매 PR 자동(`npm run check:migrations`). `migrations/*.sql`에서 ①가드 없는 `CREATE POLICY/TRIGGER` ②`IF NOT EXISTS` 없는 `CREATE INDEX/TABLE` ③가드 없는 `ADD CONSTRAINT`(DO/pg_constraint 블록은 허용)를 **빌드 실패**로 차단. 오탐 0 룰만 채택, 음성 테스트로 회귀 탐지 확인.
- 앞으로 **새 마이그레이션은 멱등이 기본** — 비멱등이면 CI가 머지 차단.

---

## #7 — KHIDI 핵심 KPI(유치·사전상담)가 존재하지 않는 컬럼을 쿼리해 항상 0 (2026-06-19)

**무슨 일**
8/27 중간평가의 핵심 정량지표를 자동집계하는 `src/lib/khidi/kpi.ts`가 **존재하지 않는 컬럼 3개**를 쿼리하고 있었음 → PostgREST 42703 오류 → 카운트 null → **유치·사전상담이 항상 0**으로 표시.
- K-01 유치: `consultation_sessions.visit_confirmed_at` (해당 컬럼 없음). 실제 유치확정 신호는 `inquiries.outcome='admitted'`(전환 깔때기 RPC가 쓰는 정의)인데 엉뚱한 테이블·컬럼을 봄. → 실제 4건인데 **0** 표시.
- K-02 사전상담: `consultation_sessions.actual_duration_minutes` (실제 컬럼은 `duration_seconds`). 게다가 `duration_seconds`는 전 세션 NULL(미추적)이라 `>=5분` 필터를 살려도 0. → 실제 9건인데 **0** 표시.
- 더해 대시보드·API·만족도가 옛 목표(유치 10 / 상담 80 / 만족도 80)를 박아둬, 공식 목표(12 / 120 / 90)와 불일치.

**왜 못 잡았나 (근본원인)**
1. `kpi.ts`의 supabase 클라가 **제네릭 없는 느슨한 타입**(`as unknown as SupabaseClient`)이라, 잘못된 컬럼명을 tsc가 못 잡음(런타임 오류로만 드러남).
2. 쿼리 오류 시 **조용히 `?? 0`으로 폴백** → "데이터 없음"처럼 보여 버그가 위장됨(PO가 "아직 0건"으로 오해).
3. 실DB 스키마 대조 없이 컬럼명을 가정해 작성. 단위테스트는 DB를 안 침.
4. PR #98이 "헤드라인 유치건수는 무사"라고 적었으나 실제로는 그때도 깨져 있었음(컬럼 미존재 미확인).

**어떻게 고쳤나**
- K-01: `inquiries.outcome='admitted'`(created_at 기준)로 재작성 — 전환 깔때기 RPC와 **정의 통일**(두 대시보드 수치 일치). 실DB 검증 = 4건.
- K-02: duration 필터 제거(컬럼 오류 + 미추적). 완료 세션 수로 집계 = 9건.
- 공식 목표 SoR `src/lib/khidi/targets.ts`(유치 12 / 상담+사후 120 / 만족도 90) 신설 → API·대시보드·만족도가 전부 참조. 대시보드에 **사업 누적 달성률**(8/27 평가표의 "현재(B)") 섹션 추가.

**재발 방지 (시스템 적용)**
- **조용한 0 제거(가시화 가드)**: `KpiResult.errors[]`에 집계 쿼리 오류를 모아 **대시보드 상단 빨간 경고 배너**로 노출 → 앞으로 컬럼 오류가 나면 0이 아니라 "집계 오류"로 보임(PO가 화면에서 바로 인지).
- 실DB 스키마 대조를 KPI 수정 시 필수로(본 세션은 Supabase MCP로 `information_schema.columns` 확인 후 작성).
- (백로그) `kpi.ts` 쿼리를 생성 타입(`database.types.ts`)으로 타이핑하면 tsc가 컬럼 오류를 잡음 — 느슨한 캐스팅 제거 과제와 연계.

---

## #8 — KPI 일별 스냅샷 cron 이 가끔 하루를 걸러 빈 칸이 영구 남음 (2026-06-20)

**무슨 일**
매일 도는 KPI 스냅샷 cron(`/api/cron/kpi-snapshot`, 매일 15:05 UTC) 결과를 담는 `kpi_snapshots` 테이블을 조회하니 **06-16·06-19 두 날짜가 통째로 빠져 있었음**(06-03~06-18 중 2일 누락, 최신은 06-18). cron 이 그날 안 돌거나 실패해 스냅샷이 안 만들어졌고, 다음 실행은 "어제"만 만들어 빈 칸을 **영구히 안 메움**.
- 다행히 #107(KPI 집계오류 canary)의 "숙주"가 바로 이 cron 이라, cron 이 그날 거르면 그날 canary 도 안 돈다 → **평가 자동집계 안정성에 직결**.
- 누락일 실제 일별 값은 0/0이라 데이터 손실은 없었음(빈 차트 칸 + canary 미실행이 문제).

**왜 못 잡았나 (근본원인)**
1. Vercel cron 은 **최선노력(best-effort)** 이라 가끔 한 실행을 거를 수 있는데, cron 을 "정확히 매일 1회"로 가정함.
2. cron 이 **"어제 하루치"만** 계산 → 한 번 거르면 그 날짜는 누구도 다시 안 채움(자가복구 부재).
3. Vercel 런타임 로그 보존이 짧아(~1시간) 과거 실행 성공/실패를 사후 확인 불가 → 누락이 **테이블을 직접 조회하기 전엔 안 보임**.

**어떻게 고쳤나**
- cron 을 **자가복구 백필**로 변경: 매 실행마다 최근 N일(기본 7일)을 idempotent upsert(`upsertRecentSnapshots`). 하루 걸러도 다음 실행이 자동으로 빈 칸을 메우고, 그 날짜들의 집계 쿼리를 다시 돌려 **canary 커버리지도 7일치로 넓힘**. (06-16·06-19 누락도 다음 cron 1회로 자동 복구.)
- canary 중복 알림 방지: 같은 컬럼 오류가 N일 반복돼도 critical 알림은 **윈도우당 1통**(중복 압축).
- 날짜 윈도우 계산을 순수 함수 `recentSnapshotDates`(server-only 없는 별도 모듈)로 분리 → 단위테스트 7개(월·연 경계 포함).

**재발 방지 (시스템 적용)**
- 단일일 cron → **N일 백필**이 곧 가드: 일시적 cron 누락이 자동 치유돼 사람이 테이블을 들여다볼 필요가 없어짐.
- `recentSnapshotDates` 단위테스트로 날짜 경계 회귀 차단.
- (관찰) cron 정기실행 자체가 죽는 경우는 별개 — `kpi_snapshots` 최신 행이 2일 이상 오래되면 알리는 가드는 추후 백로그(현재는 인프라 생존을 `dispatch-reminders` 30분 주기로 간접 확인).

---

## #9 — 의료데이터 API 권한우회(IDOR)·PII 엔드포인트 무제한 — 제3자 감리에서 발견 (2026-06-20)

**무슨 일**
ISO/IEC 25010(TTA GS) 기준 제3자 보안 감리 중, 환자 의료데이터를 다루는 API 몇 곳이 "로그인만 했으면 통과"(userId 존재만 확인)로 되어 있어 수평적 권한우회가 가능했음:
- `app/api/symptoms/alerts`: 헤더엔 "코디네이터 전용"이라 적혀 있으나 실제론 `auth.userId` 만 확인 → **로그인한 환자 누구나 다른 모든 환자의 증상알림을 조회·해제** 가능.
- `app/api/khidi/followup` POST: 인서트 실패 시 `saveError: error.message` 로 **DB 내부 오류 메시지를 클라이언트에 노출**(코드형 원칙 위반).
- `app/api/public/chat/resume`: 복호화된 게스트 PII(이름·이메일·전화)를 반환하는데 **속도제한 없음** → token 추측형 PII 오라클.
- (부수) `app/api/cron/consultation-reminders`: `(SITE_URL || VERCEL_URL) ? https://${VERCEL_URL} : fallback` 연산자 우선순위 버그로 특정 env 조합에서 리마인더 링크가 `https://undefined/...`.

**왜 못 잡았나 (근본원인)**
1. 인증 헬퍼가 `userId`(로그인 여부)와 `isAdmin/appRole`(권한)을 **둘 다 주는데, 권한이 필요한 곳에서 `userId` 만 확인**하는 패턴이 복붙으로 번짐.
2. 신규 API 추가 시 "민감 테이블을 만지면 역할(role) 게이트 필수"를 **자동 검사하는 가드가 없음** → 사람이 리뷰할 때만 걸림.
3. `error.message` 비노출 규칙이 대부분 지켜졌으나 한 곳(저장 실패 경로)에서 빠짐.

**어떻게 고쳤나 (묶음 A)**
- `symptoms/alerts`: `isStaff(auth)` 게이트(admin·coordinator·doctor) 추가 — 코디 정상 접근은 유지, 환자 차단.
- `khidi/followup`: 응답에서 `saveError` 제거(내부 상세는 console.error 로만).
- `public/chat/resume`: `thread-summary` 와 동일한 IP 속도제한(`checkRateLimit`) 추가.
- `consultation-reminders`: `??`/괄호로 우선순위 교정.

**재발 방지 (시스템 적용)**
- (백로그·권장) `scripts/check-content-consistency.mjs` 류에 **API 라우트 정적 검사 룰 추가**: `app/api/**` 가 민감 테이블(`inquiries`·`symptom_*`·`chat_threads`·`consultation_sessions`)을 만지면서 `isAdmin`/`appRole`/`requireConsultationAccess`/`checkRateLimit` 중 어느 것도 호출하지 않으면 경고. 이 부류(인증≠인가 혼동)를 사람 리뷰 없이 차단.
- **보류(묶음 C)**: `khidi/followup` POST 의 inquiry 소유권 검증은 inquiry↔환자 연결이 코드상 모호해 잘못 막으면 정상 환자 제출이 깨짐 → PO 동석/라이브 검증 필요. (cron 비밀키 클라이언트 노출 HIGH 는 #10 에서 해결.)

---

## #10 — cron 비밀키가 클라이언트 번들에 노출(HIGH) + 죽은 학습코드 "미완성 기능" 오인 (2026-06-20)

**무슨 일**
- **HIGH 보안**: 어드민 화면(`app/admin/khidi/ai-regression/page.jsx`)이 회귀테스트 cron 을 `Bearer ${NEXT_PUBLIC_CRON_SECRET}` 로 직접 호출 → **공개 접두사 때문에 cron 비밀키가 클라이언트 번들에 그대로 박혀** 소스만 보면 8개 cron 트리거 키 획득 가능.
- **죽은 코드**: `src/lib/learning/feedbackLoop.ts`(인메모리 학습 스토어)가 **어디서도 호출되지 않는 dead code** — 감리에서 "데이터 유실 미완성 기능"으로 오인될 소지(실제론 아무것도 안 먹여 유실도 없음). 진짜 피드백은 `chat_feedback`(👍/👎) DB 저장으로 정상.

**왜 못 잡았나 (근본원인)**
1. 클라이언트에서 보호된 엔드포인트 호출 시 비밀키가 필요해지자 **공개 접두사로 노출하는 안티패턴**(서버 프록시로 감쌌어야 함).
2. 공개 접두사 + SECRET 류를 막는 **자동 검사 부재**.
3. 미완성 PoC 코드를 안 지우고 방치.

**어떻게 고쳤나**
- 회귀 로직을 `src/lib/chat/regressionRunner.ts`(server-only `runRegressionBatch`)로 추출 → cron(CRON_SECRET)·신규 관리자 라우트 `app/api/admin/khidi/run-regression`(requireAdminAuth) 공용. 화면은 비밀키 없이 관리자 라우트만 호출. 공개 비밀키 사용 0.
- `feedbackLoop.ts` 삭제.

**재발 방지 (시스템 적용)**
- `scripts/check-content-consistency.mjs` 에 **`NEXT_PUBLIC_[A-Z0-9_]*SECRET` 금지 룰 추가** → 비밀키를 공개 접두사로 두면 **CI 빌드 실패**(영구 차단).
- (관찰) PO 가 어드민 "지금 실행" 버튼 1회 클릭검증 필요(인증 경로 cron→관리자 세션으로 변경).

---

## #11 — 홈에 "지어낸 환자 후기"가 라이브로 게시돼 있었음 (2026-06-20)

**무슨 일**
- 홈(`app/home/HomeClient.jsx`)의 `TESTIMONIALS_DATA` 에 **실제로는 존재하지 않는 환자 후기 3건**(A.K./카자흐스탄/위암, M.S./러시아/유방암, T.Y./일본/간암)이 별점 5개와 함께 **프로덕션에 노출**되고 있었음.
- 의료 컨시어지 사이트에 **가공된 환자 후기 게시 = 정직성 위반** + 한국 **의료광고법**(의료기관 환자 후기·치료경험담 게재 규제) 리스크.

**왜 못 잡았나 (근본원인)**
1. 초기 템플릿이 "📸 교체 대상: 실제 환자 리뷰로 교체"라는 주석과 함께 **플레이스홀더 후기**를 넣어뒀는데, 교체되지 않은 채 방치됨.
2. 가짜/플레이스홀더 후기를 **자동 검사로 막는 가드가 없었음** → 사람이 눈으로 발견할 때까지 남음.

**어떻게 고쳤나**
- 가짜 후기 3건 삭제. 대신 **출처가 확인되는 실데이터만** 보여주는 `src/components/SocialProofSection.jsx` 신설(모두닥 평점·공식 누적 치료사례·유치의료기관 등록 + 실제 후기 외부 플랫폼 링크, 6개 언어).
- 전수 스캔: Premium 홈(`HomeClientPremium`)·`/stories`(비활성·동의기반 모델) 에는 동일 부류 없음 확인.

**재발 방지 (시스템 적용)**
- `scripts/check-content-consistency.mjs` 에 **조작된 환자 후기 시그니처 가드 추가**: `이니셜 / 국가 / 암종`(예 `A.K. / Kazakhstan / Stomach Cancer`, `A.K. / 카자흐스탄 / 위암`) 형식이 제품 코드에 있으면 CI 빌드 실패. 실제 후기는 동의받은 것만, 출처표시 또는 외부 플랫폼 링크로.

---

## #12 — 만족도 설문 발송 cron 이 "항상 null 인 컬럼"에만 의존해 설문 영구 0건 (KPI K-03 측정 불능) (2026-06-21)

**무슨 일**
- 8/27 중간평가 공식 성과지표 3개 중 하나인 **환자 만족도(K-03, 목표 90점)** 가 **측정 자체가 안 되고 있었음**: 설문 발송 0건 / 응답 0건(실DB 확인 `surveys`·`survey_responses` 모두 0행).
- 원인: `app/api/cron/dispatch-surveys/route.ts` 가 환자 이메일을 `consultation_sessions.patient_id → patients` 로만 찾는데, **`consultation_sessions.patient_id` 가 전 행 null**(미사용 컬럼). → 모든 완료 세션이 `toEmail` 못 찾아 `skipped` → 설문이 단 한 건도 안 나감.
- 실제 환자 연결고리는 `inquiry_id → inquiries`(email/preferred_language/이름). 이는 **#7과 정확히 같은 부류**(kpi.ts 도 같은 이유로 patient_id→inquiry_id 전환했었는데, 설문 cron 만 옛 경로에 남아 있었음).

**왜 못 잡았나 (근본원인)**
1. `patient_id` 가 항상 null 이라는 사실이 #7 에서 KPI 쪽만 고쳐졌고, **같은 가정을 쓰는 다른 소비자(설문·침묵환자 cron)는 전수 점검이 안 됨**.
2. cron 이 "대상 없음(skipped)"으로 **조용히 정상 종료** → 0건이 "아직 상담이 적어서"처럼 위장됨(만족도 미측정이 버그로 안 보임).
3. 설문 발송은 라이브 cron + 실제 이메일이라 **자동 테스트로 안 닫혀 있었음**(수신자 결정 로직이 cron 안에 인라인).

**어떻게 고쳤나**
- 수신자 결정을 순수 함수 `src/lib/surveys/resolveRecipient.ts`(`resolveSurveyRecipient`)로 추출: 이메일 `patients.email → inquiries.email` 폴백, 언어 `session.patient_language → inquiry.preferred_language → spoken_language → ko`(카자흐 `kz→kk` 매핑), 이름 `inquiries.first_name+last_name`. → cron 이 이 함수를 사용.
- 단위테스트 `resolveRecipient.test.ts` 12개로 **고정**(patient_id null→inquiry 폴백·우선순위·잘못된 이메일 skip·언어매핑).
- ⚠️ **운영 주의**: 머지·배포되면 앞으로 완료된 상담 24~30시간 뒤 **이메일이 있는** 환자에게 실제 설문 메일이 나간다(현재 inquiries 11건 중 이메일 보유 3건). 기존 완료 세션은 발송 윈도(24~30h)를 지나 **소급 발송 안 됨**(블라스트 반경 작음).

**유사 이슈 (같은 부류 — 별도 추적)**
- `app/api/cron/detect-silent-patients/route.ts` 도 `consultation_sessions` 를 `.not("patient_id","is",null)` 로 거름 → 전 행 null 이라 **항상 0건 감지**(침묵 환자 알림이 한 번도 안 뜸). `symptom_reports` 도 patient_id 로 묶여 있어 폴백이 단순치 않음 → 더 큰 리팩터라 이번 PR 범위에서 분리, `docs/KNOWN_ISSUES.md` 에 기록.

**재발 방지 (시스템 적용)**
- `consultation_sessions.patient_id` 에 의존하는 코드는 **inquiry_id 폴백을 기본값으로** 간주(이 컬럼은 현재 미사용 = null). 새 cron/집계 작성 시 점검.
- 수신자 결정 같은 "조용히 skip 되는" 분기는 **순수 함수로 빼서 단위테스트로 잠금**(라이브 cron 자체는 못 돌려도 로직은 CI 로 닫힘).

---

## #13 — 설문 cron 이 암호화된 이메일을 복호화 없이 읽어 #12 수정 후에도 설문 영구 0건 (2026-06-21)

**무슨 일**
- #12 에서 설문 cron 을 `inquiry_id → inquiries.email` 폴백으로 고쳤는데도, **배포 후 실DB 확인 결과 여전히 설문 0건 / 응답 0건**.
- 진짜 원인: `inquiries.email`(과 `first_name`/`last_name`)은 가입 시 **AES-256-GCM 으로 암호화**돼 저장된다(`app/api/inquiries/create` 가 `encryptString(body.email)`). DB 의 `email` 컬럼 실제 값은 `{"v":"v1","iv":...,"tag":...,"data":...}` 형태 암호문(샘플 3행 길이 105자, `@` 없음).
- 설문 cron 은 이 **암호문을 그대로** `resolveSurveyRecipient` 에 넘겼고, `cleanEmail` 은 `@` 가 없으면 버린다 → 항상 null → **여전히 영구 0건**. (#12 는 "어떤 행을 보느냐"를 고쳤고, 이건 "그 값을 복호화하느냐"를 빠뜨린 것.)

**왜 못 잡았나 (근본원인)**
1. #12 단위테스트가 **평문 이메일**(`patient@example.com`)만 가정 → CI 초록인데 실데이터(암호문)에서는 깨짐. 테스트 픽스처가 실제 저장 형태(암호문)를 반영 안 함.
2. PII 암호화 컬럼(`email`/`first_name`/`last_name`)을 **읽는 쪽이 복호화 책임을 빠뜨림** — 관리자 화면 경로는 `decryptInquiryForAdmin` 으로 복호화하지만, 새로 추가된 cron 경로는 그 규약을 안 따랐다.
3. cron 이 또 "대상 없음(skipped)"으로 **조용히 정상 종료** → 0건이 버그로 안 보임(#12 와 동일한 위장).

**어떻게 고쳤나**
- cron 에서 `inquiries` 조회 직후 `decryptMaybe(email/first_name/last_name)` 로 복호화한 뒤 `resolveSurveyRecipient` 에 전달. `decryptMaybe` 는 암호문이면 복호화, 평문이면 그대로 통과 → **옛 평문 행도 안전**(마이그레이션 호환).
- 계약 고정 테스트 추가: `resolveRecipient.test.ts` 에 **"암호문 blob(`@` 없음) → null"** 케이스 → "반드시 cron 에서 복호화해야 한다"는 규약을 CI 로 잠금.

**재발 방지 (시스템 적용)**
- **규칙: 암호화 컬럼(`*_encrypted`, 그리고 `inquiries.email`/`first_name`/`last_name`/`contact_id`/`message` 처럼 암호문이 들어가는 텍스트 컬럼)을 읽어 사용·발송하는 모든 새 경로(cron·API·집계)는 `decryptMaybe`/`decrypt*ForAdmin` 으로 복호화 후 사용.** 화면 표시뿐 아니라 "메일 보낼 주소"로 쓸 때도 동일.
- 순수 로직 테스트의 픽스처는 **실제 저장 형태(암호문)** 케이스를 최소 1개 포함해 "읽는 쪽 복호화 누락"을 잡는다.

---

## #14 — 침묵환자 감지 cron 도 같은 `patient_id` null 의존 + uuid/bigint 타입 혼선으로 항상 0건 (2026-06-21)

**무슨 일**
- 사후관리 기능 중 "증상 입력이 3일 이상 끊긴 환자를 코디에게 자동 알림"(silence_long)이 **한 번도 안 떴음**(symptom_alerts 0행).
- 원인 ①: cron 이 `consultation_sessions` 를 `.not("patient_id","is",null)` 로 걸렀는데 `patient_id` 가 전 행 null → 대상 0건(#12·#13 와 같은 부류).
- 원인 ②(더 깊음): `consultation_sessions.patient_id` 는 사실 **bigint(→cancer_patient_intakes)** 인데 `symptom_alerts.patient_id` 는 **uuid(→auth.users)** 다. 두 컬럼을 같은 "환자키"로 본 설계 자체가 어긋나, `alertService.getCoordinatorIds` 가 uuid 로 bigint 컬럼을 조회하는 등 알림 흐름도 깨져 있었음. 실제 환자 연결고리는 메신저 문의(계정 없음)의 `inquiry_id`.

**왜 못 잡았나 (근본원인)**
1. 증상 모니터링 서브시스템 전체가 "로그인 환자(uuid)" 전제로 설계됐는데, 실제 퍼널은 메신저 문의(bigint, 계정 없음)라 전제가 틀림.
2. cron 이 또 "대상 없음"으로 조용히 0건 종료(#12·#13 와 동일한 위장).
3. 라이브 cron + 서버전용 모듈이라 자동 테스트로 안 닫혀 있었음.

**어떻게 고쳤나**
- 마이그레이션: `symptom_alerts` 에 `inquiry_id bigint` 추가 + `patient_id` nullable + `CHECK(patient_id IS NOT NULL OR inquiry_id IS NOT NULL)` + inquiry 활성 인덱스. (0행 테이블이라 안전, 멱등 작성.)
- 순수 로직을 서버전용 아닌 `src/lib/symptoms/silence.ts`(`buildSilenceAlert`·`uniqueInquiryIds`)로 분리 → 단위테스트 9개. cron 은 inquiry_id 기준으로 재작성(활성 문의 → 최근 증상보고 → 3일↑ 무입력 → inquiry 기준 알림, 중복방지).
- `alertService`: insert 에 inquiry_id 포함, `getCoordinatorIds` 를 inquiry_id/patient_user_id 기준으로, 메신저 문의 환자(계정 없음)는 안심 in-app 알림 skip. 코디 화면은 patient_id 없으면 `문의 #N` 표시.
- cron 계약 테스트(`route.contract.test.ts`)로 "inquiry_id 기준 조회·알림" 잠금.

**재발 방지 (시스템 적용)**
- `consultation_sessions.patient_id`(bigint·전 행 null)를 "로그인 환자키(uuid)"로 쓰지 말 것 — 실제 키는 `inquiry_id`(문의) 또는 `patient_user_id`(auth uuid). (#12·#13·#14 동일 뿌리.)
- "조용히 0건" cron 의 순수 분기는 비서버전용 모듈로 빼서 단위·계약 테스트로 닫는다(#12·#13 와 동일 처방).

## #15 — AI 챗이 환자가 안 밝힌 암종(대장암)을 단정하고, "아니라고" 정정해도 계속 고집 + 내부 사고 노출 (2026-06-21)

**무슨 일**
- PO 가 "한국에 가서 치료 받고 싶은데 절차 알려줘"(암종 안 밝힘)라고 물었는데 AI 가 **"대장암 치료의 핵심은…"** 으로 단정해 안내. 이어 "대장암이라고 안했는데 왜 대장암을 안내해줘?" / "아니 대장암 치료가 궁금한게 아니라고" 라고 두 번 정정해도 **계속 대장암을 설명**(비용까지).
- 같은 스레드에서 모델 **내부 사고/메타텍스트가 답변에 그대로 노출**: `*Wait, let's keep it extremely concise*`, `Let's make it even shorter and cleaner`, `(32 words)`, `(3 words)`.

**왜 그랬나 (근본원인)**
1. 그 스레드 앞부분에서 PO 가 "대장암 치료법 알려줘"를 6번 넘게 반복 → 모델 대화기록(최근 12개)에 "대장암"이 가득. 현재 질문이 generic 인데 **기록의 옛 화제를 단정으로 끌고 옴(over-anchoring)**. 데이터 편중이 아님(treatments·hospitals·rag 모두 대장암 0건 확인) → **항상 주입되는 `CARE_REFERENCE` 의 암종 7개 예시 중 하나를 모델이 임의 선택**.
2. **정정 무시**: "X 아니라고"라고 명확히 정정해도 화제를 버리는 규칙이 시스템 프롬프트에 없었음 → 정정 문장 자체에 "대장암"이 또 들어가 자기강화.
3. **내부 사고 노출**: 최종 메시지만 출력하라는 명시 규칙이 없어 모델의 자기지시(길이 줄이기 등)가 평문에 샘.
4. 새 스레드 단발 질문에선 재현 안 됨(확률적·맥락의존) → 자동 빌드/기존 테스트로 안 걸림.

**어떻게 고쳤나**
- `buildSystemPrompt`(`src/lib/chat/generateReply.ts`)에 행동 가드 3종 추가 — 두 공개 챗 라우트(스트림·메시지)가 공유하는 단일 함수라 한 곳 수정으로 둘 다 적용:
  1. 환자가 **현재 메시지에서 명시한 암종이 아니면 단정/명명 금지**(참고자료의 암종 목록은 예시일 뿐).
  2. **이전 대화 언급을 단정 근거로 쓰지 말 것** — 현재 질문이 generic 이면 암종 명명 없이 일반적으로 답.
  3. **정정 즉시 수용**: "아니/말고/아니라고/안했는데/not X/that's not what I asked" → 한 줄 사과 후 그 화제 완전히 버리고 무엇을 원하는지 되묻기. 정정 뒤 같은 암종 반복 = 최악.
  4. **최종 메시지만 출력** — 단어수·"Wait"·"let's keep it short" 류 자기지시/메타 노출 금지.
- 회귀 잠금: `src/lib/chat/systemPromptGuards.test.ts` — 무거운 server-only 모듈을 import 하지 않고 소스 텍스트로 가드 문구 생존을 검사(4개).

**2차(같은 날, 프롬프트만으론 부족 판명 → 코드 강제):**
- 1차(프롬프트 규칙)만으로는 **"대장암 6회+" 누적된 실제 PO 스레드에서 안 꺾임** — 정정("난 대장암 안 물어봤는데")에도 모델이 영어로 또 대장암 안내(DB 실측). 모델 확률성을 프롬프트로 못 이김 → **코드로 강제**:
  1. 순수 모듈 `src/lib/chat/topicGuards.ts` 분리(테스트 가능): `mentionsCancerType`(현재 메시지에 특정 암종어가 있나) · `isTopicCorrection`(부정·정정 신호) · `correctionReply`(6언어 결정적 사과+재질문).
  2. 두 응답 경로(`generateChatReply`·`streamChatReply`)에서 **정정 감지 시 모델을 아예 거치지 않고** 결정적 사과+재질문으로 화제 100% 리셋. (정정 문장 속 암종어는 "거부 대상"이라 게이트 안 함. "A 말고 B"는 패턴에서 제외.)
  3. `buildSystemPrompt` 최상단에 **현재 메시지에 암종 없으면** "어떤 특정 암도 언급/단정 금지" 강제 지시(`currentMentionsCancer` 게이트) — 누적 스레드에서 generic 질문이 옛 암종으로 새는 것 차단.
- 단위테스트 `topicGuards.test.ts`(15개): PO 실패 문장들(`대장암이라고 안했는데…`·`난대장암안물어봤는데?`·`아니 대장암…아니라고`) 전부 정정으로 잡히는지, `위암`(1자+암)·러시아어 암종어 검출, `A 말고 B` 오탐 방지까지 고정.

**재발 방지 (시스템 적용)**
- AI 행동 규칙은 사람 신고로만 잡지 말고, 핵심 규칙은 **소스 텍스트 회귀 테스트로 잠근다**(server-only 모듈이라 직접 import 불가 → 파일 grep 방식). **확률적 LLM 행동을 "반드시" 보장해야 하면 프롬프트가 아니라 코드 게이트(결정적 분기)로 강제**한다(프롬프트는 best-effort).
- "환자가 안 밝힌 진단을 AI 가 지어내는 것"은 단순 UX 가 아니라 **의료 레드라인(진단명 임의 명명)** 으로 취급. 새 암종/진단 관련 프롬프트 작업 시 "현재 메시지 근거"와 "정정 수용"을 항상 점검.
- **"행동" 버그는 PO 스크린샷이 아니라 자동 점검으로 먼저 잡는다**: 빌드·단위테스트는 문법·순수로직만 본다. 실제 대화 행동(암종 단정·정정 무시·언어 불일치)을 재생해 검사하는 `npm run check:ai-behavior [URL]`(`scripts/check-ai-behavior.mjs`) 추가 — 배포 후/의심 시 실서비스나 프리뷰 URL 에 대고 1회 돌린다(실 AI 호출이라 CI 매PR 게이트가 아닌 배포후 점검). 새 "행동" 버그 부류가 나오면 이 스크립트에 시나리오를 한 줄 추가해 영구 차단한다.

## #17 — 에이전시→병원 의뢰로 '치료 확정'된 케이스가 유치 전환 점수판(KHIDI 평가)에서 누락 (2026-06-21)

**무슨 일**
- 유치 전환 대시보드(`/admin/khidi/conversion`)의 "유치 확정(admitted)" 카운트는 KHIDI 중간평가 정량지표(외국인환자 유치 12건)에 직결되는데, **자동집계가 `inquiries.outcome='admitted'` 한 곳에만 의존**.
- 그런데 새 의뢰 흐름(에이전시 포털 의뢰 #194 → 코디 검토·병원 배정 #200 → 병원 응답 역방향 #202)은 전혀 다른 데이터(`inquiries.case_status` + `hospital_leads.status`)로만 진행. **병원이 '치료 확정(converted)'을 눌러도 `outcome` 은 그대로 null** → 유치 카운트 0.
- 게다가 점수판의 "유치확정 대기" 목록은 **사전상담(pre_consultation) 완료 의뢰만** 보여줘서, 상담세션 없이 에이전시→병원으로만 진행된 케이스는 코디가 확정 누를 기회조차 없음(완전 사각지대). 실데이터 #13이 그 상태였음(병원 converted인데 outcome null, 대기목록에도 없음).

**왜 그랬나 (근본원인)**
- 두 워크플로가 **각자 다른 시기에 추가**되며 데이터 트랙이 분리됨: (구) 상담세션 기반 유치 집계(outcome) vs (신) 에이전시·병원 백오피스(case_status/hospital_leads). 둘을 잇는 다리가 없었음.
- 자동집계 KPI가 **단일 컬럼(outcome)**에만 의존하는데, 그 컬럼을 갱신하는 경로가 코디 수동 1곳뿐이라 새 경로가 생기면 조용히 누락.

**어떻게 고쳤나** (PO 결정 2026-06-21: 병원 확정 → 자동 유치 집계)
- 순수 매핑 함수 `outcomeForHospitalLeadStatus(status)` 를 `src/lib/khidi/caseStatus.ts` 에 추가('converted'→'admitted', 그 외 null).
- `/api/partner/leads/[id]` PATCH 의 역방향 반영(`syncLeadStatusToCase`)에서 병원이 'converted' 로 바꾸면 `inquiries.outcome='admitted'`(+outcome_note/updated_at/updated_by) 도 함께 기록 → 점수판 유치 카운트에 즉시 반영.
- 단위테스트 `caseStatus.test.ts` 에 3개 추가(converted→admitted, 그 외/빈값→null) 로 매핑 고정.

**재발 방지 (시스템 적용)**
- **자동집계 KPI 가 의존하는 컬럼(`outcome` 등)은, 그 상태를 만들어내는 *모든* 사용자 경로에서 갱신되는지 점검**한다. 새 워크플로(포털·역할)를 추가하면 "이게 평가지표 컬럼을 건드려야 하나?"를 체크리스트에 포함.
- 상태→KPI 매핑은 라우트 안에 묻지 말고 **순수 함수로 빼서 단위테스트로 잠근다**(이번 `outcomeForHospitalLeadStatus`).
- 잔여 위험(미해결): 코디가 `case_status` 를 'treatment'/'completed' 로 수동 전진시키면서 `outcome` 을 안 박는 경우는 여전히 누락 가능 → 후속으로 "치료/완료 단계인데 outcome null" 케이스를 점수판 대기목록에 노출하는 안 검토 필요(이번엔 병원 confirmed 경로만 닫음).
