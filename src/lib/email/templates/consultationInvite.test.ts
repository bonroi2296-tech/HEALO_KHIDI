/**
 * 초대 메일 시각 표기 잠금 (2026-08-03 PO 지적: "GMT+9 가 한국 시간 맞냐")
 *
 * ⚠️ 이 검사의 핵심은 «상자마다 달라지는 표기» 차단이다. Intl 의 timeZoneName 에 맡겼더니
 *    윈도우 "오후 03:00 대한민국 표준시" / 리눅스 "PM 03:00 한국 표준시" 로 갈렸고,
 *    실서비스(리눅스)에선 한국어 메일에 "PM" 이 나갈 뻔했다(2026-08-04). → 24시간제 + 우리 문구 고정.
 */
import { describe, it, expect } from "vitest";
import { renderConsultationInviteEmail } from "./consultationInvite";

// 2026-08-03 15:00 한국시간 = 06:00 UTC
const SCHEDULED = "2026-08-03T06:00:00.000Z";
const render = (lang: any) =>
  renderConsultationInviteEmail({
    inviteUrl: "https://healwith.co.kr/c/x",
    scheduledAt: SCHEDULED,
    lang,
  }).html;

describe("초대 메일 시각 표기", () => {
  it("한국어: 24시간제 + 「한국 표준시」 + UTC", () => {
    const html = render("ko");
    expect(html).toContain("15:00 한국 표준시");
    expect(html).toContain("06:00 UTC");
    expect(html).not.toContain("GMT+9");
  });

  it("러시아어: 같은 규칙 + 러시아어 문구", () => {
    const html = render("ru");
    expect(html).toContain("15:00 время Кореи");
    expect(html).toContain("06:00 UTC");
  });

  it("어느 언어든 오전/오후·AM/PM 이 안 섞인다(상자별 표기 차이 차단)", () => {
    for (const lang of ["ko", "en", "ru", "kz", "zh", "ja"]) {
      const { text } = renderConsultationInviteEmail({
        inviteUrl: "https://healwith.co.kr/c/x",
        scheduledAt: SCHEDULED,
        lang: lang as any,
      });
      const timeLine = text.split("\n").find((l) => l.includes("15:00")) ?? "";
      expect(timeLine).not.toMatch(/\bAM\b|\bPM\b|오전|오후/);
    }
  });
});

describe("첨부가 안 열릴 때의 대비 — 주요 도시 시각", () => {
  it("러시아어 메일엔 알마티·타슈켄트·비슈케크·모스크바 시각", () => {
    const html = render("ru");
    expect(html).toContain("Алматы 11:00"); // UTC+5
    expect(html).toContain("Ташкент 11:00"); // UTC+5
    expect(html).toContain("Бишкек 12:00"); // UTC+6
    expect(html).toContain("Москва 09:00"); // UTC+3
  });

  it("한국어 메일엔 도시 줄이 없다(대상 지역 불특정)", () => {
    expect(render("ko")).not.toContain("Алматы");
  });
});
