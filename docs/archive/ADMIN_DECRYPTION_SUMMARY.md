# ADMIN_DECRYPTION_SUMMARY.md

## 📋 목적

**관리자(Admin)만 문의 조회 시 서버에서 PII를 복호화하여 표시**

- DB에는 AES-256-GCM으로 암호화된 상태 유지
- 복호화는 서버(API)에서만 수행
- 관리자 권한이 없으면 복호화 금지
- 일반 사용자 API / 로그 / 외부 전송에는 평문 노출 금지

---

## ✅ 완료 항목

### 1. 관리자 권한 체크 유틸
**파일**: `src/lib/auth/checkAdminAuth.ts`

**기능**:
- Supabase auth 기반 관리자 확인
- 3가지 권한 판정 방식 (OR 조건):
  1. `user.user_metadata.role === "admin"` ✅ 권장
  2. `user.app_metadata.role === "admin"`
  3. 환경변수 `ADMIN_EMAIL_ALLOWLIST`에 포함된 이메일

**환경변수**:
```.env.local
ADMIN_EMAIL_ALLOWLIST=admin@healo.com,manager@healo.com
```

**사용법**:
```typescript
const authResult = await checkAdminAuth(request);
if (!authResult.isAdmin) {
  return Response.json({ error: "unauthorized" }, { status: 403 });
}
// authResult.reason: "user_metadata_role" | "app_metadata_role" | "email_allowlist"
```

**함수**:
- `checkAdminAuth(request)`: 상세 권한 정보 반환 (reason 포함)
- `isAdmin(request)`: boolean만 반환

**관리자 추가 방법**:
```bash
# 스크립트로 role 부여
npx tsx scripts/set-admin.ts --email you@domain.com --role admin

# 현재 관리자 목록 확인
npx tsx scripts/set-admin.ts --list
```

상세 가이드: `ADMIN_AUTH_GUIDE.md` 참조

---

### 2. 복호화 헬퍼 함수
**파일**: `src/lib/security/decryptForAdmin.ts`

**기능**:
- 관리자 전용 PII 복호화
- fail-safe: 복호화 실패 시 해당 필드만 null 처리
- 복호화 실패해도 전체 응답은 반환

**복호화 대상 필드**:

#### `inquiries` 테이블:
- `email`
- `contact_id`
- `message`
- `first_name`
- `last_name`
- `intake` (JSONB 내 PII 키)

#### `normalized_inquiries` 테이블:
- `raw_message`
- `contact` (JSONB 내 PII 키)

**비-PII 필드** (복호화 안 함):
- `nationality`
- `treatment_type`
- `contact_method`
- `status`
- `lead_quality`
- 기타 메타데이터

**사용법**:
```typescript
const decrypted = await decryptInquiryForAdmin(inquiry);
const decryptedList = await decryptInquiriesForAdmin(inquiries);
const decryptedNormalized = await decryptNormalizedInquiryForAdmin(normalized);
```

---

### 3. 관리자 문의 리스트 API
**경로**: `GET /api/admin/inquiries`

**권한**: 관리자 전용 (Supabase auth)

**Query Parameters**:
- `limit`: 조회 개수 (기본: 50, 최대: 200)
- `offset`: 오프셋 (페이지네이션용)
- `status`: 상태 필터 (received / normalized / error / blocked)
- `treatment_type`: 시술 타입 필터
- `nationality`: 국가 필터
- `decrypt`: 복호화 여부 (true/false, 기본: true)

**Response**:
```json
{
  "ok": true,
  "inquiries": [
    {
      "id": 1,
      "email": "patient@example.com",  // ✅ 복호화됨
      "first_name": "John",             // ✅ 복호화됨
      "nationality": "US",              // 평문 (비-PII)
      "treatment_type": "rhinoplasty",  // 평문 (비-PII)
      "status": "received",             // 평문
      "intake": {
        "phone": "+14155551234",        // ✅ 복호화됨
        "complaint": "nose issue"       // 평문 (비-PII)
      }
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0,
  "decrypted": true
}
```

