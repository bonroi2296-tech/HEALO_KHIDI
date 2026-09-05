/**
 * 진행상황 주소(공개 케이스 링크) — 만드는 곳 한 군데.
 *
 * 규칙 하나: **접수되면 들어온 그 채널로 이 주소를 돌려준다**(PO 결정 2026-08-03).
 *  - 공개 문의 폼 → 완료 화면 + 접수 확인 메일
 *  - 왓츠앱·텔레그램 → 그 대화창에 한 줄
 *  - 우리가 손으로 넣은 건 → 코디 인박스의 복사 버튼
 * 세 곳이 서로 다른 주소를 만들면 안 되므로 URL 조립과 안내 문구를 여기 모았다.
 *
 * 주소 자체는 새로 만들지 않는다 — inquiries.public_token 이 이미 모든 문의에 자동으로 붙는다.
 */

import { normalizeLocaleParam, withLang } from "@/lib/i18n/guestLinkLang";

export type TrackingLang = "ko" | "en" | "ru" | "kz" | "zh" | "ja";

export const TRACKING_LANGS: TrackingLang[] = ["ko", "en", "ru", "kz", "zh", "ja"];

/** 6개 언어로 정규화(kk→kz 포함), 모르면 en. 주소의 ?lang 과 메일 본문 언어가 «같은 자»로 나오게 한 곳에 위임한다(독립 리뷰 2026-09-05). */
export function toTrackingLang(raw?: string | null): TrackingLang {
  return (normalizeLocaleParam(raw) as TrackingLang | null) || "en";
}

/**
 * 진행상황 주소.
 *
 * ⚠️ 언어 prefix 를 «붙이지 않는다». /claim/ 은 proxy.ts 의 GUEST_LINK_PREFIXES 에 있어
 * 방문자 언어(쿠키 → Accept-Language)를 proxy 가 감지해 healo_lang 쿠키로 심어준다 —
 * /consultation/·/survey/ 와 같은 취급. `/ru/claim/...` 같은 주소는 rewrite 대상이 아니라 404 다.
 *
 * 2026-08-04 실측으로 바로잡음: 예전 주석은 «자동 주입된다»고만 적어 서버가 그린 첫 화면도
 * 그 언어인 것처럼 읽혔는데, 실제로는 **첫 화면(서버 렌더)은 항상 영어**다 — page.jsx 가
 * proxy 의 x-locale 헤더를 안 읽어 LangProvider 가 기본값 en 으로 그린다. 브라우저가 켜진
 * 뒤에야 쿠키를 읽어 제 언어로 바뀐다(러시아어로 끝까지 확인함). 즉 «잠깐 영어가 스쳤다가
 * 제 언어»가 현재 동작이고, 최종 언어는 맞다.
 */
export function trackingUrl(baseUrl: string, publicToken: string, lang?: string | null): string {
  // 2026-09-05: 받는 사람 언어를 주소에 싣는다(?lang=). 메신저 미리보기 봇은 쿠키·Accept-Language 가 없어
  // 카드가 늘 영어였다 — 주소 안에 언어가 있어야 봇도 제 언어 카드를 만든다. 모르면 안 붙인다(withLang).
  return withLang(`${baseUrl.replace(/\/+$/, "")}/claim/${encodeURIComponent(publicToken)}`, lang);
}

/**
 * 메신저(왓츠앱·텔레그램)에 한 줄로 보낼 안내. 메일 본문에서도 같은 뜻을 쓴다.
 * 짧게 유지할 것 — 봇 답장 뒤에 바로 붙는 줄이라 길면 대화가 밀린다.
 */
const LINE: Record<TrackingLang, (url: string) => string> = {
  ko: (u) => `문의가 접수됐습니다. 진행 상황은 여기서 언제든 확인하실 수 있어요 (가입 불필요): ${u}`,
  en: (u) => `Your inquiry is registered. You can check the progress here anytime — no sign-up needed: ${u}`,
  ru: (u) => `Ваша заявка принята. Ход дела можно посмотреть здесь в любое время, регистрация не нужна: ${u}`,
  kz: (u) => `Өтініміңіз қабылданды. Барысын кез келген уақытта осы жерден көре аласыз, тіркелу қажет емес: ${u}`,
  zh: (u) => `您的咨询已受理。可随时在此查看进度，无需注册：${u}`,
  ja: (u) => `お問い合わせを受け付けました。進捗はいつでもこちらでご確認いただけます（登録不要）: ${u}`,
};

export function trackingMessageLine(url: string, lang: TrackingLang = "en"): string {
  return (LINE[lang] || LINE.en)(url);
}
