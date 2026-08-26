# 애플 2.1 「정보 부족」 회신 자료 (2026-08-14 반려 대응)

> **이 문서는 「앱 심사에 회신」 칸에 그대로 붙여 넣을 영문 답변 + 실기기 녹화 대본**이다.
> 제출 ID `71a49fe4-a7ec-45e6-a8e1-f634de8fc9b7` / 창구 = 제출 상세의 **「앱 심사에 회신」**(재제출 아님).
> 📌 애플 안내: *"앞으로는 이 정보를 App Review Information 의 Notes 칸에 넣어라"* → 다음 제출부터는
> 심사 메모에 상시 넣어 두면 같은 반려가 재발하지 않는다.

## 🛑 회신 «전»에 반드시 끝낼 것

| # | 무엇 | 왜 | 누가 |
|---|---|---|---|
| 1 | **심사에 걸린 빌드를 3으로 교체** | 지금 걸린 판(빌드 1로 추정)은 「Apple로 계속하기」가 **앱 안에서 영영 멈춘다**. 8/20 에 고쳤고 그 고침은 **빌드 3에만** 있다 | PO 로그인 → 어시 |
| 2 | **녹화할 아이폰에 TestFlight 빌드 3 설치** | 옛 판으로 찍으면 그 고장이 그대로 녹화된다 | Assel |
| 3 | 신청서 #1473 실서비스 반영 | 아이폰에서 「통화 종료」가 화면 밖으로 잘린다(러시아어는 「채팅」까지) | 어시 |
| 4 | 기기·OS 이름 확인 | 아래 회신문 2번을 지어내면 안 된다 | Assel 폰 설정 화면 |

---

## 📹 녹화 대본 (실기기 · 한 번에 끊지 말고 찍기)

> 애플 요구 원문: *"a video of the app in use, captured on a **physical device**"*
> **흉내기(시뮬레이터) 녹화는 거부된다.** 아이폰 화면 녹화(제어센터 ⏺)로 찍고,
> 소리 없이 화면만 나와도 된다. 목표 길이 3~5분.

| 순서 | 무엇을 보여주나 | 애플이 요구한 항목 | 주의 |
|---|---|---|---|
| 1 | 홈 화면에서 healwith 아이콘을 눌러 **앱을 켠다** | *"Begin with launching the app"* | 시작화면(스플래시)이 걷히는 것까지 담는다 |
| 2 | 로그인 없이 **암 정보·병원·원격협진 소개**를 둘러본다 | 앱의 목적 | 계정 없이도 쓸 수 있음을 보여준다 |
| 3 | **AI 상담**을 열어 질문 하나를 넣는다 | 사용자 생성 콘텐츠(UGC) | 답변에 「의료진 검토 안내」가 뜨는 것까지 |
| 4 | 로그인 화면에서 **「Apple로 계속하기」** 로 가입·로그인 | **가입 + 로그인** | 🔴 **빌드 3이어야 여기서 안 멈춘다** |
| 5 | 로그아웃 → `patient@test.com` 으로 **이메일 로그인** | 심사용 계정 | 비밀번호는 심사 정보칸의 값 |
| 6 | 문의 상세에서 **검사지 사진 첨부** | UGC + **사진 접근 권한창** | 권한창이 뜨는 순간을 꼭 담는다 |
| 7 | 원격협진 → 예약된 상담 **「입장」** | **카메라·마이크 권한창** · 네이티브 가치(4.2 방어) | 시연용 방을 미리 넣어 뒀다(아래 참고) |
| 8 | 더보기 → **계정 · 개인정보 → 계정 탈퇴** | **계정 삭제**(5.1.1(v)) | 🔴 **4번에서 만든 애플 계정으로 지운다.** `patient@test.com` 으로 지우면 **심사관 계정이 사라진다** |
| 9 | (설명만) 앱 안에 **결제·구독이 없다** | 유료 흐름 | 화면에 보여줄 것이 없으니 회신 글로 적는다 |

**시연용 상담방**: `patient@test.com` 계정에 2026-12-31 예약을 하나 넣어 뒀다
(`consultation_sessions.id = 40fda4c3-ea14-4c68-bd1e-e0cb63a77691`, **`is_test = true`** 라 KHIDI 실적에 안 잡힌다).
「원격협진 이력」 화면에 **「입장」** 버튼으로 뜬다. 심사관도 같은 방에 들어갈 수 있다.

⚠️ **이메일로 «가입»하는 장면은 대본에서 뺐다.** 가입하면 인증 메일 링크를 눌러야 끝나서(2026-08-26 실측)
녹화가 메일함으로 새어 나간다. 애플이 원하는 「가입」은 4번(애플 로그인)으로 충족된다.

---

## ✉️ 회신 영문 (그대로 복붙)

