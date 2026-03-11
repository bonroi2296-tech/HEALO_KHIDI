# HEALO Admin 보안 고도화 완료

## 🎯 목표

기존 암호화/복호화 시스템을 **절대 깨지 않으면서** 보안·운영 안정성 강화

---

## ✅ 완료된 작업

### **작업 1: server-only 하드닝** ✅

**목적**: 암호화 관련 파일이 클라이언트 번들에 포함되지 않도록 강제

**변경 파일**:
- ✅ `src/lib/security/encryptionV2.ts`
- ✅ `src/lib/security/decryptForAdmin.ts`
- ✅ `src/lib/rag/supabaseAdmin.ts`

**변경 내용**:
```typescript
import "server-only";  // ← 최상단 추가
```

**효과**:
- 클라이언트 컴포넌트에서 import 시 **빌드 타임 에러** 발생
- 암호화 키가 브라우저에 노출될 위험 **완전 차단**
- 런타임 동작에는 영향 없음

---

### **작업 2: Admin Audit Log (감사 로그)** ✅

**목적**: 누가 언제 어떤 문의 데이터를 복호화된 상태로 조회했는지 추적

**신규 파일**:
1. ✅ `migrations/20260129_add_admin_audit_logs.sql` - DB 테이블
2. ✅ `src/lib/audit/adminAuditLog.ts` - 로깅 유틸리티

**테이블 스키마**:
```sql
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY,
    admin_user_id UUID,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,          -- 'LIST_INQUIRIES', 'VIEW_INQUIRY' 등
    inquiry_ids BIGINT[],          -- ✅ inquiry ID 배열 (bigint[], udt_name=_int8)
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,                -- 필터 조건 등 (평문 제외!)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**inquiry_ids 최종 타입**: `bigint[]` (Postgres: `_int8`)  
**검증**: `SELECT udt_name FROM information_schema.columns WHERE table_name='admin_audit_logs' AND column_name='inquiry_ids';`  
**예상 결과**: `_int8`

**보안 규칙**:
- ❌ email, message 등 환자 평문 저장 **절대 금지**
- ✅ inquiry_id만 기록 (bigint[] - 최종 타입)
- ❌ error stack에 평문 포함 **절대 금지**
- ✅ metadata는 sanitize 후 저장 (필터 조건만, whitelist 기반)

**로그 기록 위치**:
- ✅ `GET /api/admin/inquiries` - 목록 조회 시
- ✅ `GET /api/admin/inquiries/[id]` - 상세 조회 시

**로그 예시**:
```json
{
  "admin_email": "admin@healo.com",
  "action": "LIST_INQUIRIES",
  "inquiry_ids": [15, 16, 17],
  "metadata": {
    "limit": 200,
    "status": "received",
    "decrypt": false
  }
}
```

**✅ 최종 타입 검증**:
- `admin_audit_logs.inquiry_ids` = `BIGINT[]` (Postgres udt_name: `_int8`)
- `inquiries.id` = `BIGINT` (Postgres udt_name: `int8`)
- TypeScript: `inquiryIds: number[]` (서버에서 `toIntArray()` 헬퍼 사용)
- 검증 SQL: `SELECT udt_name FROM information_schema.columns WHERE table_name='admin_audit_logs' AND column_name='inquiry_ids';`
- 예상 결과: `_int8` ✅

---

### **작업 3: 목록은 마스킹, 상세만 복호화** ✅

**목적**: 대량 평문 노출 방지, 최소 접근 원칙 적용

**신규 파일**:
- ✅ `src/lib/security/maskPii.ts` - 마스킹 유틸리티

**마스킹 함수**:
```typescript
maskEmail("john@gmail.com")    → "j***@gmail.com"
maskName("John")                → "J***"
maskPhone("+82 10-1234-5678")   → "+82 10-****-5678"
maskMessage("I need help...")   → "I need help...***"
```

**API 변경**:

**GET /api/admin/inquiries (목록)**:
```typescript
// Before:
?decrypt=true  (기본값)

