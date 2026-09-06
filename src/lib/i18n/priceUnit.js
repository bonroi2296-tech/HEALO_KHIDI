/**
 * 가격 단위 표기(«KRW/session» 등)를 화면 언어로.
 *
 * 왜 (2026-09-06 로컬 실측): 암종 상세의 치료법 가격이 6개 언어 화면 전부에서 「250,000 KRW/session」
 * 영어 그대로였다. 데이터(`immuneTherapies.js`)의 unit 은 «값의 종류»를 적는 자리지 화면 글자가 아니다 —
 * 글자는 사전(price.unit.*)이 맡고, 모르는 단위는 원문 그대로 둔다(빈칸보다 낫다).
 */
import { t } from "./index";

const UNIT_KEYS = {
  "KRW/session": "price.unit.session",
  "KRW/tablet": "price.unit.tablet",
  "KRW/day": "price.unit.day",
};

export function priceUnitLabel(unit, lang) {
  if (!unit) return "";
  const key = UNIT_KEYS[unit];
  if (!key) return unit;
  const label = t(key, lang);
  return label && label !== key ? label : unit;
}
