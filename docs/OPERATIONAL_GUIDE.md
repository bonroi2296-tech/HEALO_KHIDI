# 운영자를 위한 빠른 시작 가이드

> 대상: 운영자, 관리자  
> 목적: 새로 추가된 안정화 기능 활용 방법

---

## 🎯 이 가이드의 목적

이번 업데이트로 다음 기능들이 추가되었습니다:
1. ✅ **봇/도배 자동 차단** (Rate Limit)
2. ✅ **문의 상태 추적** (received / blocked / normalized / error)
3. ✅ **실패 사유 로그** (왜 문의가 저장 안 됐는지)

이 가이드는 **개발자가 아닌 운영자**가 이 기능들을 활용하는 방법을 설명합니다.

---

## 1. 문의 상태 이해하기

### 📊 상태 종류

| 상태 | 의미 | 조치 필요 여부 |
|------|------|---------------|
| `received` | 정상 수신됨 | ✅ 정상 - 처리 진행 |
| `blocked` | 스팸으로 차단됨 | 🔍 확인 필요 (정상 사용자인지) |
| `normalized` | 정규화 완료 | ✅ 정상 - 시스템 처리 완료 |
| `error` | 처리 중 에러 | ⚠️ 재처리 필요 |

### 📝 데이터베이스 조회 방법

#### 오늘 받은 실제 문의 (스팸 제외)
```sql
SELECT COUNT(*) as 정상문의수
FROM inquiries 
WHERE status = 'received' 
  AND created_at > CURRENT_DATE;
```

#### 최근 차단된 문의 확인
```sql
SELECT 
  id,
  created_at as 시각,
  status_reason as 차단사유,
  email
FROM inquiries 
WHERE status = 'blocked' 
ORDER BY created_at DESC 
LIMIT 10;
```

#### 에러 발생 문의 (재처리 필요)
```sql
SELECT 
  id,
  created_at as 시각,
  status_reason as 에러사유,
  email
FROM inquiries 
WHERE status = 'error' 
ORDER BY created_at DESC;
```

#### 상태별 통계 (대시보드용)
```sql
SELECT 
  status as 상태,
  COUNT(*) as 건수,
  MAX(created_at) as 최근시각
FROM inquiries
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY 건수 DESC;
```

**예상 결과**:
```
상태        | 건수 | 최근시각
-----------|------|------------------
received   | 45   | 2026-01-29 14:30
blocked    | 3    | 2026-01-29 12:15
normalized | 40   | 2026-01-29 14:00
error      | 1    | 2026-01-29 10:05
```

---

## 2. Rate Limit 이해하기

### 🛡️ 현재 설정

| API | 제한 | 설명 |
|-----|------|------|
| 문의 제출 | 1분당 5회 | 정상 사용자는 충분, 봇은 차단 |
| 챗봇 | 1분당 20회 | 대화형이므로 더 허용 |

### 📋 정상 vs 비정상 패턴

**정상 사용자**:
- 폼 작성 → 제출 → 완료 (1분에 1-2회)
- 챗봇 대화 (1분에 5-10회)

**봇/도배**:
- 1초에 100회 제출 시도
- 동일 내용 반복 제출

### 🔍 Rate Limit 차단 확인

#### 서버 로그에서 확인
```
[operational:rate_limit_exceeded] Exceeded 5 requests per 60s {
  "timestamp": "2026-01-29T14:30:00Z",
  "level": "warn",
  "event": "rate_limit_exceeded",
  "api": "/api/inquiries/intake",
  "clientIp": "192.168.***.100",
  "reason": "Exceeded 5 requests per 60s",
  "statusCode": 429,
  "context": { "limit": 5, "windowMs": 60000 }
}
```

#### DB에서 확인
```sql
SELECT 
  created_at as 시각,
  status_reason as 사유
FROM inquiries 
WHERE status = 'blocked' 
  AND status_reason LIKE '%rate%'
ORDER BY created_at DESC
LIMIT 10;
```

### ⚙️ Rate Limit 조정 (필요 시)

**현재 설정이 너무 엄격한가?**
- 징후: 정상 사용자가 "너무 많은 요청" 에러 받음
- 조치: 개발자에게 요청하여 limit 상향 조정

**현재 설정이 너무 느슨한가?**
- 징후: 여전히 스팸이 대량 유입됨
- 조치: 개발자에게 요청하여 limit 하향 조정

---

## 3. 로그 활용하기

### 📂 로그 위치

