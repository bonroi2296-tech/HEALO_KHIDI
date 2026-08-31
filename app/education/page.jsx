import EducationClient from "../patient/education/EducationClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// ⚠️ 이 화면이 «진짜» 교육자료 페이지다 — proxy.ts 의 PUBLIC_PREFIXES 안이라 /ru/education 이
//    검색에 색인된다. 그런데 2026-08-31 오전까지 제목·설명이 영어 고정이라 러·카 검색 결과가
//    영어로 떴다. (같은 날 번역 키가 app/patient/education 에 먼저 붙었는데 그쪽은 곧바로
//    이 주소로 되돌리는 «죽은 문»이라 제목이 뜰 일이 없다 — 실측으로 확인하고 이리로 옮겼다.)
// ⚠️ base 는 반드시 «이름 붙인 상수»로 넘겨라(인라인 객체 금지) — seoMeta.test.ts 의 정규식이
//    `localizedMeta(식별자, "키", "키")` 를 맞추므로, 인라인이면 이 화면이 ru/kz 검사에서 조용히 빠진다.
const baseMeta = {
  keywords: ["cancer education", "post-treatment care", "patient guide", "cancer recovery"],
  // openGraph·twitter 를 «키만» 둔다 → localizedMeta 가 언어화된 제목·설명으로 채우고,
  // 공개 화면이므로 og:url(canonical)도 같이 넣는다.
  openGraph: {},
  twitter: { card: "summary" },
};

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientEducation.title", "seo.patientEducation.desc");
}

export default function PublicEducationPage() {
  return <EducationClient />;
}
