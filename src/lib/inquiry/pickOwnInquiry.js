/**
 * healwith: 「자동채움에 써도 되는 지난 접수」 고르기 — 문의 폼 prefill 전용 안전장치.
 *
 * 규칙은 하나다: **문의서에 적힌 이메일이 로그인 계정 이메일과 같은 것만** 쓴다.
 * user_id 가 붙어 있다는 것만으로는 「본인 것」이 아니다 — 스태프·에이전시가 환자 대신
 * 낸 접수도 그들의 user_id 로 붙는다(2026-07-31 실측: 계정에 붙은 6건 전부 이메일 불일치).
 * 이 규칙이 없으면 남의 환자 이름·전화가 새 폼에 미리 박힌다.
 */

/**
 * @param {Array<object>} rows        inquiries 행들(암호화된 email 컬럼 포함)
 * @param {string} accountEmail       로그인 계정 이메일
 * @param {(enc:any)=>string} decrypt 복호화 함수(실패 시 빈 문자열)
 * @returns {object|null}             가장 최근의 「본인 것」 한 건
 */
export function pickOwnInquiry(rows, accountEmail, decrypt) {
  const target = (accountEmail || "").trim().toLowerCase();
  if (!target) return null;
  return (
    (rows || [])
      .slice()
      .sort((a, b) => String(b?.created_at).localeCompare(String(a?.created_at)))
      .find((r) => (decrypt(r?.email) || "").trim().toLowerCase() === target) || null
  );
}