서버 로그 (Vercel/배포 환경):
- Vercel 대시보드 → Logs
- 또는 배포 환경의 로그 시스템

### 🔍 주요 로그 이벤트

#### 정상 동작
```json
{
  "event": "inquiry_received",
  "api": "/api/inquiries/intake",
  "clientIp": "192.168.***.100",
  "statusCode": 200
}
```
→ **의미**: 문의가 정상적으로 수신됨

#### Rate Limit 차단
```json
{
  "event": "rate_limit_exceeded",
  "api": "/api/inquiries/intake",
  "clientIp": "192.168.***.100",
  "reason": "Exceeded 5 requests per 60s",
  "statusCode": 429
}
```
→ **의미**: 동일 IP에서 1분에 5회 초과 시도

#### 암호화 실패
```json
{
  "event": "encryption_failed",
  "api": "/api/inquiry/normalize",
  "reason": "encryption_error",
  "statusCode": 500
}
```
→ **의미**: 암호화 키 설정 문제 (즉시 확인 필요)

#### DB 저장 실패
```json
{
  "event": "inquiry_failed",
  "api": "/api/inquiries/intake",
  "reason": "db_insert_failed",
  "statusCode": 500
}
```
→ **의미**: DB 저장 실패 (DB 상태 확인 필요)

### 📊 로그 분석 팁

#### 특정 IP의 활동 패턴 확인
서버 로그에서 검색:
```
clientIp: "192.168.***.100"
```

#### 특정 시간대의 문제 확인
```
timestamp: "2026-01-29T14:*"
event: "inquiry_failed"
```

#### 에러 유형별 집계
서버 로그에서:
- `encryption_failed` 검색 → 암호화 문제
- `rate_limit_exceeded` 검색 → 봇/도배 시도
- `db_insert_failed` 검색 → DB 문제

---

## 4. 일상 운영 체크리스트

### 📅 매일 확인 (5분)

```sql
-- 1. 오늘 받은 문의 수
SELECT 
  status,
  COUNT(*) as count
FROM inquiries 
WHERE created_at > CURRENT_DATE
GROUP BY status;
```

**정상 범위 예시**:
- received: 40-50건 ✅
- blocked: 0-5건 ✅ (봇 차단)
- error: 0건 ✅ (있으면 확인 필요)

**이상 신호**:
- received: 0-5건 ⚠️ (시스템 문제?)
- blocked: 100건+ ⚠️ (정상 사용자 차단?)
- error: 10건+ ⚠️ (시스템 에러)

```sql
-- 2. 최근 1시간 에러 확인
SELECT * 
FROM inquiries 
WHERE status = 'error' 
  AND created_at > NOW() - INTERVAL '1 hour';
```

**결과가 0건**: ✅ 정상  
**결과가 있음**: ⚠️ status_reason 확인 필요

### 📊 주간 확인 (15분)

```sql
-- 1. 주간 문의 추이
SELECT 
  DATE(created_at) as 날짜,
  status,
  COUNT(*) as 건수
FROM inquiries 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), status
ORDER BY 날짜 DESC, status;
```

**분석 포인트**:
- 문의 수 급증/급감 여부
- blocked 비율 (5% 이하가 정상)
- error 발생 패턴

```sql
-- 2. 차단된 IP Top 10
SELECT 
  -- IP는 로그에서 확인 (DB에는 저장 안 됨)
  status_reason,
  COUNT(*) as 차단횟수
FROM inquiries 
WHERE status = 'blocked'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY status_reason
ORDER BY 차단횟수 DESC
LIMIT 10;
```

---

## 4.5 시술 자동생성 실패 대응 (관리자)

관리자 > 병원 관리에서 **「대표 시술 3개 자동 생성」** 사용 시, 실패해도 원인을 확인하고 다음에 시도하지 않도록 표시할 수 있습니다.

### 실패 로그 확인
- 병원 편집 화면 상단에 **amber 배너**로 "실패 (날짜): 사유"가 표시됩니다.
- 사유가 길면 **「더 보기」**로 전체 내용을 볼 수 있습니다.

### 건너뛰기 / 다시 시도
- **「다음에 시도하지 않음 (건너뛰기)」** 체크 시, 해당 병원은 실패로 표시된 채로 두고 자동 생성 버튼이 "다시 시도"로 바뀝니다.
- **「다시 시도」** 클릭 시 건너뛰기를 해제하고 미리보기를 다시 실행합니다.

