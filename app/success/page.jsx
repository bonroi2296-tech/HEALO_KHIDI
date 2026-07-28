import { permanentRedirect } from "next/navigation";
import { withQuery } from "@/lib/url/withQuery";

// 고아 페이지 정리(2026-07-02 전수 감사): 어떤 라이브 경로도 여기로 안 보냄
// (sessionStorage 'inquiry_success' setter 는 archive/dead-code 에만 존재).
// 남아있던 화면은 '홈으로' 버튼이 noop·접수번호가 랜덤 가짜였음 → 통합 퍼널로 영구 이동.
// 들어올 때 붙어 있던 꼬리표(?utm_source=… 등)를 그대로 넘긴다 —
// 안 넘기면 옛 주소로 들어온 광고 클릭의 «출처»가 조용히 증발한다(withQuery 주석 참고).
export default async function Success({ searchParams }) {
  permanentRedirect(withQuery("/inquiry", await searchParams));
}
