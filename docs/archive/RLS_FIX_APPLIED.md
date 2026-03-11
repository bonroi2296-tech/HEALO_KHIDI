# RLS 문의 생성 기능 수정 완료

**작성일**: 2026-01-30  
**이슈**: RLS 정책으로 인한 클라이언트 직접 insert 차단  
**해결**: 서버 API 경유로 변경

---

## 📋 수정 내용

### **문제점**

**Before**:
```javascript
// src/legacy-pages/InquiryPage.jsx (Line 152-176)
const { data: insertedRow, error } = await supabase
  .from('inquiries')
  .insert([{...}])  // ❌ RLS에 의해 차단됨
  .select('id, public_token')
  .single();
```

**RLS 정책**:
```sql
CREATE POLICY "Block all INSERT for public/anon"
ON public.inquiries
FOR INSERT
TO PUBLIC
WITH CHECK (false);  -- ❌ 모든 클라이언트 insert 차단
```

**영향**:
- ❌ 사용자가 문의를 제출할 수 없음
- ❌ 서비스 핵심 기능 차단
- ❌ 에러: `new row violates row-level security policy`

---

## ✅ 해결 방법

### **1. 신규 API 엔드포인트 생성**

**파일**: `app/api/inquiries/create/route.ts` (신규)

```typescript
export async function POST(request: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.INQUIRY);
  
  // 2. Body 파싱 및 검증
  if (!body.email || !body.treatmentType) {
    return Response.json({ ok: false, error: "missing_required_fields" }, { status: 400 });
  }
  
  // 3. PII 암호화
  const encryptedEmail = await encryptText(body.email);
  const encryptedFirstName = body.firstName ? await encryptText(body.firstName) : null;
  // ... 기타 필드 암호화
  
  // 4. DB insert (service_role - RLS 우회)
  const { data: insertedRow, error } = await supabaseAdmin
    .from("inquiries")
    .insert({
      first_name: encryptedFirstName,
      email: encryptedEmail,
      // ... 기타 필드
      status: "received",
    })
    .select("id, public_token")
    .single();
  
  // 5. 응답 반환
  return Response.json({
    ok: true,
    inquiryId: insertedRow.id,
    publicToken: insertedRow.public_token,
  });
}
```

**특징**:
- ✅ service_role_key 사용 → RLS 우회
- ✅ PII 암호화 중앙화
- ✅ Rate limiting 적용
- ✅ 운영 로그 기록

---

### **2. 클라이언트 코드 수정**

**파일**: `src/legacy-pages/InquiryPage.jsx`

**After**:
```javascript
// 🔒 RLS 보안: 서버 API 경유로 변경
const createResponse = await fetch('/api/inquiries/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: formData.firstName || null,
    lastName: formData.lastName || null,
    email: formData.email || null,
    nationality: formData.nationality,
    spokenLanguage: formData.spokenLanguage,
    contactMethod: formData.contactMethod || null,
    contactId: formData.contactId || null,
    treatmentType: formData.treatmentType,
    preferredDate: preferredDateVal,
    preferredDateFlex: !!formData.preferredDateFlex,
    message: formData.message || null,
    attachment: attachmentPath,
    attachments: attachmentsList,
  }),
});

const createResult = await createResponse.json();

if (!createResult.ok) {
  throw new Error(createResult.error || 'Failed to create inquiry');
}

const inquiryId = createResult.inquiryId;
const publicToken = createResult.publicToken;
```

---

### **3. RLS 정책 (변경 없음)**

**migrations/20260130_enable_rls_inquiries.sql**:

```sql
-- INSERT 차단 유지 (서버 API만 허용)
CREATE POLICY "Block all INSERT for public/anon"
ON public.inquiries
FOR INSERT
TO PUBLIC
WITH CHECK (false);

-- ✅ service_role은 RLS 우회 (supabaseAdmin)
```

---

## 📊 수정 효과

| 항목 | Before | After |
|------|--------|-------|
| 클라이언트 insert | ✅ 허용 (RLS 없음) | ❌ 차단 (RLS 적용) |
| 서버 API insert | ❌ 없음 | ✅ 허용 (service_role) |
| PII 암호화 | ⚠️ 클라이언트 | ✅ 서버 중앙화 |
| Rate limiting | ❌ 없음 | ✅ 적용 |
| 보안 | ⚠️ 낮음 | ✅ 높음 |

---

## 🧪 테스트 시나리오

### **1. 문의 생성 테스트**

```bash
# 브라우저에서 http://localhost:3000 접속
# Contact Form 작성:
# - First Name: Test
# - Last Name: User
# - Email: test@example.com
# - Treatment: Hair Transplant
# - Message: Test message
# Submit 클릭
```

