# 「애플로 로그인」 켜는 절차 — 애플 심사 4.8 대응

> 2026-08-05 애플 1차 반려의 **두 번째 사유**(Guideline 4.8 Login Services)를 닫기 위한 문서.
> 코드는 이미 들어가 있고 **스위치 하나로 켜진다.** 다만 켜기 «전»에 아래 등록을 끝내야 한다 —
> 등록 없이 켜면 버튼을 눌렀을 때 오류가 난다(그래서 기본값이 꺼짐이다).

## 왜 필요한가

애플 원문: *"The app uses a third-party login service, but does not appear to offer as an equivalent login option another login service"*.
동등한 대안의 조건 3가지 —

1. 수집이 **이름·이메일로 한정**
2. 사용자가 **이메일을 모든 당사자에게 비공개**로 할 수 있음
3. 동의 없이 **광고 목적 활동 수집 없음**

⚠️ **우리 이메일 가입은 2번(이메일 숨기기)을 만족하지 못한다** — 이메일이 곧 아이디라서.
그래서 「회신으로 설명하고 넘어가기」는 불가능하고, **「애플로 로그인」이 사실상 유일한 답**이다.

## 지금 상태

| | 상태 |
|---|---|
| 버튼·오류처리 코드 | ✅ 있음 (`src/components/auth/AppleSignInButton.jsx`) |
| 로그인·가입 화면 연결 | ✅ 있음 (`app/login/LoginClient.jsx`, `app/signup/SignupClient.jsx`) |
| 문구 6개 언어 | ✅ 있음 (`auth.appleContinue` / `auth.appleConnecting` / `auth.appleError`) |
| 애플 개발자 콘솔 등록 | ❌ **안 됨** |
| Supabase 인증 설정 | ❌ **안 됨** |
| 스위치 | ❌ 꺼짐 (`NEXT_PUBLIC_APPLE_LOGIN_ENABLED`) |

## 해야 할 등록 (PO 손 — 비밀번호·키 발급이라 어시가 못 함)

### 1. 애플 개발자 콘솔 — [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers)

1. **App ID** `kr.co.healwith.app` 에서 **Sign In with Apple** 능력을 켠다.
2. **Services ID** 를 새로 만든다(예: `kr.co.healwith.app.web`). 이게 웹에서 쓰는 「클라이언트 ID」다.
   - Sign In with Apple 켜고 **Configure** 에서
   - Primary App ID = `kr.co.healwith.app`
   - Domains = `hvwwlkawaxabhtumjhrg.supabase.co`
   - Return URLs = `https://hvwwlkawaxabhtumjhrg.supabase.co/auth/v1/callback`
3. **Key** 를 만든다(Keys → +) — Sign In with Apple 체크, Primary App ID 지정.
   - 내려받은 **`.p8` 파일은 한 번만 받을 수 있다.** 잃어버리면 새로 만들어야 한다.
   - **Key ID** 와 **Team ID** 를 같이 적어둔다.

### 2. Supabase — 인증 설정

프로젝트 `hvwwlkawaxabhtumjhrg` → Authentication → Sign In / Providers → **Apple** 켜기

- Client IDs: 위에서 만든 **Services ID**
- Secret Key: `.p8` 파일 내용 + **Key ID** + **Team ID**
- Callback URL 은 Supabase 가 알려주는 값을 애플 Return URLs 와 **글자 그대로** 맞춘다.

### 3. 스위치 켜기

실서비스 환경변수에 넣는다:

```
NEXT_PUBLIC_APPLE_LOGIN_ENABLED=true
```

넣고 배포하면 로그인·가입 화면에 「Apple로 계속하기」가 나타난다.

## 확인 방법

1. 실서비스 로그인 화면에 버튼이 보이는지
2. 눌러서 애플 로그인 화면이 뜨고, 돌아와서 로그인 상태가 되는지
3. **앱(웹뷰)에서도** 되는지 — 구글 로그인과 같은 이유로 바깥 브라우저로 나갔다 돌아온다
   (`capacitor.config.ts` 의 `allowNavigation` 이 비어 있어 애플 주소도 자동으로 바깥으로 나간다)

## 주의

- ⛔ **등록을 끝내기 전에 스위치를 켜지 마라.** 버튼은 보이는데 누르면 오류 = 애플 심사에서 더 나쁘다.
- 애플 재제출은 **첫 번째 사유(개인 → 사업자 계정 전환)** 가 풀린 뒤에나 의미가 있다. 순서를 지켜라.
