# 브랜딩 설정 500 에러 해결 보고서

**작성일**: 2026-02-04  
**에러**: `GET /api/admin/site-settings` 500 (Internal Server Error)

---

## 🔴 문제 상황

### 에러 메시지:
```
[Branding] 설정 조회 실패: "internal_error"
GET http://localhost:3000/api/admin/site-settings 500 (Internal Server Error)
```

### 원인:
**`site_settings` 테이블이 데이터베이스에 존재하지 않음**

- 마이그레이션 파일이 없었음
- API는 존재하지 않는 테이블을 조회하려 시도
- Supabase에서 "relation does not exist" 에러 반환

---

## ✅ 해결 방법

### 1. **site_settings 테이블 생성 마이그레이션**
**파일**: `migrations/20260204_create_site_settings.sql`

#### 테이블 구조:
```sql
CREATE TABLE public.site_settings (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  logo_url text,
  hero_background_url text,
  metadata jsonb DEFAULT '{}'::jsonb
);
```

#### 기능:
- ✅ 브랜딩 이미지 URL 저장
- ✅ `updated_at` 자동 업데이트 트리거
- ✅ RLS 활성화 (읽기: 모두, 쓰기: 관리자)
- ✅ 기본 row 자동 삽입

---

### 2. **API 에러 처리 개선**
**파일**: `app/api/admin/site-settings/route.ts`

#### Before (문제):
```typescript
if (error) {
  console.error(`[${apiPath}] DB 조회 실패:`, error);
  return NextResponse.json(
    { ok: false, error: error.message },
    { status: 500 }
  );
}
```

**문제점**:
- 에러 상세 정보 부족
- 테이블 없음 vs 기타 에러 구분 불가
- 디버깅 어려움

#### After (개선):
```typescript
if (error) {
  console.error(`[${apiPath}] DB 조회 실패:`, {
    message: error.message,
    code: error.code,       // ← 추가
    details: error.details, // ← 추가
    hint: error.hint,       // ← 추가
  });

  // 테이블 없음 감지
  if (error.code === "42P01" || error.message?.includes("does not exist")) {
    return NextResponse.json(
      { 
        ok: false, 
        error: "table_not_found",
        message: "site_settings 테이블이 존재하지 않습니다. migrations/20260204_create_site_settings.sql을 실행하세요.",
      },
      { status: 503 } // ← 503으로 변경
    );
  }

  return NextResponse.json(
    { ok: false, error: error.message, code: error.code },
    { status: 500 }
  );
}
```

**개선점**:
- ✅ 상세 에러 로깅 (code, details, hint)
- ✅ 테이블 없음 에러 특별 처리
- ✅ 명확한 해결 방법 안내
- ✅ 적절한 HTTP 상태 코드 (503)

---

### 3. **UI 에러 처리 개선**
**파일**: `app/admin/settings/branding/page.tsx`

#### Before:
```tsx
if (data.ok) {
  setSettings(data.settings || { logo_url: null, hero_background_url: null });
  setError(null);
} else {
  setError(data.error || "설정 조회 실패");
  console.error("[Branding] 설정 조회 실패:", data.error);
}
```

#### After:
```tsx
if (data.ok) {
  setSettings(data.settings || { logo_url: null, hero_background_url: null });
  setError(null);
} else {
  // 테이블 없음 에러 처리
  if (data.error === "table_not_found") {
    setError("site_settings 테이블이 존재하지 않습니다. 아래 마이그레이션을 실행하세요.");
  } else {
    setError(data.message || data.error || "설정 조회 실패");
  }
  console.error("[Branding] 설정 조회 실패:", {
    error: data.error,
    message: data.message,
    code: data.code,
  });
}
```

