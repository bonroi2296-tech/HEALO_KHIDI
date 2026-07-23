/**
 * healwith: 왓츠앱 전화 국가번호 → 활성 언어 추정 (순수 모듈 — vitest 잠금)
 *
 * 왓츠앱은 텔레그램과 달리 사용자 language_code 를 안 준다. wa_id(국제전화 형식,
 * 예: "77471234567")의 국가번호로 첫 응대 언어를 추정하고, 이후 환자가 다른 언어로
 * 쓰면 AI 가 그 언어로 따라간다(generateReply 는 사용자 언어를 우선).
 *
 * +7 은 러시아·카자흐 공용: 카자흐 이동전화는 +7 6xx/7xx 대역, 러시아는 +7 9xx —
 * 핵심 타겟 구분이라 대역까지 본다(틀려도 둘 다 키릴 언어라 피해 최소).
 */
export function mapWaLang(waId: string): string {
  const d = String(waId || "").replace(/\D/g, "");
  if (!d) return "en";
  if (d.startsWith("7")) {
    const next = d.charAt(1);
    return next === "6" || next === "7" ? "kz" : "ru";
  }
  if (d.startsWith("82")) return "ko";
  if (d.startsWith("86")) return "zh";
  if (d.startsWith("81")) return "ja";
  // CIS 인접국(우즈벡 998·키르기스 996·타지크 992·아제르 994·벨라루스 375·우크라 380 등)은
  // 러시아어가 통용 — 러시아어로 첫 인사(활성 6개 언어 안에서 가장 근접).
  if (/^(998|996|992|994|375|380|374|993)/.test(d)) return "ru";
  return "en";
}
