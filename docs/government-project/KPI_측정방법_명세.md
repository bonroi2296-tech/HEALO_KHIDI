# HEALO KPI 측정 방법 명세

**목적:** KHIDI 사업 성과지표를 시스템 데이터로부터 객관적·재현 가능하게 측정
**갱신:** KPI 정의 변경 시
**적용:** 월간 보고·중간 보고·최종 보고 모두 본 명세 기준

---

## 1. KPI 정의 (KHIDI 공고 기준)

| KPI ID | 지표 | 목표 | 사업 종료 시 검증 |
|---|---|---|---|
| K-01 | 외국인환자 유치 건수 | **10건 이상** | 누적 카운트 |
| K-02 | 원격 사전상담 건수 | **80건 이상** | 누적 카운트 |
| K-03 | 환자 만족도 | **80점 이상** | 평균 점수 |
| K-04 | 사후관리 건수 | (별도 목표 없음, 가산점) | 누적 카운트 |
| K-05 | 다국어 지원 | 6개국어 | 운영 사실 |

---

## 2. K-01. 외국인환자 유치 건수

### 정의
**"한국에 실제로 도착하여 면력한방병원(또는 협력 병원) 진료를 시작한 외국인 환자 수"**

단순 사전상담만 받고 한국 미방문 → **카운트 X**.

### 측정 데이터 출처
- `consultation_sessions` 테이블 (사전상담 기록)
- `khidi_intakes` 테이블 (인테이크 정보, 국적)
- `patient_visits` 테이블 (한국 방문 기록 — 신설 권장, 또는 `consultation_sessions.visit_confirmed_at`)

### 산출 SQL
```sql
SELECT COUNT(DISTINCT u.id) AS 유치_건수
FROM users u
JOIN khidi_intakes i ON i.user_id = u.id
JOIN consultation_sessions cs ON cs.patient_id = u.id
WHERE i.nationality NOT IN ('KR', 'Korea', '한국')
  AND cs.status = 'completed'
  AND EXISTS (
    SELECT 1 FROM patient_visits pv
    WHERE pv.patient_id = u.id
      AND pv.arrival_date IS NOT NULL
  )
  AND i.created_at BETWEEN '2026-04-01' AND '2026-12-31';
```

### 검증 절차
1. 매월 1일 위 SQL 실행 → 결과 캡처
2. `docs/government-project/monthly-reports/2026-NN_KPI.json` 으로 보관
3. 환자 명단(가명 처리)은 `MONTHLY_REPORT_GUIDE.md` 의 "외국인환자 정보 시트" 양식대로 추출

### 위험·예외
- 한국 도착 후 면력한방병원 외 병원 방문 → **카운트 X** (HEALO 매개 아닌 경우)
- 가족 동반 → 환자 본인만 카운트 (1명 = 1건)

---

## 3. K-02. 원격 사전상담 건수

### 정의
**"LiveKit 영상 통화가 실제로 시작되고 5분 이상 유지된 사전상담 세션 수"**

단순 예약·취소된 세션 → 카운트 X.
5분 미만 세션 → 카운트 X (네트워크 문제 등으로 즉시 종료된 경우 제외).

### 측정 데이터
- `consultation_sessions` 테이블
- `livekit_session_logs` (LiveKit Webhook 기록)

### 산출 SQL
```sql
SELECT COUNT(*) AS 사전상담_건수
FROM consultation_sessions cs
WHERE cs.session_type = 'pre_consultation'
  AND cs.status = 'completed'
  AND cs.actual_duration_minutes >= 5
  AND cs.scheduled_at BETWEEN '2026-04-01' AND '2026-12-31';
```

### 보조 지표 (월간 보고용)
- 평균 통화 시간 (분)
- 통역 동반률 (%)
- 의료진 비율 (한방 vs 양방)

---

## 4. K-03. 환자 만족도

### 정의
**"사전상담 종료 후 발송된 5문항 만족도 설문의 평균 점수 (100점 환산)"**

### 설문 항목 (5문항, 각 100점 환산)
| 번호 | 문항 | 척도 |
|---|---|---|
| Q1 | 상담 의료진의 전문성에 만족하셨습니까? | 1~5 (Likert) |
| Q2 | 통역 품질에 만족하셨습니까? | 1~5 |
| Q3 | 시스템 사용 편의성은 어땠습니까? | 1~5 |
| Q4 | 답변 속도와 코디네이터 응대에 만족하셨습니까? | 1~5 |
| Q5 | 전반적인 만족도는 어땠습니까? | 1~5 |

**점수 환산:** Likert 5점 → 100점 (5=100, 4=80, 3=60, 2=40, 1=20)

