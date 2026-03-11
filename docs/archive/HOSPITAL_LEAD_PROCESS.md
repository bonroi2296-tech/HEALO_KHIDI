# 병원 리드 전달 프로세스 가이드

> 대상: 운영자  
> 목적: 수동으로 병원에게 리드를 전달하고 응답을 관리하는 방법

---

## 🎯 전체 프로세스

```
1. 우선순위 리드 확인
   ↓
2. 적합한 병원 선택
   ↓
3. 리드 요약 생성
   ↓
4. 이메일/카톡 전송 (수동)
   ↓
5. 전달 기록 입력
   ↓
6. 병원 응답 대기
   ↓
7. 응답 수신 시 상태 업데이트
```

---

## 1. 우선순위 리드 확인

### 📋 daily 체크 (매일 오전)

```sql
-- 병원에 전달할 high priority 리드
SELECT * FROM v_priority_inquiries 
WHERE lead_quality = 'hot'
LIMIT 10;
```

**확인 사항**:
- ✅ priority_score 70점 이상
- ✅ 아직 병원에 전달 안 됨
- ✅ 국가/시술 타입 확인

---

## 2. 적합한 병원 선택

### 병원 선택 기준

| 시술 타입 | 추천 병원 |
|----------|----------|
| rhinoplasty (코 성형) | Seoul Plastic Surgery Clinic, Gangnam Beauty |
| double-eyelid (쌍꺼풀) | Korea Eye Clinic, Seoul Beauty |
| facelift (안면 거상) | Advanced Cosmetic Surgery |
| breast-augmentation | Seoul Plastic Surgery Clinic |

### 국가별 고려사항

| 환자 국가 | 언어 지원 | 추천 병원 |
|----------|----------|----------|
| KR | 한국어 | 모든 병원 |
| US, CA | 영어 | 영어 가능 병원 |
| JP | 일본어 | 일본어 통역 있는 병원 |
| CN | 중국어 | 중국어 통역 있는 병원 |

---

## 3. 리드 요약 생성

### Option A: DB에서 직접 조회 (추천)

```sql
-- 리드 상세 정보
SELECT 
  id,
  created_at,
  lead_quality,
  priority_score,
  nationality,
  spoken_language,
  treatment_type,
  preferred_date,
  preferred_date_flex,
  intake,
  email
FROM inquiries
WHERE id = 123;  -- 리드 ID
```

### Option B: TypeScript 함수 사용

```typescript
import { generateHospitalLeadSummary, generateHospitalLeadEmail } from './src/lib/hospital/leadSummary';

// 리드 요약 생성
const summary = await generateHospitalLeadSummary(123);

// 이메일 메시지 생성
const email = generateHospitalLeadEmail(summary, 'Seoul Plastic Surgery Clinic');

console.log(email.subject);
console.log(email.plainText);
```

---

## 4. 병원에게 전송 (수동)

### 📧 이메일 전송

**받는 사람**: hospital@example.com  
**제목**: 복사 (자동 생성된 제목)  
**본문**: 복사 (자동 생성된 본문)

**이메일 템플릿 예시**:
```
안녕하세요, [병원명] 담당자님

새로운 환자 문의가 접수되었습니다.

=== 기본 정보 ===
리드 번호: #123
우선순위: 높음 ⭐
접수 시각: 2026-01-29 14:30

=== 환자 정보 ===
국적: KR (한국)
사용 언어: ko (한국어)
연락 방법: email

=== 시술 정보 ===
시술 타입: rhinoplasty (코 성형)
심각도: 7/10

=== 일정 ===
희망 시술일: 2026-02-15
일정 조율 가능: 예

---
이 리드에 관심이 있으시면 답장 부탁드립니다.
- 관심 있음 / 관심 없음
- 추가 필요 정보
- 예상 상담 가능 일정

감사합니다.
HEALO 팀
```

### 💬 카카오톡 전송

