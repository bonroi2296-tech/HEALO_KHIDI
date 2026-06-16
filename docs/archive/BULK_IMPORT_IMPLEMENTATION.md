# 병원/시술 데이터 대량 수집 및 관리 시스템 구현 완료

## 개요

HEALO 시스템에 국내 공개 의료 데이터를 대량으로 수집하고 관리할 수 있는 시스템이 구현되었습니다.

## 구현된 기능

### 1. 데이터베이스 스키마 확장 ✅

**파일**: `migrations/20260209_add_metadata_fields.sql`

#### Hospitals 테이블 추가 필드
- `business_registration_number` - 사업자등록번호
- `medical_institution_code` - 요양기관기호
- `certifications` (JSONB) - 인증 정보 배열
- `medical_equipment` (TEXT[]) - 보유 의료장비
- `insurance_accepted` (BOOLEAN) - 보험 적용 여부
- `insurance_details` (JSONB) - 보험 상세 정보
- `annual_surgery_count` - 연간 시술 건수
- `establishment_date` - 개원일
- `total_staff_count` - 총 직원 수
- `doctor_count` - 의사 수
- `external_ratings` (JSONB) - 외부 평점 (네이버/카카오)

#### Treatments 테이블 추가 필드
- `price_max` - 최대 가격
- `recovery_time_min/max` - 회복 기간
- `recovery_process` (JSONB) - 단계별 회복 과정
- `side_effects` (TEXT[]) - 부작용 리스트
- `side_effects_detail` - 부작용 상세 설명
- `precautions` (TEXT[]) - 주의사항
- `anesthesia_type` - 마취 방법
- `surgery_duration_min/max` - 시술 시간
- `required_equipment` (TEXT[]) - 필요 의료장비
- `insurance_coverage` (BOOLEAN) - 보험 적용 가능 여부
- `insurance_coverage_detail` - 보험 상세
- `annual_procedure_count` - 연간 시술 건수
- `success_rate` (NUMERIC) - 성공률 (%)
- `similar_treatments` (UUID[]) - 유사 시술 ID
- `comparison_data` (JSONB) - 타 시술 비교 데이터

### 2. 데이터 수집 스크립트 ✅

**위치**: `scripts/data-collection/`

#### 구조
- `config.ts` - API 키 및 설정
- `sources/` - 데이터 소스 API 클라이언트
  - `hira-api.ts` - 건강보험심사평가원
  - `geo-api.ts` - Kakao/Naver 지도 API
- `collectors/` - 데이터 수집기
  - `hospital-collector.ts` - 병원 데이터 수집
- `transformers/` - 데이터 정규화
  - `normalize-hospital.ts` - DB 스키마 매핑
- `export/` - CSV/JSON 변환
  - `to-csv.ts` - CSV 변환 및 저장

#### 실행 방법
```bash
# 템플릿 CSV 생성
npm run collect:template

# 병원 데이터 수집
npm run collect:hospitals
```

### 3. 관리자 Import 기능 ✅

**페이지**: `app/admin/import/page.jsx`

#### 기능
- CSV/Excel 파일 업로드 (Drag & Drop)
- 데이터 미리보기
- 실시간 검증
- 일괄 등록
- 템플릿 다운로드

#### API 엔드포인트
- `POST /api/admin/import/hospitals` - 병원 일괄 등록
- `POST /api/admin/import/treatments` - 시술 일괄 등록

#### 검증 기능
- Zod 스키마 기반 타입 검증
- 필수 필드 체크
- 중복 체크 (slug 기준)
- 에러 행별 상세 메시지

### 4. 상세 페이지 재설계 ✅

#### 병원 상세 페이지
**파일**: `app/hospitals/[slug]/HospitalDetailLegacyClient.jsx`

**추가된 섹션**:
- 인증 및 자격 (Certifications & Accreditations)
- 의료 장비 (Medical Equipment)
- 병원 통계 (Hospital Statistics)
- 보험 정보 (Insurance Information)
- 외부 평가 (External Reviews - Naver/Kakao)

#### 시술 상세 페이지
**파일**: `app/treatments/[slug]/TreatmentDetailLegacyClient.jsx`

