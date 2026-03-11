# 시술 자동생성 Runbook

관리자 > 병원 관리 > 「대표 시술 3개 자동 생성」 동작 점검 및 실패 시 조치.

---

## 1. 정상 동작 확인

- **Preview 요청**: 병원 선택 후 「대표 시술 3개 자동 생성」 클릭 → 모달에서 크롤·추출 결과 확인.
- **성공**: `offers` 1~3건 표시, 「확정 저장」으로 treatments 반영.
- **실패**: 모달에 `hint`·`message` 표시 (예: 웹사이트 없음, 크롤 실패, 시술 추출 0건 등).

---

## 2. 실패 시 확인 순서

| 순서 | 확인 항목 | 조치 |
|------|-----------|------|
| 1 | 병원에 **웹사이트 URL** 등록 여부 | 병원 편집에서 URL 입력 (예: https://example.com) |
| 2 | **마이그레이션 적용** 여부 | Supabase SQL Editor에서 `migrations/20260226_offers_auto_fail_log.sql` 실행. 미적용 시에도 시술 생성은 되며, 실패 로그만 DB에 저장되지 않음. 관리자 UI에 파란색 안내가 보이면 미적용. |
| 3 | **LLM API 키** | Vercel/로컬에 `GOOGLE_GENERATIVE_AI_API_KEY` 또는 `OPENAI_API_KEY` 설정. 미설정 시 hint `llm_unavailable` |
| 4 | **크롤 실패** (hint `crawl_error`) | URL 접근 가능 여부, 방화벽, 대상 사이트 차단. `message`에 상세 사유 포함 |
| 5 | **시술 0건** (hint `no_offers_extracted`) | 웹사이트에 시술/가격 관련 텍스트가 적거나 LLM이 인식 못함. URL·페이지 내용 확인 |
| 6 | **추출된 필드가 대부분 비어 있음** | 기본(fetch) 모드는 HTML만 수집. **동적 사이트(SPA)** 면 `동적 사이트 (Playwright)` 체크 후 재시도. 또는 관리자가 직접 입력 |

---

## 3. 서버 로그로 보는 원인

- `[offers/preview] DB 로그 실패 (offers_auto_* 컬럼 확인)` → 마이그레이션 20260226 미적용.
- `[offers/preview] extractOffersFromText threw` → LLM API 오류(키·할당량·네트워크).
- `[offers/preview] Crawl failed` → 크롤 단계 실패, URL·네트워크 확인.
- **실패 원인 세분화 (2026-02)**
  - `insufficient_candidate_pages` → 시술/가격 관련 페이지 부족 (treatment_like 페이지 < 2)
  - `no_evidence_for_candidates` → LLM 후보는 있으나 evidence(근거 스니펫) 없음
  - `site_has_no_treatments` → 웹사이트에 시술/프로그램 정보 없음

---

## 4. API로 스키마 확인

관리자 인증 후:

```
GET /api/admin/hospitals/offers-schema
```

- `offersFailureLogEnabled: true` → 실패 로그 DB 저장 가능.
- `offersFailureLogEnabled: false` → 마이그레이션 적용 후 재배포 또는 Supabase에서 SQL 실행.

---

## 5. 대표 시술 선택 기준 (재현 가능)

- **같은 병원·같은 웹사이트 → 같은 3개 시술**이 나오도록 기준을 고정했습니다.
- 우선순위: ① 페이지 내 노출도(메뉴·히어로 우선) ② 신뢰도 내림차순 ③ 이름 오름차순.
- LLM temperature=0으로 추출을 일정하게 유정합니다.
- **자동생성 시술은 기본 숨김**이며, 관리자가 검토 후 노출로 변경합니다.

---

## 6. 네이버 검색 보강
- **웹사이트 수집이 부족하면**(800자 미만) 병원명으로 **네이버 웹검색** 후 결과 스니펫을 LLM에 전달.
- **웹사이트가 없어도** 병원명으로 네이버 검색 시도 → 초안이라도 생성.
- 필요 env: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` (네이버 개발자 센터 발급).

---

## 7. 동적 사이트(SPA)용 Playwright

- **기본(fetch)**: HTML만 수집. React/Vue 등으로 JS가 렌더링하는 내용은 수집 안 됨.
- **동적 사이트 (Playwright)**: 체크 시 브라우저 렌더링 후 수집 (속도 느림). `npm install playwright` 필요(선택 의존성). 미설치 시 해당 옵션은 fetch로 폴백됨.

## 8. 크롤 파이프라인 상세 (2026-02 개선)

- **BFS 링크 확장**: 메인 페이지에서 내부 링크 탐색, 최대 30페이지까지 수집 (같은 도메인만).
- **우선순위 키워드**: treatment, clinic, program, price, fee, menu, 진료, 치료, 비용, 가격, 클리닉 등 포함된 URL 우선 수집.
- **탭/아코디언 클릭**: Playwright 사용 시 프로그램/진료/가격 관련 버튼·탭 클릭으로 숨겨진 컨텐츠 로드 (최대 10회).
- **PDF 추출**: 발견된 PDF 링크(최대 3개)에서 텍스트 추출 후 LLM 입력에 포함. `pdf-parse` 패키지 사용.
- **DEBUG 섹션**: NODE_ENV !== "production" 일 때 preview 응답에 `debug` 포함 (fetched_pages, discovered_links_top, extraction_attempt, assets_found).

---

## 9. 요약

- **SQL 실행이 어려운 경우**: 시술 자동생성·확정 저장은 그대로 사용 가능. 실패 시 원인만 모달/메시지로 확인. 나중에 `20260226_offers_auto_fail_log.sql` 실행하면 실패 로그·건너뛰기 표시가 DB에 저장됨.
- **실패 로그가 DB에 안 쌓일 때**: 위 2번 마이그레이션 적용 여부와 3번 로그 메시지 확인.

---

## 9. 마이그레이션 SQL (복사해 Supabase SQL Editor에 붙여넣기)

Supabase 대시보드 → SQL Editor → New query → 아래 SQL 붙여넣기 → Run.

```sql
-- 시술 자동생성 실패 로그: 병원별로 실패 사유 저장, 다음에 시도하지 않을 수 있게 표시
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS offers_auto_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offers_auto_fail_reason TEXT,
  ADD COLUMN IF NOT EXISTS offers_auto_skip BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.hospitals.offers_auto_failed_at IS '시술 자동생성(Preview) 마지막 실패 시각';
COMMENT ON COLUMN public.hospitals.offers_auto_fail_reason IS '실패 사유 (no_website, crawl_error, no_content, no_offers_extracted, llm_unavailable 등)';
COMMENT ON COLUMN public.hospitals.offers_auto_skip IS 'true면 이 병원은 시술 자동생성 건너뛰기로 표시';
```
