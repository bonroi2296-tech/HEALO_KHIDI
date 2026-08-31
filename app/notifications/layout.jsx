import { localizedMeta } from "@/lib/i18n/metadata";

// 알림 목록(/notifications) — 환자가 보는 화면인데 2026-08-31 까지 셋 다 새고 있었다(실측).
//   ①제목이 루트의 영어 마케팅 문구 ②`<html lang>` 이 Accept-Language 와 무관하게 항상 en
//   ③robots 선언이 아예 없어 «색인 가능» — sitemap 에도 robots.txt Disallow 에도 없는데
//     로그인 없이 200 이 나가므로 크롤러가 들어오면 그대로 색인될 수 있었다.
// 같은 판에서 화면 29곳을 고치면서 여기만 빠져 있었다 — 「환자가 볼 수 있는 화면」 목록을
// 라우트가 아니라 «기억»으로 셌기 때문이다.
//
// ⚠️ page.jsx 가 "use client" 라 metadata 를 못 내보낸다 → 서버 layout 이 필요하다
//    (app/consultation/layout.jsx·app/inquiry/intake/layout.jsx 와 같은 모양).
// ⚠️ 방문자 언어는 proxy.ts 의 VISITOR_LANG_PREFIXES 가 맡는다 — 이 주소는 인증 분기
//    (/admin·/patient·/hospital·/agency·/clinic·/coordinator)에 하나도 안 걸리므로 거기 넣어도
//    «있던 검사가 사라지지» 않는다. 넣기 전에 그 대조를 반드시 다시 하라.
// ⚠️ alternates: null 을 지우지 마라 — x-locale 이 주입되는 순간 루트 layout 이 canonical 을
//    내보내는데, 그 분기는 x-pathname 을 안 붙여서 canonical 이 「그 언어 홈」으로 잘못 찍힌다
//    (2026-08-31 에 로그인 벽 8곳에서 실제로 밟은 사고. seoMeta.test.ts 가 이제 기계로 막는다).
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.notifications.title", "seo.notifications.desc");
}

export default function NotificationsLayout({ children }) {
  return children;
}
