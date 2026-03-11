# 히어로 섹션 기본 이미지 제거 완료

## 📋 문제

**증상**: 
관리자 페이지에서 히어로 이미지를 삭제해도 기본 Unsplash 이미지가 계속 표시됨

**근본 원인**:
```javascript
// src/components.jsx (Before)
<img 
  src={siteConfig?.hero || "https://images.unsplash.com/photo-1538108149393-fbbd81895907..."} 
/>
```
- `siteConfig?.hero`가 null/undefined/빈 문자열이면 fallback으로 Unsplash 이미지 표시
- 관리자가 이미지를 삭제해도 기본 이미지가 항상 노출됨

---

## ✅ 수정 내용

### 파일: `src/components.jsx`

**Before** (문제):
```javascript
<div className="absolute inset-0 z-0">
  <img 
    src={siteConfig?.hero || "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=2000"} 
    alt="Hero Background" 
    className="w-full h-full object-cover opacity-60" 
    loading="eager"
    fetchPriority="high"
    decoding="sync"
  />
  <div className="absolute inset-0 bg-gradient-to-b from-teal-950/80 via-teal-900/60 to-teal-800/90 mix-blend-multiply"></div>
</div>
```

**문제점**:
- ❌ `siteConfig?.hero`가 없어도 기본 Unsplash 이미지 표시
- ❌ 관리자 의도와 무관하게 항상 이미지 배경 표시

---

**After** (해결):
```javascript
<div className="absolute inset-0 z-0">
  {/* ✅ 명시적으로 설정된 이미지가 있을 때만 표시 */}
  {siteConfig?.hero && (
    <img 
      src={siteConfig.hero} 
      alt="Hero Background" 
      className="w-full h-full object-cover opacity-60" 
      loading="eager"
      fetchPriority="high"
      decoding="sync"
    />
  )}
  {/* 그라데이션 오버레이 (이미지 있든 없든 적용) */}
  <div className="absolute inset-0 bg-gradient-to-b from-teal-950/80 via-teal-900/60 to-teal-800/90 mix-blend-multiply"></div>
</div>
```

**개선점**:
- ✅ `siteConfig?.hero`가 있을 때만 `<img>` 렌더링
- ✅ 이미지 없으면 단색 배경(`bg-teal-900`) + 그라데이션만 표시
- ✅ 기본 이미지 fallback 완전 제거

---

## 🎨 수정 후 동작

### Case 1: 히어로 이미지 설정됨
**DB**: `site_settings.hero_background_url = "https://example.com/hero.jpg"`

**화면**:
```
┌─────────────────────────────────┐
│ [배경 이미지]                    │
│ + 그라데이션 오버레이              │
│                                 │
│   Find the Best Hospital        │
│   in Korea in 30 Seconds        │
└─────────────────────────────────┘
```

---

### Case 2: 히어로 이미지 삭제됨 (또는 설정 안 함)
**DB**: `site_settings.hero_background_url = null` (또는 빈 문자열)

**화면**:
```
┌─────────────────────────────────┐
│ [단색 배경: teal-900]            │
│ + 그라데이션 오버레이              │
│                                 │
│   Find the Best Hospital        │
│   in Korea in 30 Seconds        │
└─────────────────────────────────┘
```

**Before**: Unsplash 기본 이미지 표시 ❌  
**After**: 단색 + 그라데이션만 표시 ✅

---

## 🧪 테스트 방법

### 1. 히어로 이미지 삭제 테스트

```sql
-- Supabase SQL Editor에서 실행
UPDATE site_settings
SET hero_background_url = NULL;
```

또는 **관리자 페이지**에서:
```
1. /admin 접속
2. "Site Settings" 탭
3. Hero Background URL 필드를 비우기
4. Save 클릭
```

---

### 2. 메인 페이지 확인

```
1. http://localhost:3000 접속
2. 히어로 섹션 확인
3. Expected:
   - 배경은 단색 (teal-900) + 그라데이션
   - Unsplash 이미지 없음 ✅
```

---

### 3. 히어로 이미지 다시 설정 테스트

**관리자 페이지**에서:
```
1. /admin 접속
2. "Site Settings" 탭
3. Hero Background URL: https://example.com/new-hero.jpg
4. Save 클릭
5. 메인 페이지 새로고침
6. Expected: 새 이미지 표시 ✅
```

---

## 📊 데이터 흐름

```
1. DB: site_settings 테이블
   ↓
   hero_background_url 컬럼
   ↓
   
2. HomeClient.jsx: DB 조회
   ↓
   const { data: settingsData } = await supabaseClient
     .from("site_settings").select("*").single()
   ↓
   setSiteConfig({ hero: settingsData.hero_background_url })
   ↓
   
3. HeroSection 컴포넌트
   ↓
   {siteConfig?.hero && <img src={siteConfig.hero} />}
   ↓
   
4. 화면 표시
   - hero 있음: 이미지 배경 + 그라데이션
   - hero 없음: 단색 배경 + 그라데이션
```

---

## 🎯 수정 원칙 준수

### ✅ 명시적 이미지만 표시
```javascript
// siteConfig?.hero가 있을 때만
{siteConfig?.hero && <img src={siteConfig.hero} />}
```

### ✅ 기본 fallback 제거
```javascript
// ❌ Before: fallback 있음
src={siteConfig?.hero || "https://images.unsplash.com/..."}

// ✅ After: fallback 없음
{siteConfig?.hero && <img src={siteConfig.hero} />}
```

### ✅ 단색 배경 유지
```javascript
// bg-teal-900는 항상 적용
<div className="... bg-teal-900">
```

---

## 📁 수정된 파일

**수정**:
- ✅ `src/components.jsx`
  - `HeroSection` 컴포넌트
  - Line 217-224: `<img>` 조건부 렌더링
  - 기본 Unsplash 이미지 fallback 제거

**영향 없음**:
- `app/page.jsx` - 변경 없음
- `app/home/HomeClient.jsx` - 변경 없음
- DB 스키마 - 변경 없음

---

## 🚨 주의사항

### 1. 기본 배경색은 유지됨
```css
bg-teal-900
```
- 이미지 없어도 히어로 섹션은 teal-900 단색 배경으로 표시
- 그라데이션 오버레이도 항상 적용

---

### 2. 텍스트 가독성
- 단색 배경 + 그라데이션으로도 흰색 텍스트 가독성 유지
- 이미지 없어도 UI가 깨지지 않음

---

### 3. 관리자 설정과 연동
```
관리자 페이지에서:
- Hero Background URL 설정 → 이미지 표시
- Hero Background URL 삭제 → 단색 배경만
```

---

## 🎉 완료!

**이제 히어로 이미지를 명시적으로 설정하지 않으면 기본 이미지 없이 단색 배경만 표시됩니다!**

### 확인 방법:
1. ✅ 관리자 페이지에서 Hero Background URL 삭제
2. ✅ 메인 페이지 새로고침
3. ✅ 단색 배경(teal-900) + 그라데이션만 표시
4. ✅ Unsplash 이미지 없음

---

**작성일**: 2026-01-29
