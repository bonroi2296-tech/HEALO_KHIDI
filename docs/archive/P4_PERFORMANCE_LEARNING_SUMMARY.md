# P4: 병원 성과 기반 자동 학습 시스템 완료 보고서

> 작성일: 2026-01-29  
> 목표: 데이터 기반 병원 추천 (베이지안 스무딩)  
> 방식: 통계 기반 랭킹 (LLM 파인튜닝 아님)

---

## ✅ 완료 항목

1. ✅ **hospital_lead_assignments 테이블** - 리드 할당 기록
2. ✅ **hospital_performance_stats 테이블** - 성과 집계 (베이지안 점수)
3. ✅ **집계 스크립트** - Node.js 배치 도구
4. ✅ **추천 VIEW** - v_hospital_recommendations
5. ✅ **상세 문서화** - 베이지안 수식, Cold Start 설명

---

## 🎯 핵심 개념

### 베이지안 스무딩이란?

**문제**:
```
병원 A: 100건 중 40건 전환 (40%)
병원 B: 2건 중 2건 전환 (100%)

단순 전환율: B > A (잘못됨)
베이지안 점수: A ≈ B (안전함)
```

**해결**:
```
Bayesian Score = (m * Global_Avg + n * Hospital_Rate) / (m + n)

m = 10 (가중치)
Global_Avg = 0.3 (전체 평균 30%)
n = 병원 데이터 수
Hospital_Rate = 병원 실제 전환율
```

**효과**:
- 신규 병원: 전체 평균에 가까운 점수 (보수적)
- 검증된 병원: 실제 성과에 가까운 점수 (신뢰)
- Cold Start 문제 해결

---

## 📊 데이터 흐름

```
1. 리드 전달
   운영자가 병원 선택
   ↓
   hospital_lead_assignments 기록
   (inquiry_id, hospital_id, decision)

2. 병원 응답
   병원이 이메일/카톡 응답
   ↓
   hospital_responses 업데이트
   (response_status: interested/booked/completed)

3. 성과 집계 (매일 새벽 Cron)
   npx tsx scripts/hospital-performance-aggregator.ts refresh
   ↓
   hospital_performance_stats 계산
   (베이지안 점수, 전환율, 속도)

4. 추천 조회
   운영자가 VIEW 조회
   ↓
   v_hospital_recommendations
   (점수 순으로 정렬된 병원 리스트)

5. 피드백 루프
   성과 좋은 병원 → 높은 점수 → 더 많은 리드
   성과 나쁜 병원 → 낮은 점수 → 적은 리드
```

---

## 🗄️ 새로 추가된 테이블

### 1. hospital_lead_assignments
**용도**: 어떤 리드를 어디로 보냈는지 기록

| 컬럼 | 타입 | 설명 |
|------|------|------|
| inquiry_id | INTEGER | 문의 ID |
| hospital_id | INTEGER | 병원 ID |
| treatment_id | INTEGER | 시술 ID |
| country | TEXT | 국가 |
| language | TEXT | 언어 |
| decision | JSONB | 결정 근거 |
| assigned_by | TEXT | manual/auto/recommendation_engine |

**예시**:
```sql
INSERT INTO hospital_lead_assignments (
  inquiry_id, hospital_id, treatment_id, 
  country, language, decision
) VALUES (
  123, 1, 5,
  'KR', 'ko',
  '{"reason": "highest_score", "score": 0.85, "rank": 1}'
);
```

---

### 2. hospital_performance_stats
**용도**: 집계된 성과 통계

| 컬럼 | 타입 | 설명 |
|------|------|------|
| hospital_id | INTEGER | 병원 ID |
| treatment_id | INTEGER | 시술 ID (NULL = 전체) |
| country | TEXT | 국가 (NULL = 전체) |
| language | TEXT | 언어 (NULL = 전체) |
| period | TEXT | all_time / last_30d / last_7d |
| leads_sent | INTEGER | 전달된 리드 수 |
| leads_booked | INTEGER | 예약 확정 수 |
| leads_completed | INTEGER | 시술 완료 수 |
| booking_rate | NUMERIC | 예약 전환율 |
| completion_rate | NUMERIC | 완료 전환율 |
| **bayesian_score** | NUMERIC | **베이지안 점수 (0~1)** |
| **confidence_level** | NUMERIC | **신뢰도 (0~1)** |
| sample_size | INTEGER | 데이터 수 |