---

### 4. 관리자 문의 상세 API
**경로**: `GET /api/admin/inquiries/[id]`

**권한**: 관리자 전용 (Supabase auth)

**Query Parameters**:
- `decrypt`: 복호화 여부 (true/false, 기본: true)
- `include_normalized`: normalized_inquiries 포함 여부 (true/false, 기본: true)

**Response**:
```json
{
  "ok": true,
  "inquiry": {
    "id": 1,
    "email": "patient@example.com",    // ✅ 복호화됨
    "message": "I need rhinoplasty",  // ✅ 복호화됨
    "first_name": "John",              // ✅ 복호화됨
    "last_name": "Doe",                // ✅ 복호화됨
    "nationality": "US",               // 평문 (비-PII)
    "intake": {
      "phone": "+14155551234",         // ✅ 복호화됨
      "passport_no": "A12345678"       // ✅ 복호화됨
    }
  },
  "normalized": {
    "id": 1,
    "raw_message": "I need rhinoplasty",  // ✅ 복호화됨
    "contact": {
      "email": "patient@example.com"      // ✅ 복호화됨
    }
  },
  "decrypted": true
}
```

---

### 5. 기존 관리자 API 권한 체크 추가
**파일**:
- `app/api/admin/notification-recipients/route.ts`
- `app/api/admin/notification-recipients/[id]/route.ts`

**변경사항**:
- TODO 주석 제거
- `checkAdminAuth()` 호출 추가
- 권한 없으면 403 반환

---

## 🔐 보안 정책

### ✅ 허용:
- 관리자 권한 확인 후 서버에서 복호화
- 복호화된 평문을 네트워크 응답에 포함 (관리자 API만)

### ❌ 금지:
- **로그에 평문 출력 금지**:
  ```typescript
  // ❌ 절대 금지
  console.log("[admin] email:", decryptedEmail);
  
  // ✅ 허용 (마스킹)
  console.log("[admin] email:", maskEmail(decryptedEmail));
  ```

- **operationalLog에 평문 금지**:
  ```typescript
  // ❌ 절대 금지
  logOperational("info", { 
    event: "admin_view",
    email: decryptedEmail  // 평문 노출
  });
  
  // ✅ 허용 (해시)
  logOperational("info", { 
    event: "admin_view",
    email_hash: safeHash(decryptedEmail)  // 해시만
  });
  ```

- **inquiry_events meta에 평문 금지**
- **일반 사용자 API에서 복호화 금지**
- **외부 API / 이메일 / 알림에 평문 전송 금지** (마스킹 필수)

---

## 📊 복호화 플로우

### 관리자 문의 조회 시:

```
1. 클라이언트
   ↓ GET /api/admin/inquiries
   
2. API Route (서버)
   ↓ checkAdminAuth(request)
   ↓ isAdmin? → NO → 403 반환
   ↓ YES
   
3. DB 조회
   ↓ supabaseAdmin.from("inquiries").select(...)
   ↓ 암호화된 데이터 받음
   
4. 서버에서 복호화
   ↓ decryptInquiriesForAdmin(inquiries)
   ↓ email: {"v":"v1","iv":"...","data":"..."} 
   ↓     → "patient@example.com"
   
5. 응답 반환
   ↓ Response.json({ inquiries: [decrypted] })
   
6. 클라이언트
   ✅ 관리자 화면에 평문 표시
```

### 일반 사용자 API 시:

```
1. 클라이언트
   ↓ GET /api/inquiries (일반 API)
   
2. API Route (서버)
   ↓ 권한 체크 없음 (또는 일반 사용자)
   
3. DB 조회
   ↓ supabaseAdmin.from("inquiries").select(...)
   ↓ 암호화된 데이터 받음
   
4. 복호화 안 함 ❌
   
5. 응답 반환
   ↓ Response.json({ inquiries: [encrypted] })
   
6. 클라이언트
   ✅ 암호문 그대로 표시 (또는 마스킹)
```

