# 연장통 — 이 일에는 이 스킬을 집는다

> **왜 이 문서가 생겼나 (2026-09-10 PO 지적).**
> 붙어 있는 플러그인 12개가 3개월간 **사용 0회**였다. 처음엔 「안 쓰니 꺼자」고 판정했는데
> PO 가 두 번 되물었다: *«너가 알아서 쓰면 좋은거 아냐?»* → *«디자인이나 영업같은건 쓸모 있는데
> 이제까지 안쓴거아냐? 다른거도 마찬가지고»*. **둘 다 PO 가 맞았다.**
> 안 쓴 이유는 쓸모가 없어서가 아니라 **「언제 집을지」가 어디에도 안 적혀 있어서**였다.
>
> 반증 검사도 통과했다: 도구 선택이 규칙에 적힌 것(`/ppt`·`HWP_DOC`·`senior-dev-team` 76회·
> `handoff` 180회)은 **전부 실제로 쓰였고**, 안 적힌 것은 **전부 0회**였다. 지도에 없으면 맨손으로 한다.
>
> 그래서 **아무것도 끄지 않았다.** 대신 여기에 지도를 적는다.

---

## 0. 먼저 — 우리 자체 규칙이 항상 앞선다

아래 스킬들은 **범용**이라 우리 사정을 모른다. 충돌하면 **우리 것이 이긴다.**

| 이 영역은 | 우리 것이 먼저 |
|---|---|
| 화면·색·컴포넌트 | **`DESIGN.md`가 헌법.** design 스킬은 «점검표»로만 쓰고 톤을 바꾸는 데 쓰지 마라 |
| 코드 작업 | **`senior-dev-team` 스킬**이 먼저. engineering 스킬은 그 안에서 곁들인다 |
| PPT·한글문서 | **`/ppt`·`docs/rules/HWP_DOC.md`.** 범용 문서 스킬로 갈아타지 마라 |
| 정부과제 문서 | **`gov-grant-review`** |
| 배포·머지 | **`docs/rules/DEPLOY.md`·`AUTOMERGE.md`** |
| 환자 응대·상담 | **`docs/rules/SELF_QA.md`** + 기억(에이전시 경유 원칙). customer-support 스킬은 문장 다듬기용 |

---

## 1. 일 종류별 지도

### 계약·법률
| 이런 일이 오면 | 집을 것 |
|---|---|
| 계약서·협약서 검토 (마다네스·에이전시·병원) | `/legal:review-contract` — 조항별 분석, 레드라인, 사업영향. 커넥터 없이 파일만 줘도 돈다 |
| NDA 받았을 때 | `/legal:triage-nda` — 초록/노랑/빨강으로 분류 |
| 업체와 뭐가 체결돼 있는지 | `/legal:vendor-check` |
| 새 기능이 법에 걸리나 | `/legal:compliance-check` |
> ⚠️ 기억 「변호사 검토로 미루지 마라」와 짝이다. **법령 원문을 보고 내가 판단**하되, 그 판단을 이 스킬의 틀로 정리한다.

### 검색 유입·마케팅
| 이런 일이 오면 | 집을 것 |
|---|---|
| 검색 순위·유입이 안 나온다 | `/marketing:seo-audit` — SEO 도구 미연결 시 웹 검색으로 대체하는 분기가 본문에 있다 |
| 경쟁사 조사 (시너스파크·클라우드호스피탈) | `/marketing:competitive-brief` |
| 광고 돌린다 | `/marketing:campaign-plan` — 단 예산·문구는 PO 리드 |
| 블로그·랜딩·메일 초안 | `/marketing:draft-content` — 단 **카피 톤은 PO 리드**(기억) |
> 실측 자료는 `docs/data/search-queries-*.md`, 검색어 단일 출처는 `src/lib/seo/cancerSearchTerms.js`.

### 화면·디자인
| 이런 일이 오면 | 집을 것 |
|---|---|
| 만든 화면이 쓸 만한가 | `/design:design-critique` |
| 접근성 점검 | `/design:accessibility-review` |
| 버튼·안내문구·빈 화면 문안 | `/design:ux-copy` — 6개 언어라 특히 |
> 🛑 **`DESIGN.md` 위반은 이 스킬로 정당화되지 않는다.** 기본 톤(teal·단일 디자인)은 안 바뀐다.

### 영업·파트너
| 이런 일이 오면 | 집을 것 |
|---|---|
| 병원·에이전시 미팅 앞두고 | `/sales:call-prep` |
| 미팅 끝나고 정리 | `/sales:call-summary` — 단 **정식 회의록은 `minutes` 스킬**(hwpx 규격) |
| 상대 회사 조사 | `/sales:account-research` |

