# KHIDI 월간 업무 보고 작성 가이드

**대상 양식:** `(양식) 월간 업무 보고.xlsx`
**보고 주기:** 매월 말 → 익월 초 KHIDI 제출
**사업비:** 총 87,500,000원 = 정부지원금 70,000,000원 + 자기부담 17,500,000원(협약서 2026-186-001). 요약 시트 G11 에는 **정부지원금 70,000,000원**을 넣는다.
**정정(2026-09-06):** 이 문서가 「80,000,000원」으로 적고 있었다. 협약서 값으로 바로잡음.

---

## 양식 구조 요약

| 시트 | 용도 | 작성 빈도 |
|---|---|---|
| (요약) | 월별 KPI 자동 집계 + 사업비 잔액 | 자동 (월별 시트 데이터 참조) |
| (외국인환자 정보) | 누적 환자·의료진·통역사 명단 | 환자 발생 시마다 누적 |
| 4월 ~ 11월 (8개) | 월별 주요 업무 + 이번달 실적 + 다음달 계획 | 매월 1회 |

---

## 시트별 입력 필드 매핑

### 1. 요약 시트
*자동 계산 — 직접 입력 X. 월별 시트가 채워지면 자동 집계.*

| 항목 | 셀 | 출처 |
|---|---|---|
| 사전상담(건) | C5~J5 | 각 월 시트 C9 |
| 사후관리(건) | C6~J6 | 각 월 시트 C10 |
| 환자유치(건) | C7~J7 | 각 월 시트 C11 |
| 정부지원금 | G11 | 70,000,000원 (협약서 고정) |
| 월별 사용액 | C13~J13 | (각 월 시트 비용 입력 필요) |
| 잔액 | K13 | 자동 |

### 2. 외국인환자 정보 시트
*환자 발생 시마다 누적 등록.*

**환자 정보 영역**
- 환자등록번호 (최대 13자리, 환자 식별 가능 고유번호 / 코드)
- 출생연도 (YYYY 4자리)
- 성별 (남/여)
- 국적 (한글)

**사전상담 정보 영역**
- 상담일자 (YYYY-MM-DD)
- 횟수
- 주상병명 (예: 위암&위암 의증)
- 사전상담 의견 (예: "사전혼탁상의 정밀한 소견, 진료의뢰서 발급 (유효기간 20~30일), 2026년 8월 한국 방문 예상")

**의료진 정보**
- 성명 (예: 홍길동)
- 면허번호
- 직위
- 소속기관

**통역사 정보**
- 성명
- 면허번호 (있을 경우)
- 성별
- 통역 (언어 — 예: 러시아어)
- 소속기관 (예: 본로이)

### 3. 월별 시트 (4월 ~ 11월, 8개 동일 구조)

**B2 헤더:** "N월 주요 업무내용"

**4행 컬럼:** 구분 / N월 추진 실적 / N+1월 추진 계획(목표)

**5~8행:** 항목 1~4 (각각 좌측 실적, 우측 계획)
- "총 / 세부" 형식으로 입력 (셀 안에 "ㅇ/-/*" 구분)

**9~11행 카운트:**
- B9: 사전상담(건) → C9 입력
- B10: 사후관리(건) → C10 입력
- B11: 환자유치(건) → C11 입력

**12행:** 기타 사항

---

## healwith 시스템에서 데이터 추출 방법

> ⚠️ **2026-09-06 정정.** 아래 SQL 이 `users`·`khidi_intakes`·`interpreters`·`patient_visited_korea` 등
> **존재하지 않는 표·칸**을 조회하고 있었다(운영DB `information_schema` 대조). 집계 정의의 정본은
> `src/lib/khidi/kpi.ts` 이고, 월별 값은 아래 SQL 대신 **`/admin/khidi/kpi-dashboard` 에서 기간을 그 달로 놓고 읽는 것이 가장 안전**하다.
> SQL 로 직접 낼 때는 `KPI_측정방법_명세.md` 의 SQL(2026-09-06 실행 확인분)에 날짜만 바꿔 쓴다.

### 사전상담 건수 (K-02 = 영상 + 글로 전달한 소견)
**Source:** `consultation_sessions`(영상) + `case_opinions`(글) — 둘 다 시험 문의 제외

```sql
-- 영상 사전상담
SELECT COUNT(*)
FROM consultation_sessions cs
WHERE cs.session_type = 'pre_consultation'
  AND cs.status = 'completed'
  AND COALESCE(cs.is_test, FALSE) = FALSE
  AND cs.scheduled_at >= '2026-NN-01'
  AND cs.scheduled_at < '2026-(NN+1)-01';
-- 글로 전달한 사전상담(환자에게 전달된 소견)
SELECT COUNT(*)
FROM case_opinions o
WHERE o.released_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM inquiries i WHERE i.id = o.inquiry_id AND COALESCE(i.is_test, FALSE))
  AND o.released_at >= '2026-NN-01'
  AND o.released_at < '2026-(NN+1)-01';
```

### 사후관리 건수
**Source:** `consultation_sessions` 테이블 (`session_type = 'follow_up'`)