---

## 🧪 테스트

### 1. 관리자 권한으로 리스트 조회
```bash
curl -X GET "http://localhost:3000/api/admin/inquiries?limit=10" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

**Expected**:
- 200 OK
- `decrypted: true`
- PII 필드가 평문으로 표시

---

### 2. 관리자 권한으로 상세 조회
```bash
curl -X GET "http://localhost:3000/api/admin/inquiries/1" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

**Expected**:
- 200 OK
- `inquiry.email`: 평문
- `inquiry.first_name`: 평문
- `normalized.raw_message`: 평문 (있는 경우)

---

### 3. 권한 없이 조회
```bash
curl -X GET "http://localhost:3000/api/admin/inquiries"
```

**Expected**:
- 403 Forbidden
- `{ ok: false, error: "unauthorized" }`

---

### 4. decrypt=false로 조회 (관리자)
```bash
curl -X GET "http://localhost:3000/api/admin/inquiries?decrypt=false" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

**Expected**:
- 200 OK
- `decrypted: false`
- PII 필드가 암호문 그대로 표시 (`{"v":"v1","iv":"..."}`)

---

## 🚀 배포 체크리스트

### 환경변수 확인
```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# 암호화 키 (필수)
ENCRYPTION_KEY_V1=<base64 32 bytes>
```

### DB 확인
```sql
-- 암호화 여부 확인
SELECT 
  id,
  email,
  CASE 
    WHEN email LIKE '{"v":"v1"%' THEN '암호화됨'
    ELSE '평문'
  END as email_status
FROM inquiries
LIMIT 10;
```

### 권한 체크 확인
```bash
# 1. 관리자 로그인
# 2. /api/admin/inquiries 호출
# 3. 평문이 표시되는지 확인
```

---

## 📝 추가 참고

### 관리자 이메일 추가
**파일**: `src/lib/auth/checkAdminAuth.ts`

```typescript
const ADMIN_EMAILS = [
  "admin@healo.com",
  "manager@healo.com",  // ← 추가
];
```

### 복호화 필드 추가
**파일**: `src/lib/security/decryptForAdmin.ts`

새로운 PII 필드를 추가하려면:
```typescript
// 예: passport_no 추가
if (inquiry.passport_no && typeof inquiry.passport_no === "string") {
  try {
    decrypted.passport_no = await decryptAuto(inquiry.passport_no);
  } catch (error: any) {
    console.error(`[decryptForAdmin] passport_no decryption failed:`, error.message);
    decrypted.passport_no = null; // fail-safe
  }
}
```

---

## 🎯 요약

### 구현된 기능
1. ✅ 관리자 권한 체크 (`checkAdminAuth`)
2. ✅ PII 복호화 헬퍼 (`decryptForAdmin`)
3. ✅ 관리자 문의 리스트 API (`GET /api/admin/inquiries`)
4. ✅ 관리자 문의 상세 API (`GET /api/admin/inquiries/[id]`)
5. ✅ 기존 관리자 API 권한 체크 추가

### 보안 원칙
- ✅ DB에는 암호화된 상태 유지
- ✅ 복호화는 서버에서만 수행
- ✅ 관리자 권한 확인 필수
- ✅ 로그에 평문 출력 금지
- ✅ fail-safe (복호화 실패해도 응답 반환)

### 복호화 대상
- ✅ `inquiries`: email, contact_id, message, first_name, last_name, intake
- ✅ `normalized_inquiries`: raw_message, contact

### 비-PII (복호화 안 함)
- nationality, treatment_type, contact_method, status, lead_quality

---

**이제 관리자는 문의를 조회할 때 사람이 읽을 수 있는 평문을 볼 수 있습니다!** 🎉
