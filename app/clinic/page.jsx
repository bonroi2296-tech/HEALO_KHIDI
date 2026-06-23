"use client";

/**
 * /clinic 라우트 = 해외 의료기관(현지 주치의) 전용 포털.
 * 본체는 /agency 와 동일(PartnerPortal) — partner_type='medical_institution' 으로 게이팅.
 * 에이전시와 달리 케이스별 경과(검사결과·영상·소견) 업로드 가능(사후관리 ICT ④).
 */

import PartnerPortal from "../agency/PartnerPortal";

export default function ClinicPage() {
  return <PartnerPortal expected="medical_institution" />;
}
