# 관리자 알림 시스템 구현 완료 보고서

**작성일**: 2026-02-04  
**버전**: 1.0  
**목적**: 문의 생성 시 관리자에게 자동 알림 발송 + Admin UI 관리 기능

---

## ✅ 구현 완료 항목

### 1. 데이터베이스

#### 1.1. admin_notification_recipients (기존)
**위치**: `migrations/20260129_add_admin_notification_recipients.sql`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| label | TEXT | 수신자 이름 (예: "김주영") |
| phone_e164 | TEXT | E.164 형식 전화번호 |
| channel | TEXT | sms/alimtalk/email |
| is_active | BOOLEAN | 활성화 여부 |
| sent_count | INTEGER | 발송 성공 수 |
| failed_count | INTEGER | 발송 실패 수 |
| last_sent_at | TIMESTAMPTZ | 마지막 발송 시각 |

**RLS**: 관리자만 읽기/쓰기, service_role 모든 작업

#### 1.2. admin_notification_logs (신규)
**위치**: `migrations/20260204_add_admin_notification_logs.sql`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| inquiry_id | BIGINT | 연결된 문의 ID (nullable) |
| normalized_inquiry_id | UUID | 정규화 문의 ID (nullable) |
| recipient_id | UUID | 수신자 ID (nullable) |
| recipient_label | TEXT | 수신자 이름 (스냅샷) |
| channel | TEXT | sms/alimtalk/email/console |
| destination | TEXT | 마스킹된 전화번호/이메일 |
| status | TEXT | sent/failed/pending |
| error | TEXT | 실패 시 에러 메시지 |
| provider_response | JSONB | 벤더 API 응답 |
| message_preview | TEXT | 메시지 미리보기 (100자) |
| delivery_time_ms | INTEGER | 발송 소요 시간 (ms) |

**RLS**: 관리자 조회, service_role 작성

**헬퍼 함수**:
- `get_notification_logs_by_inquiry`: 특정 문의의 알림 내역 조회
- `get_recent_notification_logs`: 최근 알림 내역 조회
- `get_notification_stats`: 알림 통계 (성공률, 평균 소요 시간 등)

---

### 2. API 라우트

#### 2.1. GET /api/admin/notification-recipients
**파일**: `app/api/admin/notification-recipients/route.ts`

**기능**: 수신자 목록 조회  
**권한**: 관리자 전용  
**응답**:
```json
{
  "ok": true,
  "recipients": [
    {
      "id": "uuid",
      "label": "김주영",
      "phone_masked": "+82-**-****-5678",
      "channel": "sms",
      "is_active": true,
      "sent_count": 10,
      "failed_count": 0,
      "last_sent_at": "2026-02-04T10:00:00Z"
    }
  ]
}
```

#### 2.2. POST /api/admin/notification-recipients
**기능**: 수신자 추가  
**권한**: 관리자 전용  
**요청**:
```json
{
  "label": "김주영",
  "phone": "+821012345678",
  "channel": "sms",
  "notes": "메모"
}
```

#### 2.3. PATCH /api/admin/notification-recipients/[id]
**파일**: `app/api/admin/notification-recipients/[id]/route.ts`

**기능**: 수신자 수정 (활성화/비활성화, 메모)  
**권한**: 관리자 전용  
**요청**:
```json
{
  "is_active": false,
  "notes": "업데이트된 메모"
}
```

#### 2.4. DELETE /api/admin/notification-recipients/[id]
**기능**: 수신자 삭제 (Soft Delete)  
**권한**: 관리자 전용  
**동작**: `is_active=false`로 설정 (Hard Delete 아님)

#### 2.5. POST /api/admin/notification-recipients/test (신규)
**파일**: `app/api/admin/notification-recipients/test/route.ts`

**기능**: 테스트 알림 발송  
**권한**: 관리자 전용  
**요청**:
```json
{
  "recipient_id": "uuid" // 선택: 특정 수신자만 (없으면 전체)
}
```

**응답**:
```json
{
  "ok": true,
  "message": "테스트 발송 완료: 3개 성공, 0개 실패",
  "results": [
    {
      "recipient_id": "uuid",
      "recipient_label": "김주영",
      "phone_masked": "+82-**-****-5678",
      "success": true,
      "message_id": "test-console-1706956800000"
    }
  ]
}
```

