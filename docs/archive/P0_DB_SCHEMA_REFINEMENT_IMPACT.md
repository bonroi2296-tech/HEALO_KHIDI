# P0 DB 스키마 고도화 - 코드 영향 분석

**작성일**: 2026-02-04  
**마이그레이션 파일**: `migrations/20260204_p0_db_schema_refinement.sql`

---

## 📋 변경 사항 요약

### 1. admin_audit_logs.inquiry_ids 최적화
- **변경**: 배열 길이 기반 인덱스 추가 (이미 bigint[]로 변경 완료)
- **영향**: 없음 (쿼리 성능 개선만)

### 2. ARRAY 타입 명확화 및 통일
- **변경**: 모든 ARRAY 컬럼을 `text[] NOT NULL DEFAULT '{}'`로 통일
- **대상 테이블**: `hospitals`, `treatments`, `normalized_inquiries`
- **영향**: 코드 수정 필요 (nullable 처리 제거)

### 3. inquiries.attachment DEPRECATED
- **변경**: `attachment` 컬럼을 deprecated로 표시
- **영향**: `attachments` (jsonb)만 사용하도록 코드 정리 필요

### 4. normalized_inquiries 마케팅 추적 컬럼 추가
- **변경**: `utm`, `landing_path`, `referrer`, `client_meta` 컬럼 추가
- **영향**: 신규 기능 구현 시 사용 (기존 코드 영향 없음)

---

## 🔍 영향받는 코드 파일 및 수정 포인트

### ✅ 1. admin_audit_logs.inquiry_ids (영향 없음)

**변경**: 인덱스 최적화만 (bigint[]는 이미 적용됨)

**영향받는 파일**: 없음

**검증 완료**:
- ✅ `src/lib/audit/adminAuditLog.ts` - `toIntArray()` 헬퍼 사용 중
- ✅ `app/api/admin/inquiries/route.ts` - `number[]`로 전달
- ✅ `app/api/admin/inquiries/[id]/route.ts` - `number[]`로 전달
- ✅ `app/admin/audit/_client/AdminAuditPage.jsx` - 배열로 표시

---

### ⚠️ 2. hospitals 테이블 ARRAY 컬럼 (수정 필요)

**변경**:
```sql
-- Before: tags, images, supported_languages, amenities (nullable)
-- After: text[] NOT NULL DEFAULT '{}'
```

#### 영향받는 파일 및 수정 포인트:

##### 📄 `app/api/admin/hospitals/route.ts`

**현재 코드** (POST 핸들러, 라인 191-196):
```typescript
tags: validatedData.tags || [],
images: validatedData.images || [],
supported_languages: validatedData.supported_languages || [],
amenities: validatedData.amenities || [],
```

**✅ 수정 불필요**: 이미 빈 배열 `[]` 기본값 사용 중

**현재 코드** (PATCH 핸들러, 라인 366-369):
```typescript
if (validatedData.tags !== undefined) payload.tags = validatedData.tags;
if (validatedData.images !== undefined) payload.images = validatedData.images;
if (validatedData.supported_languages !== undefined) payload.supported_languages = validatedData.supported_languages;
if (validatedData.amenities !== undefined) payload.amenities = validatedData.amenities;
```

**⚠️ 수정 권장**:
```typescript
// null이나 undefined를 빈 배열로 변환
if (validatedData.tags !== undefined) {
  payload.tags = validatedData.tags ?? [];
}
if (validatedData.images !== undefined) {
  payload.images = validatedData.images ?? [];
}
if (validatedData.supported_languages !== undefined) {
  payload.supported_languages = validatedData.supported_languages ?? [];
}
if (validatedData.amenities !== undefined) {
  payload.amenities = validatedData.amenities ?? [];
}
```

##### 📄 `src/lib/validation/admin.ts`

**현재 코드** (라인 25-28):
```typescript
tags: z.array(z.string()).optional().default([]),
images: z.array(z.string().url("이미지 URL이 유효하지 않습니다")).optional().default([]),
supported_languages: z.array(z.string()).optional().default([]),
amenities: z.array(z.string()).optional().default([]),
```

**✅ 수정 불필요**: Zod 스키마는 이미 기본값 `[]` 제공

##### 📄 프론트엔드 컴포넌트 (필요 시)

만약 프론트엔드에서 `null` 체크를 하고 있다면:
```javascript
// ❌ Before
if (hospital.tags && hospital.tags.length > 0) { ... }

// ✅ After (더 간결)
if (hospital.tags.length > 0) { ... }
```

---

### ⚠️ 3. treatments 테이블 ARRAY 컬럼 (수정 필요)

