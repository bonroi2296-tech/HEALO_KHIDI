import OpinionClient from "./OpinionClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 전문의 소견 요청 — 비공개 토큰 링크(검색 색인 금지, 로그인 불필요).
//
// ⚠️ 받는 사람은 «환자가 아니라 한국 전문의»다. 헷갈리기 쉬우니 근거를 박아 둔다 —
//    app/api/coordinator/opinions/route.ts 의 buildSummary() 가 «카톡 붙여넣기용 요약»을 만들고
//    본문이 "아래 링크에서 검사지·상세를 보시고 소견 부탁드립니다(로그인 불필요)" 이다.
//    그래서 OpinionClient 안쪽 문구가 한국어인 건 **버그가 아니라 맞는 것**이다.
//    (2026-08-31: 이걸 「환자용인데 한국어로 새는 화면」으로 잘못 읽고 69개 문구를 번역할 뻔했다.
//     화면의 «독자»를 먼저 확인하고 고칠 것.)
//
// 2026-08-31 에 여기서 실제로 고친 것 둘:
//  ① 탭 제목이 정적 한국어 "전문의 소견 요청 — healwith" 였고, 루트 template("%s | healwith")이
//     또 붙어 「… — healwith | healwith」로 브랜드가 두 번 떴다 — /claim 에서 이미 한 번 고친 버그다.
//     이제 사전 값에 브랜드가 한 번만 들어간다. 문구는 «소견을 주는 의사» 기준으로 썼다.
//  ② proxy.ts 의 GUEST_LINK_PREFIXES 에 "/opinion/" 이 빠져 있어서 <html lang> 이 **항상 en** 이었다
//     (실측: Accept-Language: ko 로 열어도 en). 한국어 화면에 lang="en" 이 박히는 건
//     스크린리더·번역기·검색엔진 모두에게 틀린 신호다. 목록에 넣어 방문자 언어를 따르게 했다.
//
// ⚠️ alternates: null 은 «안전벨트»다 — 지금은 없어도 결과가 같다(/opinion 은 PUBLIC_PREFIXES 밖이라
//    x-pathname 이 없고, 그러면 루트 layout 이 alternates 를 아예 안 낸다). 나중에 공개 경로로
//    옮겨지면 그때 이 줄이 noindex+canonical 동시선언을 막아 준다.
// ⚠️ base 는 «이름 붙인 상수»여야 한다 — seoMeta.test.ts 정규식이 `localizedMeta(식별자, "키", "키")`
//    를 물기 때문에, 인라인 객체로 넘기면 이 화면이 ru/kz 키릴 검사에서 조용히 빠진다.
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.opinion.title", "seo.opinion.desc");
}

export default async function OpinionPage({ params }) {
  const { token } = await params;
  return <OpinionClient token={token} />;
}
