# 케이스 생애주기 단일 지도 (Case Lifecycle Map)

> **목적:** 환자 유치 케이스가 "문의 접수 → 완료"까지 흐르는 모든 단계를, **누가 만들고(행동역할) / 누가 보고(조회역할) / 어떤 평가지표를 갱신하나(KPI)** 한 장으로 묶는다.
> **왜:** 역할별 포털(노드)만 만들고 역할 간 연결·역방향 반영·KPI 갱신(엣지)을 빼먹는 "반쪽 기능"이 반복됐다(#200·#202·#207을 PO가 세 번 짚음 — POSTMORTEMS #18). 새 단계·상태·역할을 건드릴 때 **이 표의 빈 칸이 안 생기게** 점검한다.
> **이 문서가 단일 SoR.** 단계 정의 코드는 `src/lib/khidi/caseStatus.ts`(`CASE_STATUS_STEPS`), KPI 집계는 `src/lib/khidi/kpi.ts`, 점수판은 `/admin/khidi/conversion`.

---

## 1. 핵심 데이터 모델 (한눈에)

한 케이스는 **3개 축**으로 동시에 추적된다. 셋이 따로 놀면 "반쪽"이 된다.

| 축 | 컬럼/테이블 | 누가 움직이나 | 누가 보나 |
|---|---|---|---|
| **케이스 단계** (`case_status`) | `inquiries.case_status` (`CASE_STATUS_STEPS`) | 코디(주로) | 환자·에이전시·코디·어드민 |
| **병원 리드 상태** (`hospital_leads.status`) | `sent→viewed→replied→converted/rejected` | 병원 담당자 | 병원·코디·어드민, 역방향으로 에이전시 |
| **유치 결과** (`outcome`) | `inquiries.outcome` (`admitted`/`lost`/null) | 코디 수동 **또는** 병원 `converted` 자동(#207) | 점수판/KPI 집계 |

> ⚠️ **세 축의 연결이 곧 "엣지"다.** 병원이 리드를 `converted`로 바꾸면 → 케이스 단계도 진행돼야 하고(역방향, #202) → 유치 결과(`outcome='admitted'`)도 찍혀야 한다(#207). 하나라도 빠지면 화면엔 보이는데 평가 숫자엔 안 잡히는(또는 그 반대) 사각지대가 생긴다.

---

## 2. 단계별 지도 (단계 × 행동역할 / 조회역할 / KPI)

| # | case_status | 한국어 | **행동역할 (이 단계를 만든다)** | 진입 경로 (코드) | **조회역할 (이 단계를 본다)** | **갱신 KPI** |
|---|---|---|---|---|---|---|
| 1 | `received` | 문의 접수 | 환자(직접 문의) · 에이전시(환자 의뢰) | `POST /api/inquiries/create`·`/step1` · `POST /api/agency/refer` | 환자·에이전시·코디·어드민 | 전환 깔때기 분모(문의 수) |
| 2 | `pre_consult` | 사전상담 진행 | 코디(상담 생성·완료) | `/admin/consultations` → `consultation_sessions(session_type='pre_consultation')` | 환자·코디·의사·어드민 | **K-02 사전상담** (완료 세션 수) |
| 3 | `hospital_review` | 병원 치료가능 검토 중 | 코디/어드민(병원 배정) | `POST /api/coordinator/cases/assign`·`/api/admin/leads/assign` → `hospital_leads(status='sent')` | 코디·어드민·**병원(리드)**·에이전시(타임라인)·환자 | — |
| 4 | `scheduling` | 치료 일정·견적 조율 중 | 병원(리드 응답) → 코디(단계 반영) | `PATCH /api/partner/leads/[id]`(`replied`) → 역방향 `case_status` 반영(#202) | 전 역할 | — |
| 5 | `visa_prep` | 비자·예약 준비 | 코디(수동) | `PATCH /api/admin/khidi/cases` | 전 역할 | — |
| 6 | `treatment` | 입국·치료 중 | 코디(수동) | `PATCH /api/admin/khidi/cases` | 전 역할 | — |
| 7 | `follow_up` | 사후관리 중 | 코디(사후 상담) | `consultation_sessions(session_type='follow_up')` | 환자·코디·의사·어드민 | **K-04 사후관리** (완료 세션 수) |
| 8 | `completed` | 완료 | 코디(수동) | `PATCH /api/admin/khidi/cases` | 전 역할 | — |
| — | `on_hold` | 보류 | 코디(수동) | `PATCH /api/admin/khidi/cases` | 전 역할 | — |

### 단계와 별개로 도는 "결과/지표" 엣지 (가장 잘 빠지는 부분)

| 이벤트 | 행동역할 | 경로 | 갱신 KPI |
|---|---|---|---|
| **유치 확정** (`outcome='admitted'`) | ① 병원이 리드 `converted` → **자동**(#207) ② 코디 수동 | ① `PATCH /api/partner/leads/[id]` → `outcomeForHospitalLeadStatus` ② `POST /api/admin/khidi/conversion-funnel` | **K-01 외국인환자 유치** (목표 12건) |
| **유치 실패** (`outcome='lost'`) | 코디 수동 | `POST /api/admin/khidi/conversion-funnel` | 전환 깔때기(이탈) |
| **만족도 설문 응답** | 환자(설문 응답) | cron `dispatch-surveys` → `surveys`/`survey_responses` | **K-03 환자 만족도** (목표 90점) |

> **K-01 유치 = `inquiries.outcome='admitted'` 한 곳으로 통일**(전환 깔때기 RPC·`kpi.ts` 둘 다 동일 정의). 점수판 유치 숫자 = 이 컬럼 카운트. **테스트 데이터도 그대로 집계되니** 데모 시 검증 후 되돌릴 것(`outcome=null`).

---

## 3. "반쪽 기능" 방지 체크리스트 (새 단계·상태·역할 추가 시 필수)

새 케이스 단계·상태 필드·역할 포털을 추가하면, **같은 작업 단위에서** 아래 3종을 전부 채운다 (PO_PREFERENCES "반쪽 금지" / POSTMORTEMS #18):

- [ ] **① 업스트림 (누가 이 상태를 만드나)** — 이 단계로 진입시키는 행동역할·API가 실제로 있나? (없으면 영원히 안 켜지는 단계)
- [ ] **② 다운스트림 가시성 (관련 *모든* 역할이 보나)** — 이 상태 변화가 연관된 **모든** 포털(환자·에이전시·코디·병원·어드민)에 반영되나? **역방향**(병원 응답 → 코디·에이전시)도 포함했나?
- [ ] **③ 지표 소비자 (평가 KPI를 갱신하나)** — 이 변화가 평가 지표(K-01 유치 / K-02 사전상담 / K-03 만족도 / K-04 사후관리)에 잡혀야 하나? 잡혀야 하면 해당 컬럼(`outcome`·`consultation_sessions`·`survey_responses`)을 **같이** 갱신했나?

> "빌드·단위테스트 통과"는 교차역할 워크플로 완성을 **보장 못 한다.** PO가 끝에서 끝까지 클릭해야 빈 엣지가 보이는 상황을 만들지 말 것.

### 과거 빈 엣지 사례 (재발 방지 레퍼런스)
- **#200**: 에이전시·환자가 의뢰해도 코디·병원이 백오피스에서 받을 연결이 없었음 → 코디 배정·병원 확인 엣지 추가.
- **#202**: 병원이 리드에 응답해도 코디·에이전시 화면에 역방향 반영이 없었음 → 역방향 엣지(닫힌 고리) 추가.
- **#207**: 병원이 `converted`(치료 확정)해도 K-01 유치 KPI에 안 잡혔음 → `outcome='admitted'` 자동 집계 엣지 추가.

---

## 4. 빠른 점검 쿼리 (운영 중 "반쪽" 탐지)

```sql
-- 병원은 converted 인데 유치(outcome)가 안 찍힌 케이스 = #207 이전의 사각지대 패턴
SELECT i.id, hl.status AS lead_status, i.case_status, i.outcome
FROM hospital_leads hl
JOIN normalized_inquiries ni ON ni.id = hl.normalized_inquiry_id
JOIN inquiries i ON i.id = ni.source_inquiry_id
WHERE hl.status = 'converted' AND i.outcome IS DISTINCT FROM 'admitted';

-- 현재 유치 집계(점수판 유치 숫자의 원천)
SELECT count(*) FROM inquiries WHERE outcome = 'admitted';
```

위 첫 쿼리가 **0행이어야** 병원 확정 → 유치 집계 엣지가 살아있는 것이다(0행이 아니면 회귀).