**변경**:
```sql
-- Before: tags, images, benefits (nullable)
-- After: text[] NOT NULL DEFAULT '{}'
```

#### 영향받는 파일 및 수정 포인트:

##### 📄 `app/api/admin/treatments/route.ts`

**현재 코드** (POST 핸들러, 라인 202-204):
```typescript
benefits: validatedData.benefits || [],
tags: validatedData.tags || [],
images: validatedData.images || [],
```

**✅ 수정 불필요**: 이미 빈 배열 기본값 사용 중

**현재 코드** (PATCH 핸들러, 라인 370-372):
```typescript
if (validatedData.benefits !== undefined) payload.benefits = validatedData.benefits;
if (validatedData.tags !== undefined) payload.tags = validatedData.tags;
if (validatedData.images !== undefined) payload.images = validatedData.images;
```

**⚠️ 수정 권장**:
```typescript
if (validatedData.benefits !== undefined) {
  payload.benefits = validatedData.benefits ?? [];
}
if (validatedData.tags !== undefined) {
  payload.tags = validatedData.tags ?? [];
}
if (validatedData.images !== undefined) {
  payload.images = validatedData.images ?? [];
}
```

##### 📄 `src/lib/validation/admin.ts`

**현재 코드** (라인 65-67):
```typescript
benefits: z.array(z.string()).optional().default([]),
tags: z.array(z.string()).optional().default([]),
images: z.array(z.string().url("이미지 URL이 유효하지 않습니다")).optional().default([]),
```

**✅ 수정 불필요**: Zod 스키마는 이미 기본값 `[]` 제공

---

### ⚠️ 4. inquiries.attachment DEPRECATED (수정 필요)

**변경**:
```sql
-- attachment 컬럼: [DEPRECATED] 표시
-- 애플리케이션 코드: attachments (jsonb)만 사용
```

#### 영향받는 파일 및 수정 포인트:

##### 📄 `app/api/inquiries/create/route.ts`

**현재 코드** (라인 124-125):
```typescript
attachment: body.attachment || null,
attachments: body.attachments || null,
```

**⚠️ 수정 필요**:
```typescript
// attachment 필드 제거, attachments만 사용
attachments: body.attachments || [], // ✅ 빈 배열 기본값
```

**📝 참고**: 프론트엔드에서 `attachment` 필드를 보내지 않도록 수정 필요

##### 📄 `app/api/attachments/sign/route.ts`

**현재 코드** (라인 64-65):
```typescript
.select("id, public_token, attachment, attachments")
```

**⚠️ 수정 필요**:
```typescript
// attachment SELECT 제거
.select("id, public_token, attachments")
```

**현재 코드** (라인 94):
```typescript
const ok = pathAuthorized(path, inquiryData.attachment ?? null, inquiryData.attachments ?? []);
```

**⚠️ 수정 필요**:
```typescript
// attachment 파라미터 제거
const ok = pathAuthorized(path, inquiryData.attachments ?? []);
```

##### 📄 `src/lib/security/attachmentAuth.ts`

**현재 코드** (라인 13-20):
```typescript
export function pathAuthorized(
  path: string,
  attachment: string | null,  // ⚠️ 제거 필요
  attachments: unknown
): boolean {
  if (attachment && String(attachment) === path) return true;  // ⚠️ 제거 필요
  const arr = Array.isArray(attachments) ? attachments : [];
  return arr.some((a: { path?: string }) => a?.path === path);
}
```

**⚠️ 수정 필요**:
```typescript
export function pathAuthorized(
  path: string,
  attachments: unknown
): boolean {
  const arr = Array.isArray(attachments) ? attachments : [];
  return arr.some((a: { path?: string }) => a?.path === path);
}
```

##### 📄 `src/lib/referral/buildReferralSummary.ts`

**현재 코드** (라인 58-90):
```typescript
async function buildAttachmentsList(
  attachment: string | null,  // ⚠️ 제거 필요
  attachments: unknown,
  inquiryId: number
): Promise<ReferralSummaryJson["attachments"]> {
  const paths: Array<{ path: string; name: string | null }> = [];
  if (attachment && typeof attachment === "string" && attachment.startsWith("inquiry/")) {
    paths.push({ path: attachment, name: null });  // ⚠️ 제거 필요
  }
  // ... attachments 처리는 유지
}
```

**⚠️ 수정 필요**:
```typescript
async function buildAttachmentsList(
  attachments: unknown,
  inquiryId: number
): Promise<ReferralSummaryJson["attachments"]> {
  const paths: Array<{ path: string; name: string | null }> = [];
  // attachment 처리 로직 제거
  if (Array.isArray(attachments)) {
    for (const item of attachments) {
      if (item && typeof item === "object" && item.path && typeof item.path === "string") {
        paths.push({ path: item.path, name: item.name && typeof item.name === "string" ? item.name : null });
      }
    }
  }
  // ... 나머지 로직
}
```