```
Hello,

Thank you for the additional review. Please find the requested information below.
A screen recording captured on a physical iPhone is attached.

1) VIDEO OF THE APP IN USE
Attached. Recorded on a physical iPhone. It shows: app launch, browsing without an
account, AI consultation chat (user-generated content), account creation and sign-in
via Sign in with Apple, uploading a medical document (photo permission prompt),
joining a video consultation (camera and microphone permission prompts), and full
in-app account deletion.

2) DEVICES AND OS VERSIONS TESTED
- iPhone (physical device) - used for the attached recording. [모델·iOS 판올림 번호를 여기에]
- iPad - the build is universal; no iPad-specific code paths exist.
Our app renders the same responsive interface on all screen sizes.

3) WHAT THE APP DOES, AND FOR WHOM
healwith is a cancer-care concierge for international patients, primarily Russian
speaking patients in Kazakhstan and the CIS region, who need treatment in Korea.
The problem we solve: these patients cannot read Korean hospital information, cannot
reach Korean oncology departments directly, and have no way to obtain a second opinion
before spending money on international travel.

The app provides: multilingual cancer and hospital information (6 languages), an AI
assistant that answers care questions, a structured intake form that our coordinators
turn into a hospital referral, video consultation with Korean specialists including
live interpretation, document sharing, and post-treatment follow-up scheduling.

IMPORTANT: We do not diagnose, prescribe, or provide treatment. We provide information
and coordinate access to licensed Korean hospitals. Every AI answer carries a notice
that it is not a medical diagnosis and must be reviewed by a physician.

Native capabilities used: push notifications (APNs/FCM) for consultation updates,
and camera and microphone for WebRTC video consultations.

4) HOW TO ACCESS ALL FEATURES
Most of the app is usable without an account (cancer information, hospital directory,
AI consultation, inquiry submission). For account-gated features, use the demo account
entered in App Review Information:
  User name: patient@test.com
  Password:  (as entered in the App Review Information section)
This account has existing inquiries and a scheduled video consultation so that every
screen has real content. Sign in with Apple and Sign in with Google are also available
and create a working account immediately.

5) THIRD-PARTY SERVICES
- Supabase - authentication, database, encrypted file storage (patient data at rest is
  additionally encrypted with AES-256-GCM by our own server before storage).
- Google Gemini (Google LLC, United States) - the AI assistant. This is disclosed to
  users in all six languages in our privacy notice, as required by Guideline 5.1.1(i).
- LiveKit - WebRTC infrastructure for the video consultation.
- Firebase Cloud Messaging (Google) - push notifications.
- Google Analytics - anonymous product usage measurement, not linked to accounts.
- Resend - transactional email (sign-up confirmation, notifications).
- Google Maps / Places - hospital locations.
- Vercel - application hosting.
There is NO advertising SDK, NO third-party tracking for advertising purposes, and NO
sale or sharing of user data. The App Tracking Transparency prompt is therefore not
applicable.

6) REGIONAL DIFFERENCES
None. The same features are available in every region where the app is distributed.
Only the interface language differs (Korean, English, Russian, Kazakh, Chinese,
Japanese), selected by the user or inferred from the device language.

7) REGULATED INDUSTRY - AUTHORIZATION TO OPERATE
Our services fall under Korea's medical tourism framework, and we hold the required
government registration.

  Registered entity:   Bonroi (sole proprietorship)
  Business reg. no.:   463-35-00902
  Registration:        Foreign Patient Attraction Business Registration
                       No. A-2026-01-02-06761
  Issued by:           Mayor of Seoul Metropolitan Government
  Legal basis:         Act on Support for Overseas Expansion of Healthcare System and
                       Attraction of Foreign Patients, Article 6(5)
  Valid:               2026-03-11 to 2029-03-10
  Mandatory surety:    Seoul Guarantee Insurance, KRW 100,000,000, beneficiary =
                       Korea Health Industry Development Institute (KHIDI)
                       (this insurance is a legal precondition of the registration)

Copies of the registration certificate and the surety bond are attached.

To be precise about our scope: this registration authorizes us to ATTRACT and COORDINATE
foreign patients for licensed Korean medical institutions. We are not a medical provider.
Medical care is delivered by the partner hospitals, by their own licensed physicians,
under their own licenses. Our role is information, matching, interpretation, and
coordination.

Thank you for your time. Please let us know if anything else would help the review.

Best regards,
Juyoung Kang
Bonroi / healwith
```

## 📎 같이 올릴 파일

| 파일 | 어디 있나 |
|---|---|
| 실기기 화면 녹화 | Assel 아이폰에서 촬영 후 |
| 유치사업자 등록증 | `C:\Users\user\Documents\테플러\2025 정부지원과제\02. 본로이\90. 본로이 서류\03. 인증, 협약 서류\` |
| SGI 보증보험 증권 | 같은 폴더 |

⚠️ 등록증·보험증권은 **한국어 서류**다. 애플이 영문을 요구하면 그때 번역본을 붙인다
(먼저 원본을 내고, 요구가 오면 대응하는 쪽이 빠르다).
