# HEALO 보안 강화 구현 요약

## 완료된 작업

### 1. RLS (Row Level Security) 정책 ✅

**파일**: `migrations/20260125_security_rls_policies.sql`

- `inquiries`, `normalized_inquiries`, `human_touchpoints` 테이블에 RLS 활성화
- 클라이언트는 `inquiries`에 INSERT만 허용 (SELECT 금지)
- `normalized_inquiries`, `human_touchpoints`는 서버(service_role)만 접근 가능

### 2. Storage 보안 ✅

**파일**: 
- `app/api/attachments/sign/route.ts` (Signed URL API)
- `src/legacy-pages/InquiryPage.jsx` (수정)

- `attachments` 버킷을 private로 전환 필요 (수동 설정)
- 프론트엔드에서 public URL 저장 금지 → path만 저장
- 서버에서 signed URL 발급 (만료 5분)

### 3. 데이터 암호화 ✅

**파일**:
- `migrations/20260125_security_encryption_functions.sql` (pgcrypto 함수)
- `src/lib/security/encryption.ts` (TypeScript 유틸리티)
- `app/api/inquiry/normalize/route.ts` (수정)
- `app/api/chat/route.ts` (수정)

**암호화 적용 범위**:
- `normalized_inquiries.raw_message` → 암호화
- `normalized_inquiries.contact.email` → 암호화
- `normalized_inquiries.contact.messenger_handle` → 암호화
- `normalized_inquiries.contact.email_hash` → 검색용 해시

### 4. 데이터 분리 준비 (선택적) ✅

**파일**: `migrations/20260125_security_table_separation.sql`

- `inquiry_contacts` 테이블 (PII 분리)
- `inquiry_medical` 테이블 (의료 데이터 분리)
- `inquiries.public_token` 추가 (외부 노출용)

---

## 생성된 파일 목록

### 마이그레이션 SQL
1. `migrations/20260125_security_rls_policies.sql`
2. `migrations/20260125_security_encryption_functions.sql`
3. `migrations/20260125_security_table_separation.sql`

### 서버 코드
4. `src/lib/security/encryption.ts` - 암호화 유틸리티
5. `app/api/attachments/sign/route.ts` - Signed URL API

### 수정된 파일
6. `src/legacy-pages/InquiryPage.jsx` - attachment path만 저장
7. `app/api/inquiry/normalize/route.ts` - 암호화 적용
8. `app/api/chat/route.ts` - 암호화 적용
9. `.env.local.example` - SUPABASE_ENCRYPTION_KEY 추가

### 문서
10. `migrations/SECURITY_SETUP_GUIDE.md` - 설정 가이드
11. `migrations/SECURITY_IMPLEMENTATION_SUMMARY.md` - 이 문서

---

## 적용 순서

### 1단계: RLS 정책 적용

```sql
-- Supabase SQL Editor에서 실행
\i migrations/20260125_security_rls_policies.sql
```

### 2단계: 암호화 함수 생성

```sql
-- Supabase SQL Editor에서 실행
\i migrations/20260125_security_encryption_functions.sql
```

### 3단계: 환경변수 설정

```bash
# .env.local 또는 Supabase Dashboard > Settings > API > Environment Variables
SUPABASE_ENCRYPTION_KEY=your-32-character-minimum-random-string
```

**키 생성 방법**:
```bash
# 방법 1: openssl
openssl rand -hex 32

# 방법 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4단계: Storage 버킷 Private 전환

1. Supabase Dashboard > Storage > `attachments`
2. Settings > Public bucket: **OFF**

### 5단계: (선택) 데이터 분리 테이블 생성

```sql
-- 필요시에만 실행
\i migrations/20260125_security_table_separation.sql
```

---

## 검증 방법

### RLS 정책 확인

```sql
-- 정책 목록
select tablename, policyname, cmd, roles
from pg_policies
where tablename in ('inquiries', 'normalized_inquiries', 'human_touchpoints');
```

### 암호화 확인

```sql
-- 암호화된 데이터 확인 (base64 문자열)
select 
  id, 
  created_at,
  source_type,
  raw_message, -- 암호화된 값
  contact->>'email' as email_enc, -- 암호화된 값
  contact->>'email_hash' as email_hash -- 검색용 해시
from normalized_inquiries
order by created_at desc
limit 5;
```

### Storage 확인

```sql
-- path만 저장됨 (public URL 아님)
select id, attachment
from inquiries
where attachment is not null
limit 5;
```

---

## 주의사항

### 1. 기존 데이터

- **RLS**: 기존 데이터는 서버에서만 접근 가능 (클라이언트 접근 차단)
- **암호화**: 새로 생성되는 `normalized_inquiries` 레코드만 암호화됨
- **기존 레코드**: 평문으로 저장되어 있음 (필요시 마이그레이션)

### 2. 키 관리

- `SUPABASE_ENCRYPTION_KEY`는 서버 환경변수에서만 관리
- 키 분실 시 복호화 불가 (백업 필수)
- 키는 최소 32자 이상의 강력한 랜덤 문자열 권장

### 3. 복호화

- 암호화된 데이터는 **서버에서만** 복호화 가능
- `src/lib/security/encryption.ts`의 `decryptText()` 함수 사용
- 클라이언트에서는 복호화 불가

### 4. 호환성

- 기존 API 응답 구조 유지 (프론트엔드 변경 최소화)
- `inquiries` 테이블은 기존 구조 유지 (나중에 분리 테이블로 마이그레이션 가능)

---

## 다음 단계 (로드맵)

1. **기존 데이터 마이그레이션**: 평문 → 암호화
2. **inquiries 테이블 분리**: inquiry_contacts + inquiry_medical 사용
3. **감사 로그**: 접근/수정 이력 기록
4. **키 로테이션**: 주기적 키 변경 및 재암호화
5. **백업 암호화**: DB 백업 파일도 암호화

---

## 문제 해결

자세한 문제 해결 방법은 `migrations/SECURITY_SETUP_GUIDE.md` 참조.

### 일반적인 문제

1. **RLS 정책이 작동하지 않음**: RLS 활성화 확인
2. **암호화 실패**: 환경변수 및 pgcrypto extension 확인
3. **Signed URL 실패**: Storage 버킷 Private 설정 확인