// After:
?decrypt=false (기본값) ← 🔒 보안 강화
→ 마스킹된 데이터 반환
```

**GET /api/admin/inquiries/[id] (상세)**:
```typescript
?decrypt=true  (기본값 유지)
→ 복호화된 데이터 반환
```

**프론트엔드 변경**:
- ✅ `src/AdminPage.jsx`
  - 목록 조회: `decrypt=false` (마스킹)
  - 추후 상세 조회 추가 시: `decrypt=true` 사용

---

### **작업 4: 로그 안전 처리** ✅

**목적**: 운영 로그에 PII가 섞일 가능성 차단

**변경 사항**:

**Before (위험)**:
```typescript
console.error(error);  // ❌ error 객체 전체 로깅 (PII 포함 가능)
```

**After (안전)**:
```typescript
console.error(error.message);  // ✅ 메시지만 로깅 (PII 제외)
```

**적용 파일**:
- ✅ `app/api/admin/inquiries/route.ts`
- ✅ `app/api/admin/inquiries/[id]/route.ts`
- ✅ `src/lib/security/decryptForAdmin.ts` (이미 안전)

**주요 변경 예시**:
```typescript
// 복호화 실패 catch 블록
catch (decryptError: any) {
  console.error("Decryption failed:", decryptError.message); // ✅ 안전
  // console.error("Decryption failed:", decryptError); ❌ 위험
}
```

---

## 📦 수정/추가된 파일 목록

### **신규 파일 (4개)**:
1. ✅ `migrations/20260129_add_admin_audit_logs.sql` - 감사 로그 테이블
2. ✅ `src/lib/audit/adminAuditLog.ts` - 감사 로깅 유틸리티
3. ✅ `src/lib/security/maskPii.ts` - PII 마스킹 함수
4. ✅ `SECURITY_HARDENING_COMPLETE.md` - 이 문서

### **수정 파일 (6개)**:
1. ✅ `src/lib/security/encryptionV2.ts` - `import "server-only"` 추가
2. ✅ `src/lib/security/decryptForAdmin.ts` - `import "server-only"` 추가
3. ✅ `src/lib/rag/supabaseAdmin.ts` - `import "server-only"` 추가
4. ✅ `app/api/admin/inquiries/route.ts` - 마스킹 + 감사 로그 + 안전 로깅
5. ✅ `app/api/admin/inquiries/[id]/route.ts` - 감사 로그 + 안전 로깅
6. ✅ `src/AdminPage.jsx` - `decrypt=false`로 변경
7. ✅ `package.json` - `server-only` 패키지 추가

---

## 🔒 보안 원칙 준수 확인

### ✅ **절대 금지 사항 준수**:

| 규칙 | 준수 여부 |
|------|----------|
| ❌ 프론트엔드에서 복호화 로직 추가 금지 | ✅ 준수 |
| ❌ 암호화 키를 클라이언트로 노출 금지 | ✅ 준수 (`server-only`) |
| ❌ AdminPage에서 DB 직접 조회 금지 | ✅ 준수 (fallback 제거) |
| ❌ 평문을 로그·DB·RAG에 저장 금지 | ✅ 준수 |
| ❌ 기존 암호화/복호화 흐름 변경 금지 | ✅ 준수 |

---

## 🧪 테스트 시나리오

### **1. server-only 동작 확인**:

**테스트**: 클라이언트 컴포넌트에서 암호화 함수 import 시도
```typescript
// src/components.jsx (클라이언트 컴포넌트)
import { encryptText } from './lib/security/encryptionV2';  // ❌ 빌드 에러!
```

**Expected**:
```
Error: You're importing a component that needs "server-only".
That only works in a Server Component but one of its parents is marked with "use client".
```

---

### **2. 마스킹 동작 확인**:

**API 호출**:
```bash
GET /api/admin/inquiries?limit=5&decrypt=false
```

**Expected Response**:
```json
{
  "ok": true,
  "inquiries": [
    {
      "email": "j***@gmail.com",      // ✅ 마스킹
      "first_name": "J***",            // ✅ 마스킹
      "message": "I need help...***"   // ✅ 마스킹
    }
  ],
  "masked": true,
  "decrypted": false
}
```

---

### **3. 복호화 동작 확인 (상세)**:

**API 호출**:
```bash
GET /api/admin/inquiries/123?decrypt=true
```

**Expected Response**:
```json
{
  "ok": true,
  "inquiry": {
    "email": "john@gmail.com",        // ✅ 평문
    "first_name": "John",             // ✅ 평문
    "message": "I need help with..."  // ✅ 평문
  },
  "decrypted": true
}
```

---

### **4. 감사 로그 확인**:

**Supabase Dashboard**:
```sql
SELECT * FROM admin_audit_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected**:
```
| admin_email       | action          | inquiry_ids      | created_at |
|-------------------|-----------------|------------------|------------|
| admin@healo.com   | LIST_INQUIRIES  | [uuid1, uuid2]   | 2026-01-29 |
| admin@healo.com   | VIEW_INQUIRY    | [uuid3]          | 2026-01-29 |
```

