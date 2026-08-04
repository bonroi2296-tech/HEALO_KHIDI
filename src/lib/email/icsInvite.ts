/**
 * healwith: 상담 일정 파일(.ics) 생성 — 메일에 첨부해 «받는 사람 시간대»를 자동으로 맞춘다.
 *
 * 왜(2026-08-03 PO): 메일에 한국 시각만 적으면 받는 사람이 환산해야 하고, 코디가 상대 국가를
 * 매번 골라 적으면 사람 실수가 난다. 일정 파일은 시각을 UTC 로 담고 **달력 앱이 각자 현지
 * 시각으로 그려준다** — 양쪽 다 손댈 게 없다.
 *
 * ponytail: 라이브러리 안 쓴다. RFC 5545 최소 필드(UID·DTSTART·DTEND·SUMMARY·URL)만 손으로 쓴다.
 * ponytail: METHOD:PUBLISH — 참석 응답(Yes/No) 흐름은 안 쓴다. «달력에 담기»만 되면 충분.
 */

const SUMMARY: Record<string, string> = {
  ko: "healwith 원격 상담",
  en: "healwith online consultation",
  ru: "healwith — онлайн-консультация",
  kz: "healwith — онлайн-кеңес",
  kk: "healwith — онлайн-кеңес",
  zh: "healwith 在线会诊",
  ja: "healwith オンライン診療",
};

/** 2026-08-03T06:00:00.000Z → 20260803T060000Z */
function toIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// 줄바꿈·쉼표·세미콜론은 이스케이프해야 달력 앱이 필드를 안 깨뜨린다(RFC 5545 3.3.11).
function esc(v: string): string {
  return String(v).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

export function buildConsultationIcs(opts: {
  /** 상담 id — 같은 상담을 다시 보내면 달력이 «수정»으로 합친다(중복 일정 방지) */
  uid: string;
  scheduledAt: string;
  joinUrl: string;
  lang?: string;
  /** 기본 60분 */
  durationMinutes?: number;
}): string {
  const start = new Date(opts.scheduledAt);
  const end = new Date(start.getTime() + (opts.durationMinutes ?? 60) * 60_000);
  const summary = SUMMARY[opts.lang || "ko"] || SUMMARY.en;
  // DTSTAMP 는 «이 파일을 만든 시각» — 같은 상담을 다시 보낼 때 최신본으로 인식되게 지금 시각.
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//healwith//consultation//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${esc(opts.uid)}@healwith.co.kr`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(opts.joinUrl)}`,
    `URL:${esc(opts.joinUrl)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // 달력 앱은 CRLF 를 요구한다(LF 만 쓰면 일부 앱이 파일을 통째로 거부).
  return lines.join("\r\n") + "\r\n";
}
