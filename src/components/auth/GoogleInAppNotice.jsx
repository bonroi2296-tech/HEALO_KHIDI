"use client";

/**
 * 앱(스토어 셸) 안에서 「Google로 계속하기」를 «잠그고» 왜 잠갔는지·그럼 어떻게 들어가는지 알려준다.
 *
 * 왜 잠그나 (2026-08-29 실측으로 확정 — 가설 아님):
 *   이 앱은 라이브로드(웹을 그대로 띄움)라 로그인 화면도 웹과 같은 것을 쓴다. 그런데
 *   구글은 «앱에 박힌 브라우저(웹뷰) 안에서의 로그인»을 정책으로 막기 때문에,
 *   `capacitor.config.ts` 는 `accounts.google.com` 을 일부러 «앱 밖 브라우저(크롬)»로 내보낸다.
 *   → 로그인은 크롬에서 «성공»하는데, 돌아오는 주소(`/auth/callback`)도 크롬에서 열린다.
 *   → 그런데 PKCE 검증값(code_verifier)은 «앱 웹뷰의 쿠키»에 있다. 크롬에는 없다.
 *   → 서버가 코드를 세션으로 못 바꾼다. 앱은 「Google에 연결 중...」인 채로 영영 멈춘다.
 *
 *   2026-08-29 04:59 KST PO 갤럭시 실기기 기록:
 *     · Supabase `auth_logs`: /authorize 03:59:17 → /callback 03:59:22 **login 성공(provider=google)**
 *     · Vercel `/auth/callback`: "PKCE code verifier not found in storage.
 *        This can happen if the auth flow was initiated in a different browser or device"
 *     · 같은 24시간 안에 구글 로그인이 «끝까지 간» 건 0건 (애플·이메일은 정상)
 *
 * 🔴 **안내 문구는 «막다른 길»을 가리키면 안 된다** (2026-08-29 독립 리뷰가 잡음).
 *    처음엔 「비밀번호 찾기로 비밀번호를 만들라」고 적었는데 **그 길은 닫혀 있다** —
 *    `app/api/auth/forgot-password/route.ts` 는 소셜 전용 계정이면 재설정 메일 대신
 *    «로그인 화면에서 Google 버튼을 누르세요» 안내 메일을 보낸다. 즉 방금 잠근 그 버튼으로 되돌린다.
 *    → 구글로 가입한 사람에게 «실제로 되는» 유일한 길은 **폰 브라우저에서 여는 것**이다.
 *      실측(2026-08-29, 로컬 실서비스 코드): 일반 브라우저에서 구글 버튼을 누르면
 *      `sb-...-code-verifier` 쿠키가 SameSite=Lax 로 «그 브라우저에» 심긴다 →
 *      구글에서 돌아오는 최상위 이동에 그대로 실려 교환이 성립한다. 앱과 갈리는 지점이 이것이다.
 *
 * ⚠️ 이건 임시 조치다. 진짜 고침은 «네이티브 구글 로그인»(애플과 같은 방식 —
 *    `src/lib/auth/appleNativeSignIn.ts` 참고). 그게 붙으면 이 파일과 `src/index.css` 의
 *    「앱에서 구글 잠금」 블록을 같이 지워라.
 *
 * ⚠️ 웹(브라우저)에는 «아무 영향 없다» — 거기선 시작과 끝이 같은 브라우저라 정상 동작한다.
 *
 * 🎨 **왜 CSS 로도 잠그나 (깜빡임)**: `app/layout.jsx` 가 첫 그림 «전에» head 인라인으로
 *    `<html data-healo-native="1">` 를 붙인다. 그래서 잠금·안내는 **CSS 가 먼저** 그린다
 *    (`src/index.css` 의 `html[data-healo-native="1"] .app-google-lock*`). 리액트 수화를 기다리면
 *    느린 웹뷰에서 «멀쩡한 버튼 → 회색으로 바뀜» 깜빡임이 난다. 리액트 쪽 `disabled`·
 *    `aria-describedby` 는 그 «뒤에» 붙어 의미(스크린리더)를 채운다 — 둘은 짝이다.
 *
 * 🌐 **언어는 활성 6개**(`src/lib/i18n/config.js` 의 `LOCALES`)만 인라인으로 담는다.
 *    바로 위 `FIND_ID_LABEL`·`FindIdClient` 의 문구표와 같은 규약이고, 이 파일은 곧 지울 임시물이라
 *    공용 사전(21개 언어)을 건드리지 않는다. 그 외 언어는 `en` 으로 떨어진다.
 */

import { APPLE_LOGIN_ENABLED } from "@/components/auth/AppleSignInButton";