간략 버전 사용:
```
[HEALO] 새 환자 문의

리드 #123
시술: 코 성형
국적: 한국
우선순위: 높음

관심 있으시면 답장 부탁드립니다 🙏
```

---

## 5. 전달 기록 입력

### DB에 기록

```sql
-- 병원에게 리드 전달 기록
INSERT INTO hospital_responses (
  inquiry_id,
  hospital_name,
  sent_method,
  sent_by,
  response_status
) VALUES (
  123,                              -- 리드 ID
  'Seoul Plastic Surgery Clinic',   -- 병원 이름
  'email',                          -- 전송 방법
  '운영자이름',                      -- 전달한 사람
  'pending'                         -- 응답 대기
);
```

**sent_method 옵션**:
- `email`: 이메일
- `kakao`: 카카오톡
- `phone`: 전화
- `manual`: 수동 (대면 등)
- `other`: 기타

---

## 6. 응답 대기 모니터링

### 📊 응답 대기 중인 리드 확인

```sql
-- 오래 기다리는 순서로 조회
SELECT * FROM v_pending_hospital_responses
ORDER BY hours_waiting DESC
LIMIT 20;
```

**결과 예시**:
```
response_id | inquiry_id | hospital_name | hours_waiting
1           | 123        | Seoul Plastic | 48.5  ⚠️ 리마인더 필요
2           | 124        | Gangnam       | 24.0  ✅ 정상 범위
3           | 125        | Korea Medical | 12.0  ✅ 최근
```

**조치**:
- ⚠️ **48시간 이상**: 병원에 리마인더 전송
- ✅ **24-48시간**: 정상 대기
- ✅ **24시간 미만**: 최근 전달

---

## 7. 병원 응답 수신 및 업데이트

### 📧 병원 이메일 응답 예시

```
답변: 관심 있습니다.
추가 정보: 환자의 과거 수술 이력이 궁금합니다.
상담 가능일: 2026-02-01, 2026-02-05
견적: $8,000 - $10,000
```

### DB 업데이트

```sql
-- 응답 상태 업데이트
UPDATE hospital_responses
SET 
  response_status = 'interested',
  response_at = NOW(),
  response_notes = '상담 가능일: 2/1, 2/5. 견적: $8-10k. 과거 수술 이력 확인 필요.',
  quoted_price = 9000,
  quoted_currency = 'USD'
WHERE id = 1;  -- response_id
```

### 응답 상태 종류

| 상태 | 설명 | 다음 단계 |
|------|------|----------|
| `pending` | 응답 대기 중 | 48시간 후 리마인더 |
| `interested` | 관심 있음 | 환자에게 연락 준비 |
| `not_interested` | 관심 없음 | 다른 병원 찾기 |
| `contacted` | 환자와 연락함 | 상담 일정 조율 |
| `consultation` | 상담 진행 중 | 진행 상황 모니터링 |
| `quoted` | 견적 제시함 | 환자 결정 대기 |
| `booked` | 예약 확정 | 시술 일정 확인 |
| `completed` | 시술 완료 | 피드백 수집 |
| `cancelled` | 취소됨 | 취소 사유 기록 |

---

## 8. 병원 성과 추적

### 📊 병원별 응답률

```sql
SELECT * FROM v_hospital_response_stats
ORDER BY total_leads DESC;
```

**결과 예시**:
```
hospital_name           | total_leads | interested | not_interested | interest_rate | avg_response_hours
-----------------------|-------------|------------|----------------|---------------|-------------------
Seoul Plastic Surgery  | 50          | 35         | 10             | 70.0          | 18.5
Gangnam Beauty         | 40          | 28         | 8              | 70.0          | 24.3
Korea Medical Center   | 30          | 15         | 12             | 50.0          | 36.2
```

**분석**:
- ✅ **Seoul Plastic**: 높은 관심률 (70%), 빠른 응답 (18.5시간)
- ✅ **Gangnam Beauty**: 높은 관심률, 적절한 응답 시간
- ⚠️ **Korea Medical**: 낮은 관심률, 느린 응답

