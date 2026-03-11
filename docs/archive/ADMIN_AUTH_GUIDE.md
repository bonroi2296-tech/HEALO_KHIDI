# ADMIN_AUTH_GUIDE.md

## 📋 목적

**관리자 계정을 추가/제거하여 관리자 API 접근 권한을 관리**

- `/api/admin/*` API 접근 권한 제어
- PII 복호화 권한 제어
- 관리자 대시보드 접근 권한 제어

---

## 🔐 권한 판정 기준

관리자 권한은 다음 중 **하나라도 만족**하면 부여됩니다 (OR 조건):

### 1. Supabase User Metadata에 `role="admin"` 설정 (권장)
```json
{
  "user_metadata": {
    "role": "admin"
  }
}
```

### 2. Supabase App Metadata에 `role="admin"` 설정
```json
{
  "app_metadata": {
    "role": "admin"
  }
}
```

### 3. 환경변수 `ADMIN_EMAIL_ALLOWLIST`에 이메일 포함
```.env.local
ADMIN_EMAIL_ALLOWLIST=admin@healo.com,manager@healo.com
```

---

## ✅ 방법 1: 스크립트로 관리자 role 설정 (권장)

### 1-1. 관리자 role 부여

```bash
npx tsx scripts/set-admin.ts --email you@domain.com --role admin
```

**출력 예시**:
```
🔐 HEALO 관리자 Role 설정 도구

✅ 유저 발견: you@domain.com (ID: abc123...)
✅ Role 업데이트 완료: you@domain.com → admin
   user_metadata.role: admin

✅ 완료!
```

---

### 1-2. 관리자 role 제거

```bash
npx tsx scripts/set-admin.ts --email you@domain.com --role none
```

**출력 예시**:
```
✅ Role 업데이트 완료: you@domain.com → none
   user_metadata.role: null (제거됨)
```

---

### 1-3. 현재 관리자 목록 확인

```bash
npx tsx scripts/set-admin.ts --list
```

**출력 예시**:
```
📋 관리자 목록

============================================================
✅ metadata.role="admin"인 유저 (2명):

  1. admin@healo.com (ID: abc123, source: user_metadata)
  2. manager@healo.com (ID: def456, source: user_metadata)

============================================================

📧 환경변수 ADMIN_EMAIL_ALLOWLIST (1명):

  1. admin@healo.com

============================================================
```

---

## ✅ 방법 2: Supabase Dashboard에서 설정

### 2-1. Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. **Authentication** → **Users** 메뉴

---

### 2-2. 유저 검색
1. 관리자로 만들 유저의 이메일 검색
2. 유저 클릭

---

### 2-3. User Metadata 수정
1. **User Metadata** 섹션에서 **Edit** 클릭
2. JSON 편집:
   ```json
   {
     "role": "admin"
   }
   ```
3. **Save** 클릭

**Before**:
```json
{}
```

**After**:
```json
{
  "role": "admin"
}
```

---

### 2-4. 확인
```bash
# 스크립트로 확인
npx tsx scripts/set-admin.ts --list
```

---

## ✅ 방법 3: SQL로 직접 설정 (고급)

### 3-1. Supabase SQL Editor 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. **SQL Editor** 메뉴

---

### 3-2. SQL 실행

#### 관리자 role 부여:
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'you@domain.com';
```

#### 관리자 role 제거:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'you@domain.com';
```

#### 현재 관리자 확인:
```sql
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as user_role,
  raw_app_meta_data->>'role' as app_role
FROM auth.users
WHERE 
  raw_user_meta_data->>'role' = 'admin'
  OR raw_app_meta_data->>'role' = 'admin';
```

---

## ✅ 방법 4: 환경변수 ADMIN_EMAIL_ALLOWLIST 사용

### 4-1. .env.local 수정

```.env.local
# 쉼표로 구분, 띄어쓰기 허용
ADMIN_EMAIL_ALLOWLIST=admin@healo.com,manager@healo.com,you@domain.com
```

---

### 4-2. 개발 서버 재시작

```bash
# 서버 중지 (Ctrl+C)
# 서버 재시작
npm run dev
```

---

### 4-3. 확인

```bash
curl -X GET "http://localhost:3000/api/admin/inquiries?limit=1" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

**Expected**:
- 200 OK
- `{ ok: true, inquiries: [...] }`

---

## 🧪 테스트

### 1. 관리자 계정으로 로그인
1. http://localhost:3000/login 접속
2. 관리자 계정으로 로그인

---

### 2. 관리자 API 호출
```bash
# 브라우저 콘솔에서
fetch("/api/admin/inquiries?limit=5&decrypt=true")
  .then(r => r.json())
  .then(data => console.log(data));
```

**Expected**:
```json
{
  "ok": true,
  "inquiries": [
    {
      "id": 1,
      "email": "patient@example.com",  // ✅ 복호화됨 (평문)
      "first_name": "John"
    }
  ],
  "decrypted": true
}
```

---

### 3. 비로그인 시도
```bash
# 새 브라우저 시크릿 모드에서
fetch("/api/admin/inquiries")
  .then(r => r.json())
  .then(data => console.log(data));
