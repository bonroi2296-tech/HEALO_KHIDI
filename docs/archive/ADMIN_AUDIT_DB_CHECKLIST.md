# HEALO Admin Audit DB 검증 체크리스트

**작성일**: 2026-01-30  
**목적**: `admin_audit_logs.inquiry_ids`를 INT4[]로 변경 후 UUID 관련 잔재 확인

---

## 📋 작업 맥락 요약

### 오늘 수행한 주요 작업

**Phase 2 보안 강화 완료 후 발생한 이슈들을 해결:**

1. **Next.js 15 Params Promise 이슈 수정**
   - `/api/admin/inquiries/[id]`에서 `params is a Promise` 에러 발생
   - Next.js 15부터 route handler params가 Promise로 변경됨
   - 해결: `context: { params: Promise<{ id: string }> }` + `await context.params`

2. **Audit Log 타입 에러 수정 및 최종 고정**
   - 서버 로그: `invalid input syntax for type uuid: "15"`
   - 원인: `admin_audit_logs.inquiry_ids`가 UUID[]로 설계되었으나, `inquiries.id`는 integer
   - 해결:
     - Migration: `inquiry_ids UUID[]` → `INT4[]` → **`BIGINT[]` (최종)**
     - TypeScript: `inquiryIds: string[]` → `number[]`
     - 안전한 `toIntArray()` 헬퍼 함수 추가
     - 모든 호출부 수정 (number[] 전달)

3. **이메일 검증 강화**
   - `includes('@')` → 정규식 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
   - API 레벨 + 클라이언트 레벨 동시 적용

4. **Normalize API 수정**
   - RAG 시스템을 위해 필수
   - DB 함수(`encrypt_text`) → Node.js crypto 직접 사용
   - `encryptionV2.ts`로 통일

**현재 상태**: `inquiry_ids = BIGINT[]` (udt_name = `_int8`) 최종 고정

---

## 🔍 DB 검증 SQL 세트

아래 SQL들을 **Supabase SQL Editor**에서 순서대로 실행하세요.  
**모든 결과가 0 rows이면 "UUID 잔재 없음"으로 판정됩니다.**

---

### 1️⃣ admin_audit_logs.inquiry_ids 컬럼 타입 확인

**목적**: 타입이 BIGINT[]로 최종 고정되었는지 확인

```sql
-- admin_audit_logs.inquiry_ids 컬럼 타입 확인
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    udt_name,
    CASE 
        WHEN udt_name = '_int8' THEN '✅ 올바름 (BIGINT[])'
        WHEN udt_name = '_int4' THEN '⚠️ 구버전 (INT4[]) - BIGINT[] 마이그레이션 필요'
        WHEN udt_name = '_uuid' THEN '❌ UUID[] - 즉시 수정 필요'
        ELSE '⚠️ 예상치 못한 타입: ' || udt_name
    END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_audit_logs'
  AND column_name = 'inquiry_ids';

-- 예상 결과:
-- | column_name  | data_type | udt_name | status              |
-- |--------------|-----------|----------|---------------------|
-- | inquiry_ids  | ARRAY     | _int8    | ✅ 올바름 (BIGINT[]) |
--
-- ❌ 만약 udt_name이 '_int4'이면 20260130_harden_audit_inquiry_ids_to_bigint_array.sql 실행
-- ❌ 만약 udt_name이 '_uuid'이면 모든 마이그레이션 재실행
```

---

### 2️⃣ inquiries 테이블의 id 컬럼 타입 확인

**목적**: inquiries.id가 bigint(INT8)인지 확인

```sql
-- inquiries.id 컬럼 타입 확인
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    udt_name,
    CASE 
        WHEN udt_name = 'int8' THEN '✅ 올바름 (bigint/INT8)'
        WHEN udt_name = 'int4' THEN '⚠️ integer/INT4 (동작하지만 bigint 권장)'
        WHEN udt_name = 'uuid' THEN '❌ UUID (예상과 다름)'
        ELSE '⚠️ 예상치 못한 타입: ' || udt_name
    END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inquiries'
  AND column_name = 'id';

-- 예상 결과:
-- | column_name | data_type | udt_name | status                  |
-- |-------------|-----------|----------|-------------------------|
-- | id          | bigint    | int8     | ✅ 올바름 (bigint/INT8)  |
--
-- 참고: inquiries.id는 bigserial 또는 bigint 타입
```

---

### 3️⃣ 최근 audit log 데이터 샘플 확인

**목적**: 실제 데이터가 bigint array로 저장되는지 확인

```sql
-- 최근 audit log 5건 확인
SELECT 
    id,
    action,
    inquiry_ids,
    pg_typeof(inquiry_ids) AS inquiry_ids_type,
    admin_email,
    created_at,
    CASE
        WHEN pg_typeof(inquiry_ids)::text = 'bigint[]' THEN '✅ 올바른 타입 (BIGINT[])'
        WHEN pg_typeof(inquiry_ids)::text = 'integer[]' THEN '⚠️ 구버전 (INT4[]) - 마이그레이션 필요'
        WHEN pg_typeof(inquiry_ids)::text = 'uuid[]' THEN '❌ UUID[] - 즉시 수정 필요'
        WHEN inquiry_ids IS NULL THEN '⚠️ NULL'
        ELSE '⚠️ 예상치 못한 타입: ' || pg_typeof(inquiry_ids)::text
    END AS status
FROM public.admin_audit_logs
ORDER BY created_at DESC
LIMIT 5;

-- 예상 결과:
-- | action         | inquiry_ids | inquiry_ids_type | status                    |
-- |----------------|-------------|------------------|---------------------------|
-- | VIEW_INQUIRY   | {15}        | bigint[]         | ✅ 올바른 타입 (BIGINT[])  |
-- | LIST_INQUIRIES | {13,14,15}  | bigint[]         | ✅ 올바른 타입 (BIGINT[])  |
--
-- ❌ 만약 inquiry_ids_type이 integer[]이면:
--    - 20260130_harden_audit_inquiry_ids_to_bigint_array.sql 실행
-- ❌ 만약 inquiry_ids_type이 uuid[]이면:
--    - 모든 마이그레이션 재실행 필요
```

