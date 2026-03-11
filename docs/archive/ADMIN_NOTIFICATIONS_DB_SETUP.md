# 관리자 알림 DB 기반 관리 가이드

> P4.1 확장: 수신자를 관리자 페이지에서 관리  
> 우선순위: DB → ENV fallback

---

## 🎯 개요

### Before (P4.1-1)
```
환경변수(ADMIN_PHONE_NUMBERS)에 전화번호 하드코딩
→ 변경하려면 .env 수정 + 재배포 필요
```

### After (P4.1 확장)
```
관리자 페이지에서 수신자 추가/수정/삭제
→ DB 저장, 즉시 반영
→ ENV는 긴급 fallback으로만 사용
```

---

## 📊 우선순위

```
1. DB 활성 수신자 (is_active=true)
   ↓ (없거나 오류)
2. ENV (ADMIN_PHONE_NUMBERS)
   ↓ (없음)
3. 알림 건너뜀
```

---

## 🗄️ DB 구조

### admin_notification_recipients 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary key |
| label | TEXT | 수신자 이름 (예: "김주영") |
| phone_e164 | TEXT | E.164 형식 전화번호 |
| channel | TEXT | sms/alimtalk/email |
| is_active | BOOLEAN | 활성화 여부 |
| last_sent_at | TIMESTAMPTZ | 마지막 발송 시각 |
| sent_count | INTEGER | 총 발송 성공 수 |
| failed_count | INTEGER | 총 발송 실패 수 |
| notes | TEXT | 메모 |

---

## 🚀 시작하기

### 1단계: DB 마이그레이션

```bash
# Supabase SQL Editor에서 실행
migrations/20260129_add_admin_notification_recipients.sql
```

---

### 2단계: 관리자 페이지 접속

```
URL: https://healo.com/admin/settings/notifications
```

---

### 3단계: 수신자 추가

#### 예시 1: 주 관리자
```
이름: 김주영
전화번호: +821012345678
채널: sms
메모: 주 관리자 (24시간)
```

#### 예시 2: 야간 당직
```
이름: 야간 당직
전화번호: +821087654321
채널: sms
메모: 평일 19:00-09:00
```

---

### 4단계: 테스트

```bash
# 문의 1건 제출
# → 휴대폰에 알림 도착 확인 (2명 모두)

# 로그 확인
npx tsx scripts/test-admin-notification.ts list
```

---

## 📱 전화번호 형식 (E.164)

### 올바른 형식

| 국가 | 형식 | 예시 |
|------|------|------|
| 한국 | +82 10-XXXX-XXXX | `+821012345678` |
| 미국 | +1 XXX-XXX-XXXX | `+12025551234` |
| 일본 | +81 X-XXXX-XXXX | `+819012345678` |

### 잘못된 형식

| 형식 | 문제 | 올바른 형식 |
|------|------|------------|
| `01012345678` | ❌ + 없음 | `+821012345678` |
| `+82-10-1234-5678` | ⚠️ 하이픈 (발송 시 제거됨) | `+821012345678` |
| `82-10-1234-5678` | ❌ + 없음 | `+821012345678` |

---

## 🎯 사용 시나리오

### 시나리오 1: 신규 관리자 추가

```
1. /admin/settings/notifications 접속
2. "+ 수신자 추가" 클릭
3. 정보 입력:
   - 이름: 이철수
   - 전화번호: +821011112222
   - 메모: 부 관리자
4. "추가" 클릭
5. 즉시 반영 (다음 문의부터 알림 감)
```

---

### 시나리오 2: 휴가 시 일시 비활성화

```
1. 목록에서 해당 수신자 찾기
2. "활성" 버튼 클릭 → "비활성"으로 변경
3. 비활성 상태: 알림 발송 제외
4. 복귀 시 다시 클릭 → "활성"
```

---

### 시나리오 3: DB 오류 시 ENV fallback

```
상황: DB 연결 오류 또는 활성 수신자 0명

자동 동작:
1. DB 조회 시도 → 오류 또는 0건
2. ENV(ADMIN_PHONE_NUMBERS) 사용
3. 로그: "DB 비어있음 → ENV fallback"

확인:
[Recipients] DB에 활성 수신자 없음
[Recipients] ENV fallback
[Recipients] ENV 사용: 1명
```

---

## 🔒 보안 정책

### 전화번호 마스킹

```typescript
// 저장: 평문 (발송용)
phone_e164: "+821012345678"

// 로그/UI: 마스킹
phone_masked: "+82-**-****-5678"
```

### 로그 예시

```
✅ 올바름
[Notify] 발송 성공: +82-**-****-5678

❌ 잘못됨
[Notify] 발송 성공: +821012345678  // 평문 노출
```

---

## 📊 통계 모니터링

### 관리자 페이지

```
이름       | 전화번호          | 활성 | 발송 | 실패 | 마지막 발송
---------- | ---------------- | ---- | ---- | ---- | -----------
김주영     | +82-**-****-5678 | 활성 | 42   | 2    | 2026-01-29
야간 당직  | +82-**-****-4321 | 활성 | 38   | 0    | 2026-01-29
이철수     | +82-**-****-9999 | 비활성| 15   | 1    | 2026-01-25
```