---

### **5. 로그 안전성 확인**:

**서버 로그에서**:
```bash
✅ 안전:
[admin/inquiries] Decryption failed: Invalid key length

❌ 위험 (발생하지 않음):
[admin/inquiries] Error: { email: "john@gmail.com", ... }
```

---

## 🚀 배포 가이드

### **1단계: DB 마이그레이션 실행**

**Supabase Dashboard**:
```
SQL Editor → New Query
→ migrations/20260129_add_admin_audit_logs.sql 내용 복사
→ Run
```

**확인**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'admin_audit_logs';
```

---

### **2단계: Vercel 환경변수 확인**

**필수 환경변수 5개**:
```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ ENCRYPTION_KEY_V1
✅ ADMIN_EMAIL_ALLOWLIST
```

**주의**: 환경변수 추가/수정 후 **Redeploy** 필수!

---

### **3단계: 로컬 테스트**

```bash
# 개발 서버 재시작
npm run dev

# 브라우저 접속
http://localhost:3000/admin
```

**확인사항**:
- [ ] 로그인 정상 작동
- [ ] 문의 목록 표시 (마스킹된 값)
- [ ] 콘솔에 에러 없음
- [ ] 서버 로그에 평문 없음

---

### **4단계: Vercel 배포**

**방법 1: Git Push (자동 배포)**:
```bash
git add .
git commit -m "Security hardening: server-only + audit logs + masking"
git push origin main
```

**방법 2: Vercel Dashboard**:
```
Deployments → Redeploy
```

---

## 📊 API 변경 사항

### **GET /api/admin/inquiries (목록)**

**Before**:
```
?decrypt=true  (기본값)
→ 모든 inquiries 복호화
→ 대량 평문 노출
```

**After**:
```
?decrypt=false (기본값) ← 🔒 보안 강화
→ 마스킹된 값 반환
→ 최소 접근 원칙
```

**Response 추가 필드**:
```json
{
  "masked": true,    // ← 새로 추가
  "decrypted": false
}
```

---

### **GET /api/admin/inquiries/[id] (상세)**

**변경 없음**:
```
?decrypt=true  (기본값)
→ 단건 복호화
→ 상세 조회 시에만 평문 노출
```

**감사 로그 추가**:
- 조회 시마다 `admin_audit_logs` 테이블에 기록

---

## 🔐 보안 강화 포인트

### **1. server-only 강제**

```typescript
// ❌ 클라이언트 컴포넌트에서 시도
import { encryptText } from '@/lib/security/encryptionV2';

// 💥 빌드 에러!
Error: You're importing a component that needs "server-only".
```

→ **암호화 키가 브라우저 번들에 포함될 위험 완전 차단**

---

### **2. 감사 로그**

```typescript
// 모든 관리자 조회를 추적
{
  "admin_email": "admin@healo.com",
  "action": "VIEW_INQUIRY",
  "inquiry_ids": ["123"],
  "ip_address": "203.0.113.1",
  "created_at": "2026-01-29T10:00:00Z"
}
```

→ **보안 사고 발생 시 추적 가능**

---

### **3. 최소 접근 원칙**

```
목록 조회: 마스킹된 값만 (j***@gmail.com)
상세 조회: 평문 (john@gmail.com)
```

→ **대량 평문 노출 방지**

---

### **4. 안전한 에러 로깅**

```typescript
// Before (위험):
console.error(error);  // ❌ PII 포함 가능

