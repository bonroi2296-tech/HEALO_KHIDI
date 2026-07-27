// 브라우저에 «그 언어 사전 하나»만 내려주는 스크립트.
//
// 왜 있나: 전에는 21개 언어 사전이 통째로 첫 화면 JS 에 들어가 있었다(gzip 269KB —
// 홈 첫 화면 JS 의 43%). 러시아 환자가 한국어·중국어·일본어 사전까지 받았다.
// 이제 layout 이 `<script src="/i18n/ru.js">` 하나만 넣고, 그게 window.__I18N__ 을 채운다.
//
// 왜 dynamic import 가 아니라 스크립트 태그인가: t() 는 화면 곳곳에서 **동기**로 불린다.
// 나중에 도착하는 방식으로 바꾸면 하이드레이션 순간 글자가 빈칸으로 그려졌다가 채워진다
// (6개 언어 전 화면에 깜빡임). layout 의 beforeInteractive 스크립트는 React 가 붙기 전에
// 실행이 보장돼서 그 문제가 없다.
//
// en 값으로 빈칸을 미리 메워 내려준다 → 브라우저가 en 사전을 따로 안 받아도 폴백이 된다.

import { DICTIONARY } from "@/lib/i18n/dictionary";
import { LANG_OPTIONS } from "@/lib/i18n";
import { I18N_VERSION } from "@/lib/i18n/version";

export const dynamic = "force-static";

export function generateStaticParams() {
  return LANG_OPTIONS.map(({ code }) => ({ lang: code }));
}

export async function GET(_req, { params }) {
  const { lang } = await params;
  if (!LANG_OPTIONS.some((l) => l.code === lang)) {
    return new Response("/* unknown language */", {
      status: 404,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  // en 을 깔고 그 위에 해당 언어를 덮는다 = 그 언어에 없는 키는 영어로 채워진 «완성본».
  const merged = lang === "en" ? DICTIONARY.en : { ...DICTIONARY.en, ...(DICTIONARY[lang] || {}) };

  // U+2028/U+2029 는 JS 문자열 안에서 줄바꿈으로 취급돼 그대로 두면 문법 오류가 난다.
  const json = JSON.stringify(merged).replace(
    /[\u2028\u2029]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16)
  );

  const body = `window.__I18N__=Object.assign(window.__I18N__||{},{${JSON.stringify(lang)}:${json}});`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // 주소에 ?v=<배포 식별자> 가 붙어(layout) 배포마다 주소가 바뀐다 → 1년 캐시해도 안 박제된다.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-I18N-Version": I18N_VERSION,
    },
  });
}