---

## 9. 주간 워크플로우 예시

### 월요일 오전
```sql
-- 1. 주말에 들어온 high priority 리드 확인
SELECT * FROM v_priority_inquiries 
WHERE lead_quality = 'hot'
  AND created_at > NOW() - INTERVAL '3 days';

-- 2. 적합한 병원 선택 및 전송
-- (수동으로 이메일/카톡 전송)

-- 3. 전달 기록
INSERT INTO hospital_responses (...);
```

### 수요일 오후
```sql
-- 1. 응답 대기 중인 리드 확인
SELECT * FROM v_pending_hospital_responses
WHERE hours_waiting > 48;

-- 2. 리마인더 전송 (필요 시)
-- 3. 병원 응답 수신 시 업데이트
UPDATE hospital_responses SET response_status = 'interested', ...;
```

### 금요일 오후
```sql
-- 1. 주간 통계 확인
SELECT * FROM v_hospital_response_stats;

-- 2. 미응답 리드 정리
-- 3. 다음 주 우선순위 리드 체크
```

---

## 10. 자주 묻는 질문

### Q1. 어떤 리드를 먼저 보내야 하나요?
**A**: 
1. priority_score 70점 이상 (hot)
2. 한국/미국/일본 환자
3. 고가 시술 (rhinoplasty, facelift 등)

### Q2. 병원이 응답 안 하면?
**A**: 
- 48시간 후: 1차 리마인더
- 72시간 후: 2차 리마인더
- 96시간 후: 다른 병원 찾기

### Q3. 한 리드를 여러 병원에 보낼 수 있나요?
**A**: 
- 가능합니다
- hospital_responses 테이블에 각각 기록
- 먼저 응답한 병원 우선

### Q4. 견적은 어떻게 관리하나요?
**A**:
```sql
UPDATE hospital_responses
SET 
  quoted_price = 8000,
  quoted_currency = 'USD',
  response_notes = '견적: $8,000. 마취비 포함.'
WHERE id = 1;
```

### Q5. 환자 개인정보는 언제 공유하나요?
**A**: 
- 병원이 '관심 있음' 응답한 후
- 환자 동의 확인 후
- 이메일은 암호화되어 있으므로 복호화 필요

---

## 11. 체크리스트

### 리드 전달 시
- [ ] 리드 우선순위 확인 (70점+)
- [ ] 적합한 병원 선택
- [ ] 리드 요약 생성
- [ ] 이메일/카톡 전송
- [ ] DB에 전달 기록 (hospital_responses)

### 응답 수신 시
- [ ] 병원 응답 확인 (관심도, 견적 등)
- [ ] DB 상태 업데이트
- [ ] 환자에게 다음 단계 안내 준비
- [ ] 필요 시 추가 정보 요청

### 주간 리뷰
- [ ] 병원별 응답률 확인
- [ ] 미응답 리드 정리
- [ ] 다음 주 우선순위 리드 확인

---

## 📝 참고 SQL 모음

```sql
-- 전달할 리드 찾기
SELECT * FROM v_priority_inquiries WHERE lead_quality = 'hot' LIMIT 10;

-- 전달 기록
INSERT INTO hospital_responses (inquiry_id, hospital_name, sent_method, sent_by)
VALUES (123, 'Seoul Plastic Surgery', 'email', '운영자');

-- 응답 대기 확인
SELECT * FROM v_pending_hospital_responses;

-- 응답 업데이트
UPDATE hospital_responses 
SET response_status = 'interested', response_at = NOW(), response_notes = '...'
WHERE id = 1;

-- 병원 성과 확인
SELECT * FROM v_hospital_response_stats;
```

---

**운영 팁**: 
- 🕐 매일 오전 10시: 새 리드 확인
- 📧 매일 오후 4시: 병원 응답 확인
- 📊 매주 금요일: 통계 리뷰
