# PHASE2 검증 리포트

**검증일**: 2026-01-30  
**검증자**: Cursor AI (Code Analysis)  
**검증 원칙**: 코드 분석 + 실제 동작 예측

---

## 📊 검증 결과 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| 1. decrypt 봉인 | ✅ PASS | 코드 레벨 확인 완료 |
| 2. 상세 복호화 | ✅ PASS | 코드 레벨 확인 완료 |
| 3. 감사 로그 | ✅ PASS | 코드 레벨 확인 완료 |
| 4. RLS 문의 생성 | ❌ **FAIL** | 클라이언트 직접 insert 차단됨 |

**Go/No-Go**: ❌ **NO-GO** (문의 생성 기능 차단 문제 수정 필요)

---

## 1️⃣ 검증 1: 목록 decrypt 봉인

### 📋 테스트 시나리오

```http
GET http://localhost:3000/api/admin/inquiries?limit=5
GET http://localhost:3000/api/admin/inquiries?limit=5&decrypt=true
```

### 🔍 코드 분석 결과

**파일**: `app/api/admin/inquiries/route.ts`

```typescript
// Line 98-100
// 🔒 보안 정책: decrypt 파라미터 완전 봉인 (목록은 항상 마스킹만)
// decrypt 파라미터가 오더라도 무시하고 항상 false로 고정
const shouldDecrypt = false; // 🚫 ALWAYS FALSE - 평문 대량 노출 차단
```

```typescript
// Line 143-146
// 🔒 보안 정책: 목록 API는 항상 마스킹만 반환
// 복호화 로직 자체를 제거하여 평문 대량 노출 가능성 차단
inquiries = maskInquiriesForList(inquiries);
console.log(`[admin/inquiries] ✅ Masked ${inquiries.length} inquiries (decrypt sealed)`);
```

**maskInquiriesForList() 함수**:
```typescript
// src/lib/security/maskPii.ts
export function maskEmail(email: string | null): string {
  // j***@gmail.com
}

export function maskName(name: string | null): string {
  // J***
}

export function maskMessage(message: string | null): string {
  // I need help...***
}
```

### ✅ 판정: **PASS**

**근거**:
- ✅ `shouldDecrypt` 변수가 `false`로 하드코딩됨 (쿼리 파라미터 무시)
- ✅ 복호화 로직(`decryptInquiriesForAdmin()`) 호출이 완전히 제거됨
- ✅ `maskInquiriesForList()` 함수가 항상 호출됨
- ✅ 응답 스키마에 `decrypted: false`, `masked: true` 고정

**예상 응답**:
```json
{
  "ok": true,
  "inquiries": [
    {
      "email": "j***@gmail.com",
      "first_name": "J***",
      "last_name": "D***",
      "message": "I need help...***"
    }
  ],
  "decrypted": false,
  "masked": true,
  "_security": "list_api_always_masked"
}
```

### 🧪 실제 테스트 방법

**브라우저 Console**:
```javascript
// 1. 세션 가져오기
const { data } = await supabase.auth.getSession();
const token = data.session.access_token;

// 2. decrypt=true로 강제 시도
const res1 = await fetch('/api/admin/inquiries?limit=5&decrypt=true', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const result1 = await res1.json();

// 3. decrypt=false (기본값)
const res2 = await fetch('/api/admin/inquiries?limit=5', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const result2 = await res2.json();

// 4. 결과 비교
console.log('decrypt=true:', result1.decrypted, result1.masked);
console.log('decrypt=false:', result2.decrypted, result2.masked);
console.log('Sample email:', result1.inquiries[0]?.email);
```

**Expected**: 두 요청 모두 `decrypted: false`, `masked: true`, 이메일은 `j***@...` 형식

---

## 2️⃣ 검증 2: 상세 단건 복호화

### 📋 테스트 시나리오

```http
GET http://localhost:3000/api/admin/inquiries/123
```

### 🔍 코드 분석 결과

**파일**: `app/api/admin/inquiries/[id]/route.ts`

```typescript
// Line 93-95
// Query Parameters 파싱
const shouldDecrypt = searchParams.get("decrypt") !== "false"; // 기본: true
const includeNormalized = searchParams.get("include_normalized") !== "false"; // 기본: true
```

