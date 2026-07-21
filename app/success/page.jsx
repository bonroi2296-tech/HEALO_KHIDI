import { permanentRedirect } from "next/navigation";

// 고아 페이지 정리(2026-07-02 전수 감사): 어떤 라이브 경로도 여기로 안 보냄
// (sessionStorage 'inquiry_success' setter 는 archive/dead-code 에만 존재).
// 남아있던 화면은 '홈으로' 버튼이 noop·접수번호가 랜덤 가짜였음 → 통합 퍼널로 영구 이동.
export default function Success() {
  permanentRedirect("/inquiry");
}
