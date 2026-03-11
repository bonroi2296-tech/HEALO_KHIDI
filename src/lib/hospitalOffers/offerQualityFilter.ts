/**
 * LLM 출력 name_ko에 대한 규칙 기반 품질 필터.
 * "다른 병원에서 치료를 받았는데", "72시간 골든타임 입니다" 같은 슬로건/서술형은 탈락.
 */

import type { OfferItem, TreatmentOffer } from "./types";

/** 이름 reject: 슬로건·서술·후기·문의 등 */
const REJECT_NAME =
  /물음표|말줄임|입니다\s*\.?|해결|후기|상담|문의|밤마다|통증|받았는데|분명|골든타임|72\s*시간|다른\s*병원/i;

/** 이름 accept: 시술/검사/치료 등 명사구 */
const ACCEPT_NAME =
  /검사|치료|시술|수술|주사|도수|재활|면역|항암|한약|프로그램/i;

export interface FilterResult {
  kept: OfferItem[];
  dropped_by_rules_count: number;
  dropped_samples: Array<{ name: string; reason: string }>;
}

const MAX_DROPPED_SAMPLES = 5;

/**
 * offers에서 name이 규칙에 맞지 않는 항목 제거.
 */
export function filterOffersByQualityRules(offers: OfferItem[]): FilterResult {
  const kept: OfferItem[] = [];
  const dropped_samples: Array<{ name: string; reason: string }> = [];

  for (const o of offers) {
    const name = (o.treatment?.name ?? "").trim();
    if (!name) {
      dropped_samples.push({ name: "(empty)", reason: "empty_name" });
      continue;
    }
    if (REJECT_NAME.test(name)) {
      dropped_samples.push({ name, reason: "rule_reject" });
      continue;
    }
    if (!ACCEPT_NAME.test(name)) {
      dropped_samples.push({ name, reason: "rule_no_accept" });
      continue;
    }
    if (name.length < 6 || name.length > 40) {
      dropped_samples.push({ name, reason: "length" });
      continue;
    }
    kept.push(o);
  }

  return {
    kept,
    dropped_by_rules_count: offers.length - kept.length,
    dropped_samples: dropped_samples.slice(0, MAX_DROPPED_SAMPLES),
  };
}