```typescript
// Line 167-184
if (shouldDecrypt) {
  try {
    decryptedInquiry = await decryptInquiryForAdmin(inquiry);
    console.log(`[admin/inquiries/${inquiryId}] ✅ Inquiry decrypted`);

    if (normalized) {
      decryptedNormalized = await decryptNormalizedInquiryForAdmin(normalized);
      console.log(`[admin/inquiries/${inquiryId}] ✅ Normalized inquiry decrypted`);
    }
  } catch (decryptError: any) {
    console.error(
      `[admin/inquiries/${inquiryId}] Decryption failed:`,
      decryptError.message
    );
  }
}
```

### ✅ 판정: **PASS** (코드 레벨)

**근거**:
- ✅ `shouldDecrypt = true` (기본값)
- ✅ `decryptInquiryForAdmin()` 함수 호출
- ✅ 복호화 성공 시 평문 반환
- ✅ 복호화 실패 시 암호문 상태로 반환 (fail-safe)

**예상 응답**:
```json
{
  "ok": true,
  "inquiry": {
    "id": 123,
    "email": "john@gmail.com",     // ✅ 평문
    "first_name": "John",           // ✅ 평문
    "last_name": "Doe",             // ✅ 평문
    "message": "I need help with...", // ✅ 평문
    "treatment_type": "Hair Transplant"
  },
  "decrypted": true
}
```

### ⚠️ 잠재적 이슈

**환경변수 누락 시**:
- `ENCRYPTION_KEY_V1` 없으면 복호화 실패
- 응답: 암호문 JSON (`{"v":"v1","iv":...}`)
- HTTP 200이지만 평문 아님

**해결**: Vercel 환경변수 확인 필수

### 🧪 실제 테스트 방법