// After (안전):
console.error(error.message);  // ✅ 메시지만
```

→ **Sentry 등 로그 시스템에 PII 유출 방지**

---

## 🧪 테스트 가이드

### **A. 로컬 환경 테스트**

**1. DB 마이그레이션**:
```sql
-- Supabase Dashboard에서 실행
-- migrations/20260129_add_admin_audit_logs.sql
```

**2. 개발 서버 재시작**:
```bash
npm run dev
```

**3. 브라우저 테스트**:
```
http://localhost:3000/admin
→ 로그인
→ 고객 문의 탭
→ 마스킹된 값 표시 확인
```

**4. API 직접 테스트**:
```bash
# 콘솔에서
const token = (await supabase.auth.getSession()).data.session.access_token;

fetch('/api/admin/inquiries?limit=5&decrypt=false', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

**Expected**:
```json
{
  "ok": true,
  "inquiries": [
    { "email": "j***@gmail.com" }
  ],
  "masked": true
}
```

---

### **B. 프로덕션 환경 테스트**

**1. Vercel 환경변수 확인**:
```
https://vercel.com/dashboard
→ Settings → Environment Variables
→ 5개 모두 있는지 확인
```

**2. Redeploy**:
```
Deployments → Redeploy
```

**3. 배포 완료 후 (5분)**:
```
https://healo-nu.vercel.app/admin
→ 로그인
→ 고객 문의 탭
→ 마스킹된 값 표시 확인
```

**4. 감사 로그 확인**:
```sql
-- Supabase Dashboard
SELECT * FROM admin_audit_logs 
ORDER BY created_at DESC;
```

---

## 🎯 핵심 원칙 (불변)

### HEALO 보안 3원칙:

```
1️⃣ DB에는 항상 암호화
2️⃣ 관리자만 서버에서 복호화
3️⃣ 프론트는 결과만 소비
```

**이 원칙을 어기는 코드는 무조건 실패!**

---

## 📚 관련 문서

- `ADMIN_DECRYPTION_SUMMARY.md` - 기존 복호화 시스템 설명
- `ENCRYPTION_GUIDE.md` - 암호화 가이드
- `OPERATIONAL_DASHBOARD_GUIDE.md` - 운영 가이드

---

## 🚨 주의사항

### **1. AdminPage fallback 제거**

**Before**:
```javascript
} catch (error) {
  // fallback: DB 직접 조회 (암호화된 데이터)
  const { data } = await supabase.from('inquiries').select('*');
  setInquiries(data);  // ❌ 암호문 표시
}
```

**After**:
```javascript
} catch (error) {
  alert('문의 로딩 실패');
  setInquiries([]);  // ✅ 빈 배열
}
```

→ **API 실패 시 암호문 대신 에러 표시**

---

### **2. 감사 로그는 백그라운드 실행**

```typescript
// 메인 로직 블로킹 방지
logAdminAction({...}).catch(err => {
  console.error("Audit log failed:", err.message);
});
```

→ **로깅 실패해도 메인 기능은 정상 작동**

---

### **3. metadata 자동 sanitize**

```typescript
// PII 키는 자동으로 필터링
sanitizeMetadata({
  limit: 10,           // ✅ 허용
  email: "john@...",   // ❌ 자동 제거
});
```

→ **실수로 PII가 로그에 저장될 위험 차단**

---

## 🎉 완료!

### **보안 강화 결과**:

| 항목 | Before | After |
|------|--------|-------|
| 클라이언트 번들 보호 | ⚠️ 수동 확인 | ✅ 자동 차단 |
| 조회 추적 | ❌ 없음 | ✅ 감사 로그 |
| 대량 평문 노출 | ⚠️ 목록도 복호화 | ✅ 목록은 마스킹 |
| 로그 PII 유출 | ⚠️ error 객체 | ✅ message만 |

---

**작성일**: 2026-01-29  
**작업자**: Cursor AI  
**상태**: ✅ 완료 (DB 마이그레이션 대기)
