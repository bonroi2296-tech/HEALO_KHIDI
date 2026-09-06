# healwith KPI 측정 방법 명세

**목적:** KHIDI 사업 성과지표를 시스템 데이터로부터 객관적·재현 가능하게 측정
**갱신:** KPI 정의 변경 시 · **마지막 실행 확인 2026-09-06**(아래 SQL 전부 운영DB 재실행)
**적용:** 월간 보고·중간 보고·최종 보고 모두 본 명세 기준

---

## 1. KPI 정의 (KHIDI 공고 기준)

> 🛑 **2026-08-06 재확인 (PO) — 목표치는 12건 / 120건 / 90점이다. 이걸로 끝난 얘기다.**
> **최초 신청본 `01. 사업신청/[최종] 사업계획서_v3.docx` 의 성과지표 총괄표에는 옛 값이 남아 있다**
> (유치 최소10·도전12 / 상담 최소80·도전96 / 만족도 최소80·도전85, 「환자당 8회(사전3+사후5)」).
> **그 문서를 근거로 목표치를 다시 낮추지 마라** — 신청 단계 값이고, 확정 목표는 위 12/120/90이다.
> 상담 120건의 구조는 **유치 12 × 10회(사전 5 + 사후 5)**. 단, 그 문서의 **증빙 방법
> 「healwith 로그, 상담일지」**는 유효하다(영상통화로 한정하지 않는 근거).
>
> ⚠️ **2026-07-27 정정** — 아래 목표치가 오래된 값(유치 10건 / 사전상담 80건 / 만족도 80점)으로
> 남아 있어 현행 공식 목표로 고쳤다. **목표의 단일 소스(SoR)는 `src/lib/khidi/targets.ts`**이며
> 유치 전환 대시보드(`/admin/khidi/conversion`)도 그 값으로 집계한다.
> 이 표와 코드가 어긋나면 **코드가 맞다** — 이 표를 고칠 것.

| KPI ID | 지표 | 목표 | 사업 종료 시 검증 |
|---|---|---|---|
| K-01 | 외국인환자 유치 건수 | **12건 이상** | 누적 카운트 |
| K-02 + K-04 | 사전상담 + 사후관리 합산 | **120건 이상** | 누적 카운트 (유치 12 × 10회: 사전 5 + 사후 5) |
| K-03 | 환자 만족도 | **90점 이상** | 평균 점수 |
| K-05 | 다국어 지원 | 6개국어 (ko·en·ru·kz·zh·ja) | 운영 사실 |

---

## 2. K-01. 외국인환자 유치 건수

### 정의
**"한국에 실제로 도착하여 면력한방병원(또는 협력 병원) 진료를 시작한 외국인 환자 수"**

단순 사전상담만 받고 한국 미방문 → **카운트 X**.

### 측정 데이터 출처
- `inquiries` 테이블 — `outcome='admitted'` 가 유치 확정 표시다.
  코디네이터가 「유치 확정」을 누르거나, 병원 포털에서 리드를 「치료 확정」으로 바꾸면 여기에 반영된다.
- 유치 전환 대시보드(`/admin/khidi/conversion`)와 **같은 정의**를 쓴다.

