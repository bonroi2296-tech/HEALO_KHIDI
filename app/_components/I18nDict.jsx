"use client";

import { applyClientDict } from "@/lib/i18n";

/**
 * 방문자 언어 사전을 브라우저에 심는다. 심는 길이 «두 갈래»인 게 핵심이다.
 *
 * ① 보통 화면(서버 렌더 + 하이드레이션) — 아래 <script> 가 HTML <head> 에 그대로 실려
 *    React 가 붙기 전에 실행된다. t() 는 화면 곳곳에서 «동기»로 불리므로 이 순서가 필요하다.
 *    (인라인인 이유·외부 파일 대비 FCP 실측은 app/layout.jsx 주석에 있다. 형태를 바꾸지 마라.)
 *
 * ② 404 처럼 «브라우저에서만 그려지는» 화면 — 라우트 안에서 notFound() 가 불리면 Next 는
 *    서버 HTML 로 빈 껍데기(<html id="__next_error__">)만 보내고 레이아웃 전체를 브라우저에서
 *    다시 그린다. 그런데 **React 는 그때 인라인 <script> 를 실행하지 않는다**(콘솔에도
 *    "Scripts inside React components are never executed when rendering on the client" 가 뜬다)
 *    → window.__I18N__ 이 비고 t() 가 값 대신 키를 그린다. 실제로 러시아어·카자흐어 방문자에게
 *    푸터가 「footer.tagline」·「nav.about」으로 보였다(2026-09-10 실서비스 실측).
 *    → 그래서 렌더 본문에서 한 번 더 심는다. 사전 JSON 은 어차피 이 컴포넌트의 prop 으로
 *      RSC 페이로드에 실려 오므로 «없던 바이트를 새로 더하지 않는다».
 *
 * ⚠️ 이 컴포넌트는 <head> 안, ClientShell(헤더·푸터) «위»에 있어야 한다. React 는 위에서
 *    아래로 그리므로, 아래에 두면 푸터가 이미 그려진 뒤에 사전이 도착한다.
 * ⚠️ 렌더 본문에서 동기 적용하는 이유는 I18nOverridesApply 와 같다(useEffect 면 한 박자 늦어
 *    첫 렌더가 키로 그려진다). 재발 검사 = e2e/not-found-locale.spec.ts.
 */
export default function I18nDict({ json }) {
  applyClientDict(json);
  return <script dangerouslySetInnerHTML={{ __html: `window.__I18N__=${json};` }} />;
}
