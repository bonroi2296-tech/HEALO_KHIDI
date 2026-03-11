# 🗺️ Google Maps API Billing 에러 해결 가이드

**날짜**: 2026-02-05  
**에러**: `BillingNotEnabledMapError`  
**증상**: Treatments 상세페이지에서 Google Maps 로드 실패

---

## 🔍 문제 분석

### 에러 메시지
```
Google Maps JavaScript API error: BillingNotEnabledMapError
https://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error
```

### 원인
- Google Maps API 키는 설정되어 있음 (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- **Google Cloud Platform에서 결제 계정이 활성화되지 않음**
- Maps JavaScript API 사용을 위해서는 결제 계정 필요 (무료 크레딧 사용 가능)

---

## ✅ 해결 방법

### 방법 1: Google Cloud Platform 설정 (프로덕션용)

#### 1. Google Cloud Console 접속
https://console.cloud.google.com

#### 2. 결제 계정 연결
1. 좌측 메뉴 → **"Billing"**
2. **"Link a billing account"** 클릭
3. 신용카드 또는 결제 수단 등록
   - 💡 Google은 $300 무료 크레딧 제공
   - Maps API는 월 $200까지 무료 사용량 제공

#### 3. Maps JavaScript API 활성화
1. 좌측 메뉴 → **"APIs & Services"** → **"Library"**
2. **"Maps JavaScript API"** 검색
3. **"Enable"** 클릭

#### 4. API 키 권한 확인
1. **"APIs & Services"** → **"Credentials"**
2. 사용 중인 API 키 선택
3. **"API restrictions"** 섹션:
   - "Restrict key" 선택
   - **"Maps JavaScript API"** 체크

#### 5. (선택) API 키 보안 강화
- **Application restrictions**: HTTP referrers 설정
  ```
  https://healo-nu.vercel.app/*
  http://localhost:3000/*
  ```

---

### 방법 2: 개발 환경 Fallback UI (적용 완료 ✅)

로컬 개발 시 Google Maps 에러를 우아하게 처리하도록 개선했습니다.

#### 변경 내용

**파일**: `src/components/GoogleMap.jsx`

```javascript
// ✅ 에러 발생 시 Fallback UI 표시
if (loadError) {
  const isBillingError = loadError.message?.includes('BillingNotEnabled');
  
  return (
    <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-full h-full min-h-[200px]">
      {/* 병원 위치 정보를 아이콘과 텍스트로 표시 */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white shadow-md">
          <MapIcon />
        </div>
        
        <div>
          <p className="text-sm font-bold">{hospitalName}</p>
          <p className="text-xs text-gray-500">{location}</p>
        </div>
        
        {/* 개발 모드에서만 에러 힌트 표시 */}
        {isDev && isBillingError && (
          <div className="text-[10px] text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            ⚠️ Dev Mode: Google Maps billing not enabled
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 효과
- ✅ 개발 중에도 페이지가 정상 렌더링됨
- ✅ 사용자에게 병원 위치 정보는 표시됨 (지도 없이도)
- ✅ 개발자에게는 명확한 에러 힌트 제공
- ✅ 프로덕션 환경에서 결제 설정 후 자동으로 지도 표시

---

## 📊 비교

| 상황 | 이전 | 이후 |
|-----|------|------|
| **결제 미설정 (Dev)** | ❌ 콘솔 에러 + 빈 영역 | ✅ Fallback UI + 힌트 |
| **결제 미설정 (Prod)** | ❌ 콘솔 에러 + 빈 영역 | ✅ Fallback UI (에러 힌트 없음) |
| **결제 설정 완료** | ✅ 정상 지도 표시 | ✅ 정상 지도 표시 |

---

## 🎯 권장 사항

### 즉시 조치 (개발 중)
- ✅ **완료**: Fallback UI 적용 (페이지 정상 작동)
- 개발 중에는 Fallback UI로 작업 가능

### 배포 전 필수
- [ ] Google Cloud Platform에서 결제 계정 설정
- [ ] Maps JavaScript API 활성화
- [ ] API 키 권한 확인

### 보안 강화 (선택)
- [ ] API 키에 HTTP referrer 제한 설정
- [ ] 일일 사용량 제한 (Quotas) 설정

---

## 💰 비용 정보

### Google Maps Platform 가격
- **무료 크레딧**: 월 $200 (대부분의 소규모 사이트 충분)
- **Maps JavaScript API 비용**:
  - 0-100,000 로드: 무료
  - 100,000+ 로드: $7 per 1,000 loads

### 예상 비용 (HEALO 기준)
- 일 방문자 1,000명
- 각 방문자가 평균 3개 상세페이지 조회
- 월 약 90,000 지도 로드
- **비용**: $0 (무료 범위 내)

---

## 🧪 테스트 방법

### 1. 현재 상태 (결제 미설정)
```bash
npm run dev
# → http://localhost:3000/treatments/[slug]
# → Fallback UI가 표시되고, 개발 모드 힌트가 보임
```

### 2. 결제 설정 후
```bash
npm run dev
# → http://localhost:3000/treatments/[slug]
# → 실제 Google Maps가 로드되고 병원 위치가 지도에 표시됨
```

---

## 📝 환경 변수 확인

### `.env.local`
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA_DYCZyOPTi0lt7mChWe9dFjxtA9g1QZE
```

### 확인 방법
```bash
# Next.js 환경 변수 확인
node -e "console.log(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)"
```

---

## 🔗 참고 링크

- [Google Maps Platform 가격](https://mapsplatform.google.com/pricing/)
- [결제 계정 설정 가이드](https://cloud.google.com/billing/docs/how-to/manage-billing-account)
- [Maps JavaScript API 문서](https://developers.google.com/maps/documentation/javascript)
- [BillingNotEnabled 에러 해결](https://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error)

---

## ✅ 체크리스트

### 즉시 조치 (완료)
- [x] Fallback UI 구현
- [x] 개발 모드 에러 힌트 추가
- [x] 사용자 경험 개선 (빈 영역 → 위치 정보)

### 배포 전
- [ ] Google Cloud Console에서 결제 설정
- [ ] Maps JavaScript API 활성화
- [ ] API 키 권한 확인
- [ ] HTTP referrer 제한 설정

### 모니터링
- [ ] API 사용량 모니터링 대시보드 설정
- [ ] 비용 알림 설정 (예: $50 초과 시)

---

**작성**: AI Assistant  
**적용**: Fallback UI 구현 완료  
**배포 전 필수**: Google Cloud Platform 결제 설정  
**버전**: v1.0 (2026-02-05)
