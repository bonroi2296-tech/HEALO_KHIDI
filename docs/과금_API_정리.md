# healwith 서비스 과금/API 정리

실제 카드 등록·과금 적용 시 필요한 외부 API·서비스 목록과 용도, 환경변수, 비고를 정리했습니다.

---

## 1. Google Cloud (한 프로젝트에서 여러 API 사용)

**결제**: GCP 프로젝트에 결제 계정 연결 필요. **$300 무료 크레딧** + 월별 무료 할당량 있음.

| API | 용도 | 환경변수 | 비고 |
|-----|------|----------|------|
| **Maps JavaScript API** | 병원/시술 상세 페이지 지도 표시 | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 월 $200 상당 무료, 그 이후 과금 |
| **Places API (New)** | 병원 정보 보강: 검색·상호·전화·웹사이트·영업시간·평점·사진 | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 또는 `GOOGLE_PLACES_API_KEY` | 크롤/엔리치먼트·관리자 병원 보강에서 사용 |
| **Generative AI (Gemini)** | 챗봇 응답, RAG 임베딩, 시술 정규화, 번역, 플레이북 추출 등 | `GOOGLE_GENERATIVE_AI_API_KEY` | 채팅·RAG·번역·자동화 전반 |

**코드 위치 예시**
- 지도: `src/components/GoogleMap.jsx`
- Places: `src/lib/enrichment/sources/google-places.ts`, `src/lib/crawl/sources/google-places-search.ts`
- Gemini: `app/api/chat/route.ts`, `src/lib/rag/`, `src/lib/translate.ts`, `src/lib/playbook/extractPattern.ts` 등

---

## 2. OpenAI (선택)

| API | 용도 | 환경변수 | 비고 |
|-----|------|----------|------|
| **OpenAI API** | 챗봇·LLM (Google 대신 사용 시), 시술 분류·추출 등 | `OPENAI_API_KEY` | `LLM_PROVIDER=openai` 일 때 사용 |

현재 기본값은 `LLM_PROVIDER=google`(Gemini)입니다. OpenAI 쓰려면 키 설정 + provider 변경 필요.

---

## 3. 병원/의료 데이터

| 서비스 | 용도 | 환경변수 | 과금 |
|--------|------|----------|------|
| **HIRA (건강보험심사평가원)** | 병원 목록·진료과·지역별 조회 (공공데이터) | `HIRA_API_KEY` | 공공데이터포털에서 인증키 발급 후 무료 (일일 호출 제한 있음) |
| **카카오 로컬/맵** | 장소 검색·주소 보정 (크롤·엔리치먼트) | `KAKAO_REST_API_KEY` | 카카오 개발자 콘솔에서 앱 생성 후 무료 할당량, 초과 시 과금 |
| **네이버 검색/로컬** | 검색·로컬 데이터 (크롤 소스 등) | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 개발자 센터에서 무료 할당량 |

**코드 위치**
- HIRA: `src/lib/crawl/sources/hira.ts`, `scripts/data-collection/sources/hira-api.ts`
- 카카오: `src/lib/crawl/sources/kakao-local.ts`, `src/lib/enrichment/sources/kakao-map.ts`
- 네이버: `src/lib/crawl/sources/naver-local.ts`

---

## 4. 인프라·DB·인증

| 서비스 | 용도 | 환경변수 | 과금 |
|--------|------|----------|------|
| **Supabase** | DB·Auth·Storage·RLS | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | 무료 티어 있음, 사용량에 따라 유료 |
| **Vercel** (배포) | 호스팅·Cron | — | 무료 티어 + Pro 등 |

---

## 5. 알림·이메일 (선택)

| 서비스 | 용도 | 환경변수 | 비고 |
|--------|------|----------|------|
| **AWS SES** | 관리자/사용자 이메일 발송 | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL` | 사용량 기반 과금 |
| **알림톡(카카오)** | 문의 접수 등 알림 | `ALIMTALK_API_KEY`, `ALIMTALK_TEMPLATE_CODE` | 카카오 비즈니스 채널·알림톡 신청 필요 |
| **Twilio** | SMS (해외 등) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | 사용량 기반 과금 |

코드: `src/lib/notifications/`, `src/lib/notifications/emailSender.ts`

---

## 6. 기타 (선택)

| 서비스 | 용도 | 환경변수 | 비고 |
|--------|------|----------|------|
| **Google Analytics** | 방문·전환 분석 | `NEXT_PUBLIC_GA_ID` | 무료 |
| **Sentry** | 에러 모니터링 | `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` | 무료 티어 있음 |

---

## 실서비스 적용 시 체크리스트

1. **Google Cloud**
   - [ ] 결제 계정 연결 (무료 크레딧으로 시작 가능)
   - [ ] **Maps JavaScript API** 활성화 (병원/시술 페이지 지도)
   - [ ] **Places API (New)** 활성화 (병원 보강·크롤)
   - [ ] **Generative Language API** 활성화 (Gemini)
   - [ ] API 키 제한 설정 (HTTP referrer 등)

2. **병원/로컬 데이터**
   - [ ] HIRA: [공공데이터포털](https://www.data.go.kr)에서 인증키 발급
   - [ ] 카카오: [개발자 콘솔](https://developers.kakao.com)에서 REST API 키 발급
   - [ ] 네이버: [네이버 개발자센터](https://developers.naver.com)에서 애플리케이션 등록

3. **알림·이메일** (필요 시)
   - [ ] AWS SES 또는 이메일 발송 서비스 설정
   - [ ] 알림톡/문자 사용 시 해당 서비스 가입·키 설정

4. **환경변수**
   - [ ] `.env.local`(또는 배포 환경)에 위 환경변수 반영
   - [ ] `node scripts/check-env.js` 로 필수 값 확인

---

## 요약: “진짜 과금” 넣을 때 꼭 필요한 것

- **Google Cloud (카드 등록)**  
  - Maps JavaScript API, Places API, Generative AI(Gemini) 사용을 위해 **한 번 결제 계정 연결**이 필요합니다.  
  - 무료 크레딧·월별 무료 구간 있으므로, 사용량이 적으면 비용은 거의 나오지 않을 수 있습니다.

- **병원 정보 불러오기**  
  - **HIRA**: 공공데이터 인증키만 있으면 무료.  
  - **Google Places**: 병원 보강(전화번호·영업시간·사진 등)은 Places API 과금 대상.  
  - **카카오/네이버**: 각자 개발자 등록 후 무료 할당량 사용 가능.

- **지도**  
  - **Google Maps JavaScript API** 한 종류만 활성화하면, 현재 코드상 병원/시술 페이지 지도는 이 키 하나로 동작합니다.

정리하면, **실제 카드 등록이 꼭 필요한 건 Google Cloud 하나**이고, 나머지( HIRA·카카오·네이버·Supabase 등)는 각 서비스 가입·키만 있으면 되고, 일부는 무료 할당량으로만 쓸 수 있습니다.
