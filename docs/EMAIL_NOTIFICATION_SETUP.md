# 📧 Email 알림 설정 가이드

## 개요

healwith는 문의 접수 시 관리자에게 이메일 알림을 발송합니다.
- **SMS**: 아직 실제 발송하지 않음 (Console log만, 나중에 Provider 연동 예정)
- **Email**: AWS SES로 실제 발송 ✅

---

## 1. AWS SES 설정

### 1.1 AWS 계정 준비
1. [AWS Console](https://console.aws.amazon.com/) 로그인
2. 리전: `ap-northeast-2` (서울) 권장

### 1.2 SES 설정
1. **SES Console** 접속
   - https://console.aws.amazon.com/ses/

2. **발신 이메일 주소 인증**
   ```
   SES > Verified identities > Create identity
   - Email address: noreply@healo.com (또는 원하는 주소)
   - 인증 이메일 수신 후 링크 클릭
   ```

3. **Sandbox 모드 해제 (선택)**
   - Sandbox 모드: 인증된 수신자에게만 발송 가능
   - Production 모드: 모든 이메일 주소로 발송 가능
   - 해제 방법: SES Console > Account dashboard > Request production access

### 1.3 IAM 사용자 생성 (API 액세스용)
1. **IAM Console** 접속
   - https://console.aws.amazon.com/iam/

2. **사용자 생성**
   ```
   IAM > Users > Add users
   - User name: healo-ses-sender
   - Access type: Programmatic access (API)
   ```

3. **권한 설정**
   ```
   Attach policies directly:
   - AmazonSESFullAccess (또는 커스텀 정책)
   ```

4. **액세스 키 저장**
   ```
   Access key ID: AKIA...
   Secret access key: wJal...
   ⚠️ Secret은 한 번만 표시되므로 안전하게 보관!
   ```

---

## 2. 환경변수 설정

`.env.local` 파일에 추가:

```env
# AWS SES (Email Notifications)
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJal...
SES_FROM_EMAIL=noreply@healo.com
```

---

## 3. 수신자 등록

### 3.1 관리자 페이지에서 등록
1. `/admin/settings/notifications` 접속
2. **+ 수신자 추가** 클릭
3. 정보 입력:
   - 이름: 홍길동
   - 채널: Email 선택
   - 이메일 주소: admin@healo.com
   - 활성화: 체크
4. **추가** 버튼 클릭

### 3.2 여러 채널 동시 등록
- SMS + Email 체크 → 전화번호와 이메일 모두 입력
- 한 사람이 여러 채널로 알림 수신 가능

---

## 4. 테스트

### 4.1 테스트 알림 발송
1. `/admin/settings/notifications` 페이지
2. **테스트 알림 발송** 버튼 클릭
3. 이메일 수신 확인

### 4.2 실제 문의 테스트
1. `/inquiry` 페이지에서 문의 작성
2. 제출 후 이메일 수신 확인

### 4.3 로그 확인
```sql
-- Supabase SQL Editor
SELECT * FROM admin_notification_logs 
WHERE channel = 'email' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 5. 발송 메시지 템플릿

### Subject
```
[healwith] 🔥 New inquiry received #123
```

### Body (HTML)
- 문의 번호
- 국가
- 시술 종류
- 연락 방법
- 우선순위 점수
- 문의 확인 링크

---

## 6. 트러블슈팅

### ❌ Email 발송 실패

**증상**: `admin_notification_logs`에 `status='failed'` 기록

**원인 1**: AWS Credentials 미설정
```bash
# 확인
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY

# 해결: .env.local에 추가
```

**원인 2**: SES_FROM_EMAIL 미인증
```
# 확인: SES Console > Verified identities
# 해결: 발신 이메일 주소 인증 완료
```

**원인 3**: Sandbox 모드
```
# 수신자 이메일도 인증 필요
# 또는 Production 모드 요청
```

**원인 4**: 리전 불일치
```env
# 확인: AWS_REGION과 SES 리전이 동일한지 확인
AWS_REGION=ap-northeast-2
```

### ❌ SMS는 언제 실제 발송되나요?

현재 SMS는 **Mock Mode**입니다:
- Console log만 출력
- `admin_notification_logs`에 `status='sent'`로 기록
- 실제 발송은 하지 않음

**실제 발송 구현 시**:
- `src/lib/notifications/adminNotifier.ts`의 `sendSMS()` 함수만 교체
- Twilio / AWS SNS / 기타 SMS Provider 연동

---

## 7. 보안 권장사항

1. **IAM 최소 권한 원칙**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ses:SendEmail",
           "ses:SendRawEmail"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

2. **환경변수 보호**
   - `.env.local`을 `.gitignore`에 추가 (이미 추가됨)
   - Production 환경변수는 Vercel/AWS 등 플랫폼에서 관리

3. **발신 이메일 SPF/DKIM 설정**
   - SES에서 자동 설정됨
   - 도메인 이메일 사용 시 DNS 설정 필요

---

## 8. 비용

### AWS SES 요금 (2024 기준)
- 첫 62,000건/월: 무료 (EC2에서 발송 시)
- 추가 발송: $0.10/1,000건
- 대부분의 경우 무료 범위 내에서 충분

### 예상 비용
- 월 1,000건 문의 → 무료
- 월 10,000건 문의 → 무료
- 월 100,000건 문의 → $3.80

---

## 9. 참고 자료

- [AWS SES 공식 문서](https://docs.aws.amazon.com/ses/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ses/)
- [Sandbox 모드 해제 가이드](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