### 실패 시 확인 순서
1. 병원에 **웹사이트 URL**이 등록되어 있는지 확인.
2. **마이그레이션** 적용: Supabase SQL Editor에서 `migrations/20260226_offers_auto_fail_log.sql` 실행 시 실패 로그가 DB에 저장됩니다. 미적용이어도 시술 자동생성 자체는 동작합니다.
3. **LLM API 키**: `GOOGLE_GENERATIVE_AI_API_KEY` 또는 `OPENAI_API_KEY` 설정 여부.
4. **크롤 실패**: URL 접근 가능 여부, 방화벽. 배너의 실패 사유 메시지 참고.

자세한 내용은 **docs/시술_자동생성_RUNBOOK.md** 를 참고하세요.

---

## 5. 문제 해결 가이드

### 🚨 시나리오 1: "오늘 문의가 하나도 없어요"

**확인 순서**:
1. DB 조회로 실제로 0건인지 확인
2. 로그에서 에러 확인 (`inquiry_failed`, `encryption_failed`)
3. Rate limit이 너무 엄격한지 확인 (`rate_limit_exceeded` 로그)

**가능한 원인**:
- 암호화 키 설정 문제
- DB 연결 문제
- Rate limit이 너무 엄격함 (모두 차단)

### 🚨 시나리오 2: "스팸이 너무 많아요"

**확인 순서**:
1. blocked 상태 문의 수 확인
2. 로그에서 `rate_limit_exceeded` 확인
3. IP 패턴 분석

**조치**:
- Rate limit이 작동 중이면: ✅ 정상 (일부는 차단됨)
- Rate limit 없이 모두 저장되면: 개발자에게 확인 요청

### 🚨 시나리오 3: "정상 사용자가 제출 못한다고 해요"

**확인 순서**:
1. 해당 사용자의 IP 확인 (가능하면)
2. 로그에서 해당 IP의 `rate_limit_exceeded` 확인
3. 실제로 1분에 5회 초과했는지 확인

**조치**:
- 실제로 빠르게 여러 번 시도한 경우: 사용자에게 잠시 후 재시도 안내
- Rate limit이 너무 엄격한 경우: 개발자에게 조정 요청

---

## 6. 자주 묻는 질문 (FAQ)

### Q1. Rate limit이 뭔가요?
**A**: 동일한 IP에서 짧은 시간 내 과도한 요청을 차단하는 기능입니다.  
예: 1분에 100회 문의 제출 시도 → 5회 후 차단

### Q2. 정상 사용자도 차단될 수 있나요?
**A**: 매우 드뭅니다. 정상 사용자는 1분에 1-2회 제출하므로 문제없습니다.  
만약 차단되면 1분 후 자동으로 해제됩니다.

### Q3. blocked 상태 문의를 확인해야 하나요?
**A**: 주기적으로 확인 권장. 대부분 봇이지만, 간혹 정상 사용자가 포함될 수 있습니다.

### Q4. error 상태 문의는 어떻게 처리하나요?
**A**: status_reason을 확인하고:
- `encryption_error`: 개발자에게 문의
- `db_insert_failed`: DB 상태 확인
- 재처리 가능하면 수동으로 재입력

### Q5. 로그는 어디서 보나요?
**A**: Vercel 대시보드 → 프로젝트 → Logs 메뉴

### Q6. Rate limit 설정을 바꾸고 싶어요
**A**: 개발자에게 요청. 현재 설정과 원하는 설정을 명확히 전달.

---

## 7. 연락처

### 문제 발생 시
- **긴급 (서비스 중단)**: 즉시 개발자 연락
- **일반 (에러 로그 확인)**: 다음 정기 미팅에서 논의
- **개선 제안**: 이슈 트래커에 등록

### 필요한 정보
문제 보고 시 다음 정보를 함께 전달:
1. 발생 시각
2. 에러 메시지 (로그 복사)
3. 영향 범위 (몇 건의 문의?)
4. 재현 가능 여부

---

## 📌 핵심 정리

### ✅ 매일 확인할 것
- 오늘 문의 수 (상태별)
- error 상태 문의 (있으면 조치)

### 🔍 주간 확인할 것
- 문의 추이 (급증/급감)
- blocked 비율 (5% 이하 정상)

### ⚠️ 즉시 확인할 것
- 문의가 갑자기 0건
- error 상태가 급증
- 정상 사용자 차단 신고

---

**이 가이드는 운영자가 시스템을 이해하고, 문제를 빠르게 파악하기 위해 작성되었습니다.**  
궁금한 점이 있으면 개발팀에 문의하세요.
