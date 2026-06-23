"use client";

/**
 * /agency 라우트 = 해외 에이전시 전용 포털.
 * 본체는 PartnerPortal(에이전시·의료기관 공용) — partner_type='agency' 로 게이팅.
 */

import PartnerPortal from "./PartnerPortal";

export default function AgencyPage() {
  return <PartnerPortal expected="agency" />;
}
