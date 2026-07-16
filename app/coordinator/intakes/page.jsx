import { redirect } from "next/navigation";

// 인테이크 메뉴 정리 (2026-07-15 PO 결정). 이 화면은 상담 세션(/api/khidi/consultation)을
// 그대로 재탕한 '상담 일정'과 중복이었고, '의사 배정' 버튼은 노-옵이었다 — 우리 모델에서
// 의사는 계정 없이 상담방 초대링크로 참여하므로 배정할 doctor_id 개념 자체가 없음(반쪽 #18 부류).
// → 별도 메뉴를 없애고 상담 일정으로 통합. 북마크/딥링크 404 방지를 위해 리다이렉트만 남긴다.
export default function IntakesRedirect() {
  redirect("/coordinator/consultations");
}