```sql
SELECT COUNT(*)
FROM consultation_sessions
WHERE session_type = 'follow_up'
  AND status = 'completed'
  AND COALESCE(is_test, FALSE) = FALSE
  AND scheduled_at >= '2026-NN-01'
  AND scheduled_at < '2026-(NN+1)-01';
```

### 환자유치 건수 (K-01)
**Source:** `inquiries.outcome = 'admitted'` — 코디가 「유치 확정」을 누르거나 병원 포털에서 리드를 「치료 확정」으로 바꾸면 찍힌다

```sql
SELECT COUNT(*)
FROM inquiries
WHERE outcome = 'admitted'
  AND COALESCE(is_test, FALSE) = FALSE
  AND created_at >= '2026-NN-01'
  AND created_at < '2026-(NN+1)-01';
```
*※ "환자유치" 정의 = 실제 한국 도착 + 진료 시작. 단순 사전상담은 카운트 X. 날짜 기준은 문의 접수일(코호트, 전환 깔때기와 동일).*

### 외국인환자 명단
**Source:** `inquiries`(성명·이메일·전화는 암호문) + `cancer_patient_intakes`(암종·병기) + `consultation_sessions`

- 환자등록번호 = `inquiries.id`(문의 번호) 를 그대로 쓴다. 실명은 양식에 넣지 않는다(가명화: 이니셜 + 출생연도).
- 출생연도·성별·국적 = `cancer_patient_intakes`(암호화 칸은 서버 복호화 경로로만) / `inquiries.nationality`
- 상담일자·횟수 = `consultation_sessions.scheduled_at`(완료분) + `case_opinions.released_at`
- 주상병명 = `cancer_patient_intakes.cancer_type`
- 사전상담 의견 = `case_opinions`(원문) — 환자 전달본은 케이스 상세 「전문의 소견」

가장 빠른 길: 어드민 **`/admin/khidi/evidence`** 에서 기간을 고르고 내려받는다(가명 처리 포함).

### 의료진 명단
**Source:** 면력한방병원 의료진은 코드 데이터 `src/lib/data/immuneDoctors.js`(4개 지점 28명, 2026-08-18 병원 홈페이지 기준 재정렬). 협진 대학병원 의료진은 케이스별 소견 요청(`opinion_requests`)에 기록된 담당의만 적는다.
*※ 운영DB `partner_doctors` 표는 0행이다 — 여기서 뽑지 마라.*

### 통역사 명단
**Source:** 통역은 사람이 아니라 플랫폼 통역봇(`agents/live-translate`)과 자막이 맡는다. 사람이 통역한 회차만 손으로 적는다(소속 본로이). 별도 표는 없다.

---

## 자동화 권장: KHIDI 리포트 생성기

매월 작성 부담 감소를 위한 시스템 기능 제안:

**경로:** `/admin/khidi/monthly-report`

**기능:**
- 월 선택 → "리포트 생성" 클릭
- 시스템이 위 SQL 결과를 양식.xlsx 의 해당 셀에 자동 채움
- xlsx 파일 다운로드

**구현:** `app/api/admin/khidi/monthly-report/route.ts` (미구현, 2026-09-06 확인)
**라이브러리:** `exceljs` (이미 설치됨, `xlsx` 대체)
**우선순위:** 낮음 — 월 1회 손으로 5개 칸을 채우는 일이라 자동화 이득이 작다. 실환자 유치가 늘어 명단 시트가 길어지면 다시 본다.

---

## 월별 보고 체크리스트

매월 말일 ~ 익월 5일 사이:

- [ ] 외국인환자 정보 시트 누적 업데이트 (당월 신규 환자)
- [ ] 4월~11월 중 해당 월 시트:
  - [ ] 항목 1~4 주요 업무 입력 (실적·계획)
  - [ ] C9 사전상담 건수
  - [ ] C10 사후관리 건수
  - [ ] C11 환자유치 건수
  - [ ] B12 기타 사항
- [ ] 요약 시트 자동 계산 검증 (셀 참조 깨짐 없는지)
- [ ] 사업비 사용액 입력 (해당 월 지출액)
- [ ] PDF 변환 또는 xlsx 그대로 KHIDI 시스템 업로드

---

## 보고 누적 데이터 보관

매월 보고 후 사본은 **PO PC 의 사업 폴더**(`…\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\`)에 둔다.
저장소 안 `docs/government-project/monthly-reports/` 폴더는 **만들지 않았다**(2026-09-06 확인) — 제출본에 환자 명단이 들어가므로 저장소에 올리지 않는다.
사업 종료 후 최종 보고서의 데이터 원본은 이 사본과 `kpi_snapshots`(매일 스냅샷)다.

---

## 참조 산출물

- `01_요구사항정의서.docx` — KPI 정의
- `02_기능명세서.docx` — 데이터 모델 (`consultation_sessions` 등)
- `EVAL_MATRIX.docx` — 성과지표 가중치
- `PROJECT_STATUS.md` — 매월 1일 본 가이드 기준 갱신
