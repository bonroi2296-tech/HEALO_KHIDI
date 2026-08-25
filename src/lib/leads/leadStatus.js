/**
 * healwith: 병원 진료의뢰(hospital_leads) 상태 — 단일 SoR.
 *
 * 왜 생겼나(2026-08-25): 같은 표(hospital_leads)의 같은 상태값을 **두 화면이 다르게 부르고 있었다.**
 *   sent      어드민 「발송됨」 / 병원 「전송됨」
 *   rejected  어드민 「거부됨」 / 병원 「거절」
 *   expired   어드민 「만료됨」 / 병원 「만료」
 *   색도 달랐다 — viewed 는 어드민 보라 / 병원 노랑, converted 는 teal / emerald.
 *   코디가 병원에 「그 건 거부됨 상태예요」라고 말하면 병원 화면엔 그런 말이 없다.
 *   → 라벨·색을 여기 한 곳에 두고 두 화면이 같이 읽는다.
 *
 * ⚠️ 이건 «환자 여정 단계»(src/lib/khidi/caseStatus)와 **다른 것**이다.
 *    여기는 「의뢰서를 병원이 봤나·답했나」 하나의 수명주기고, 저기는 환자가 어느 단계에 있나다.
 *    둘을 한 사전으로 합치려 하지 마라 — 뜻이 다르다.
 *
 * 한국어만 두는 이유: 이 상태를 보는 사람은 국내 제휴 병원과 우리 어드민뿐이다.
 *    (해외 에이전시·클리닉 포털은 이 값을 화면에 쓰지 않는다 — 2026-08-25 확인)
 */
import { Clock, Send, Eye, Reply, CheckCircle, XCircle } from "lucide-react";

// 순서 = 실제 진행 순서. 화면의 목록·필터 순서도 이걸 따른다.
export const LEAD_STATUSES = {
  queued: { label: "대기", badge: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
  sent: { label: "발송됨", badge: "bg-blue-100 text-blue-700 border-blue-200", icon: Send },
  viewed: { label: "조회됨", badge: "bg-amber-100 text-amber-800 border-amber-200", icon: Eye },
  replied: { label: "응답함", badge: "bg-green-100 text-green-800 border-green-200", icon: Reply },
  converted: { label: "치료 확정", badge: "bg-teal-100 text-teal-800 border-teal-200", icon: CheckCircle },
  rejected: { label: "거절됨", badge: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  expired: { label: "만료됨", badge: "bg-gray-100 text-gray-600 border-gray-200", icon: Clock },
};

export const LEAD_STATUS_ORDER = Object.keys(LEAD_STATUSES);

/** 모르는 값이 와도 화면이 비지 않게 — 값 자체를 보여준다(빈칸이면 원인을 못 찾는다). */
export function leadStatusLabel(status) {
  return LEAD_STATUSES[status]?.label || status || "-";
}

export function leadStatusBadge(status) {
  return LEAD_STATUSES[status]?.badge || "bg-gray-100 text-gray-700 border-gray-200";
}

export function leadStatusIcon(status) {
  return LEAD_STATUSES[status]?.icon || Clock;
}

/** 목록 위 필터 칩 — 「전체」는 화면에서 붙인다(여기 넣으면 상태값이 아닌 게 섞인다). */
export const LEAD_STATUS_FILTERS = LEAD_STATUS_ORDER.filter((s) => s !== "queued").map((value) => ({
  value,
  label: LEAD_STATUSES[value].label,
}));
