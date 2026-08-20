# 관리자 알림 빠른 설정 가이드

> 소요 시간: 5-30분 (모드별)  
> 난이도: ⭐ (Console) ~ ⭐⭐⭐⭐⭐ (알림톡)

---

## 🚀 1단계: Console 모드 (5분)

**추천**: 개발/테스트 환경

### 설정
```bash
# .env.local
NOTIFY_PROVIDER=console
```

### 테스트
1. 문의 제출 (Step2)
2. 터미널 확인

**결과**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 SMS 발송 (Console Mode)
수신: CONSOLE
내용:
🔥 새 문의 #123

국가: KR
시술: rhinoplasty
연락: WhatsApp
점수: 85

시각: 2026-01-29 14:30
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**장점**: 설정 불필요, 즉시 작동  
**단점**: 실제 알림 안 감 (터미널만)

---

## 📱 2단계: SMS - Twilio (30분)

**추천**: 프로덕션 환경

### 준비

1. **Twilio 계정 생성**
   - https://www.twilio.com
   - 무료 체험: $15 크레딧

2. **전화번호 구매**
   - Console → Phone Numbers → Buy a number
   - 약 $1/월

3. **API Credentials 복사**
   - Console → Account → API credentials
   - Account SID
   - Auth Token

### 설정

```bash
# .env.local
NOTIFY_PROVIDER=sms
SMS_PROVIDER=twilio
ADMIN_PHONE_NUMBERS=+82-10-1234-5678,+82-10-9876-5432

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1234567890
```

### 패키지 설치

```bash
npm install twilio
```

### 코드 활성화

`src/lib/notifications/adminNotifier.ts` 파일 수정:

```typescript
// 기존 (주석 처리됨):
// const client = require('twilio')(accountSid, authToken);

// 변경 (주석 해제):
const client = require('twilio')(accountSid, authToken);
const result = await client.messages.create({
  body: message,
  from: fromNumber,
  to: to,
});

return {
  success: true,
  provider: "sms",
  messageId: result.sid,  // 실제 messageId 반환
};
```

### 테스트

1. 앱 재시작
2. 문의 제출
3. **휴대폰에 SMS 도착 확인** 📱

**비용**: 건당 약 $0.01-0.05

---

## ☁️ 3단계: SMS - AWS SNS (20분)

**추천**: AWS 인프라 사용 중인 경우

### 준비

1. **AWS 계정**
2. **IAM User 생성** (SNS 권한)
3. **Access Key 발급**

### 설정

```bash
# .env.local
NOTIFY_PROVIDER=sms
SMS_PROVIDER=aws-sns
ADMIN_PHONE_NUMBERS=+82-10-1234-5678

AWS_SNS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxx
```

### 패키지 설치

```bash
npm install @aws-sdk/client-sns
```

### 코드 활성화

`src/lib/notifications/adminNotifier.ts` 수정:

```typescript
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const client = new SNSClient({ region });

const result = await client.send(new PublishCommand({
  PhoneNumber: to,
  Message: message,
}));

return {
  success: true,
  provider: "sms",
  messageId: result.MessageId,
};
```

---

## 💬 4단계: 알림톡 (3-7일)

**추천**: 한국 사용자 전용

### 준비 (3-5일 소요)

1. **카카오 비즈니스 계정**
   - https://business.kakao.com
   - 사업자 등록 필요

2. **알림톡 템플릿 승인 요청**
   - 템플릿 작성
   - 카카오 검수 (1-3일)

3. **벤더 선택**
   - NHN Cloud
   - Aligo
   - CoolSMS

### 템플릿 예시

```
[healwith] 새 문의 도착

문의 번호: #{inquiry_id}
국가: #{nationality}
시술: #{treatment}
접수 시각: #{created_at}

자세히 보기
https://healo.com/admin/inquiries/#{inquiry_id}
```

### 설정

```bash
# .env.local
NOTIFY_PROVIDER=alimtalk
ADMIN_PHONE_NUMBERS=010-1234-5678
ALIMTALK_API_KEY=xxxxxxxxxxxx
ALIMTALK_TEMPLATE_CODE=INQUIRY_NOTICE
```

### 코드 활성화

벤더 API 문서에 따라 `src/lib/notifications/adminNotifier.ts` 수정

---

## 🔒 세션 만료 설정

### 기본값 (권장)

