/**
 * 한국 주요 대학병원 암수술 «외국인 환자 기준» 참고 범위.
 *
 * 출처: 이대서울·세브란스 등 협력 대학병원 국제진료센터에 직접 문의해 받은 답변을 정리한
 *       면력한방병원 「암 진료비 안내 자료」(카자흐스탄 협력병원 환자 안내용, 2026-06-17).
 *       원본: PO 보관 「99. 기타/면력_암진료비_안내.pdf」
 *
 * ⚠️ 이 숫자의 성격을 오해하지 마라 — 잘못 대조하면 「2~3배 틀렸다」는 오진이 나온다.
 *   · «총비용»이다: 입원 5~10일 + 기본 검사 + 수술료를 포함한다.
 *   · «외국인 기준»이다: 건강보험이 적용되지 않아 국제수가(전액 본인부담)가 적용된 금액이다.
 *   · 따라서 병원 홈페이지의 «법정 공개 비급여 가격»(내국인 기준, 항목 단가)과는
 *     기준이 달라 서로 대조되지 않는다. 예: 갑상선 로봇수술 항목 단가와 여기 총비용은 다른 자다.
 *   · 병기별로 나뉘지 않는다. 병원도 병기별 확정가를 주지 못한다(정찰가가 없다).
 *
 * 확정 금액은 코디네이터가 병원에서 받아 발급하는 정식 견적서로만 안내한다.
 * 갱신: 병원 답변 기반이므로 시간이 지나면 다시 물어야 한다. 아래 SOURCE_DATE 를 같이 표시할 것.
 */

export const SOURCE_DATE = "2026-06";

export type SurgeryRange = {
  /** 수술 방식 표시용 i18n 키 */
  methodKey: string;
  minKrw: number;
  maxKrw: number;
};

/** 암종별 참고 범위. 같은 암종에 방식이 둘이면 저렴한 쪽을 먼저 둔다. */
export const SURGERY_RANGES: Record<string, SurgeryRange[]> = {
  thyroid: [
    { methodKey: "costRange.method.openEndo", minKrw: 4_000_000, maxKrw: 8_000_000 },
    { methodKey: "costRange.method.robot", minKrw: 15_000_000, maxKrw: 25_000_000 },
  ],
  stomach: [
    { methodKey: "costRange.method.laparo", minKrw: 8_000_000, maxKrw: 15_000_000 },
    { methodKey: "costRange.method.robot", minKrw: 15_000_000, maxKrw: 25_000_000 },
  ],
  colorectal: [
    { methodKey: "costRange.method.laparoRobot", minKrw: 10_000_000, maxKrw: 18_000_000 },
  ],
  lung: [
    { methodKey: "costRange.method.thoracoRobot", minKrw: 12_000_000, maxKrw: 25_000_000 },
  ],
  liver: [
    { methodKey: "costRange.method.hepatectomy", minKrw: 12_000_000, maxKrw: 25_000_000 },
  ],
  breast: [
    { methodKey: "costRange.method.breastSln", minKrw: 8_000_000, maxKrw: 18_000_000 },
  ],
};

/** 해당 암종의 전체 범위(가장 낮은 최소 ~ 가장 높은 최대). 없으면 null. */
export function overallRange(cancerType: string): { minKrw: number; maxKrw: number } | null {
  const rows = SURGERY_RANGES[cancerType];
  if (!rows || rows.length === 0) return null;
  return {
    minKrw: Math.min(...rows.map((r) => r.minKrw)),
    maxKrw: Math.max(...rows.map((r) => r.maxKrw)),
  };
}