### SQL 쿼리

```sql
-- 수신자별 성공률
SELECT 
  label,
  sent_count,
  failed_count,
  ROUND(sent_count * 100.0 / NULLIF(sent_count + failed_count, 0), 1) as success_rate
FROM admin_notification_recipients
ORDER BY sent_count DESC;
```

---

## ⚠️ 주의사항

### 1. 활성 수신자 없을 때

```
DB: 0명 (모두 is_active=false)
ENV: 미설정

결과: 알림 발송 안 됨 (조용히 건너뜀)

해결:
1. DB에서 최소 1명 활성화
2. 또는 ENV 설정 (긴급 백업)
```

### 2. 전화번호 중복

```
동일 번호 + 채널 중복 방지
→ Unique 제약 조건

예:
+821012345678 + sms (O)
+821012345678 + sms (X 중복)
+821012345678 + alimtalk (O 다른 채널)
```

### 3. ENV vs DB 충돌

```
상황:
ENV: +821011111111
DB: +821022222222 (활성)

결과: DB 우선 (ENV 무시)

ENV는 DB 없을 때만 사용됨
```

---

## 🐛 문제 해결

### 알림이 안 와요

#### 1. DB 확인
```sql
SELECT * FROM admin_notification_recipients 
WHERE is_active = true;
```
→ 결과 0건이면 ENV 확인

#### 2. ENV 확인
```bash
echo $ADMIN_PHONE_NUMBERS
# 또는 관리자 UI에서 ENV 섹션 확인
```

#### 3. 로그 확인
```bash
npx tsx scripts/test-admin-notification.ts stats
```

---

### DB 수신자가 발송 안 됨

#### 1. is_active 확인
```sql
SELECT id, label, is_active 
FROM admin_notification_recipients;
```
→ is_active=false면 발송 제외

#### 2. 전화번호 형식 확인
```sql
SELECT phone_e164 FROM admin_notification_recipients;
```
→ E.164 형식인지 확인 (+로 시작)

#### 3. 이벤트 로그 확인
```sql
SELECT * FROM inquiry_events 
WHERE event_type IN ('admin_notified', 'admin_notify_failed')
ORDER BY created_at DESC LIMIT 10;
```

---

### ENV fallback이 작동 안 함

#### 1. ENV 값 확인
```bash
# .env.local
ADMIN_PHONE_NUMBERS=+821012345678,+821087654321
```
→ 콤마로 구분, + 포함

#### 2. 앱 재시작
```bash
npm run dev  # ENV 변경 시 필수
```

#### 3. 콘솔 로그 확인
```
[Recipients] DB에 활성 수신자 없음
[Recipients] ENV fallback
[Recipients] ENV 사용: 2명
```
→ "ENV 사용" 메시지 확인

---

## 📈 운영 권장사항

### 수신자 구성

```
최소 2명 이상 권장 (중복성)

추천 구조:
- 주 관리자 (24시간)
- 부 관리자 (백업)
- 야간 당직 (선택)
```

### ENV fallback 유지

```
DB가 주 수단이지만, ENV도 유지 권장

이유:
- DB 오류 시 긴급 백업
- 배포 중 DB 접근 불가 시
- 관리자 페이지 문제 시
```

### 정기 점검

```
월 1회:
1. failed_count 높은 수신자 확인
2. 비활성 수신자 정리
3. 전화번호 유효성 확인
```

---

## 🔄 마이그레이션 (ENV → DB)

### 단계별 전환

```
1. 현재 ENV 확인
   ADMIN_PHONE_NUMBERS=+821012345678,+821087654321

2. DB에 추가
   - /admin/settings/notifications
   - 각 번호 수동 입력

3. ENV 유지 (백업용)
   변경 안 함 (fallback으로 활용)

4. 테스트
   - 문의 제출
   - DB 수신자에게만 발송되는지 확인
   - ENV는 DB 없을 때만 사용됨 확인
```

---

## 📚 관련 문서

- `P4.1_ADMIN_OPERATIONS_SUMMARY.md` - P4.1 기본 (ENV 기반)
- `ADMIN_NOTIFICATIONS_QUICK_SETUP.md` - 빠른 설정 가이드
- `ADMIN_NOTIFICATIONS_DB_SETUP.md` - 본 문서 (DB 기반)

---

## ✅ 체크리스트

### 초기 설정
- [ ] DB 마이그레이션 실행
- [ ] 관리자 페이지 접속 확인
- [ ] 수신자 2명 이상 등록
- [ ] 테스트 문의 → 알림 수신 확인

### 일상 운영
- [ ] 신규 관리자 추가 시 DB에 등록
- [ ] 휴가 시 is_active=false 설정
- [ ] 월 1회 통계 확인 (sent/failed)

### 긴급 상황
- [ ] DB 오류 시 ENV fallback 작동 확인
- [ ] ENV 백업 번호 최신 상태 유지

---

**이제 DB 기반으로 유연하게 관리하세요!** 🎛️✅