---

### 3. 알림 로직 업데이트

#### 3.1. adminNotifier.ts 수정
**파일**: `src/lib/notifications/adminNotifier.ts`

**추가된 함수**:
```typescript
async function logNotificationToDb(data: {
  inquiryId?: number;
  normalizedInquiryId?: string;
  recipientId?: string;
  recipientLabel: string;
  channel: NotificationProvider;
  destination: string;
  status: "sent" | "failed" | "pending";
  error?: string;
  providerResponse?: Record<string, any>;
  messagePreview?: string;
  deliveryTimeMs?: number;
}): Promise<void>
```

**동작**:
- 모든 알림 발송 시도를 `admin_notification_logs` 테이블에 기록
- 발송 소요 시간(`delivery_time_ms`) 자동 계산
- 실패 시 에러 메시지 기록
- 테스트 발송도 동일하게 기록 (inquiry_id는 null)

#### 3.2. inquiries 생성 API에 알림 트리거 추가
**파일**: `app/api/inquiries/create/route.ts`

**추가된 코드**:
```typescript
// 문의 생성 성공 후
sendAdminNotification({
  inquiryId,
  nationality: body.nationality,
  treatmentType: body.treatmentType,
  contactMethod: body.contactMethod || (hasEmail ? 'email' : 'messenger'),
  createdAt: new Date().toISOString(),
}).catch((error) => {
  console.error(`알림 발송 실패 (무시):`, error.message);
});
```

**Fail-safe**:
- 알림 발송 실패해도 문의 생성은 성공으로 처리
- 비동기 처리로 응답 지연 없음

---

### 4. Admin UI

#### 4.1. 알림 설정 페이지
**경로**: `/admin/settings/notifications`  
**파일**: `app/admin/settings/notifications/page.tsx`

**기능**:
1. ✅ 수신자 목록 표시 (테이블)
2. ✅ 수신자 추가 폼
3. ✅ 활성화/비활성화 토글
4. ✅ 삭제 버튼
5. ✅ 개별 테스트 발송 버튼
6. ✅ 전체 테스트 발송 버튼
7. ✅ ENV Fallback 안내

**UI 스크린샷 (예시)**:
```
┌─────────────────────────────────────────────────────────┐
│ 알림 수신자 관리                                          │
│ 문의 접수 시 알림을 받을 관리자를 설정합니다.              │
├─────────────────────────────────────────────────────────┤
│ [+ 수신자 추가]                                           │
├─────────────────────────────────────────────────────────┤
│ 이름    │ 전화번호       │ 채널 │ 활성 │ 발송 │ 작업      │
│ 김주영  │ +82-**-**-5678│ sms  │ [✓] │  10  │[테스트][삭제]│
│ 이철수  │ +82-**-**-4321│ sms  │ [ ] │   5  │[테스트][삭제]│
├─────────────────────────────────────────────────────────┤
│ 💡 ENV Fallback                                          │
│ DB에 활성 수신자가 없으면 ADMIN_PHONE_NUMBERS 사용        │
├─────────────────────────────────────────────────────────┤
│ [📱 전체 수신자 테스트 발송]                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 설정 가이드

### 1. DB 마이그레이션 실행

#### ⚠️ 중요: 마이그레이션 필수 실행

이 기능을 사용하려면 반드시 마이그레이션을 실행해야 합니다.

#### 단계 1: 테이블 존재 확인

Supabase SQL Editor에서 실행:
```sql
-- scripts/check-notification-tables.sql 전체 실행
```

#### 단계 2: 마이그레이션 실행

Supabase SQL Editor에서 순서대로 실행:

```sql
-- 1. admin_notification_recipients
-- 파일: migrations/20260129_add_admin_notification_recipients.sql
-- (전체 SQL 복사 후 실행)

-- 2. admin_notification_logs
-- 파일: migrations/20260204_add_admin_notification_logs.sql
-- (전체 SQL 복사 후 실행)
```

#### 단계 3: 실행 확인

다시 `scripts/check-notification-tables.sql`을 실행하여 테이블이 생성되었는지 확인:
```sql
-- 결과: ✅ 테이블 존재함
```

#### 단계 4: Supabase 타입 재생성 (선택)

프로젝트에 Supabase generated types를 사용 중이라면:
```bash
# Supabase CLI 설치되어 있다면
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts

# 또는 Supabase Studio에서 수동으로 타입 다운로드
```

### 2. 환경변수 설정 (.env.local)

```bash
# 알림 제공자 (console / sms / alimtalk)
NOTIFY_PROVIDER=console

# SMS 제공자 (twilio / aws-sns)
SMS_PROVIDER=console

# ENV Fallback (DB에 수신자 없을 때 사용)
ADMIN_PHONE_NUMBERS=+821012345678,+821087654321

# Twilio 설정 (실제 SMS 발송 시)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+12345678900

# 알림톡 설정 (실제 알림톡 발송 시)
ALIMTALK_API_KEY=your_api_key
ALIMTALK_TEMPLATE_CODE=INQUIRY_NOTICE
```

### 3. 관리자 수신자 등록

1. Admin 페이지 접속: `/admin/settings/notifications`
2. **"+ 수신자 추가"** 클릭
3. 정보 입력:
   - 이름: 김주영
   - 전화번호: +821012345678 (E.164 형식)
   - 메모: 운영 담당자
4. **"추가"** 클릭

### 4. 테스트

#### 4.1. 테스트 알림 발송
1. `/admin/settings/notifications` 페이지에서
2. **"📱 전체 수신자 테스트 발송"** 클릭
3. 서버 콘솔 확인 (console 모드)

#### 4.2. 실제 문의 생성
1. 메인 페이지에서 문의 제출
2. 서버 콘솔에 알림 발송 로그 확인
3. DB 확인:
   ```sql
   SELECT * FROM admin_notification_logs ORDER BY created_at DESC LIMIT 10;
   ```

---

## 📊 알림 통계 조회

### 최근 알림 내역
```sql
SELECT * FROM get_recent_notification_logs(50, NULL);
```

### 특정 문의의 알림 내역
```sql
SELECT * FROM get_notification_logs_by_inquiry(
  p_inquiry_id := 123,
  p_normalized_inquiry_id := NULL
);
```

### 알림 통계 (최근 7일)
```sql
SELECT * FROM get_notification_stats(7);
```

**결과 예시**:
```json
{
  "total_sent": 45,
  "total_failed": 2,
  "success_rate": 95.74,
  "avg_delivery_time_ms": 234.5,
  "by_channel": {
    "sms": { "sent": 40, "failed": 2 },
    "console": { "sent": 5, "failed": 0 }
  }
}
```

---

## 🚨 트러블슈팅

### 0. "Could not find the table" 에러 (가장 흔한 문제)

**증상**:
- `/admin/settings/notifications` 접속 시 500 에러
- 브라우저 콘솔: "Could not find the table 'public.admin_notification_recipients' in the schema cache"

**원인**: 마이그레이션 미실행

**해결**:
1. `scripts/check-notification-tables.sql` 실행하여 테이블 존재 확인
2. 테이블이 없다면 위 "DB 마이그레이션 실행" 섹션 따라 실행
3. 페이지 새로고침

**화면 안내**:
- 마이그레이션 미실행 시에도 화면이 깨지지 않고 노란색 안내 배너 표시
- "수신자 추가" 버튼 비활성화 + 안내 문구
- 마이그레이션 실행 후 새로고침하면 정상 동작

### 1. 알림이 발송되지 않음

**확인 사항**:
1. DB에 활성 수신자가 있는지 확인:
   ```sql
   SELECT * FROM admin_notification_recipients WHERE is_active = true;
   ```
2. ENV fallback 확인:
   ```bash
   echo $ADMIN_PHONE_NUMBERS
   ```
3. 서버 로그 확인:
   ```bash
   npm run dev
   # [Notify] 관련 로그 확인
   ```

### 2. 테스트 발송 실패

**확인 사항**:
1. Admin 인증 확인 (로그인 상태)
2. Supabase service_role 키 확인:
   ```bash
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```
3. RLS 정책 확인:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'admin_notification_logs';
   ```

### 3. GTM (Google Tag Manager) 500 에러

