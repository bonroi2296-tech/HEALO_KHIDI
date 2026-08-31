/**
 * /no-access — 로그인은 됐지만 권한이 없는 보호구역에 들어왔을 때의 안내 페이지.
 *
 * 왜: 미들웨어(proxy.ts)가 비관리자를 말없이 /login 으로 되던져서
 *     "로그인 성공 토스트는 뜨는데 또 로그인 화면"인 혼란이 실제로 발생(2026-07-06 PO).
 *     거절 사유와 갈 곳을 알려주는 게 이 페이지의 전부다. 공개 라우트(내용 없음, noindex).
 *
 * 2026-08-31 다국어화. 지켜야 할 것 3가지:
 *  ① **서버 컴포넌트로 유지한다.** "use client" + useLang() 으로 바꾸면 서버 스냅샷(x-locale)과
 *     클라 스냅샷(쿠키)이 갈려 POSTMORTEMS #77 부류의 hydration mismatch 를 새로 만든다.
 *     언어는 서버에서 getUiLocale() 로 고정하고 문자열을 완성해 내려보낸다.
 *  ② **인라인 `const L = {ko:…, ru:…}` 미니사전 금지.** 이 경로는 check-content-consistency 의
 *     PUBLIC_FILE_RE 밖이라 CI 가 안 막지만, 인라인으로 두면 check:i18n(ru/kz 100%)·
 *     check:i18n-quality(용어집)·코디 콘텐츠 편집기 세 그물에서 전부 안 보인다 → 조용히 썩는다.
 *  ③ 문구는 PortalGate 거절 카드와 «같은 사건»이다. otherAccount·goHome 은 그쪽 GATE_TR 값을
 *     그대로 가져왔다(2026-08-25 에 문지기 3벌을 1벌로 합친 그 정리를 되돌리지 않기 위해).
 */

import { getUiLocale, localizedMeta } from "@/lib/i18n/metadata";
import { t } from "@/lib/i18n";

// ⚠️ /no-access 도 proxy.ts 의 PUBLIC_PREFIXES 밖이라 x-locale 이 안 붙는다 →
//    localizedMeta 안쪽의 getUiLocale()(x-locale → healo_lang 쿠키 → en)이 필요하다.
//    alternates: null 은 noindex 화면이 layout 의 canonical/hreflang 을 물려받지 않게 하는 문.
export async function generateMetadata() {
  return localizedMeta(
    { robots: { index: false, follow: false }, alternates: null },
    "seo.noAccess.title",
    "seo.noAccess.desc"
  );
}

// 「{영역} 전용」 치환 템플릿을 못 쓰는 이유: t(key, lang) 은 치환을 지원하지 않고, 무엇보다
// 러시아어·카자흐어는 명사를 슬롯에 끼우면 격·일치가 깨진다(«관리자 전용» = только для
// администраторов — 생격 복수). → 문장을 통째로 2개 둔다. proxy.ts 가 넣는 area 값은
// admin 하나뿐이라(그 외는 폴백) 이 둘로 전수 커버된다.
const AREA_HEADING_KEY = {
  admin: "noAccess.headingAdmin",
};

export default async function NoAccessPage({ searchParams }) {
  const sp = await searchParams;
  const lang = await getUiLocale();
  const headingKey =
    typeof sp?.area === "string" && Object.hasOwn(AREA_HEADING_KEY, sp.area)
      ? AREA_HEADING_KEY[sp.area]
      : "noAccess.headingGeneric";
  const fromRaw = typeof sp?.from === "string" ? sp.from : "";
  // open-redirect 차단: 내부 경로만 재로그인 목적지로 허용 (`//`·`/\` 우회 포함 차단)
  const from =
    fromRaw.startsWith("/") && !fromRaw.startsWith("//") && !fromRaw.startsWith("/\\")
      ? fromRaw
      : "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-3xl mb-3">🔒</p>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{t(headingKey, lang)}</h1>
        <p className="text-sm text-gray-500 mb-6">{t("noAccess.body", lang)}</p>
        <div className="space-y-2">
          <a
            href={`/login?redirect=${encodeURIComponent(from)}`}
            className="block w-full py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition"
          >
            {t("noAccess.otherAccount", lang)}
          </a>
          <a
            href="/coordinator"
            className="block w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
          >
            {t("noAccess.goCoordinator", lang)}
          </a>
          <a href="/" className="block w-full py-2.5 text-gray-400 text-xs hover:text-gray-600 transition">
            {t("noAccess.goHome", lang)}
          </a>
        </div>
      </div>
    </div>
  );
}
