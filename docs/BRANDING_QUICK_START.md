# 브랜딩 설정 빠른 시작 가이드

**3분 안에 브랜딩 설정 완료하기**

---

## 1️⃣ 데이터베이스 설정 (1회만)

### Supabase SQL Editor
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. **SQL Editor** 클릭
3. **New query** 클릭
4. `migrations/20260204_create_site_settings.sql` 파일 내용 복사/붙여넣기
5. **Run** 클릭 (또는 Ctrl+Enter)

✅ 완료!

---

## 2️⃣ Storage 버킷 생성 (1회만)

### Supabase Dashboard
1. **Storage** 클릭
2. **New bucket** 클릭
3. 설정:
   - Name: `public-assets`
   - Public bucket: ✅ **체크**
4. **Create** 클릭

✅ 완료!

---

## 3️⃣ 로고 업로드

### 브랜딩 설정 페이지
1. `/admin/settings/branding` 접속
2. **로고 이미지** 섹션
3. **"파일 선택"** 클릭
4. PNG/SVG 파일 선택 (< 2MB)
5. ✅ "✓ 로고 업로드 완료" Toast 표시
6. 페이지 자동 새로고침
7. 헤더에 새 로고 확인

---

## 4️⃣ 히어로 배경 업로드

### 브랜딩 설정 페이지
1. **히어로 배경 이미지** 섹션
2. **"파일 선택"** 클릭
3. JPEG/PNG 파일 선택 (< 8MB)
4. ✅ "✓ 히어로 배경 업로드 완료" Toast 표시
5. 홈페이지에서 새 배경 확인

---

## 🎯 파일 요구사항

| 항목 | 타입 | 최대 크기 | 권장 사양 |
|------|------|----------|-----------|
| **로고** | PNG, SVG, WebP | 2MB | 투명 배경, 40px 높이 |
| **배경** | JPEG, PNG, WebP | 8MB | 1920x1080 이상 |

---

## ⚠️ 문제 해결

### "테이블이 존재하지 않습니다" 에러
→ 위 **1️⃣ 데이터베이스 설정** 단계 수행

### "Bucket not found" 에러
→ 위 **2️⃣ Storage 버킷 생성** 단계 수행

### "File too large" 에러
→ 이미지 압축 후 재업로드

### 업로드 후 반영 안 됨
→ 브라우저 캐시 초기화 (Ctrl+Shift+R)

---

**더 자세한 가이드**: 
- `docs/STORAGE_SETUP.md`
- `docs/BRANDING_TROUBLESHOOTING.md`
