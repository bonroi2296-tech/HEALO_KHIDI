# db_query_failed 에러 수정

## 🚨 에러 증상

**브라우저 콘솔**:
```
[AdminPage] API failed: "db_query_failed" undefined
at fetchInquiries (src\AdminPage.jsx:190:17)
```

**API 응답**:
```json
{
  "ok": false,
  "error": "db_query_failed",
  "detail": "..."
}
```

---

## 🔍 근본 원인

### API 라우트에서 존재하지 않는 컬럼 조회

**`app/api/admin/inquiries/route.ts`**:
```typescript
.select(`
  id,
  public_token,
  email,
  contact_id,  // ❌ 이 컬럼이 DB에 없음!
  message,
  ...
`)
```

**실제 DB 스키마**:
- ❌ `contact_id` 컬럼 없음
- ✅ `contact_id_enc` 컬럼만 존재 (암호화된 버전)

**결과**: Supabase 쿼리 실패 → `db_query_failed` 에러

---

## ✅ 수정 내용

### `app/api/admin/inquiries/route.ts`

**Before** (라인 92-122):
```typescript
let query = supabaseAdmin
  .from("inquiries")
  .select(`
    id,
    public_token,
    email,
    contact_id,  // ❌ 제거
    message,
    first_name,
    ...
  `)
```

**After**:
```typescript
let query = supabaseAdmin
  .from("inquiries")
  .select(`
    id,
    public_token,
    email,
    message,     // ✅ contact_id 제거
    first_name,
    ...
  `)
```

---

## 📝 설명

### 왜 `contact_id`가 없나요?

**보안 설계**:
- PII 데이터는 암호화되어 저장
- `contact_id` → `contact_id_enc` (암호화)
- 평문은 DB에 저장하지 않음

**마이그레이션** (`20260125_security_table_separation.sql`):
```sql
contact_id_enc text null, -- 암호화된 contact_id (WhatsApp/LINE ID)
```

---

### 복호화는 어떻게 하나요?

**API 흐름**:
1. DB에서 암호화된 데이터 조회
2. `decryptInquiriesForAdmin()` 호출
3. 암호화된 필드를 평문으로 변환
4. 클라이언트에 반환

**코드** (`src/lib/security/decryptForAdmin.ts`):
```typescript
export async function decryptInquiriesForAdmin(inquiries) {
  return inquiries.map(inquiry => ({
    ...inquiry,
    email: decryptJsonOrText(inquiry.email),
    first_name: decryptJsonOrText(inquiry.first_name),
    // contact_id는 현재 사용 안 함
  }));
}
```

---

## 🧪 테스트

### 1. 로컬 확인

```bash
# 브라우저 새로고침
http://localhost:3000/admin
```

**Expected**:
- ✅ 에러 없음
- ✅ 문의 목록 표시
- ✅ 평문 이메일/이름

---

### 2. API 직접 테스트

```bash
# Bearer 토큰 가져오기
const { data } = await supabase.auth.getSession();
const token = data.session.access_token;

# API 호출
fetch('/api/admin/inquiries?limit=5', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

**Expected**:
```json
{
  "ok": true,
  "inquiries": [
    {
      "id": 1,
      "email": "patient@example.com",
      "first_name": "John"
    }
  ],
  "total": 100
}
```

---

## 🎯 체크리스트

- [x] `contact_id` 컬럼 제거
- [x] API 라우트 수정
- [ ] 브라우저 새로고침
- [ ] 에러 해결 확인
- [ ] 평문 표시 확인

---

## 📚 관련 파일

- `app/api/admin/inquiries/route.ts` - ✅ 수정됨
- `app/api/admin/inquiries/[id]/route.ts` - OK (`select("*")` 사용)
- `src/lib/security/decryptForAdmin.ts` - 복호화 로직
- `migrations/20260125_security_table_separation.sql` - DB 스키마

---

**수정 완료**: 2026-01-29  
**테스트**: 브라우저 새로고침 후 확인
