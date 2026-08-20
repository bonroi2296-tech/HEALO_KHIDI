# 🎨 이미지 Fallback 시스템 구현 완료

## 📋 구현 개요

병원/시술 정보에 이미지가 없어도 전문적으로 보이도록 **Unsplash 기반 임시 이미지** 자동 생성 시스템을 구현했습니다.

### ✅ 구현 내용

1. **DB 스키마 확장**: `thumbnail_image`, `gallery_images` 필드 추가
2. **Unsplash Fallback**: 진료과목/시술명 기반 고품질 임시 이미지 자동 매칭
3. **Import API 자동화**: 이미지 없이 입력해도 자동으로 임시 이미지 생성
4. **상세 페이지 업데이트**: 새로운 이미지 필드 우선 사용

---

## 🗄️ 1단계: DB 마이그레이션 실행 (필수!)

### Supabase Dashboard에서 실행

1. **https://supabase.com/dashboard** 접속
2. healwith 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭
4. 아래 파일의 **전체 내용**을 복사해서 실행:

```
migrations/20260209_add_metadata_fields.sql
```

> ⚠️ **중요**: 이 마이그레이션을 실행하지 않으면 이미지 필드가 DB에 없어서 에러가 발생합니다!

---

## 🎨 2. Unsplash Fallback 시스템

### 작동 방식

```typescript
// 진료과목별 자동 이미지 매칭
const specialty = "성형외과";
const thumbnail = getFallbackImage(specialty, 0, 800, 600);
// → "https://source.unsplash.com/800x600/?plastic-surgery-clinic&sig=..."

const gallery = getHospitalGalleryImages(specialty);
// → [image1, image2, image3, image4]
```

### 지원 카테고리

**병원 진료과목:**
- 성형외과 → `plastic-surgery-clinic`
- 피부과 → `dermatology-clinic`
- 치과 → `dental-clinic`
- 안과 → `ophthalmology-clinic`
- 내과 → `hospital-interior`
- 정형외과, 이비인후과, 산부인과 등

**시술명:**
- 보톡스 → `botox-injection`
- 필러 → `dermal-filler`
- 레이저 → `laser-treatment`
- 리프팅 → `face-lifting`
- 쌍꺼풀 → `double-eyelid-surgery`
- 코, 윤곽, 지방흡입 등

---

## 📥 3. Import 사용 방법

### JSON 템플릿

```json
{
  "name": "강남성형외과",
  "specialties": ["성형외과"],
  "thumbnail_image": "",  // 비워두면 자동 생성
  "gallery_images": []    // 비워두면 자동 생성
}
```

### 자동 생성 결과

```json
{
  "name": "강남성형외과",
  "specialties": ["성형외과"],
  "thumbnail_image": "https://source.unsplash.com/800x600/?plastic-surgery-clinic&sig=성형외과-0",
  "gallery_images": [
    "https://source.unsplash.com/800x600/?plastic-surgery-clinic&sig=성형외과-1",
    "https://source.unsplash.com/800x600/?plastic-surgery-clinic&sig=성형외과-2",
    "https://source.unsplash.com/800x600/?plastic-surgery-clinic&sig=성형외과-3",
    "https://source.unsplash.com/800x600/?plastic-surgery-clinic&sig=성형외과-4"
  ]
}
```

---

## 🖼️ 4. 이미지 우선순위

프론트엔드에서 이미지를 표시할 때 다음 순서로 우선순위 적용:

1. ✅ **thumbnail_image** (새로운 필드)
2. ✅ **gallery_images** (새로운 필드)
3. 🔄 **images** (기존 필드, 하위호환)
4. 🔄 **thumbnail** (기존 필드, 하위호환)
5. ⚠️ **Placeholder** (모두 없을 경우)

---

## 🎯 5. 임시 이미지 → 실제 이미지 교체 방법

### A. 관리자 페이지에서 개별 수정 (향후 구현)

```tsx
// 병원 편집 페이지에 이미지 업로드 UI 추가 예정
<ImageUploadButton 
  currentImage={hospital.thumbnail_image}
  isPlaceholder={isPlaceholderImage(hospital.thumbnail_image)}
  onUpload={handleUploadThumbnail}
/>
```

### B. Supabase Storage 직접 업로드

1. Supabase Dashboard → Storage → `hospital-images` 버킷
2. 이미지 업로드 후 Public URL 복사
3. SQL Editor에서 업데이트:

```sql
UPDATE hospitals
SET 
  thumbnail_image = 'https://...supabase.co/storage/v1/object/public/hospital-images/abc.jpg',
  gallery_images = ARRAY[
    'https://...supabase.co/.../gallery1.jpg',
    'https://...supabase.co/.../gallery2.jpg'
  ]
WHERE slug = 'gangnam-plastic-surgery';
```

### C. Import API로 재등록

실제 이미지 URL을 포함한 JSON 파일을 다시 Import하면 덮어씌워집니다.

---

## 🚀 6. 다음 단계

### 우선순위 높음

- [ ] **마이그레이션 실행** (지금 바로!)
- [ ] 샘플 데이터 Import 테스트
- [ ] 상세 페이지에서 이미지 정상 표시 확인

### 우선순위 중간

- [ ] 관리자 페이지에 이미지 업로드 UI 추가
- [ ] Supabase Storage 버킷 설정 (`hospital-images`, `treatment-images`)
- [ ] 이미지 압축/리사이징 자동화

### 우선순위 낮음

- [ ] 인기 병원 Top 50 실제 이미지 수집
- [ ] 병원 측 협력 요청 시스템
- [ ] 자체 제작 카테고리별 일러스트레이션 디자인

---

## 📊 7. 수정된 파일 목록

### DB & Migration
- `migrations/20260209_add_metadata_fields.sql` (이미지 필드 추가)

### Backend
- `src/lib/utils/imageFallback.ts` (신규 생성)
- `src/lib/validation/admin.ts` (스키마 확장)
- `app/api/admin/import/hospitals/route.ts` (Fallback 로직 추가)
- `app/api/admin/import/treatments/route.ts` (Fallback 로직 추가)

### Frontend
- `app/hospitals/[slug]/HospitalDetailLegacyClient.jsx` (이미지 우선순위 적용)
- `app/treatments/[slug]/TreatmentDetailLegacyClient.jsx` (이미지 우선순위 적용)

### Templates
- `public/templates/sample-hospitals.json` (필드 업데이트)
- `public/templates/hospital-import-template.json` (필드 업데이트)

---

## 🎉 완료!

이제 병원/시술 정보를 입력할 때 **이미지를 비워두어도** 자동으로 전문적인 임시 이미지가 생성됩니다!

**다음 단계**: Supabase Dashboard에서 마이그레이션을 실행하세요! 🚀
