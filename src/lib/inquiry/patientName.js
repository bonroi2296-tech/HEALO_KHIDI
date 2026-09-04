/**
 * 환자 이름을 «화면에 붙여 쓰는» 방법 — 단일 출처.
 *
 * 왜 생겼나 (2026-09-03):
 *   화면들이 제각각 `[first_name, last_name].join(" ")` 로 붙이고 있었다. 그러면 「이름 성」 순인데,
 *   우리 환자는 카자흐·러시아 사람이라 여권도 서류도 「성 이름」 순으로 쓴다.
 *   더 나쁜 건, 옛 접수 화면이 이름을 한 칸으로 받아 잘라 넣는 바람에 «칸이 뒤바뀐» 자료가 있었고,
 *   그 둘이 서로를 가려서 화면에는 「Ахметов Жасулан」으로 «맞게» 보였다는 점이다.
 *   자료를 제자리로 돌리는 순간 화면이 어색해지므로, 붙이는 방법도 여기서 한 번에 정한다.
 *
 * 🛑 이건 «보여주는» 순서다. 저장은 언제나 성=last_name, 이름=first_name 이다 —
 *    병원 등록·여권 대조는 두 칸을 «각각» 쓰기 때문에 칸이 섞이면 거부된다.
 */

/**
 * 목록·상세에 쓸 전체 이름. 여권과 같은 「성 이름」 순.
 *   fullPatientName("Aigerim", "Amirova") → "Amirova Aigerim"
 * 한쪽이 비면 있는 쪽만 돌려준다. 둘 다 없으면 빈 문자열(부르는 쪽이 「이름 미상」을 정한다).
 */
export function fullPatientName(firstName, lastName) {
  return [lastName, firstName]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
}