```

**Expected**:
```json
{
  "ok": false,
  "error": "unauthorized",
  "detail": "관리자 권한이 필요합니다"
}
```

---

## 🚨 문제 해결

### ❌ "unauthorized" 오류 발생

**원인**:
- 관리자 role이 설정되지 않음
- 환경변수 `ADMIN_EMAIL_ALLOWLIST`가 비어있음
- 로그인하지 않음

**해결**:

#### 1. 관리자 목록 확인
```bash
npx tsx scripts/set-admin.ts --list
```

#### 2. 현재 로그인한 유저 확인
```javascript
// 브라우저 콘솔에서
const { data } = await supabase.auth.getSession();
console.log(data.session?.user.email);
console.log(data.session?.user.user_metadata);
```

#### 3. role 설정
```bash
npx tsx scripts/set-admin.ts --email YOUR_EMAIL --role admin
```

#### 4. 로그아웃 후 재로그인
```javascript
// 브라우저 콘솔에서
await supabase.auth.signOut();
// 그런 다음 다시 로그인
```

---

### ❌ 스크립트 실행 시 "유저를 찾을 수 없습니다" 오류

**원인**:
- 해당 이메일로 가입하지 않음

**해결**:
1. 해당 이메일로 회원가입 먼저 진행
2. 가입 후 스크립트 재실행

```bash
npx tsx scripts/set-admin.ts --email you@domain.com --role admin
```

---

### ❌ 환경변수가 적용되지 않음

**원인**:
- 개발 서버를 재시작하지 않음

**해결**:
```bash
# 서버 중지 (Ctrl+C)
# 서버 재시작
npm run dev
```

---

## 📊 권한 체크 플로우

```
1. 클라이언트
   ↓ GET /api/admin/inquiries
   
2. API Route (checkAdminAuth)
   ↓ Supabase 세션 확인
   ↓ user.user_metadata.role === "admin"? → YES → ✅ 권한 부여
   ↓ NO
   ↓ user.app_metadata.role === "admin"? → YES → ✅ 권한 부여
   ↓ NO
   ↓ ADMIN_EMAIL_ALLOWLIST에 포함? → YES → ✅ 권한 부여
   ↓ NO
   ↓ 403 Unauthorized
```

---

## 🎯 권장 방법

### 개발 환경:
- **방법 4**: `ADMIN_EMAIL_ALLOWLIST` 사용
  - 간편하고 빠름
  - .env.local에 추가만 하면 됨

### 프로덕션 환경:
- **방법 1**: 스크립트로 `user_metadata.role` 설정
  - DB에 영구 저장
  - 환경변수 관리 불필요
  - 확장성 좋음

---

## 📝 체크리스트

### 신규 관리자 추가 시:

- [ ] 1. 해당 이메일로 회원가입 완료
- [ ] 2. 스크립트로 role 부여: `npx tsx scripts/set-admin.ts --email ... --role admin`
- [ ] 3. 관리자 목록 확인: `npx tsx scripts/set-admin.ts --list`
- [ ] 4. 해당 계정으로 로그인
- [ ] 5. 관리자 API 호출 테스트: `GET /api/admin/inquiries`
- [ ] 6. 평문 데이터가 보이는지 확인

---

### 관리자 제거 시:

- [ ] 1. 스크립트로 role 제거: `npx tsx scripts/set-admin.ts --email ... --role none`
- [ ] 2. 관리자 목록 확인: `npx tsx scripts/set-admin.ts --list`
- [ ] 3. 해당 계정으로 테스트: 403 Unauthorized 확인

---

## 🔒 보안 주의사항

### ✅ 반드시 지킬 것:
1. **관리자 이메일 신중히 관리**: 절대 공개하지 말 것
2. **환경변수 `.env.local`은 .gitignore에 포함**: Git에 커밋 금지
3. **프로덕션 환경변수는 Vercel/AWS에서만 관리**
4. **관리자 계정은 강력한 비밀번호 사용**
5. **불필요한 관리자 계정은 즉시 제거**

### ❌ 절대 하지 말 것:
1. `ADMIN_EMAIL_ALLOWLIST`를 코드에 하드코딩
2. 관리자 이메일을 공개 저장소에 푸시
3. 테스트 계정을 프로덕션에 남겨둠
4. 퇴사자 계정을 방치

---

## 🚀 프로덕션 배포 시

### 환경변수 설정 (Vercel):
1. Vercel Dashboard 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables**
4. 추가:
   ```
   ADMIN_EMAIL_ALLOWLIST=admin@company.com,manager@company.com
   ```
5. **Save**
6. 재배포

---

### 관리자 role 설정 (권장):
```bash
# 로컬에서 프로덕션 DB에 접근
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=prod_service_key \
npx tsx scripts/set-admin.ts --email admin@company.com --role admin
```

---

**이제 관리자 계정을 안전하게 관리할 수 있습니다!** 🔐✅