**차원 조합**:
- (hospital=1, treatment=NULL, country=NULL) → 병원 1 전체 성과
- (hospital=1, treatment=5, country='KR') → 병원 1의 코성형 한국인 성과

---

### 3. hospital_performance_global_avg
**용도**: 글로벌 평균 저장

| 컬럼 | 기본값 | 설명 |
|------|--------|------|
| global_completion_rate | 0.25 | 전체 평균 완료율 25% |
| bayesian_m | 10 | Prior strength (가중치) |

---

## 🔧 사용법

### 1. 초기 설정

```bash
# 1. DB 마이그레이션
# Supabase SQL Editor에서 실행
migrations/20260129_add_hospital_performance.sql

# 2. 초기 집계
npx tsx scripts/hospital-performance-aggregator.ts refresh
```

---

### 2. 병원 추천 조회

#### SQL로 직접 조회
```sql
-- 코성형(1) 한국(KR) 한국어(ko) 추천 병원 Top 5
SELECT 
  hospital_name,
  bayesian_score,
  confidence_level,
  breakdown
FROM v_hospital_recommendations
WHERE treatment_id = 1
  AND country = 'KR'
  AND language = 'ko'
ORDER BY bayesian_score DESC
LIMIT 5;
```

#### CLI 도구 사용
```bash
npx tsx scripts/hospital-performance-aggregator.ts recommend \
  --treatment 1 \
  --country KR \
  --language ko \
  --limit 5
```

**결과 예시**:
```
🎯 병원 추천 조회

1. Seoul Plastic Surgery A
   점수: 85.0/100 (신뢰도: 91%)
   데이터: 100건
   예약율: 42.0%
   완료율: 38.0%
   응답 속도: 12.5시간
   추천 등급: 🔥 강력 추천

2. Gangnam Beauty Hospital
   점수: 78.0/100 (신뢰도: 87%)
   데이터: 80건
   예약율: 40.0%
   완료율: 36.0%
   응답 속도: 18.2시간
   추천 등급: 🔥 강력 추천

3. Korea Medical Center
   점수: 72.0/100 (신뢰도: 75%)
   데이터: 50건
   예약율: 36.0%
   완료율: 32.0%
   응답 속도: 24.5시간
   추천 등급: ⭐ 추천
```

---

### 3. 리드 전달 시 기록

```sql
-- 추천 받은 병원에 리드 전달 후 기록
INSERT INTO hospital_lead_assignments (
  inquiry_id,
  hospital_id,
  treatment_id,
  country,
  language,
  decision,
  assigned_by
) VALUES (
  456,  -- 리드 ID
  1,    -- Seoul Plastic Surgery A
  1,    -- 코성형
  'KR',
  'ko',
  '{"reason": "highest_bayesian_score", "score": 0.85, "rank": 1}',
  'manual'
);
```

---

### 4. 정기 집계 (Cron)

```bash
# crontab -e
0 2 * * * cd /path/to/healo && npx tsx scripts/hospital-performance-aggregator.ts refresh
```
→ 매일 새벽 2시 자동 집계

---

### 5. 성과 모니터링

```bash
# 전체 병원 대시보드
npx tsx scripts/hospital-performance-aggregator.ts dashboard

# 특정 병원 상세
npx tsx scripts/hospital-performance-aggregator.ts show-hospital 1

# 글로벌 평균 갱신
npx tsx scripts/hospital-performance-aggregator.ts update-global-avg

# 베이지안 시뮬레이션 (테스트)
npx tsx scripts/hospital-performance-aggregator.ts simulate
```

---

## 📈 추천 등급

| 등급 | 조건 | 의미 | 조치 |
|------|------|------|------|
| 🔥 강력 추천 | 점수 70%+ & 데이터 10건+ | 검증됨, 높은 성과 | 우선 전달 |
| ⭐ 추천 | 점수 50%+ & 데이터 5건+ | 신뢰 가능 | 추천 |
| 📊 고려 가능 | 점수 30%+ 또는 데이터 3건+ | 참고만 | 조심스럽게 |
| 📉 데이터 부족 | 그 외 | 검증 안 됨 | 시범 전달 |

---

## 💡 운영 시나리오

### 시나리오 1: 새 리드 접수

