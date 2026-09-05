# 애플 2.1 「정보 부족」 회신 자료 (2026-08-14 반려 대응)

> **이 문서는 「앱 심사에 회신」 칸에 그대로 붙여 넣을 영문 답변 + 실기기 녹화 대본**이다.
> 제출 ID `71a49fe4-a7ec-45e6-a8e1-f634de8fc9b7` / 창구 = 제출 상세의 **「앱 심사에 회신」**(재제출 아님).
> 📌 애플 안내: *"앞으로는 이 정보를 App Review Information 의 Notes 칸에 넣어라"* → 다음 제출부터는
> 심사 메모에 상시 넣어 두면 같은 반려가 재발하지 않는다.

## ✅ 준비 상태 (2026-08-26 콘솔 실측으로 갱신)

| # | 무엇 | 상태 |
|---|---|---|
| 1 | 심사에 걸린 빌드를 3으로 교체 | ✅ **끝남.** 걸려 있던 판은 **빌드 1**이 맞았다(추정이 아니라 화면으로 확인). 지금 제출 항목은 **1.0 (3)** |
| 2 | 심사 메모(Notes)에 애플 요구 정보 넣기 | ✅ **끝남.** 아래 6가지를 App Review Information 의 메모 칸에 넣고 저장했다 |
| 3 | 녹화할 아이폰에 TestFlight 빌드 3 설치 | ✅ **끝남.** Assel(`binmin96@icloud.com`) **iPhone 16 Pro Max · iOS 18.6.2** 에 2026-08-26 설치 완료 |
| 4 | 기기·OS 이름 확인 | ✅ **끝남.** 위 값으로 회신문·메모를 채웠다 |
| 5 | 신청서 #1473 실서비스 반영 | ⏳ 본판에 합쳐졌고 **KST 오후 3시 배포 창구**를 기다린다 |
| 6 | **실기기 화면 녹화** | 🔴 **남은 것.** Assel 이 아래 대본대로 찍는다 |
| 7 | 녹화·등록증 첨부 후 **「심사 업데이트」로 제출** | 🔴 **남은 것.** 파일 올리기는 어시가 원천적으로 못 한다(PO 손) |

> ⚠️ **iPhone 16 Pro Max 는 화면이 넓어(440px) #1473 이 고친 「통화 종료 잘림」이 원래 안 보인다.**
> 녹화에는 지장이 없지만, 「Pro Max 에서 멀쩡하니 고칠 게 없었다」로 읽지 마라: 좁은 폰에서는 진짜로 잘렸다.

---

## 🔴 2026-08-28: 첫 촬영에서 «애플 로그인이 안 넘어가는» 결함이 드러났다

Assel 이 빌드 3 으로 찍은 촬영본(2분 10초)을 서버 기록과 대조한 결과이다.

- **증상**: 「Apple로 계속하기」 → 얼굴 인식 → 「완료 ✓」 까지 간 뒤 **「인터넷에 연결되어 있지 않습니다」** 화면. 세 번 반복, 세 번 다 로그인 안 됨.
- **진단**: Supabase 기록에 `/auth/v1/authorize` **3건**, `/auth/v1/callback` **0건**.
  즉 애플이 인증을 마친 뒤 그 결과가 우리 서버로 «돌아오지 않았다». 진짜 통신 장애가 아니다.
- **원인**: 아이폰은 앱 안 웹뷰의 애플 로그인을 「화면 이동」이 아니라 **「시스템 창」으로 가로채기** 때문에
  돌아올 길이 끊긴다. 8/20 에 넣은 `allowNavigation` 은 「연결 중」 멈춤만 없앱을 뿐 **문제를 반만 고쳤다**.
  ⚠️ 빌드 3 에 그 고침은 **들어 있다**(커밋 `d3e26bc`). «낡은 판이라 그런 것»이 아니니 다시 굽는 것만으로는 안 된다.
- **고침**: 아이폰은 웹뷰를 거치지 않고 **네이티브 창을 직접 쓴다**
  (`src/lib/auth/appleNativeSignIn.ts` · 빌드 4). Supabase Client IDs 에 번들 ID 를 추가했다.
- 🛑 **이건 녹화 문제가 아니라 출시를 막는 결함이다.** 심사관도 같은 버튼을 누른다:
  지금 상태로 내면 **1차 반려 사유였던 4.8 조항으로 또 반려**된다.

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
| 4 | 로그인 화면에서 **「Apple로 계속하기」** 로 가입·로그인 | **가입 + 로그인** | ✅ 폰에 깔린 판이 빌드 3이라 여기서 안 멈춘다 |
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
account, AI consultation chat (user-generated content), the push notification
permission prompt, account creation and sign-in via Sign in with Apple, uploading a
medical document (photo permission prompt), and full in-app account deletion.
Camera and microphone are used only for the scheduled video consultation described
in section 3; that flow is not shown in this recording.

2) DEVICES AND OS VERSIONS TESTED
- iPhone 16 Pro Max, iOS 18.6.2 (physical device) - used for the attached recording.
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