### 돈·정산
| 이런 일이 오면 | 집을 것 |
|---|---|
| 예산 대비 실제 차이 설명 | `/finance:variance-analysis` |
| 장부 대사 | `/finance:reconciliation` |
> ⚠️ 미국 회계(SOX·1099) 전제인 스킬은 **우리와 안 맞는다.** `/finance:sox-testing`, `journal-entry` 는 쓰지 마라.
> KHIDI 집행 규칙은 기억과 `docs/rules/KHIDI.md` 가 먼저다.

### 운영·절차
| 이런 일이 오면 | 집을 것 |
|---|---|
| 반복 작업 절차서 | `/operations:runbook` |
| 업무 흐름 문서화·담당 정리 | `/operations:process-doc` |
| 위험 목록 만들기 | `/operations:risk-assessment` |
> 백오피스 사용설명서는 `docs/rules/MANUALS.md` 규격이 먼저다.

### 환자·고객 응대
| 이런 일이 오면 | 집을 것 |
|---|---|
| 문의 답장 초안 | `/customer-support:draft-response` |
| 들어온 문의 분류·우선순위 | `/customer-support:ticket-triage` |
> 🛑 **실환자는 에이전시 경유다.** 직접 메일 금지(기억). 초안은 코디를 거친다.

### 데이터·지표
| 이런 일이 오면 | 집을 것 |
|---|---|
| 숫자 물어볼 때 | **Supabase MCP 직결이 더 정확하다.** `/data:analyze` 는 틀 잡을 때만 |
| 대시보드 만들기 | `/data:build-dashboard` |
> data 스킬은 Snowflake·BigQuery 전제라 우리 DB 와 안 맞는 대목이 많다.

### 코드·장애
| 이런 일이 오면 | 집을 것 |
|---|---|
| 코드 작업 전반 | **`senior-dev-team` 먼저** |
| 변경 리뷰 | `/code-review` (우리 것) |
| 장애 대응·사후분석 | `/engineering:incident-response` + `docs/rules/BUG_ROUTINE.md` |

### 인사
> 🛑 **넬리 채용은 안 한다(2026-09-10 PO 확정). 먼저 꺼내지 마라.**
> `human-resources` 는 깔려 있다. 사규 정리·평가 틀이 필요해질 때만 열어라.

---

## 2. 도구(MCP) 지도 — 2026-09-10 전수 점검, 16개 전부 정상

| 이런 일이 오면 | 집을 것 |
|---|---|
| 실서비스 **서버** 오류 | Vercel `get_runtime_errors` — Sentry 인증 없이도 된다 |
| 실서비스 **브라우저** 오류 | **Sentry** (`bonroi` 조직). 서버 오류와 «다른 것»을 본다. 2026-09-10 실측: 4건이 아무도 안 본 채 쌓여 있었다 |
| 논문 근거 | PubMed. ⚠️ `"Korean medicine"` 처럼 자연어로 치면 **한국 저자 논문을 전부 끌어온다** — MeSH 용어(`"Medicine, Korean Traditional"[MeSH Terms]`)로 쳐라 |
| 암종 코드 | ICD-10 MCP |
| DB 조회·마이그레이션 | Supabase MCP |
| 로그인 뒤 화면·외부 콘솔 | 크롬 MCP (PO 로그인 세션). 구글 계정은 **`u/2`** 가 PO 것이다 |
| 로컬 화면 검증 | 앱 내장 브라우저 + `preview_start` |
| 설명이 복잡할 때 | `show_widget` 으로 그림 한 장 |
| 오래 걸리는 일이 끝났을 때 | `PushNotification` 으로 PO 폰에 |
| 정기 반복 | `scheduled-tasks` (현재 6개 등록) |

**비어 있어 못 쓰는 것**: 위키독스(책 0권), 터미널 읽기(PO 가 안 씀), 커넥터 검색(목록 0개).
**연결됐지만 쓸 일 없는 것**: 허깅페이스.

---

## 3. 되살리기·추가

플러그인은 **하나도 끄지 않았다.** 새로 필요하면 이 한 줄이면 된다.

```bash
claude plugin install <이름>@knowledge-work-plugins
```

마켓플레이스 `knowledge-work-plugins`(= `anthropics/knowledge-work-plugins`)는 2026-09-10 에 등록했다.
쓸 수 있는 것: bio-research · enterprise-search · small-business 등 19개.
⚠️ `small-business` 는 QuickBooks·HubSpot·PayPal·Canva 전제라 **우리와 안 맞는다.**
