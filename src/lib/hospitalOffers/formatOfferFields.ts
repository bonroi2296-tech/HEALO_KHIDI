/**
 * 크롤이 뽑아온 숫자 필드를 실DB `treatments` 의 **글자형 컬럼**으로 옮길 때 쓰는 표기 헬퍼.
 *
 * 왜 여기 있나: `treatments` 에는 `recovery_time_min/max`·`surgery_duration_min/max` 같은
 * 숫자 컬럼이 없다(옛 미용시술 스키마 잔재 — POSTMORTEMS #103). 실컬럼은 글자형
 * `recovery_time`·`duration` 하나씩이라, 크롤 결과를 사람이 읽는 문장으로 합쳐 넣는다.
 *
 * 미리보기 화면(HospitalOffersPreview)과 실제 적용(offers/apply)이 **같은 함수**를 쓴다 —
 * 예전엔 각자 포맷해서 미리보기는 "3~3일", 적용 결과는 "3일" 로 갈렸다(독립 리뷰 지적).
 */

/** 회복기간 min/max(일) → "3일" / "3~7일" / null */
export function formatRecoveryTime(
  min?: number | null,
  max?: number | null
): string | null {
  const days = [min, max].filter((n): n is number => typeof n === "number");
  if (days.length === 0) return null;
  const uniq = [...new Set(days)];
  return `${uniq.join("~")}일`;
}

/** 시술 소요시간(분) → "30분" / null. 단위 없이 "30" 만 보이던 것 교정. */
export function formatDuration(minutes?: number | null): string | null {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) return null;
  return `${minutes}분`;
}
