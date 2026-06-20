/**
 * 국적 코드 → 한국어 표기 (순수 함수, KHIDI 리포트 가독성).
 *
 * kpi.ts 에서 분리: kpi.ts 는 `import "server-only"` 라 vitest 직접 임포트가 막힌다.
 * inquiries.nationality 는 ISO 2자리 코드(KZ/RU/UZ…)로 저장됨.
 * 대시보드 진행바 색상은 "카자흐"/"러시아" 또는 "KZ"/"RU" 둘 다 매칭하므로
 * 한국어로 바꿔도 색상 로직이 유지된다. 모르는 코드는 원문 그대로 둔다.
 */

export const NATIONALITY_NAMES: Record<string, string> = {
  KZ: "카자흐스탄",
  RU: "러시아",
  UZ: "우즈베키스탄",
  KG: "키르기스스탄",
  TJ: "타지키스탄",
  TM: "투르크메니스탄",
  AZ: "아제르바이잔",
  GE: "조지아",
  AM: "아르메니아",
  BY: "벨라루스",
  UA: "우크라이나",
  MN: "몽골",
  KR: "한국",
  CN: "중국",
  JP: "일본",
  US: "미국",
};

/**
 * 국적 코드 정규화. 빈 값/공백은 "기타", 알려진 코드는 한국어, 미등록 코드는 원문 유지.
 */
export function normalizeNationality(raw: string | null | undefined): string {
  if (!raw) return "기타";
  const v = raw.trim();
  if (!v) return "기타";
  return NATIONALITY_NAMES[v.toUpperCase()] ?? v;
}
