/**
 * 카자흐어 메일이 «kz»(내부 코드)로 불려도 «kk»(BCP47)로 불려도 카자흐어로 나가야 한다.
 * 2026-09-06 까지 두 템플릿은 kk 키만 있어 호출부마다 kz→kk 매핑을 기억해야 했다(빠뜨리면 교육 메일은 러시아어,
 * 리마인더는 한국어로 조용히 떨어진다 — POSTMORTEMS #23 이 그 사고). 기존 호출부 2곳은 매핑이 있어 실제로 새진 않았지만,
 * 덫을 템플릿 쪽에서 없애고 여기서 고정한다. 모르는 값이 ko 로 내려가는 것(리마인더)도 같이 잠근다.
 */
import { describe, it, expect } from "vitest";
import { renderEducationEmail } from "./educationContent";
import { renderConsultationReminderEmail } from "./consultationReminder";

describe("카자흐어 메일 — kz·kk 둘 다 카자흐어", () => {
  it("교육 메일: kz 와 kk 가 같은 카자흐어 제목, 러시아어 폴백 아님", () => {
    const base = { recipientName: "", phaseLabel: "1 ай", items: [{ title: "t", body: "b", categoryLabel: "c" }] } as any;
    const kz = renderEducationEmail({ ...base, lang: "kz" });
    const kk = renderEducationEmail({ ...base, lang: "kk" });
    expect(kz.subject).toBe(kk.subject);
    expect(kz.subject).toContain("денсаулық нұсқаулығы");
    expect(kz.subject).not.toContain("Рекомендации");
  });

  it("리마인더: kz 와 kk 가 같은 카자흐어, 한국어 폴백 아님", () => {
    const base = { joinUrl: "https://healwith.co.kr/c/x", scheduledAt: "2026-08-03T06:00:00.000Z" } as any;
    const kz = renderConsultationReminderEmail({ ...base, lang: "kz" });
    const kk = renderConsultationReminderEmail({ ...base, lang: "kk" });
    expect(kz.subject).toBe(kk.subject);
    expect(kz.subject).toContain("кеңесіңіз");
    expect(kz.html).toContain("Корея уақыты");
    expect(kz.html).not.toContain("한국 표준시");
  });

  it("리마인더: 러시아어는 그대로, 모르는 값·빈 값은 한국어로 내려간다(옛 호출부 화이트리스트를 뺐으니 여기서 잠근다)", () => {
    const base = { joinUrl: "https://healwith.co.kr/c/x", scheduledAt: "2026-08-03T06:00:00.000Z" } as any;
    expect(renderConsultationReminderEmail({ ...base, lang: "ru" }).html).toContain("время Кореи");
    expect(renderConsultationReminderEmail({ ...base, lang: "xx" }).html).toContain("한국 표준시");
    expect(renderConsultationReminderEmail({ ...base }).html).toContain("한국 표준시");
  });
});