```
1. 리드 #789 접수 (코성형, 한국, 한국어)
   ↓
2. 추천 조회
   npx tsx scripts/hospital-performance-aggregator.ts recommend \
     --treatment 1 --country KR --language ko
   ↓
3. 결과 확인
   - Seoul Plastic A: 85점 (강력 추천)
   - Gangnam Beauty: 78점 (강력 추천)
   - Korea Medical: 72점 (추천)
   ↓
4. 운영자 판단
   → Seoul Plastic A 선택 (최고 점수)
   ↓
5. 리드 전달 (P3 프로세스)
   npx tsx scripts/hospital-lead-helper.ts generate-summary 789 "Seoul Plastic A"
   → 이메일 전송
   ↓
6. 할당 기록
   INSERT INTO hospital_lead_assignments (...)
   ↓
7. 병원 응답 대기
   (P3 프로세스)
   ↓
8. 응답 기록
   UPDATE hospital_responses SET response_status = 'booked'
   ↓
9. 다음 날 새벽 자동 집계
   → Seoul Plastic A 점수 업데이트
```

---

### 시나리오 2: 신규 병원 추가

```
1. New Hospital 추가 (데이터 0건)
   ↓
2. 초기 점수 계산
   베이지안 = (10 * 0.3 + 0 * 0) / (10 + 0) = 0.3 (30%)
   신뢰도 = 0 / (10 + 0) = 0%
   등급: 📉 데이터 부족
   ↓
3. 시범 전달 (2-3건)
   → 조심스럽게 적은 수의 리드 전달
   ↓
4. 결과 관찰
   - 2건 중 2건 성공 (100%)
   - 베이지안 = (10 * 0.3 + 2 * 1.0) / (10 + 2) = 0.42 (42%)
   - 신뢰도 = 2 / 12 = 17%
   - 등급: 📊 고려 가능
   ↓
5. 점진적 증가
   → 성과 좋으면 5건 → 10건 → 20건 ...
   ↓
6. 안정화
   → 20건+ 데이터 → 신뢰도 높아짐
```

---

### 시나리오 3: 성과 하락 감지

```
1. 정기 모니터링
   npx tsx scripts/hospital-performance-aggregator.ts dashboard
   ↓
2. Seoul Plastic A 점수 하락 발견
   - all_time: 85점 (100건 기반)
   - last_30d: 55점 (10건 기반) ⚠️
   ↓
3. 상세 확인
   npx tsx scripts/hospital-performance-aggregator.ts show-hospital 1
   → 최근 30일 전환율 급락
   ↓
4. 원인 분석
   SELECT * FROM hospital_responses
   WHERE hospital_name = 'Seoul Plastic A'
     AND sent_at > NOW() - INTERVAL '30 days';
   → 최근 not_interested 증가
   ↓
5. 조치
   - 병원에 피드백
   - 일시적으로 리드 전달 축소
   - 개선 안 되면 다른 병원 우선
   ↓
6. 자동 반영
   → 점수 낮아져서 자연스럽게 추천 순위 하락
```

---

## 🎓 베이지안 계산 예시

### 예시 1: 신생 vs 검증 병원

**전제**:
- Global Average = 30%
- Prior Strength (m) = 10

**병원 A (신생)**:
- 실적: 2건 중 2건 성공 (100%)
- 계산: (10 * 0.3 + 2 * 1.0) / (10 + 2) = 5 / 12 = 0.42
- **점수: 42%** (전체 평균에 가까움)
- **신뢰도: 17%** (낮음)
- **등급: 📊 고려 가능**

**병원 B (검증)**:
- 실적: 100건 중 40건 성공 (40%)
- 계산: (10 * 0.3 + 100 * 0.4) / (10 + 100) = 43 / 110 = 0.39
- **점수: 39%** (실제에 가까움)
- **신뢰도: 91%** (높음)
- **등급: ⭐ 추천**

**최종 추천**: B (점수 비슷하지만 신뢰도 압도적)

---

### 예시 2: 성과 차이

**병원 C (우수)**:
- 실적: 50건 중 35건 성공 (70%)
- 계산: (10 * 0.3 + 50 * 0.7) / (10 + 50) = 38 / 60 = 0.63
- **점수: 63%**
- **신뢰도: 83%**
- **등급: ⭐ 추천**

**병원 D (부진)**:
- 실적: 50건 중 5건 성공 (10%)
- 계산: (10 * 0.3 + 50 * 0.1) / (10 + 50) = 8 / 60 = 0.13
- **점수: 13%**
- **신뢰도: 83%**
- **등급: 📉 Below Average**

**차이**: 점수가 명확하게 구분됨 (데이터 충분)