### 발송 시점
- 사전상담 세션 종료 24시간 후 자동 이메일·카톡 발송
- 미응답 시 72시간 후 1회 리마인더
- 응답률 목표: 60% 이상

### 측정 데이터
- `surveys` 테이블 (설문 정의)
- `survey_responses` 테이블 (개별 응답)

### 산출 SQL
```sql
SELECT
  AVG(
    (q1_score + q2_score + q3_score + q4_score + q5_score) / 5.0 * 20
  ) AS 만족도_평균
FROM survey_responses
WHERE survey_type = 'post_consultation'
  AND submitted_at BETWEEN '2026-04-01' AND '2026-12-31';
```

### 검증 절차
1. 매월 응답률 (`응답수 / 발송수`) 확인 → 60% 미만이면 발송 채널 점검
2. Q1~Q5 개별 평균도 함께 보고 (낮은 항목 → 개선 영역 식별)
3. 자유 의견(`comment` 필드) 정성 분석

### 시스템 구현 상태
- 🟡 설문 발송 자동화 — Resend 메일 + 카카오 알림톡 미구현
- 🟡 설문 응답 페이지 (`/survey/[token]`) — 미구현
- ❌ 결과 집계 대시보드 — 미구현

**우선순위 높음.** Phase B 산출물 작업과 별개로 구현 필요.

---

## 5. K-04. 사후관리 건수

### 정의
**"한국 치료 종료 후 30일·90일·180일 시점에 진행된 후속 영상 상담 또는 메시지 응대 건수"**

### 측정 데이터
- `consultation_sessions` (`session_type = 'follow_up'`)
- `messages` 테이블 (코디네이터 ↔ 환자)

### 산출 SQL
```sql
-- 사후관리 영상 상담
SELECT COUNT(*) AS 사후관리_상담_건수
FROM consultation_sessions
WHERE session_type = 'follow_up'
  AND status = 'completed'
  AND scheduled_at BETWEEN '2026-04-01' AND '2026-12-31';

-- 사후관리 메시지 (옵션)
SELECT COUNT(DISTINCT thread_id) AS 사후관리_메시지_쓰레드
FROM messages
WHERE message_type = 'follow_up'
  AND created_at BETWEEN '2026-04-01' AND '2026-12-31';
```

---

## 6. K-05. 다국어 지원 검증

### 정의
**"6개국어(한·영·러·카·중·일) UI 커버리지 100%"**

### 측정 방법
- `src/lib/i18n/index.js` 의 `LANG_CODES` 배열 = 6
- 모든 페이지가 6개 언어 fallback 동작 (자동 테스트)

### 검증 SQL/스크립트
```bash
# 6개 언어별 i18n 키 누락 검증
node scripts/check-i18n-coverage.js
```

### 현재 상태
- ✅ ko/en — 100%
- 🟡 ru/kk — 핵심 페이지 100%, 보조 페이지 부분
- 🟡 zh/ja — 일부 페이지

---

## 7. 월간·중간·최종 보고 매핑

### 월간 보고 (`(양식) 월간 업무 보고.xlsx`)
- C9 사전상담(건) → **K-02**
- C10 사후관리(건) → **K-04**
- C11 환자유치(건) → **K-01**

### 중간 보고 (사업 50% 시점)
- 누적 K-01~K-05 + 추세 분석
- 위 KPI 외 + `리스크_관리_대장.md` 의 변경사항

### 최종 보고 (사업 종료)
- 누적 K-01~K-05 → 목표 대비 실적
- 미달 항목 사유·향후 계획
- 정성 사례 5건 이상 (환자 인터뷰·후기)

---

## 8. KPI 자동 추적 시스템 (구현 권장)

**경로:** `/admin/khidi/kpi-dashboard`

**기능:**
- 위 SQL 들을 Edge Function 으로 실행
- 일·주·월 단위 그래프 자동 갱신
- 목표 대비 진행률 (%)
- 만족도 응답률·평균 실시간 표시
- 월간 보고 xlsx 자동 채움 (`MONTHLY_REPORT_GUIDE.md` 의 자동화 항목)

**구현 우선순위:** 중-상 (실 환자 발생 시점에 맞춰)
**예상 공수:** 3~5일

---

## 9. 데이터 무결성 보장

- 모든 KPI SQL은 **read-only**, 결과 변경 불가
- 월별 결과는 `monthly-reports/` 폴더에 JSON 으로 보관 → 사후 검증 가능
- 환자 PII는 가명화(이니셜 + 출생연도) 후 기록 (PIPA 준수)
- 감리 시 원본 SQL + 결과 + 보관 JSON 3종 매칭 검증