**추가된 섹션**:
- 회복 과정 (Recovery Timeline)
- 부작용 및 주의사항 (Side Effects & Precautions)
- 시술 정보 (Procedure Details)
- 보험 정보 (Insurance Coverage)
- 통계 및 성공률 (Statistics)

### 5. Validation 스키마 업데이트 ✅

**파일**: `src/lib/validation/admin.ts`

- `HospitalCreateSchema` 확장
- `TreatmentCreateSchema` 확장
- 데이터 타입 검증
- 범위 검증 (min/max 관계)

---

## 데이터 소스 가이드

### 추천 공개 데이터 소스

#### 1. 건강보험심사평가원 (HIRA)
- **URL**: https://openapi.hira.or.kr
- **데이터**: 병원 기본 정보, 평가 정보
- **신청**: 공공데이터포털 (data.go.kr)

#### 2. Kakao Local API
- **URL**: https://developers.kakao.com
- **데이터**: 위치, 평점, 리뷰 수
- **신청**: Kakao Developers (즉시 발급)

상세 내용은 `docs/DATA_SOURCE_GUIDE.md` 참조

---

## 템플릿 파일

### 병원 Import 템플릿
**위치**: `public/templates/hospital-import-template.csv`

**주요 컬럼**:
- name, location_kr, address_detail
- certifications, medical_equipment
- insurance_accepted, annual_surgery_count
- establishment_date, doctor_count
- external_ratings

### 시술 Import 템플릿
**위치**: `public/templates/treatment-import-template.csv`

**주요 컬럼**:
- hospital_id, name, description
- price_min, price_max
- recovery_time_min, recovery_time_max
- side_effects, precautions
- insurance_coverage, success_rate

---

## 다음 단계

### 필수 작업
1. ✅ 마이그레이션 실행
   ```sql
   -- Supabase Dashboard에서 실행
   -- migrations/20260209_add_metadata_fields.sql
   ```

2. ⏳ 공공 API 키 발급
   - 건강보험심사평가원 API
   - Kakao Developers API

3. ⏳ 데이터 수집 실행
   ```bash
   npm run collect:hospitals
   ```

4. ⏳ Import 테스트
   - 템플릿 다운로드
   - 샘플 데이터 입력
   - Import 페이지에서 업로드

### 선택 작업
- 관리자 개별 입력 UI 업데이트 (신규 필드 추가)
- 시술 비교 기능 구현 (similar_treatments 활용)
- 주기적 데이터 동기화 (Cron Job)

---

## 주의사항

### 법적 준수
- ⚠️ 공공데이터 이용약관 준수
- ⚠️ 개인정보 미포함 확인
- ⚠️ 데이터 출처 명시 (웹사이트 푸터)

### 데이터 품질
- ⚠️ 수집 데이터 정확성 검증
- ⚠️ 중복 제거 로직 적용
- ⚠️ 관리자 검토 후 공개 (`is_published=false` 기본값)

### 성능
- ⚠️ 대량 INSERT 시 배치 처리
- ⚠️ API Rate Limiting 준수
- ⚠️ 이미지 업로드 시간 고려

---

## 파일 목록

### 신규 생성
- `migrations/20260209_add_metadata_fields.sql`
- `scripts/data-collection/**/*.ts`
- `app/admin/import/page.jsx`
- `app/api/admin/import/hospitals/route.ts`
- `app/api/admin/import/treatments/route.ts`
- `public/templates/*.csv`
- `docs/DATA_SOURCE_GUIDE.md`
- `docs/BULK_IMPORT_IMPLEMENTATION.md` (본 파일)

### 수정됨
- `package.json` - 스크립트 및 의존성 추가
- `src/lib/validation/admin.ts` - Zod 스키마 확장
- `app/admin/_components/AdminNav.jsx` - Import 메뉴 추가
- `app/hospitals/[slug]/HospitalDetailLegacyClient.jsx` - 신규 섹션
- `app/treatments/[slug]/TreatmentDetailLegacyClient.jsx` - 신규 섹션

---

**구현 완료일**: 2026-02-09  
**작성자**: HEALO Development Team