**Expected**:
- ✅ "Success! We received your inquiry." 메시지
- ✅ Public token 화면 표시
- ✅ DB에 row 생성 (암호화된 상태)

---

### **2. DB 확인**

```sql
SELECT 
  id, 
  email, 
  status, 
  created_at 
FROM inquiries 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected**:
```
| id  | email              | status   | created_at          |
|-----|--------------------|----------|---------------------|
| 999 | {"v":"v1","iv":... | received | 2026-01-30 10:10:00 |
```

- ✅ `email`이 암호화된 JSON 형식
- ✅ `status`가 `received`

---

### **3. API 직접 테스트**

```bash
curl -X POST http://localhost:3000/api/inquiries/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "treatmentType": "Hair Transplant",
    "nationality": "USA",
    "spokenLanguage": "English"
  }'
```

**Expected**:
```json
{
  "ok": true,
  "inquiryId": 999,
  "publicToken": "abc123..."
}
```

---

### **4. Rate Limiting 테스트**

```bash
# 연속 10회 요청
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/inquiries/create \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","treatmentType":"Test"}'
done
```

**Expected**:
- 처음 몇 개: `200 OK`
- 이후: `429 Too Many Requests`

---

## 🔐 보안 강화 포인트

### **1. 클라이언트 접근 차단**

**Before**:
- 클라이언트가 DB에 직접 접근
- 암호화 로직이 브라우저에 노출
- 악의적 사용자가 임의 데이터 insert 가능

**After**:
- 클라이언트는 API만 호출 가능
- 서버에서 암호화/검증 수행
- RLS로 직접 접근 차단

---

### **2. PII 암호화 중앙화**

**Before**:
- 클라이언트에서 암호화 (?) 또는 평문 전송 (?)
- 암호화 키가 브라우저에 노출될 위험

**After**:
- 서버에서만 암호화 수행
- 암호화 키는 서버 환경변수에만 존재
- 클라이언트는 평문만 전송 (HTTPS)

---

### **3. Rate Limiting**

**Before**:
- 제한 없음
- 봇/도배 공격 가능

**After**:
- IP별 제한 (예: 10 requests / 10 minutes)
- 초과 시 429 에러

---

### **4. 운영 로그**

**Before**:
- 로그 없음

**After**:
- 문의 생성 성공/실패 로그
- 암호화 실패 로그
- Rate limit 초과 로그

---

## 📝 추가 수정 사항

### **필요 없음 (기존 동작 유지)**

다음 로직은 그대로 유지됩니다:

1. ✅ 첨부파일 업로드 (Supabase Storage)
2. ✅ normalize API 호출
3. ✅ Funnel 이벤트 트래킹
4. ✅ 성공 페이지 표시

---

## 🚀 배포 절차

### **1. 로컬 테스트** (필수)

```bash
# 개발 서버 재시작
npm run dev

# 브라우저에서 문의 제출 테스트
http://localhost:3000

# DB 확인
```

---

### **2. DB 마이그레이션** (필수)

**Supabase Dashboard → SQL Editor**:

```sql
-- 순서 1: 감사 로그 테이블 (이미 완료?)
-- migrations/20260129_add_admin_audit_logs.sql

-- 순서 2: RLS 정책 (지금 실행)
-- migrations/20260130_enable_rls_inquiries.sql
```

**⚠️ 중요**: 로컬 테스트 성공 후 마이그레이션 실행!

---

### **3. Vercel 배포**

```bash
# Git 커밋 (사용자 요청 시)
git add .
git commit -m "Fix: RLS inquiry creation via server API"
git push origin main

# Vercel 자동 배포 대기 (3-5분)
```

---

### **4. 프로덕션 테스트**

```bash
# 프로덕션에서 문의 제출
https://healo-nu.vercel.app

# DB 확인 (Supabase Dashboard)
SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 5;
```

---

## ⚠️ 롤백 계획

**문제 발생 시**:

```sql
-- RLS 비활성화 (임시)
ALTER TABLE public.inquiries DISABLE ROW LEVEL SECURITY;

-- 확인
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'inquiries';
-- relrowsecurity = false
```

**영구 수정**:
- `/api/inquiries/create` API 디버깅
- 환경변수 확인 (`ENCRYPTION_KEY_V1`)
- 로그 확인

---

## 🎯 완료 체크리스트

- [x] `/api/inquiries/create` 엔드포인트 생성
- [x] `InquiryPage.jsx` API 호출로 변경
- [x] Linter 에러 없음
- [ ] 로컬 테스트 성공
- [ ] RLS 마이그레이션 실행
- [ ] 프로덕션 배포
- [ ] 프로덕션 테스트

---

**수정 완료일**: 2026-01-30  
**수정자**: Cursor AI  
**상태**: ✅ 코드 수정 완료 (테스트 대기)
