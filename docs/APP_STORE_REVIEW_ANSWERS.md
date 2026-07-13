# healwith — 스토어 심사 설문 답변지 (결제 후 복붙용)

> 2026-07-13 작성. 구글 플레이 「데이터 안전(Data safety)」 설문과 애플 「앱 개인정보(Privacy Nutrition Labels)」 설문의
> **문항별 답**을 미리 채워둔 것. 콘솔이 열리면 이 문서 보고 그대로 옮기면 됨 (앱 코드 기준으로 작성 — 기능 바뀌면 같이 갱신).
> 등록 문구·스크린샷 규격은 [APP_STORE_LISTING.md](APP_STORE_LISTING.md) 참고.

## 0) 우리 앱이 실제로 수집하는 것 (사실관계 — 답의 근거)

| 데이터 | 어디서 | 목적 | 저장 방식 |
|---|---|---|---|
| 이름·이메일·전화·메신저ID | 문의/인테이크 폼, 회원가입 | 상담 연결·사후관리 | AES-256-GCM 암호화 컬럼 |
| 건강·의료 정보 (암종·병력·검사 결과 서술) | 인테이크, AI/휴먼 상담, 증상 리포트 | 병원 매칭·상담 | 암호화 컬럼 (`*_encrypted`) |
| 사용자 콘텐츠 (채팅 메시지, 첨부파일=검사지 등) | 채팅·문의·상담방 | 상담 진행 | Supabase Storage + 암호화 |
| 기기 푸시 토큰 | 앱에서 알림 허용 시 | 푸시 알림(FCM) | `device_tokens` 테이블 |
| 사용 데이터 (페이지 조회 등 분석) | Google Analytics (웹 로드형 앱이라 GA가 앱 안에서도 동작) | 서비스 개선 | GA (Google) |
| 대략적 위치 | 수집 안 함 (IP 기반 언어 추정만, 저장 X) | — | — |

- **광고 없음 / 제3자 판매 없음 / 광고용 추적 없음** (ATT 프롬프트 불필요)
- 전송 중 암호화(HTTPS) ✅ / **앱 내 계정 삭제 요청 기능 있음** ✅ (`/patient/account` — 애플 5.1.1(v) 요건 충족)
- 계정 없이도 열람 가능(문의·정보 페이지), 상담 이력은 계정 필요

## 1) 구글 플레이 「데이터 안전」 설문 답

- 데이터를 수집하나? **예** / 제3자와 공유하나? **아니요**
  (분석용 GA는 "수집"으로 신고 — Google은 서비스 제공자(processor) 지위)
- 전송 중 암호화? **예** / 삭제 요청 방법 제공? **예** (앱 내 + privacy 페이지)
- 수집 항목 체크리스트:
  - 개인 정보 → 이름 ✅, 이메일 ✅, 전화번호 ✅, 기타(메신저 ID) ✅ — 목적: 앱 기능(상담). 필수 아님(문의 시에만).
  - 건강 및 피트니스 → 건강 정보 ✅ — 목적: 앱 기능. **민감정보라 "사용자가 자발 제공, 암호화 저장" 문구 각오**.
  - 메시지 → 기타 인앱 메시지 ✅ (상담 채팅)
  - 사진/동영상·파일 → ✅ (검사지 첨부, 사용자가 올릴 때만)
  - 앱 활동 → 앱 상호작용 ✅ (GA 페이지뷰)
  - 기기 ID → ✅ (푸시 토큰. "기타 ID"로 신고)
  - 위치·재무정보·주소록·검색기록 → ❌
- 데이터 처리 목적 선택지: **앱 기능** + **분석** 두 개만. (광고·마케팅 ❌)

## 2) 애플 「앱 개인정보」 라벨 답

**Data Linked to You (사용자와 연결되는 데이터):**
- Contact Info: Name, Email Address, Phone Number
- Health & Fitness: Health (상담용 병력 — 사용자 자발 제공)
- User Content: Photos or Videos(첨부), Other User Content(채팅)
- Identifiers: Device ID(푸시 토큰)

**Data Not Linked to You:**
- Usage Data: Product Interaction (GA — 계정과 미연결)

**Data Used to Track You: 없음** (추적 목적 사용 ❌ → ATT 불필요)

## 3) 심사 노트 (Review Notes 칸에 붙일 것)

- 데모 계정: 심사 제출 직전에 환자 테스트 계정 1개 발급해 ID/비번을 폼에 기입 (저장소 문서에 비번 쓰지 말 것).
  로그인 없이도 주요 기능(문의·정보·AI 상담 시작) 열람 가능함을 명시.
- 앱 성격 설명(반려 예방): "cancer-care concierge connecting international patients to Korean hospitals.
  Native features: push notifications for consultation updates, camera/mic for video consultations (LiveKit)."
- **의료 앱 단골 질문 대비**: 우리는 진단·처방을 하지 않음(정보 제공 + 병원 연결). AI 챗은 의료진 검토 안내를 포함.
  → "The app does not provide medical diagnosis or treatment; it facilitates hospital matching and coordination."
- 웹뷰 반려(4.2) 대비 문구: 푸시 알림 + 카메라/마이크 영상상담이 네이티브 가치.

## 4) 아직 못 채우는 칸 (계정 열려야 확정)

- 애플: App Store Connect 팀 ID·서명 인증서 (계정 발급 후)
- 구글: 앱 서명 키(Play App Signing 권장 — 콘솔이 관리)
- 연령 등급 설문(IARC): 콘솔 안에서만 진행 가능 — "의료 정보" 항목 예로 답하면 17+/성인 등급 예상