> ⚠️ **2026-08-20 정정.** 아래 SQL 이 `users`·`khidi_intakes`·`patient_visits` 와
> `consultation_sessions.visit_confirmed_at` 을 조회하고 있었는데 **넷 다 존재하지 않는다.**
> 코드는 2026-06-19 에 이미 고쳤고(POSTMORTEMS #7 — 없는 컬럼을 조회해 실적이 항상 0이었다)
> 이 문서만 옛 SQL 로 남아 있었다. 아래는 **운영DB 에서 실제로 돌려 값을 확인한** SQL 이다.

### 산출 SQL
```sql
-- 2026-08-20 실행 확인: 0건 · 2026-09-06 재실행: 0건
SELECT COUNT(*) AS 유치_건수
FROM inquiries i
WHERE i.outcome = 'admitted'
  AND COALESCE(i.is_test, FALSE) = FALSE
  AND i.created_at >= '2026-04-01' AND i.created_at < '2026-12-01';
```

### 검증 절차
1. 매월 1일 위 SQL 실행 → 결과 캡처
2. 결과는 `kpi_snapshots` 표(매일 자동 스냅샷)와 PO PC 사업 폴더의 월간보고 사본에 남는다(저장소 안 `monthly-reports/` 폴더는 만들지 않았다 — 환자 명단이 섞이므로)
3. 환자 명단(가명 처리)은 `MONTHLY_REPORT_GUIDE.md` 의 "외국인환자 정보 시트" 양식대로 추출

### 위험·예외
- 한국 도착 후 면력한방병원 외 병원 방문 → **카운트 X** (healwith 매개 아닌 경우)
- 가족 동반 → 환자 본인만 카운트 (1명 = 1건)

---

## 3. K-02. 원격 사전상담 건수

### 정의 (2026-08-06 PO 지시로 확대 — 아래 ⚠️ 경위 참조)
**"환자 케이스에 대해 실제로 상담이 이루어지고 결과가 환자에게 전달된 건수"** — 매체는 둘:

| 매체 | 세는 기준 |
|---|---|
| ① 영상 사전상담 | `consultation_sessions.session_type='pre_consultation'` AND `status='completed'` |
| ② **글로 전달한 사전상담** | `case_opinions.released_at IS NOT NULL` (의료진 소견을 검토해 **환자에게 전달 완료**한 건) |

단순 예약·취소된 세션 → 카운트 X.
소견을 **작성만 하고 환자에게 안 보낸 초안** → 카운트 X (`released_at` 이 판정 기준).
시험용 문의(`inquiries.is_test=true`)에 딸린 것 → 전부 카운트 X.

> ⚠️ **왜 고쳤나 (2026-08-06).** 옛 정의는 *"LiveKit 영상 통화가 5분 이상 유지된 세션"* 이었다.
> 그런데 **진흥원 제출 정의의 증빙은 「healwith 상담로그·AI/Human 기록」**이지 영상통화가 아니다
> (`docs/KHIDI_중간보고_베이스.md` §2 지표표). 이 자체 명세가 매체를 영상으로 좁혀 놓아
> **병원에서 검토해 환자에게 전달한 소견이 한 건도 안 세어지고 있었다**(실측: 3건 누락).
> 또한 옛 SQL 의 `actual_duration_minutes` 는 **존재하지 않는 컬럼**이었고, 대체 컬럼
> `duration_seconds` 도 전 건 `null` 이라 「5분 이상」 조건은 애초에 잴 수 없었다.

### 측정 데이터
- `consultation_sessions` 테이블 (영상)
- `case_opinions` 테이블 (글 — `released_at`)
- 구현: `src/lib/khidi/kpi.ts` (`preConsultation` + `writtenOpinion`), 합산은 `dashboardMetrics.consultCareTotal()`

### 산출 SQL
```sql
-- ① 영상 사전상담
-- 2026-08-20 실행 확인: 1건 · 2026-09-06 재실행: 1건
SELECT COUNT(*) AS 영상_사전상담
FROM consultation_sessions cs
WHERE cs.session_type = 'pre_consultation'
  AND cs.status = 'completed'
  AND COALESCE(cs.is_test, FALSE) = FALSE          -- 시험 방 제외
  AND NOT EXISTS (SELECT 1 FROM inquiries i          -- 시험 «문의»에 딸린 방도 제외 (코드 fetchTestSessionIds 와 같은 범위, 2026-09-06 정정)
                  WHERE i.id = cs.inquiry_id AND COALESCE(i.is_test, FALSE) = TRUE)
  AND cs.scheduled_at >= '2026-04-01' AND cs.scheduled_at < '2026-12-01';

-- ② 글로 전달한 사전상담 (의료진 소견 전달 완료, 시험용 문의 제외)
-- 2026-08-20 실행 확인: 6건 · 2026-09-06 재실행: 6건
SELECT COUNT(*) AS 글_소견전달
FROM case_opinions o
WHERE o.released_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM inquiries i
                  WHERE i.id = o.inquiry_id AND COALESCE(i.is_test, FALSE) = TRUE)
  AND o.released_at >= '2026-04-01' AND o.released_at < '2026-12-01';
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
-- 2026-08-20 실행 확인: 응답 1건, 평균 100.0 · 2026-09-06 재실행: 응답 2건(전부 시험·시연용 설문) — 실환자 연결 응답 0건
-- ⚠️ survey_type 은 survey_responses 가 아니라 surveys 표에 있다(2026-08-20 정정).
SELECT ROUND(AVG((r.q1_score + r.q2_score + r.q3_score + r.q4_score + r.q5_score) / 5.0 * 20), 1)
       AS 만족도_평균,
       COUNT(*) AS 응답_수
FROM survey_responses r
JOIN surveys s ON s.id = r.survey_id
LEFT JOIN inquiries i ON i.id = s.inquiry_id
WHERE COALESCE(i.is_test, FALSE) = FALSE            -- 시험 문의에 딸린 설문 제외 (코드 fetchTestSurveyIds 와 같은 취지, 2026-09-06 정정)
  AND r.submitted_at >= '2026-04-01' AND r.submitted_at < '2026-12-01';
-- 응답률 = 위 응답 수 / (같은 기간 surveys.sent_at 이 찍힌 발송 수). 코드는 소수 1자리 반올림.
-- 표본부족 가드: SATISFACTION_MIN_RESPONSES 미만이면 화면은 평균 대신 「표본 부족」을 낸다.
```

### 검증 절차
1. 매월 응답률 (`응답수 / 발송수`) 확인 → 60% 미만이면 발송 채널 점검
2. Q1~Q5 개별 평균도 함께 보고 (낮은 항목 → 개선 영역 식별)
3. 자유 의견(`comment` 필드) 정성 분석

### 시스템 구현 상태 (2026-09-06 코드 확인)
- ✅ 설문 발송 자동화 — `/api/cron/dispatch-surveys`(매일 09:00 UTC) 가 Resend 메일로 발송. 카카오 알림톡은 미도입(대상 환자가 러시아어권이라 우선순위 낮음)
- ✅ 설문 응답 페이지 — `/survey/[token]` 운영 중(E2E `patient-survey-response.spec.ts`)
- ✅ 결과 집계 — 어드민 `/admin/khidi/satisfaction`, 코디 `/coordinator/satisfaction`
- ⚠️ **실환자 응답이 아직 0건**이라 K-03 은 「표본 없음」이다. 설문 발송 조건(상담 «완료» 처리)이 사람 손에 걸려 있다 — 코디가 [상담 완료]를 눌러야 발송된다(06_사용자매뉴얼 2.4).
- 표본부족 가드: `SATISFACTION_MIN_RESPONSES`(env, 기본 0=가드 없음). PO 가 신뢰구간을 정하면 3~5 로 켠다.

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
-- 2026-08-20 실행 확인: 0건 · 2026-09-06 재실행: 0건 (실환자가 치료 완료 단계에 아직 도달하지 않았다)
SELECT COUNT(*) AS 사후관리_상담_건수
FROM consultation_sessions cs
WHERE cs.session_type = 'follow_up'
  AND cs.status = 'completed'
  AND COALESCE(cs.is_test, FALSE) = FALSE
  AND NOT EXISTS (SELECT 1 FROM inquiries i
                  WHERE i.id = cs.inquiry_id AND COALESCE(i.is_test, FALSE) = TRUE)
  AND cs.scheduled_at >= '2026-04-01' AND cs.scheduled_at < '2026-12-01';

-- (옛 「사후관리 메시지」 SQL 삭제 — messages 표는 존재하지 않는다. 2026-08-20 확인)
-- 성과지표에 세는 사후관리는 위 「완료된 follow_up 세션」뿐이다.
```

---

## 6. K-05. 다국어 지원 검증

### 정의
**"6개국어(한·영·러·카·중·일) UI 커버리지 100%"**

### 측정 방법
- `src/lib/i18n/config.js` 의 `LOCALES` 배열 = 6 (en·ko·ru·kz·zh·ja). 옛 기록의 `LANG_CODES` 는 없는 이름이다
- 모든 페이지가 6개 언어 fallback 동작 (자동 테스트)

### 검증 SQL/스크립트
```bash
# 6개 언어별 i18n 키 누락 검증 (CI 가 매 변경마다 ru·kz 는 누락 시 차단)
npm run check:i18n -- --fail-on-missing
# 번역 품질(사실 유실·언어 섞임·용어 흔들림)
npm run check:i18n-quality
# 암종 콘텐츠 6개 언어 완성
npm run check:cancer-i18n
```

### 현재 상태 (2026-09-06 실측)
- ✅ ko/en — 100%
- ✅ ru/kz — 2,052키 100% (CI 차단 대상)
- ✅ zh/ja — 화면 문구 사전은 전건 채움. 콘텐츠 칸(치료법·암종 상세·병원 소개)은 2026-09-06 AI 번역으로 채웠고 **원어민 검수 전 「제안」 상태**(`docs/rules/I18N_QUALITY.md` §3)
- 언어 코드 표기: 코드·주소는 `kz`, 메일 템플릿은 한때 `kk` 와 섞여 엉뚱한 언어로 나갈 구조였다(2026-09-06 #1654 로 통일). 새 코드는 `kz` 하나만 쓴다.

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

## 8. KPI 자동 추적 시스템 (✅ 구현됨 — 2026-09-06 확인)

| 화면 | 역할 | 집계 코드 |
|---|---|---|
| `/admin/khidi/kpi-dashboard` | 목표 대비 K-01~K-05 자동 집계 · 기간 선택 | `src/lib/khidi/kpi.ts` |
| `/admin/khidi/conversion` | 유치 깔때기(문의→사전상담→견적·비자→유치→사후관리) · 「실적만」 스위치 | `conversion_funnel` RPC(같은 정의) |
| `/admin/khidi/satisfaction` | 만족도 응답·응답률 | `survey_responses` |
| `/admin/khidi/evidence` | 증빙 산출물 내려받기 | — |
| `/api/cron/kpi-snapshot` | 매일 15:05 UTC 지표 스냅샷(`kpi_snapshots`, 111일 누적) | `src/lib/khidi/snapshotDates.ts` |

**아직 없는 것:** 월간 보고 xlsx 자동 채움(`MONTHLY_REPORT_GUIDE.md`). 월 1회 손으로 SQL 을 돌려 넣는다.
**정직성 가드:** `npm run check:metric-honesty` 가 공식 산출물이 시험 데이터를 실적으로 세는 것을 CI 에서 차단한다(3회 재발 뒤 신설).

---

## 9. 데이터 무결성 보장

- 모든 KPI SQL은 **read-only**, 결과 변경 불가
- 월별 결과는 `monthly-reports/` 폴더에 JSON 으로 보관 → 사후 검증 가능
- 환자 PII는 가명화(이니셜 + 출생연도) 후 기록 (PIPA 준수)
- 감리 시 원본 SQL + 결과 + 보관 JSON 3종 매칭 검증
