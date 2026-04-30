# KHIDI 월간 업무 보고 작성 가이드

**대상 양식:** `(양식) 월간 업무 보고.xlsx`
**보고 주기:** 매월 말 → 익월 초 KHIDI 제출
**사업비 총액:** 80,000,000원 (요약 시트 G11 참조)

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
| 정부지원금 | G11 | 80,000,000원 (고정) |
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

## HEALO 시스템에서 데이터 추출 방법

### 사전상담 건수
**Source:** Supabase `consultation_sessions` 테이블

```sql
SELECT COUNT(*)
FROM consultation_sessions
WHERE session_type = 'pre_consultation'
  AND status = 'completed'
  AND scheduled_at >= '2026-NN-01'
  AND scheduled_at < '2026-(NN+1)-01';
```

### 사후관리 건수
**Source:** `consultation_sessions` 테이블 (`session_type = 'follow_up'`)

```sql
SELECT COUNT(*)
FROM consultation_sessions
WHERE session_type = 'follow_up'
  AND status = 'completed'
  AND scheduled_at >= '2026-NN-01'
  AND scheduled_at < '2026-(NN+1)-01';
```

### 환자유치 건수
**Source:** `inquiries` 또는 `intake` 완료 후 실제 한국 방문 확정 환자

```sql
SELECT COUNT(DISTINCT user_id)
FROM consultation_sessions
WHERE status = 'completed'
  AND patient_visited_korea = TRUE  -- 컬럼 추가 필요 또는 별도 추적
  AND visit_date >= '2026-NN-01'
  AND visit_date < '2026-(NN+1)-01';
```
*※ "환자유치" 정의 = 실제 한국 도착 + 진료 시작. 단순 사전상담은 카운트 X.*

### 외국인환자 명단
**Source:** `consultation_sessions` JOIN `users`, `khidi_intakes`

```sql
SELECT
  u.id AS 환자등록번호,
  EXTRACT(YEAR FROM i.birth_date) AS 출생연도,
  i.gender AS 성별,
  i.nationality AS 국적,
  cs.scheduled_at AS 상담일자,
  COUNT(*) OVER (PARTITION BY u.id) AS 횟수,
  i.diagnosis AS 주상병명,
  cs.notes AS 사전상담의견
FROM consultation_sessions cs
JOIN users u ON cs.patient_id = u.id
JOIN khidi_intakes i ON i.user_id = u.id
WHERE cs.status = 'completed';
```

### 의료진 명단
**Source:** `partner_doctors` 테이블 (면역병원 의료진 4개 지점 분 이미 등록됨)

### 통역사 명단
**Source:** `interpreters` 테이블 (없으면 추가 필요)

---

## 자동화 권장: KHIDI 리포트 생성기

매월 작성 부담 감소를 위한 시스템 기능 제안:

**경로:** `/admin/khidi/monthly-report`

**기능:**
- 월 선택 → "리포트 생성" 클릭
- 시스템이 위 SQL 결과를 양식.xlsx 의 해당 셀에 자동 채움
- xlsx 파일 다운로드

**구현:** `app/api/admin/khidi/monthly-report/route.ts` (예정)
**라이브러리:** `exceljs` (이미 설치됨, `xlsx` 대체)
**우선순위:** 중 (수동 작성도 가능하므로, 다른 코어 기능 완료 후)

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

매월 보고 후 사본을 다음 위치에 보관:

```
docs/government-project/monthly-reports/
├── 2026-04_월간보고.xlsx
├── 2026-05_월간보고.xlsx
├── ...
└── 2026-11_월간보고.xlsx
```

이 폴더는 **사업 종료 후 최종 보고서 작성 시 데이터 원본**으로 활용.

---

## 참조 산출물

- `01_요구사항정의서.docx` — KPI 정의
- `02_기능명세서.docx` — 데이터 모델 (`consultation_sessions` 등)
- `EVAL_MATRIX.docx` — 성과지표 가중치
- `PROJECT_STATUS.md` — 매월 1일 본 가이드 기준 갱신