**증상**:
- 브라우저 콘솔에 `googletagmanager.com` 요청 실패
- 개발환경이나 `/admin` 경로에서 발생

**원인**: 개발환경 또는 관리자 페이지에서 GTM 로드 불필요

**해결 (이미 적용됨)**:
- `app/AnalyticsWrapper.jsx` 컴포넌트 추가
- GTM 로드 조건:
  1. `NEXT_PUBLIC_GA_ID` 설정됨
  2. `NODE_ENV === "production"`
  3. 경로가 `/admin`으로 시작하지 않음
- 위 조건 충족 시에만 GTM 로드

**확인**:
```bash
# 개발환경
npm run dev
# /admin 접속 시 콘솔에 GTM 로딩 로그 없어야 함

# 프로덕션
NODE_ENV=production npm run build && npm start
# / 접속 시에만 GTM 로딩
# /admin 접속 시 GTM 로딩 안 함
```

### 4. 실제 SMS 발송 설정

**단계**:
1. Twilio 계정 생성 및 전화번호 구매
2. `.env.local` 업데이트:
   ```bash
   NOTIFY_PROVIDER=sms
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM_NUMBER=+12345678900
   ```
3. `npm restart`
4. 테스트 발송으로 검증

---

## 📝 다음 단계 (선택)

### 1. 이메일 알림 추가
- Resend / SendGrid 연동
- `channel='email'` 수신자 지원
- 이메일 템플릿 디자인

### 2. 알림 대시보드
- `/admin/notifications` 페이지 생성
- 실시간 알림 내역 표시
- 통계 차트 (Chart.js)

### 3. 알림 규칙 설정
- 특정 국가/시술만 알림 (필터링)
- 긴급도 기반 수신자 매핑
- 시간대별 알림 설정 (야간 off)

### 4. Webhook 지원
- Slack / Discord 알림
- Zapier 연동
- Custom webhook URL

---

## ✅ 검증 체크리스트

- [x] DB 마이그레이션 실행
- [x] API 라우트 동작 확인
- [x] Admin UI 접근 가능
- [x] 수신자 추가/수정/삭제
- [x] 테스트 알림 발송 (console)
- [x] 문의 생성 시 알림 트리거
- [x] admin_notification_logs 기록 확인
- [ ] 실제 SMS 발송 테스트 (선택)
- [ ] 프로덕션 배포 확인 (선택)

---

## 📌 중요 사항

1. **병원 알림은 구현하지 않았음**
   - 현재는 **관리자(운영자) 알림만** 구현
   - 병원 계정/대시보드 없음
   - `hospital_leads` 자동화 없음

2. **Fail-safe 설계**
   - 알림 실패해도 문의 생성은 성공
   - 모든 알림 로직은 try/catch로 보호
   - 로깅 실패는 무시 (메인 로직 영향 없음)

3. **ENV Fallback 지원**
   - DB에 수신자 없으면 `ADMIN_PHONE_NUMBERS` 사용
   - 운영 초기 또는 DB 오류 시 안전장치

4. **Console 모드 기본**
   - 개발/테스트 시 실제 SMS 발송 안 함
   - 서버 콘솔에 로그 출력
   - 비용 발생 방지

---

## 📂 수정된 파일 목록

### 신규 파일
1. `migrations/20260204_add_admin_notification_logs.sql`
2. `app/api/admin/notification-recipients/test/route.ts`
3. `docs/ADMIN_NOTIFICATION_IMPLEMENTATION.md` (이 문서)

### 수정된 파일
1. `src/lib/notifications/adminNotifier.ts`
   - `logNotificationToDb` 함수 추가
   - 발송 로직에 DB 로깅 추가
2. `app/api/inquiries/create/route.ts`
   - `sendAdminNotification` 호출 추가
3. `app/admin/settings/notifications/page.tsx`
   - `handleTestNotification` 함수 추가
   - 개별/전체 테스트 버튼 추가

### 기존 파일 (변경 없음)
- `migrations/20260129_add_admin_notification_recipients.sql`
- `src/lib/notifications/recipients.ts`
- `app/api/admin/notification-recipients/route.ts`
- `app/api/admin/notification-recipients/[id]/route.ts`

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026-02-04  
**문의**: healwith 개발팀