```bash
# .env.local
ADMIN_IDLE_TIMEOUT_MINUTES=60      # 1시간
ADMIN_ABSOLUTE_TIMEOUT_DAYS=7      # 7일
```

### 조정 가능

```bash
# 더 엄격하게
ADMIN_IDLE_TIMEOUT_MINUTES=30      # 30분
ADMIN_ABSOLUTE_TIMEOUT_DAYS=3      # 3일

# 더 느슨하게 (비추천)
ADMIN_IDLE_TIMEOUT_MINUTES=120     # 2시간
ADMIN_ABSOLUTE_TIMEOUT_DAYS=30     # 30일
```

---

## ✅ 설정 검증

### 알림 설정 확인

```typescript
// 개발자 콘솔에서 실행
import { validateNotificationConfig } from '@/lib/notifications/adminNotifier';

const config = validateNotificationConfig();
console.log(config);
```

**결과**:
```json
{
  "valid": true,
  "provider": "sms",
  "adminCount": 2,
  "issues": []
}
```

### 세션 정보 확인

```typescript
// 관리자 페이지에서 실행
import { getSessionInfo } from '@/lib/auth/sessionGuard';

const info = getSessionInfo(request);
console.log(info);
```

**결과**:
```json
{
  "hasSession": true,
  "idleMinutes": 15,
  "absoluteDays": 2,
  "validUntil": {
    "idle": "2026-01-29T15:30:00Z",
    "absolute": "2026-02-05T14:30:00Z"
  }
}
```

---

## 🐛 문제 해결

### 알림이 안 와요

#### 1. Console 모드 확인
```bash
# 터미널에 출력되는지 확인
# 출력되면 → 알림 모듈은 정상
# 안 되면 → 환경변수 확인
```

#### 2. 환경변수 확인
```bash
# .env.local 파일 존재 확인
# 앱 재시작 (환경변수 변경 시)
npm run dev
```

#### 3. 로그 확인
```bash
# 터미널 로그 확인
[Notify] Inquiry 123: 1 sent, 0 failed  # 성공
[Notify] Rate limited: inquiry 123       # Rate limit
[Notify] ADMIN_PHONE_NUMBERS not configured  # 미설정
```

#### 4. 이벤트 로그 확인
```sql
SELECT * FROM inquiry_events 
WHERE event_type IN ('admin_notified', 'admin_notify_failed')
ORDER BY created_at DESC LIMIT 10;
```

---

### 세션이 계속 만료돼요

#### 1. 정책 확인
```bash
# .env.local
ADMIN_IDLE_TIMEOUT_MINUTES=60  # 너무 짧은가?
```

#### 2. 쿠키 확인
- 브라우저 개발자 도구 → Application → Cookies
- `admin_last_activity`, `admin_login_time` 존재 확인

#### 3. 미들웨어 확인
```typescript
// middleware.ts
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

---

## 📊 모니터링

### 알림 성공률

```sql
-- 오늘 알림 통계
SELECT 
  event_type,
  COUNT(*) as count
FROM inquiry_events
WHERE event_type IN ('admin_notified', 'admin_notify_failed')
  AND DATE(created_at) = CURRENT_DATE
GROUP BY event_type;
```

### 세션 만료 패턴

```sql
-- 세션 만료 로그 (로그인 페이지 접근 + reason 파라미터)
-- 운영자가 만료 이유를 확인할 수 있도록
```

---

## 💡 운영 팁

### 알림

1. **처음엔 Console 모드로 테스트**
   - 문의 → 터미널 확인
   - 메시지 내용 확인

2. **SMS 테스트는 본인 번호로**
   - 비용 절약
   - 실제 수신 확인

3. **알림톡은 나중에**
   - 설정 복잡
   - 승인 소요 시간 김

### 세션

1. **정책은 보수적으로**
   - Idle 60분 (권장)
   - 너무 짧으면 불편

2. **운영자에게 안내**
   - "1시간 활동 없으면 자동 로그아웃"
   - 중요 작업 전 저장

3. **로그인 페이지에 이유 표시**
   ```
   세션 만료 (비활동 60분 초과)
   다시 로그인하세요.
   ```

---

## 📚 참고

- **상세 가이드**: `P4.1_ADMIN_OPERATIONS_SUMMARY.md`
- **알림 코드**: `src/lib/notifications/adminNotifier.ts`
- **세션 코드**: `src/lib/auth/sessionGuard.ts`

---

**이제 설정 완료! 문의를 놓치지 마세요** 📱✅