**호출부 수정** (라인 128-140):
```typescript
// Before
const attachments = await buildAttachmentsList(
  inquiry?.attachment ?? null,  // ⚠️ 제거
  inquiry?.attachments ?? [],
  inquiryId
);

// After
const attachments = await buildAttachmentsList(
  inquiry?.attachments ?? [],
  inquiryId
);
```

그리고 SELECT 쿼리 수정 (라인 128-130):
```typescript
// Before
.select("attachment, attachments")

// After
.select("attachments")
```

##### 📄 `app/api/admin/inquiries/route.ts`

**현재 코드** (라인 91-92):
```typescript
// 🔒 보안: list API는 최소 필드만 SELECT (message/attachment 제외)
```

**✅ 수정 불필요**: 이미 attachment를 SELECT하지 않음

##### 📄 `app/api/admin/inquiries/[id]/route.ts`

**현재 코드** (라인 112):
```typescript
"attachment",
```

**⚠️ 수정 고려**:
```typescript
// attachment SELECT 제거 (deprecated)
// 또는 주석으로 표시
// "attachment", // DEPRECATED: use attachments instead
```

##### 📄 `app/api/inquiry/normalize/route.ts`

**현재 코드** (라인 98-99, 106-107):
```typescript
attachment?: string | null;
attachments?: unknown;
```

**⚠️ 수정 필요**:
```typescript
// attachment 제거
attachments?: unknown;
```

그리고 함수 내부 (라인 106-108):
```typescript
// Before
const att = row?.attachment ?? null;
const arr = Array.isArray(row?.attachments) ? row.attachments : [];
const hasAtt = !!att || arr.length > 0;

// After
const arr = Array.isArray(row?.attachments) ? row.attachments : [];
const hasAtt = arr.length > 0;
```

SELECT 쿼리 수정 (라인 220):
```typescript
// Before
"attachment, attachments, intake"

// After
"attachments, intake"
```

##### 📄 프론트엔드 컴포넌트 (필요 시)

Inquiry 생성 폼에서 `attachment` 필드 제거:
```javascript
// ❌ Before
const payload = {
  ...otherFields,
  attachment: fileUrl,  // 제거
  attachments: [{ path: fileUrl, name: fileName }]
};

// ✅ After
const payload = {
  ...otherFields,
  attachments: [{ path: fileUrl, name: fileName, type: fileType }]
};
```

---

### ✅ 5. normalized_inquiries: missing_fields 타입 명확화 (영향 최소)

**변경**:
```sql
-- Before: text[] (nullable, 기본값 없음)
-- After: text[] DEFAULT '{}' (nullable 유지)
```

**영향받는 파일**: 
- `20260124_add_rag_inquiry_tables.sql` (이미 `text[] null` 정의됨)

**✅ 수정 불필요**: 기존 `null` 허용 유지, 기본값만 추가

---

### ✅ 6. normalized_inquiries: 마케팅 추적 컬럼 추가 (영향 없음)

**변경**:
```sql
-- 신규 컬럼 추가: utm, landing_path, referrer, client_meta
```

**영향받는 파일**: 없음 (신규 기능)

#### 📝 향후 구현 가이드:

##### Inquiry 생성 시 UTM 파라미터 수집 예시:

```typescript
// app/api/inquiries/create/route.ts (향후 추가)
const utmParams = {
  source: searchParams.get('utm_source'),
  medium: searchParams.get('utm_medium'),
  campaign: searchParams.get('utm_campaign'),
  term: searchParams.get('utm_term'),
  content: searchParams.get('utm_content'),
};

const hasUtm = Object.values(utmParams).some(v => v !== null);

await supabaseAdmin.from('normalized_inquiries').insert({
  // ... other fields
  utm: hasUtm ? utmParams : null,
  landing_path: request.headers.get('referer') ? new URL(request.headers.get('referer')).pathname : null,
  referrer: request.headers.get('referer'),
  client_meta: {
    userAgent: request.headers.get('user-agent'),
    // device, browser 파싱 (optional)
  },
});
```

##### 분석 쿼리 예시:

