# 공개 의료 데이터 소스 조사 및 활용 가이드

## 개요

healwith 시스템에 대량의 병원 및 시술 데이터를 수집하기 위한 합법적 공개 데이터 소스 조사 결과입니다.

---

## 1. 건강보험심사평가원 (HIRA) ⭐ 추천

### 기본 정보
- **URL**: https://openapi.hira.or.kr
- **관리**: 건강보험심사평가원
- **API 유형**: REST API
- **인증**: API Key 방식

### 제공 데이터
1. **요양기관 정보 조회**
   - 병원명, 주소, 전화번호
   - 진료과목, 의료진 수
   - 요양기관기호 (고유번호)

2. **의료 질 평가 정보**
   - 병원 평가 등급
   - 환자 경험 평가
   - 적정성 평가 결과

3. **진료비 정보**
   - 비급여 진료비
   - 시술별 평균 비용

### 신청 방법
1. 공공데이터포털(data.go.kr) 접속
2. "건강보험심사평가원" 검색
3. 원하는 API 선택 후 "활용신청"
4. 승인 후 API Key 발급 (보통 1-2일 소요)

### 활용 가능 필드 매핑
- `의료기관명` → `hospitals.name`
- `주소` → `hospitals.location_kr`, `hospitals.address_detail`
- `요양기관기호` → `hospitals.medical_institution_code`
- `진료과목` → `hospitals.specialties`
- `평가등급` → `hospitals.certifications` (JSONB)

### 호출 제한
- 일일 트래픽: 1,000건 (기본)
- 초당 요청: 10건

---

## 2. 공공데이터포털 (data.go.kr)

### 관련 API 목록

#### 2-1. 전국 병의원 찾기
- **제공기관**: 보건복지부
- **데이터**: 병원 기본 정보, 운영시간, 위치
- **활용**: 병원 기본 정보 수집

#### 2-2. 의료기관 개설 현황
- **제공기관**: 보건복지부
- **데이터**: 개설일, 병상 수, 인력 현황
- **활용**: `establishment_date`, `total_staff_count`, `doctor_count`

#### 2-3. 비급여 진료비 정보
- **제공기관**: 건강보험심사평가원
- **데이터**: 시술별 가격 정보
- **활용**: `treatments.price_min`, `treatments.price_max`

### 신청 절차
1. 공공데이터포털 회원가입
2. 기관 인증 (사업자등록번호)
3. API별 활용신청
4. 승인 대기 (1-3일)
5. API Key 발급

---

## 3. 식품의약품안전처 (MFDS)

### 기본 정보
- **URL**: https://www.mfds.go.kr/openapi
- **제공 데이터**: 의료기기 허가 정보

### 활용 방안
- 의료기기 인증 정보 → `hospitals.medical_equipment`
- 시술에 사용되는 기기 정보 → `treatments.required_equipment`

### 신청 방법
1. 식약처 홈페이지 접속
2. Open API 메뉴
3. 신청서 작성 및 제출

---

## 4. 지도 API (부가 데이터)

### 4-1. Kakao Local API
- **URL**: https://developers.kakao.com
- **제공 데이터**: 장소 검색, 주소 변환, 좌표
- **활용**: 위도/경도, 평점, 리뷰 수
- **제한**: 일 300,000건 (무료)

#### 신청 방법
1. Kakao Developers 가입
2. 내 애플리케이션 등록
3. REST API 키 발급 (즉시)

#### 활용 예시
```javascript
// 병원명으로 장소 검색
GET https://dapi.kakao.com/v2/local/search/keyword.json?query=병원명
Authorization: KakaoAK {REST_API_KEY}

// 응답에서 활용 가능 데이터
- place_name (병원명)
- address_name (주소)
- road_address_name (도로명주소)
- x, y (경도, 위도)
- rating (평점)
```

### 4-2. Naver Search API (지역)
- **URL**: https://developers.naver.com
- **제공 데이터**: 지역 검색, 리뷰, 평점
- **제한**: 일 25,000건 (무료)

---

## 5. 수집 전략

### Phase 1: 기본 정보 수집
1. **공공데이터포털 → 병원 리스트 확보**
   - 서울/경기 주요 성형외과, 피부과 병원 목록
   - 예상 수집량: 200-500개 병원

2. **HIRA API → 상세 정보 보강**
   - 요양기관기호로 평가 정보 조회
   - 진료과목, 의료진 수 등

### Phase 2: 위치 및 평점 데이터
3. **Kakao Local API → 위치 정보**
   - 병원명으로 검색하여 좌표 확보
   - 리뷰 수, 평점 수집

### Phase 3: 시술 정보 수집
4. **HIRA 비급여 정보 → 시술 데이터**
   - 병원별 비급여 시술 목록
   - 가격 정보

---

## 6. 법적 고려사항

### ✅ 준수사항
- 공공데이터 이용약관 준수
- API 호출 제한 준수
- 데이터 출처 명시 (웹사이트 푸터에 표기)
- 개인정보 미포함 데이터만 수집

### ⚠️ 주의사항
- 상업적 이용 가능 여부 확인 (대부분 허용)
- 의사 개인정보는 공개 범위 내에서만 사용
- 리뷰 등 저작물은 링크만 제공 (크롤링 금지)

### 📝 권장 표기
```
본 서비스는 건강보험심사평가원, 공공데이터포털의 공개 데이터를 활용합니다.
출처: 건강보험심사평가원 Open API, 공공데이터포털
```

---

## 7. API 키 관리

### 환경변수 설정 (`.env.local`)
```bash
# HIRA API
HIRA_API_KEY=your_hira_api_key_here

# 공공데이터포털
PUBLIC_DATA_API_KEY=your_public_data_api_key_here

# MFDS
MFDS_API_KEY=your_mfds_api_key_here

# Kakao
KAKAO_REST_API_KEY=your_kakao_api_key_here

# Naver
NAVER_CLIENT_ID=your_naver_client_id_here
NAVER_CLIENT_SECRET=your_naver_client_secret_here
```

### 보안
- `.env.local` 파일은 `.gitignore`에 포함 (이미 설정됨)
- API 키는 서버 사이드에서만 사용
- 프론트엔드 노출 금지

---

## 8. 다음 단계

### 실행 순서
1. ✅ 본 문서 검토
2. 🔄 공공데이터포털 계정 생성 및 API 신청
3. 🔄 Kakao Developers 계정 생성 및 API 키 발급
4. ⏳ 승인 대기 (1-3일)
5. ⏳ 데이터 수집 스크립트 작성 및 테스트

### 즉시 실행 가능
- Kakao API (즉시 발급)
- Naver API (즉시 발급)

### 승인 필요 (1-3일)
- 건강보험심사평가원 API
- 공공데이터포털 API
- 식약처 API

---

## 참고 링크

- 공공데이터포털: https://www.data.go.kr
- 건강보험심사평가원 Open API: https://openapi.hira.or.kr
- 식약처 Open API: https://www.mfds.go.kr/openapi
- Kakao Developers: https://developers.kakao.com
- Naver Developers: https://developers.naver.com

---

**작성일**: 2026-02-09  
**업데이트**: API 신청 후 승인 결과 반영 필요