---

## 📊 기대 효과

### Before (수동 판단)
```
운영자 감으로 선택
↓
특정 병원 편중 (친분/관습)
↓
신규 병원 기회 없음
↓
전환율 정체 (30%)
```

### After (데이터 기반)
```
베이지안 점수로 추천
↓
성과 좋은 병원에 자연 집중
↓
신규 병원도 공정 평가
↓
전환율 향상 (35-40%)
```

### 예상 수치
- 📊 평균 전환율: 30% → **35-40%** (10-30% 향상)
- ⏱️ 병원 선정: 10분 → **1분** (90% 절감)
- 🎯 신규 병원: 어려움 → **자동** (공정한 기회)
- 💎 최적화: 불가능 → **지속적** (자동 학습)

---

## ⚠️ 주의사항

### 1. 데이터 품질이 핵심
```
hospital_responses 상태가 정확해야 함
- booked: 실제 예약 확정
- completed: 실제 시술 완료
- not_interested: 명확한 거절

잘못된 데이터 → 잘못된 학습
```

### 2. Cold Start는 의도된 동작
```
신규 병원 점수가 낮은 것은 정상
→ 보수적 접근 (리스크 최소화)

급하게 늘리지 말고 점진적으로
→ 2건 → 5건 → 10건 → 20건 ...
```

### 3. 실시간이 아님
```
집계는 배치 (매일 새벽)
→ 즉시 반영 안 됨

긴급 시 수동 실행:
npx tsx scripts/hospital-performance-aggregator.ts refresh
```

### 4. 차원 조합 주의
```
차원이 많을수록 데이터 희소
- (hospital, treatment, country, language) → 데이터 적음
- (hospital) → 데이터 많음

처음에는 전체 기준으로 시작
데이터 쌓이면 세분화
```

---

## 🗂️ 파일 목록

### 새로 추가 (3개)
1. `migrations/20260129_add_hospital_performance.sql` - DB 스키마
2. `scripts/hospital-performance-aggregator.ts` - 집계 스크립트
3. `HOSPITAL_PERFORMANCE_LEARNING.md` - 상세 문서
4. `P4_PERFORMANCE_LEARNING_SUMMARY.md` - 본 문서

### 기존 연동
- `hospital_responses` (P3) → 성과 데이터 소스
- `inquiries` → 리드 정보
- `hospitals` → 병원 정보

---

## 🚀 빠른 시작

### 1단계: DB 설정
```bash
# Supabase SQL Editor
migrations/20260129_add_hospital_performance.sql 실행
```

### 2단계: 초기 집계
```bash
npx tsx scripts/hospital-performance-aggregator.ts refresh
```

### 3단계: 추천 조회 테스트
```bash
npx tsx scripts/hospital-performance-aggregator.ts recommend --country KR
```

### 4단계: Cron 설정
```bash
crontab -e
# 추가:
0 2 * * * cd /path/to/healo && npx tsx scripts/hospital-performance-aggregator.ts refresh
```

### 5단계: 실제 사용
```
1. 리드 접수
2. CLI로 추천 조회
3. 운영자가 최종 선택
4. 리드 전달 (P3)
5. 할당 기록 (assignments 테이블)
6. 다음 날 자동 집계
7. 점수 업데이트
```

---

## 📚 관련 문서

- `HOSPITAL_PERFORMANCE_LEARNING.md` - **상세 설명 (필독)**
- `P3_HOSPITAL_LEAD_SUMMARY.md` - 리드 전달 기본
- `COMPLETE_UPGRADE_SUMMARY.md` - 전체 여정

---

## 결론

### ✅ 달성한 것
1. ✅ 데이터 기반 병원 추천 시스템
2. ✅ Cold Start 문제 해결 (베이지안 스무딩)
3. ✅ 자동 학습 (성과 → 점수 → 추천)
4. ✅ 공정한 평가 (신규 병원도 기회)

### 🎯 핵심 원칙
1. **통계 기반** (LLM 아님)
2. **보수적 접근** (신규 병원 보호)
3. **점진적 개선** (데이터 쌓일수록 정확)
4. **운영자 판단** (최종 결정권)

### 💡 다음 단계
1. 데이터 수집 (2-3개월)
2. 패턴 분석
3. m 값 튜닝 (필요 시)
4. 차원 세분화 (데이터 충분 시)

---

**"데이터가 쌓이면서 자동으로 학습하고 개선됩니다"** 🎓