```sql
-- UTM 소스별 inquiry 분석
SELECT 
  utm->>'source' as utm_source,
  utm->>'campaign' as campaign,
  COUNT(*) as inquiry_count
FROM public.normalized_inquiries
WHERE utm IS NOT NULL
GROUP BY utm->>'source', utm->>'campaign'
ORDER BY inquiry_count DESC;

-- 랜딩 페이지별 전환율
SELECT 
  landing_path,
  COUNT(*) as visits,
  COUNT(CASE WHEN lead_quality = 'hot' THEN 1 END) as hot_leads
FROM public.normalized_inquiries
WHERE landing_path IS NOT NULL
GROUP BY landing_path
ORDER BY visits DESC;
```

---

## 🧪 마이그레이션 실행 및 검증

### 1. 마이그레이션 실행

**Supabase Dashboard → SQL Editor**에서:
```sql
-- 파일 내용을 복사해서 실행
-- 또는 Supabase CLI 사용
-- supabase migration run 20260204_p0_db_schema_refinement.sql
```

### 2. 타입 검증 쿼리

```sql
-- hospitals ARRAY 컬럼 확인
SELECT column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'hospitals' 
  AND column_name IN ('tags', 'images', 'supported_languages', 'amenities')
ORDER BY column_name;
-- 예상: udt_name = '_text', is_nullable = 'NO', column_default = "'{}'::text[]"

-- treatments ARRAY 컬럼 확인
SELECT column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'treatments' 
  AND column_name IN ('tags', 'images', 'benefits')
ORDER BY column_name;

-- normalized_inquiries 신규 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'normalized_inquiries' 
  AND column_name IN ('utm', 'landing_path', 'referrer', 'client_meta', 'missing_fields')
ORDER BY column_name;
```

### 3. 기존 데이터 검증

```sql
-- hospitals: NULL 값이 빈 배열로 변환되었는지 확인
SELECT 
  id,
  name,
  array_length(tags, 1) as tags_count,
  array_length(images, 1) as images_count
FROM public.hospitals
LIMIT 10;

-- treatments: NULL 값이 빈 배열로 변환되었는지 확인
SELECT 
  id,
  name,
  array_length(tags, 1) as tags_count,
  array_length(benefits, 1) as benefits_count
FROM public.treatments
LIMIT 10;

-- inquiries.attachment deprecated 확인
SELECT COUNT(*) as attachment_deprecated_count
FROM public.inquiries
WHERE attachment IS NOT NULL 
  AND attachment <> ''
  AND (attachments IS NULL OR attachments = '[]'::jsonb);
-- 결과가 0이면 모든 attachment가 attachments로 마이그레이션됨
```

---

## 📊 코드 수정 우선순위

### 🔴 높음 (P0 - 즉시 수정)

1. **`src/lib/security/attachmentAuth.ts`** - `attachment` 파라미터 제거
2. **`app/api/attachments/sign/route.ts`** - `attachment` SELECT 및 사용 제거
3. **`src/lib/referral/buildReferralSummary.ts`** - `attachment` 처리 로직 제거
4. **`app/api/inquiries/create/route.ts`** - `attachment` 필드 제거

### 🟡 중간 (P1 - 주내 수정)

5. **`app/api/inquiry/normalize/route.ts`** - `attachment` 관련 로직 제거
6. **`app/api/admin/hospitals/route.ts`** - PATCH 핸들러에 null 체크 추가
7. **`app/api/admin/treatments/route.ts`** - PATCH 핸들러에 null 체크 추가

### 🟢 낮음 (P2 - 점진적 개선)

8. **프론트엔드 컴포넌트** - `attachment` 필드 제거, `null` 체크 간소화
9. **`app/api/admin/inquiries/[id]/route.ts`** - `attachment` SELECT 제거 (또는 주석)

---

## ✅ 마이그레이션 체크리스트

- [ ] 마이그레이션 SQL 실행
- [ ] 타입 검증 쿼리 실행 및 결과 확인
- [ ] 기존 데이터 검증 (NULL → 빈 배열 변환 확인)
- [ ] P0 코드 수정 (attachment 관련)
- [ ] P1 코드 수정 (null 체크 추가)
- [ ] `npm run build` 성공 확인
- [ ] 로컬 테스트 (inquiry 생성, attachment 업로드)
- [ ] Vercel 배포 및 프로덕션 테스트
- [ ] P2 코드 정리 (점진적)

---

## 📚 참고 자료

- **마이그레이션 파일**: `migrations/20260204_p0_db_schema_refinement.sql`
- **이전 마이그레이션**:
  - `20260130_harden_audit_inquiry_ids_to_bigint_array.sql` (inquiry_ids → bigint[])
  - `20260125_inquiries_public_token_and_attachments.sql` (attachments jsonb 추가)
  - `20260129_add_admin_audit_logs.sql` (admin_audit_logs 생성)

---

**작성자**: healwith Engineering  
**검토 필요**: ✅ 마이그레이션 실행 전 백업 권장