---

## 📊 검증 결과 해석

### ✅ 모든 체크 통과 기준

1. **1️⃣**: `udt_name = '_int8'` ✅
2. **2️⃣**: `udt_name = 'int8'` ✅
3. **3️⃣**: `pg_typeof = 'bigint[]'` ✅
4. **통합 UUID 잔재 검사**: 0 rows ✅

### ❌ 문제 발견 시 조치

| 체크 | 문제 | 조치 |
|------|------|------|
| 1️⃣ | `udt_name = '_int4'` | `migrations/20260130_harden_audit_inquiry_ids_to_bigint_array.sql` 실행 |
| 1️⃣ | `udt_name = '_uuid'` | 모든 마이그레이션 재실행 |
| 2️⃣ | `udt_name = 'int4'` | 동작하지만 bigint 권장 |
| 3️⃣ | `pg_typeof = 'integer[]'` | BIGINT[] 마이그레이션 필요 |
| 3️⃣ | `pg_typeof = 'uuid[]'` | 즉시 모든 마이그레이션 재실행 |
| 통합 | 1+ rows | obj_name 확인 후 해당 객체 수정 |


---

## 📝 체크리스트 실행 로그

**실행자**: ___________  
**실행일**: ___________

| 체크 | 결과 | 비고 |
|------|------|------|
| 1️⃣ audit.inquiry_ids | ⬜ PASS / ⬜ FAIL | udt_name: _______ (목표: _int8) |
| 2️⃣ inquiries.id | ⬜ PASS / ⬜ FAIL | udt_name: _______ (목표: int8) |
| 3️⃣ 실제 데이터 | ⬜ PASS / ⬜ FAIL | pg_typeof: _______ (목표: bigint[]) |
| 통합 UUID 잔재 | ⬜ PASS / ⬜ FAIL | rows: _______ (목표: 0) |

**종합 결과**: ⬜ 모든 체크 통과 (BIGINT[]) / ⬜ 조치 필요

---

## 🎯 다음 단계

### ✅ 모든 체크 통과 시
- 작업 완료
- 로컬 테스트 진행
- Vercel 배포

### ❌ 문제 발견 시
1. 위 "문제 발견 시 조치" 테이블 참고
2. 필요한 마이그레이션/수정 실행
3. 다시 체크리스트 실행
4. 모두 통과할 때까지 반복

---

---

## 🔍 통합 UUID 잔재 검사 쿼리 (1개로 통합)

**목적**: admin_audit_logs 관련 모든 객체(뷰/정책/트리거/프로시저)에서 'uuid' 또는 'uuid[]' 문자열 검색

```sql
-- admin_audit_logs 관련 객체에서 UUID 타입 사용 여부 확인 (통합)
-- 예상: 0 rows (UUID 잔재 없음)

-- 1. RLS 정책
SELECT 
    'POLICY' AS obj_type,
    schemaname AS schema_name,
    policyname AS obj_name,
    definition AS hit_text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'admin_audit_logs'
  AND (definition ILIKE '%uuid%' OR definition ILIKE '%uuid[]%')

UNION ALL

-- 2. 뷰
SELECT 
    'VIEW' AS obj_type,
    schemaname AS schema_name,
    viewname AS obj_name,
    definition AS hit_text
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%admin_audit_logs%'
  AND (definition ILIKE '%uuid%' OR definition ILIKE '%uuid[]%')

UNION ALL

-- 3. 트리거
SELECT 
    'TRIGGER' AS obj_type,
    'public' AS schema_name,
    t.tgname AS obj_name,
    pg_get_triggerdef(t.oid) AS hit_text
FROM pg_trigger t
WHERE t.tgrelid = 'public.admin_audit_logs'::regclass
  AND NOT t.tgisinternal
  AND (pg_get_triggerdef(t.oid) ILIKE '%uuid%' OR pg_get_triggerdef(t.oid) ILIKE '%uuid[]%')

UNION ALL

-- 4. 프로시저 (admin_audit 관련)
SELECT 
    'FUNCTION' AS obj_type,
    n.nspname AS schema_name,
    p.proname AS obj_name,
    prosrc AS hit_text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%audit%' OR prosrc ILIKE '%admin_audit_logs%')
  AND (prosrc ILIKE '%uuid%' OR prosrc ILIKE '%uuid[]%');

-- 결과 해석:
-- 0 rows → ✅ UUID 잔재 없음 (통과)
-- 1+ rows → ❌ obj_name/hit_text 확인하여 수정 필요
```

---

**작성자**: Cursor AI  
**문서 버전**: 2.0 (BIGINT[] 최종 버전)  
**관련 파일**:
- `migrations/20260129_add_admin_audit_logs.sql` (BIGINT[] 정의)
- `migrations/20260130_harden_audit_inquiry_ids_to_bigint_array.sql` (최종 마이그레이션)
- `src/lib/audit/adminAuditLog.ts` (number[] 사용)
- `app/api/admin/inquiries/[id]/route.ts`
- `app/api/admin/inquiries/route.ts`
