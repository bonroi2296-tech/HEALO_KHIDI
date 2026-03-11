# HEALO 일상 운영 체크리스트

> 대상: 운영자  
> 목적: 매일 확인할 것들을 한눈에

---

## ☀️ 매일 오전 (10분)

### 1. 긴급 알림 확인 ⚡
```sql
SELECT * FROM operational_alerts 
WHERE acknowledged = FALSE 
  AND severity = 'critical'
ORDER BY created_at DESC;
```
- 🚨 **Critical 알림 있으면 즉시 대응**
- ⚠️ Warning 알림 확인

### 2. 우선순위 리드 확인 🔥
```bash
npx tsx scripts/hospital-lead-helper.ts list-priority
```
- **Hot 리드 (70점+)**: 즉시 병원 전달
- **Warm 리드 (50-69점)**: 당일 처리 목표

### 3. 새 문의 확인 📬
```sql
SELECT 
  status,
  COUNT(*) as count
FROM inquiries 
WHERE created_at > CURRENT_DATE
GROUP BY status;
```
- ✅ **received**: 정상 (대부분 이 상태)
- ⚠️ **error**: 있으면 확인 필요
- 🛡️ **blocked**: 스팸 차단 (정상)

---

## 🌆 매일 오후 (5분)

### 1. 병원 응답 확인 📧
```bash
npx tsx scripts/hospital-lead-helper.ts list-pending
```
- **48시간 이상 대기**: 리마인더 전송
- **응답 수신**: 상태 업데이트

### 2. 응답 업데이트 ✏️
```bash
# 병원 응답 받았을 때
npx tsx scripts/hospital-lead-helper.ts update-response 1 interested "상담 가능"
```

---

## 📊 매주 금요일 (15분)

### 1. 전환율 확인
```sql
SELECT * FROM v_today_funnel_stats;
```
- 📉 **이탈 많은 구간** → 개선 아이템
- 📈 **전환율 추이** → 주간 비교

### 2. 병원 성과 확인
```bash
npx tsx scripts/hospital-lead-helper.ts stats
```
- ✅ **응답률 높은 병원** → 더 많은 리드 전송
- ⚠️ **응답률 낮은 병원** → 리드 전송 축소

### 3. 미처리 리드 정리
```sql
SELECT * FROM v_pending_hospital_responses
WHERE hours_waiting > 72;
```
- 72시간+ 미응답 → 다른 병원 찾기

---

## 🚨 즉시 대응 시나리오

### Critical 알림 수신
```
🚨 CRITICAL: 10 errors in last 5 minutes
```
**조치**:
1. 서버 로그 확인
2. 환경변수 확인
3. 개발팀 연락

### Hot 리드 유입
```
🔥 High-priority lead (score: 85)
```
**조치**:
1. 30분 내 리드 확인
2. 적합한 병원 선택
3. 즉시 전달

### 스팸 공격
```
🛡️ Potential spam attack: 55 blocks in last hour
```
**조치**:
1. 패턴 확인 (동일 IP?)
2. 정상 사용자 차단 여부 확인
3. 필요 시 개발팀에 rate limit 조정 요청

---

## 📋 간편 명령어 모음

```bash
# === 리드 관리 ===
# 우선순위 리드
npx tsx scripts/hospital-lead-helper.ts list-priority

# 리드 요약
npx tsx scripts/hospital-lead-helper.ts generate-summary <ID> "<병원명>"

# 전달 기록
npx tsx scripts/hospital-lead-helper.ts record-sent <ID> "<병원명>" email

# === 응답 관리 ===
# 응답 대기
npx tsx scripts/hospital-lead-helper.ts list-pending

# 응답 업데이트
npx tsx scripts/hospital-lead-helper.ts update-response <response_id> <상태> "<메모>"

# === 통계 ===
# 병원 통계
npx tsx scripts/hospital-lead-helper.ts stats
```

---

## 📊 주요 SQL 쿼리

```sql
-- 우선순위 문의
SELECT * FROM v_priority_inquiries LIMIT 10;

-- 오늘 문의 현황
SELECT status, COUNT(*) FROM inquiries 
WHERE created_at > CURRENT_DATE 
GROUP BY status;

-- 응답 대기
SELECT * FROM v_pending_hospital_responses;

-- 미확인 알림
SELECT * FROM operational_alerts 
WHERE acknowledged = FALSE;

-- 오늘 통계
SELECT * FROM v_today_funnel_stats;

-- 병원 성과
SELECT * FROM v_hospital_response_stats;
```

---

## ✅ 정상 범위 참고

### 일일 지표
- 문의 수: 40-60건 ✅
- Hot 리드: 5-10건 (10-15%) ✅
- Blocked: 5-10건 (10% 이하) ✅
- Error: 0-2건 ✅

### 주간 지표
- 전환율: 35-45% ✅
- 병원 응답률: 60-80% ✅
- 평균 응답 시간: 12-24시간 ✅

### 이상 신호
- 문의 0건 (1시간+) 🚨
- Error 10건+ (1시간) 🚨
- Blocked 50건+ (1시간) 🚨
- 전환율 20% 미만 ⚠️

---

## 💡 운영 팁

### 효율적인 시간 관리
- 🕐 **10:00**: 긴급 알림 + 우선순위 리드 (10분)
- 🕐 **16:00**: 병원 응답 확인 + 업데이트 (5분)
- 🕐 **금요일 17:00**: 주간 통계 + 정리 (15분)

### 우선순위
1. 🔥 **Hot 리드** (즉시)
2. 🚨 **Critical 알림** (즉시)
3. ⭐ **Warm 리드** (당일)
4. ⚠️ **Warning 알림** (당일)
5. 📋 **Cold 리드** (여유 있을 때)

---

## 🆘 문제 해결

### "리드가 너무 적어요"
```sql
-- 차단 확인
SELECT COUNT(*) FROM inquiries 
WHERE status = 'blocked' AND created_at > CURRENT_DATE;

-- 에러 확인
SELECT * FROM operational_alerts 
WHERE alert_type = 'high_error_rate';
```

### "병원이 응답 안 해요"
```bash
# 응답 대기 확인
npx tsx scripts/hospital-lead-helper.ts list-pending

# 48시간+ → 리마인더
# 72시간+ → 다른 병원
```

### "스팸이 너무 많아요"
```sql
-- 차단 통계
SELECT COUNT(*) FROM inquiries 
WHERE status = 'blocked' AND created_at > NOW() - INTERVAL '24 hours';

-- Rate limit 작동 중이면 정상
-- 여전히 많으면 개발팀에 limit 조정 요청
```

---

**이 체크리스트를 인쇄해서 모니터 옆에 붙여두세요!** 📌