// 활성 6개 언어. 「폰 브라우저에서 열어라」가 구글 가입자에게 유일하게 «되는» 길이라 맨 앞에 온다.
const NOTICE = {
  signin: {
    ko: "앱에서는 Google 로그인이 아직 안 돼요. Google로 가입하셨다면 폰 브라우저에서 healwith.co.kr 을 열어 로그인해 주세요.",
    en: "Google sign-in doesn’t work in the app yet. If you signed up with Google, open healwith.co.kr in your phone’s browser and sign in there.",
    ru: "Вход через Google пока не работает в приложении. Если вы регистрировались через Google, откройте healwith.co.kr в браузере телефона и войдите там.",
    kz: "Қолданбада Google арқылы кіру әзірге жұмыс істемейді. Google арқылы тіркелген болсаңыз, телефон браузерінде healwith.co.kr сайтын ашып кіріңіз.",
    zh: "应用内暂时无法使用 Google 登录。若您通过 Google 注册，请在手机浏览器中打开 healwith.co.kr 登录。",
    ja: "アプリではGoogleログインがまだご利用いただけません。Googleで登録された方は、スマホのブラウザで healwith.co.kr を開いてログインしてください。",
  },
  signup: {
    ko: "앱에서는 Google 가입이 아직 안 돼요. 폰 브라우저에서 healwith.co.kr 을 열어 가입하시면 됩니다.",
    en: "Signing up with Google doesn’t work in the app yet. Open healwith.co.kr in your phone’s browser to sign up with Google.",
    ru: "Регистрация через Google пока не работает в приложении. Откройте healwith.co.kr в браузере телефона, чтобы зарегистрироваться через Google.",
    kz: "Қолданбада Google арқылы тіркелу әзірге жұмыс істемейді. Телефон браузерінде healwith.co.kr сайтын ашып тіркеліңіз.",
    zh: "应用内暂时无法使用 Google 注册。请在手机浏览器中打开 healwith.co.kr 进行注册。",
    ja: "アプリではGoogleでの登録がまだご利用いただけません。スマホのブラウザで healwith.co.kr を開いてご登録ください。",
  },
};

// 둘째 문장 — 이 화면에서 «지금 바로» 되는 것.
// ⚠️ 애플 버튼은 env 스위치(`NEXT_PUBLIC_APPLE_LOGIN_ENABLED`)로 꺼지면 «아예 안 그려진다»
//    (`AppleSignInButton` 첫 줄). 꺼진 화면에서 「Apple로 하세요」라고 하면 없는 버튼을 가리킨다.
const ALTERNATIVE = {
  signin: {
    withApple: {
      ko: "이메일이나 Apple 계정이 있으면 여기서 바로 로그인됩니다.",
      en: "If you have an email or Apple account, you can sign in right here.",
      ru: "Если у вас есть аккаунт с эл. почтой или Apple, войдите прямо здесь.",
      kz: "Электрондық пошта немесе Apple тіркелгіңіз болса, осы жерден кіре аласыз.",
      zh: "若您有邮箱或 Apple 账户，可直接在此登录。",
      ja: "メールまたはAppleのアカウントがあれば、この画面でログインできます。",
    },
    emailOnly: {
      ko: "이메일 계정이 있으면 여기서 바로 로그인됩니다.",
      en: "If you have an email account, you can sign in right here.",
      ru: "Если у вас есть аккаунт с эл. почтой, войдите прямо здесь.",
      kz: "Электрондық пошта тіркелгіңіз болса, осы жерден кіре аласыз.",
      zh: "若您有邮箱账户，可直接在此登录。",
      ja: "メールのアカウントがあれば、この画面でログインできます。",
    },
  },
  signup: {
    withApple: {
      ko: "이메일이나 Apple로는 여기서 바로 가입됩니다.",
      en: "You can sign up right here with email or Apple.",
      ru: "Зарегистрироваться по эл. почте или через Apple можно прямо здесь.",
      kz: "Электрондық пошта немесе Apple арқылы осы жерден тіркеле аласыз.",
      zh: "使用邮箱或 Apple 可直接在此注册。",
      ja: "メールまたはAppleでは、この画面でそのまま登録できます。",
    },
    emailOnly: {
      ko: "이메일로는 여기서 바로 가입됩니다.",
      en: "You can sign up right here with email.",
      ru: "Зарегистрироваться по эл. почте можно прямо здесь.",
      kz: "Электрондық пошта арқылы осы жерден тіркеле аласыз.",
      zh: "使用邮箱可直接在此注册。",
      ja: "メールでは、この画面でそのまま登録できます。",
    },
  },
};

/**
 * 안내문. **항상 그린다** — 보이고 안 보이고는 CSS 가 정한다(위 「깜빡임」 주석).
 * `id` 는 잠긴 버튼의 `aria-describedby` 가 가리키는 짝이라 화면마다 달라야 한다.
 */
export default function GoogleInAppNotice({ id, langCode, variant = "signin" }) {
  const table = NOTICE[variant] || NOTICE.signin;
  const altSet = ALTERNATIVE[variant] || ALTERNATIVE.signin;
  const alt = APPLE_LOGIN_ENABLED ? altSet.withApple : altSet.emailOnly;
  return (
    <p id={id} className="app-google-lock-note mt-2 text-xs leading-relaxed text-gray-500 break-keep">
      {table[langCode] || table.en}{" "}
      {(alt[langCode] || alt.en)}
    </p>
  );
}
