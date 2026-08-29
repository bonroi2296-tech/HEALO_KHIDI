"use client";

/**
 * 앱(스토어 셸) 안에서 「Google로 계속하기」를 «회색으로 잠그고» 그 이유를 한 줄로 알려준다.
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
 * 그래서 «되지도 않는 버튼을 눌러 영영 기다리게 두는 것»보다 못 한다고 말하는 편이 낫다.
 * ⚠️ 이건 임시 조치다. 진짜 고침은 «네이티브 구글 로그인»(애플과 같은 방식 —
 *    `src/lib/auth/appleNativeSignIn.ts` 참고)이고, 그건 구글 클라우드 콘솔에 안드로이드·iOS
 *    클라이언트 ID 등록 + 앱 재빌드가 필요하다. 그게 끝나면 이 파일을 지워라.
 *
 * ⚠️ 웹(브라우저)에는 «아무 영향 없다» — 거기선 시작과 끝이 같은 브라우저라 정상 동작한다.
 *    판정은 반드시 useEffect 안에서 한다(서버 렌더엔 navigator 가 없어 수화 불일치가 난다).
 */

import { useSyncExternalStore } from "react";
import { isNativeApp } from "@/lib/isNativeApp";

// 앱인지 여부는 «절대 안 바뀐다» → 구독은 빈 함수(알림이 올 일이 없다).
const neverChanges = () => () => {};

/**
 * 지금 화면이 앱 안이라 구글 로그인이 끝까지 못 가는 상태인가.
 * 서버 렌더에서는 항상 false 를 돌려주므로 수화(hydration) 불일치가 나지 않는다.
 */
export function useGoogleBlockedInApp() {
  return useSyncExternalStore(neverChanges, isNativeApp, () => false);
}

// 활성 6개 언어 인라인 (공용 i18n 미수정 — 이 파일이 지워질 임시 조치라서).
// 큰따옴표 안의 말은 «그 화면에 실제로 찍혀 있는 버튼 글자»와 같아야 한다
// (`login.forgot` 값 그대로 — 다르면 사용자가 그 버튼을 못 찾는다).
const NOTICE = {
  signin: {
    ko: "앱에서는 Google 로그인이 아직 안 돼요. 이메일이나 Apple로 로그인해 주세요. Google로 가입하셨다면 「비밀번호 찾기」로 비밀번호를 만들면 됩니다.",
    en: 'Google sign-in doesn’t work in the app yet. Please use email or Apple. If you signed up with Google, create a password from "Forgot?".',
    ru: "Вход через Google пока не работает в приложении. Войдите по эл. почте или через Apple. Если вы регистрировались через Google, создайте пароль через «Забыли пароль?».",
    kz: "Қолданбада Google арқылы кіру әзірге жұмыс істемейді. Электрондық пошта немесе Apple арқылы кіріңіз. Google арқылы тіркелген болсаңыз, «Ұмыттыңыз ба?» арқылы құпиясөз жасаңыз.",
    zh: "应用内暂时无法使用 Google 登录。请使用邮箱或 Apple 登录。若您通过 Google 注册，请从“忘记密码？”设置密码。",
    ja: "アプリではGoogleログインがまだご利用いただけません。メールまたはAppleでログインしてください。Googleで登録された方は「パスワードをお忘れですか？」からパスワードを設定できます。",
  },
  signup: {
    ko: "앱에서는 Google 가입이 아직 안 돼요. 이메일이나 Apple로 가입해 주세요.",
    en: "Signing up with Google doesn’t work in the app yet. Please use email or Apple.",
    ru: "Регистрация через Google пока не работает в приложении. Зарегистрируйтесь по эл. почте или через Apple.",
    kz: "Қолданбада Google арқылы тіркелу әзірге жұмыс істемейді. Электрондық пошта немесе Apple арқылы тіркеліңіз.",
    zh: "应用内暂时无法使用 Google 注册。请使用邮箱或 Apple 注册。",
    ja: "アプリではGoogleでの登録がまだご利用いただけません。メールまたはAppleでご登録ください。",
  },
};

export default function GoogleInAppNotice({ langCode, variant = "signin" }) {
  const table = NOTICE[variant] || NOTICE.signin;
  return (
    <p className="mt-2 text-xs leading-relaxed text-gray-500 break-keep">
      {table[langCode] || table.en}
    </p>
  );
}