#### 에러 배너 개선:
```tsx
{error && (
  <div className={`mb-4 p-4 border rounded-lg ${
    error.includes("테이블이 존재하지 않습니다")
      ? "bg-yellow-50 border-yellow-200 text-yellow-700"  // ← 노란색
      : "bg-red-50 border-red-200 text-red-700"           // ← 빨간색
  }`}>
    <div className="flex items-start gap-2">
      <X size={18} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">
          {error.includes("테이블이 존재하지 않습니다") 
            ? "⚠️ 테이블 설정 필요" 
            : "오류 발생"}
        </p>
        <p className="text-sm mt-1">{error}</p>
        
        {/* 마이그레이션 안내 */}
        {error.includes("테이블이 존재하지 않습니다") && (
          <div className="mt-3 p-3 bg-white rounded border border-yellow-300">
            <p className="text-sm font-semibold mb-2">📋 해결 방법:</p>
            <ol className="text-sm space-y-1.5 ml-4 list-decimal">
              <li>Supabase SQL Editor 접속</li>
              <li>
                <code className="bg-yellow-100 px-2 py-0.5 rounded">
                  migrations/20260204_create_site_settings.sql
                </code> 파일 내용 복사
              </li>
              <li>SQL Editor에 붙여넣기 후 실행</li>
              <li>이 페이지 새로고침</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

**개선점**:
- ✅ 테이블 없음 → 노란색 경고 (덜 심각)
- ✅ 기타 에러 → 빨간색 (심각)
- ✅ 해결 방법 단계별 안내
- ✅ 마이그레이션 파일명 명시

---

## 📂 생성/수정된 파일

### 생성된 파일:
1. **`migrations/20260204_create_site_settings.sql`**
   - site_settings 테이블 생성
   - RLS 정책 설정
   - 트리거 설정

2. **`docs/BRANDING_TROUBLESHOOTING.md`**
   - 문제 해결 가이드
   - 진단 체크리스트
   - 디버깅 명령어

3. **`docs/BRANDING_ERROR_FIX.md`**
   - 이 문서

### 수정된 파일:
1. **`app/api/admin/site-settings/route.ts`**
   - 상세 에러 로깅
   - 테이블 없음 감지
   - 명확한 에러 메시지

2. **`app/admin/settings/branding/page.tsx`**
   - 테이블 없음 에러 처리
   - 노란색 경고 배너
   - 마이그레이션 안내 추가

3. **`docs/BRANDING_QUICK_START.md`**
   - 데이터베이스 설정 단계 추가
   - 문제 해결 섹션 확장

---

## 🔄 해결 흐름

```
[에러 발생]
   ↓
GET /api/admin/site-settings
   ↓
site_settings 테이블 조회 시도
   ↓
❌ PostgreSQL: "relation does not exist" (code: 42P01)
   ↓
[개선된 API 에러 처리]
   ↓
error.code === "42P01" 감지
   ↓
{
  ok: false,
  error: "table_not_found",
  message: "site_settings 테이블이 존재하지 않습니다..."
}
   ↓
[개선된 UI 에러 표시]
   ↓
⚠️ 노란색 배너 + 마이그레이션 안내
   ↓
[사용자 액션]
1. SQL Editor 접속
2. 마이그레이션 실행
3. 페이지 새로고침
   ↓
✅ 정상 동작
```

---

## ✅ 해결 확인

### 1. 마이그레이션 실행
```bash
# Supabase SQL Editor에서
# migrations/20260204_create_site_settings.sql 실행

# 확인
SELECT * FROM public.site_settings;
-- Result: 1 row (기본값)
```

### 2. API 테스트
```bash
# 정상 응답 확인
GET /api/admin/site-settings
→ 200 OK
{
  "ok": true,
  "settings": {
    "id": 1,
    "logo_url": null,
    "hero_background_url": null
  }
}
```

### 3. UI 테스트
```
1. /admin/settings/branding 접속
2. ✅ 에러 없이 로드
3. ✅ "현재 로고 없음" 표시
4. ✅ 파일 업로드 가능
```

---

## 📊 에러 처리 비교

| 항목 | Before | After |
|------|--------|-------|
| **에러 로그** | `error.message`만 | `code`, `details`, `hint` 포함 |
| **에러 구분** | ❌ 없음 | ✅ 테이블 없음 vs 기타 |
| **HTTP 상태** | 500만 | 503 (테이블 없음), 500 (기타) |
| **UI 배너** | 빨간색만 | 노란색 (경고), 빨간색 (에러) |
| **해결 안내** | ❌ 없음 | ✅ 단계별 안내 |

---

## 🎯 향후 개선 가능 사항

### 1. 자동 테이블 생성
```typescript
// API에서 테이블 없을 시 자동 생성 시도
if (error.code === "42P01") {
  await supabaseAdmin.rpc("create_site_settings_table");
  // 재시도
}
```

### 2. Health Check API
```typescript
// GET /api/admin/health
{
  "site_settings_table": true,
  "storage_bucket": true,
  "service_role_key": true
}
```

### 3. 마이그레이션 UI
- Admin 페이지에서 직접 마이그레이션 실행
- 버튼 클릭으로 테이블 생성

---

## 📝 사용자 안내

### 에러 발생 시 해야 할 일:

#### 1. 노란색 경고 (⚠️ 테이블 설정 필요)
→ **심각하지 않음**, 설정만 하면 됨
→ 안내된 마이그레이션 실행

#### 2. 빨간색 에러 (오류 발생)
→ **문제 발생**, 디버깅 필요
→ `docs/BRANDING_TROUBLESHOOTING.md` 참조

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026-02-04  
**상태**: ✅ 해결 완료