**브라우저 Console**:
```javascript
// 1. inquiry ID 가져오기 (목록에서)
const listRes = await fetch('/api/admin/inquiries?limit=1', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const list = await listRes.json();
const inquiryId = list.inquiries[0]?.id;

// 2. 상세 조회
const detailRes = await fetch(`/api/admin/inquiries/${inquiryId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const detail = await detailRes.json();

// 3. 평문 확인
console.log('Status:', detailRes.status);
console.log('Decrypted:', detail.decrypted);
console.log('Email:', detail.inquiry?.email);
console.log('Is plaintext:', typeof detail.inquiry?.email === 'string' && detail.inquiry?.email.includes('@'));
```

**Expected**: 
- `status: 200`
- `decrypted: true`
- `email: "john@gmail.com"` (평문, @ 포함)

---

## 3️⃣ 검증 3: 감사 로그 적재

### 📋 테스트 시나리오

목록 API 1회 + 상세 API 1회 호출 후:

```sql
SELECT action, inquiry_ids, admin_email, created_at
FROM public.admin_audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

### 🔍 코드 분석 결과

**목록 API** (`app/api/admin/inquiries/route.ts`):

```typescript
// Line 154-172
logAdminAction({
  adminEmail: authResult.email || "unknown",
  adminUserId: authResult.userId,
  action: "LIST_INQUIRIES",
  inquiryIds,
  ipAddress: getIpFromRequest(request),
  userAgent: getUserAgentFromRequest(request),
  metadata: {
    limit,
    offset,
    status: statusFilter,
    treatment_type: treatmentTypeFilter,
    nationality: nationalityFilter,
    decrypt: false, // 항상 false (봉인)
  },
}).catch((err) => {
  console.error("[admin/inquiries] Audit log failed:", err.message);
});
```

**상세 API** (`app/api/admin/inquiries/[id]/route.ts`):

```typescript
// Line 190-204
logAdminAction({
  adminEmail: authResult.email || "unknown",
  adminUserId: authResult.userId,
  action: "VIEW_INQUIRY",
  inquiryIds: [inquiryId.toString()],
  ipAddress: getIpFromRequest(request),
  userAgent: getUserAgentFromRequest(request),
  metadata: {
    decrypt: shouldDecrypt,
    include_normalized: includeNormalized,
  },
}).catch((err) => {
  console.error(`[admin/inquiries/${inquiryId}] Audit log failed:`, err.message);
});
```

**감사 로그 함수** (`src/lib/audit/adminAuditLog.ts`):

```typescript
export async function logAdminAction(params: AdminAuditLogParams): Promise<string | null> {
  try {
    const safeMetadata = params.metadata ? sanitizeMetadata(params.metadata) : null;

    const { data, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        admin_email: params.adminEmail,
        admin_user_id: params.adminUserId,
        action: params.action,
        inquiry_ids: params.inquiryIds,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        metadata: safeMetadata,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[adminAuditLog] Failed to log:", error.message);
      return null;
    }

    return data.id;
  } catch (error: any) {
    console.error("[adminAuditLog] Exception:", error.message);
    return null;
  }
}
```

**metadata sanitize**:
```typescript
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> | null {
  const allowedKeys = [
    "limit", "offset", "page", "status", "treatment_type", 
    "nationality", "sort_by", "sort_order", "decrypt"
  ];
  
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(metadata)) {
    if (allowedKeys.includes(key)) {
      sanitized[key] = metadata[key];
    }
  }
  
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
```

### ✅ 판정: **PASS** (코드 레벨)

**근거**:
- ✅ `logAdminAction()` 호출 확인 (목록/상세 모두)
- ✅ `action` 구분: `LIST_INQUIRIES` / `VIEW_INQUIRY`
- ✅ `inquiry_ids` 배열로 기록
- ✅ `metadata`에 PII 없음 (`sanitizeMetadata()` 필터링)
- ✅ 에러 시 조용히 실패 (메인 로직 영향 없음)

**예상 DB 결과**:
```
| admin_email       | action          | inquiry_ids      | created_at          | metadata                         |
|-------------------|-----------------|------------------|---------------------|----------------------------------|
| admin@healo.com   | VIEW_INQUIRY    | [123]            | 2026-01-30 10:05:00 | {"decrypt": true}                |
| admin@healo.com   | LIST_INQUIRIES  | [123, 124, 125]  | 2026-01-30 10:04:00 | {"limit": 5, "decrypt": false}   |
```

### ⚠️ 잠재적 이슈

**DB 마이그레이션 미실행 시**:
- 테이블 없음: `admin_audit_logs` does not exist
- Insert 실패 → catch 블록에서 조용히 처리
- 메인 API는 정상 작동 (로그만 실패)

**해결**: `migrations/20260129_add_admin_audit_logs.sql` 실행 필수

### 🧪 실제 테스트 방법

**Supabase Dashboard → SQL Editor**:

```sql
-- 1. 테이블 존재 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'admin_audit_logs';

-- 2. 최근 로그 확인
SELECT 
  admin_email,
  action,
  inquiry_ids,
  created_at,
  metadata
FROM admin_audit_logs
ORDER BY created_at DESC
LIMIT 10;

-- 3. PII 유출 확인 (실패해야 함)
SELECT * FROM admin_audit_logs
WHERE metadata::text LIKE '%@gmail.com%'
   OR metadata::text LIKE '%message%personal%';
-- 결과: 0 rows
```

**Expected**:
- ✅ 테이블 존재
- ✅ LIST/VIEW 로그 쌓임
- ✅ metadata에 필터 조건만 (평문 없음)

---

## 4️⃣ 검증 4: RLS 문의 생성 기능

### 📋 테스트 시나리오

일반 사용자가 Contact Form 작성 → Submit:

1. 브라우저에서 `http://localhost:3000` 접속
2. Contact Form 작성
3. Submit 버튼 클릭
4. 성공 메시지 확인
5. DB에 row 생성 확인

### 🔍 코드 분석 결과

**현재 구현** (`src/legacy-pages/InquiryPage.jsx`):

```javascript
// Line 152-174
const { data: insertedRow, error } = await supabase
  .from('inquiries')
  .insert([
    {
      first_name: formData.firstName || null,
      last_name: formData.lastName || null,
      email: formData.email || null,
      nationality: formData.nationality,
      spoken_language: formData.spokenLanguage,
      contact_method: formData.contactMethod || null,
      contact_id: formData.contactId || null,
      treatment_type: formData.treatmentType,
      preferred_date: preferredDateVal,
      preferred_date_flex: !!formData.preferredDateFlex,
      message: formData.message || null,
      attachment: attachmentPath,
      attachments: attachmentsList,
      intake: {},
      status: '대기중',
    },
  ])
  .select('id, public_token')
  .single();

if (error) throw error;
```

**RLS 정책** (`migrations/20260130_enable_rls_inquiries.sql`):

```sql
-- RLS 활성화
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- INSERT 차단
CREATE POLICY "Block all INSERT for public/anon"
ON public.inquiries
FOR INSERT
TO PUBLIC
WITH CHECK (false);  -- ❌ 모든 클라이언트 insert 차단
```

### ❌ 판정: **FAIL**

**근거**:
- ❌ 클라이언트가 `supabase.from('inquiries').insert()` 직접 호출
- ❌ anon_key 사용 → RLS 정책에 의해 차단됨
- ❌ `WITH CHECK (false)` → 무조건 실패

**예상 에러**:
```javascript
{
  error: {
    code: "42501",
    message: "new row violates row-level security policy for table \"inquiries\""
  }
}
```

**영향**:
- ❌ 사용자가 문의를 제출할 수 없음
- ❌ 서비스 핵심 기능 차단
- ❌ **비즈니스 크리티컬 이슈**

### 🔧 수정 방안 (2가지 옵션)

---

#### **옵션 A: 서버 API 경유 (추천) ⭐**

**장점**:
- ✅ 보안 최대화 (클라이언트 접근 완전 차단)
- ✅ 암호화/검증/로깅 중앙화
- ✅ Rate limiting 적용 가능

**단점**:
- ⚠️ 코드 리팩터링 필요 (중간 규모)

**구현**:

1. **신규 API 엔드포인트 생성**:

**`app/api/inquiries/create/route.ts`** (신규 파일):

```typescript
/**
 * healwith: 문의 생성 API (서버 전용)
 * 
 * 경로: /api/inquiries/create
 * 권한: 공개 (Rate limited)
 * 
 * 목적:
 * - 클라이언트에서 문의를 제출하면 서버에서 암호화 후 DB에 저장
 * - RLS 우회 (service_role_key 사용)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { encryptText } from "../../../../src/lib/security/encryptionV2";
import { checkRateLimit, getClientIp, RATE_LIMITS, getRateLimitHeaders } from "../../../../src/lib/rateLimit";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  
  const clientIp = getClientIp(request);
  
  // Rate limiting
  const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.INQUIRY);
  if (!rateLimitResult.allowed) {
    return Response.json(
      { ok: false, error: "rate_limit_exceeded" },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }
  
  try {
    const body = await request.json();
    
    // 필수 필드 검증
    if (!body.email || !body.treatmentType) {
      return Response.json(
        { ok: false, error: "missing_required_fields" },
        { status: 400 }
      );
    }
    
    // PII 암호화
    const encryptedEmail = await encryptText(body.email);
    const encryptedFirstName = body.firstName ? await encryptText(body.firstName) : null;
    const encryptedLastName = body.lastName ? await encryptText(body.lastName) : null;
    const encryptedMessage = body.message ? await encryptText(body.message) : null;
    const encryptedContactId = body.contactId ? await encryptText(body.contactId) : null;
    
    // DB insert (service_role - RLS 우회)
    const { data: insertedRow, error } = await supabaseAdmin
      .from("inquiries")
      .insert({
        first_name: encryptedFirstName,
        last_name: encryptedLastName,
        email: encryptedEmail,
        nationality: body.nationality,
        spoken_language: body.spokenLanguage,
        contact_method: body.contactMethod,
        contact_id: encryptedContactId,
        treatment_type: body.treatmentType,
        preferred_date: body.preferredDate,
        preferred_date_flex: body.preferredDateFlex,
        message: encryptedMessage,
        attachment: body.attachment,
        attachments: body.attachments,
        intake: {},
        status: "received",
      })
      .select("id, public_token")
      .single();
    
    if (error) {
      console.error("[api/inquiries/create] Insert error:", error.message);
      return Response.json(
        { ok: false, error: "insert_failed" },
        { status: 500 }
      );
    }
    
    return Response.json({
      ok: true,
      inquiryId: insertedRow.id,
      publicToken: insertedRow.public_token,
    });
  } catch (error: any) {
    console.error("[api/inquiries/create] Error:", error.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
```

2. **클라이언트 코드 수정**:

**`src/legacy-pages/InquiryPage.jsx`**:

```javascript
// Before (Line 152-174) - 삭제
const { data: insertedRow, error } = await supabase
  .from('inquiries')
  .insert([{...}])
  .select('id, public_token')
  .single();

// After - API 호출로 변경
const response = await fetch('/api/inquiries/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    nationality: formData.nationality,
    spokenLanguage: formData.spokenLanguage,
    contactMethod: formData.contactMethod,
    contactId: formData.contactId,
    treatmentType: formData.treatmentType,
    preferredDate: preferredDateVal,
    preferredDateFlex: !!formData.preferredDateFlex,
    message: formData.message,
    attachment: attachmentPath,
    attachments: attachmentsList,
  }),
});

const result = await response.json();

if (!result.ok) {
  throw new Error(result.error || 'Failed to create inquiry');
}

const inquiryId = result.inquiryId;
const publicToken = result.publicToken;
```

3. **RLS 정책 유지** (변경 없음):

```sql
-- INSERT 계속 차단 (서버 API만 허용)
CREATE POLICY "Block all INSERT for public/anon"
ON public.inquiries
FOR INSERT
TO PUBLIC
WITH CHECK (false);
```

---

#### **옵션 B: 제한적 RLS 허용**

**장점**:
- ✅ 코드 변경 최소화
- ✅ 빠른 적용 가능

**단점**:
- ⚠️ 보안 약화 (클라이언트 접근 허용)
- ⚠️ Rate limiting 적용 어려움
- ⚠️ 암호화 로직이 클라이언트에 노출

**구현**:

**RLS 정책 수정** (`migrations/20260130_enable_rls_inquiries.sql`):

```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Block all INSERT for public/anon" ON public.inquiries;

-- 제한적 INSERT 허용
CREATE POLICY "Allow INSERT for public with minimal data"
ON public.inquiries
FOR INSERT
TO PUBLIC
WITH CHECK (
  -- 필수 필드만 체크
  email IS NOT NULL
  AND treatment_type IS NOT NULL
  AND status = 'received'  -- 상태 강제
);

-- ⚠️ 주의: 이 방식은 클라이언트가 DB에 직접 접근 가능
-- ⚠️ 암호화 로직이 클라이언트 번들에 포함되어야 함
-- ⚠️ Rate limiting 불가
```

**클라이언트 코드** (변경 없음):

```javascript
// 기존 코드 유지
const { data: insertedRow, error } = await supabase
  .from('inquiries')
  .insert([{...}])
  .select('id, public_token')
  .single();
```

---

### 🎯 권장 사항: **옵션 A (서버 API 경유)**

**이유**:
1. **보안 최대화**: 클라이언트 접근 완전 차단
2. **중앙화**: 암호화/검증/로깅 한 곳에서 관리
3. **확장성**: Rate limiting, 스팸 방지, 감사 로그 추가 용이
4. **일관성**: 기존 `/api/inquiries/intake` 패턴과 동일

**리팩터링 규모**: 중간 (2시간 이내)

---

### 🧪 실제 테스트 방법

**Before (RLS 적용 전)**:
```javascript
// 브라우저 Console
const { data, error } = await supabase.from('inquiries').insert({
  email: 'test@example.com',
  treatment_type: 'Hair Transplant',
  status: 'received'
});

console.log('Success:', data);  // ✅ 정상 insert
```

**After (RLS 적용 후)**:
```javascript
// 브라우저 Console
const { data, error } = await supabase.from('inquiries').insert({
  email: 'test@example.com',
  treatment_type: 'Hair Transplant',
  status: 'received'
});

console.log('Error:', error);
// ❌ { code: "42501", message: "new row violates row-level security policy" }
```

**수정 후 (서버 API 경유)**:
```javascript
// 브라우저 Console
const res = await fetch('/api/inquiries/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    treatmentType: 'Hair Transplant',
  }),
});

const result = await res.json();
console.log('Success:', result);  // ✅ { ok: true, inquiryId: 123, publicToken: "..." }
```

---

## 📋 검증 체크리스트

### ✅ PASS 항목

- [x] **decrypt 봉인**: 코드 레벨 확인 완료
  - `shouldDecrypt = false` 고정
  - 복호화 로직 제거
  - 마스킹 함수 항상 호출
  
- [x] **상세 복호화**: 코드 레벨 확인 완료
  - `shouldDecrypt = true` (기본값)
  - `decryptInquiryForAdmin()` 호출
  - fail-safe 처리
  
- [x] **감사 로그**: 코드 레벨 확인 완료
  - LIST/VIEW 액션 구분
  - metadata sanitize
  - 백그라운드 실행

### ❌ FAIL 항목

- [ ] **RLS 문의 생성**: 클라이언트 직접 insert 차단됨
  - 원인: `src/legacy-pages/InquiryPage.jsx` Line 152-174
  - 영향: 사용자가 문의를 제출할 수 없음
  - 수정: 옵션 A (서버 API 경유) 권장

---

## 🔧 즉시 수정 필요 항목

### 🚨 Priority 1: RLS 문의 생성 (CRITICAL)

**현재 상태**: ❌ FAIL  
**영향도**: 비즈니스 크리티컬 (서비스 핵심 기능 차단)  
**예상 소요**: 2시간

**수정 파일**:
1. ✅ `app/api/inquiries/create/route.ts` (신규 생성)
2. ✅ `src/legacy-pages/InquiryPage.jsx` (API 호출로 변경)
3. ⚠️ `migrations/20260130_enable_rls_inquiries.sql` (변경 없음 - 그대로 유지)

**수정 후 검증**:
```bash
# 1. 브라우저에서 Contact Form 제출
# 2. 성공 메시지 확인
# 3. DB 확인
SELECT id, email, status, created_at 
FROM inquiries 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## 📊 최종 판정

| 항목 | 상태 | 우선순위 | 예상 소요 |
|------|------|----------|-----------|
| decrypt 봉인 | ✅ PASS | - | - |
| 상세 복호화 | ✅ PASS | - | - |
| 감사 로그 | ✅ PASS | - | - |
| RLS 문의 생성 | ❌ FAIL | P1 (CRITICAL) | 2시간 |

---

## 🚦 Go/No-Go 판정

### ❌ **NO-GO**

**이유**: 
- **문의 생성 기능이 차단되어 서비스 핵심 기능 사용 불가**
- RLS 적용 후 클라이언트 직접 insert가 차단됨
- 사용자가 문의를 제출할 수 없는 상태

**다음 단계 진행 조건**:
1. ✅ `/api/inquiries/create` 엔드포인트 생성
2. ✅ `InquiryPage.jsx`에서 API 호출로 변경
3. ✅ 문의 생성 플로우 테스트 성공
4. ✅ DB에 row 생성 확인

**수정 완료 후**: ✅ **GO** (다음 단계 진행 가능)

---

## 📝 추가 권장 사항

### 1. DB 마이그레이션 실행 순서

```sql
-- 순서 1: 감사 로그 테이블 (이미 완료?)
-- migrations/20260129_add_admin_audit_logs.sql

-- 순서 2: RLS 정책 (문의 생성 수정 후 실행)
-- migrations/20260130_enable_rls_inquiries.sql
```

**⚠️ 중요**: RLS 마이그레이션은 **문의 생성 API를 수정한 후에** 실행해야 합니다!

---

### 2. 환경변수 확인

**Vercel/로컬 모두 필요**:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ENCRYPTION_KEY_V1=...
ADMIN_EMAIL_ALLOWLIST=...
```

---

### 3. 테스트 시나리오 우선순위

**우선순위 1**: RLS 문의 생성
- Contact Form 제출
- DB row 생성 확인

**우선순위 2**: 감사 로그
- 목록/상세 조회
- DB 로그 확인

**우선순위 3**: decrypt 봉인
- `?decrypt=true` 파라미터 테스트
- 응답에 마스킹 확인

**우선순위 4**: 상세 복호화
- 상세보기 클릭
- 모달에 평문 확인

---

## 🎯 다음 작업

1. **`/api/inquiries/create` 엔드포인트 생성** (필수)
2. **`InquiryPage.jsx` 수정** (필수)
3. **로컬 테스트** (문의 생성 플로우)
4. **RLS 마이그레이션 실행** (테스트 성공 후)
5. **스모크 테스트 전체 수행** (`SECURITY_SMOKE_TEST.md`)

---

**검증 완료일**: 2026-01-30  
**검증자**: Cursor AI (Code Analysis)  
**다음 검증**: 수정 완료 후 실제 동작 테스트
