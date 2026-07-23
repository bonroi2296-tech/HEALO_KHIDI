/**
 * healwith: 환자 현지 시각 추정 (순수 모듈 — vitest 잠금)
 *
 * 왜(2026-07-23 PO): 코디가 한국 아침에 답장하면 환자는 새벽일 수 있다 — 알림으로
 * 깨우는 실례를 피하려면 어드민 챗에서 "환자 현지 시각"이 보여야 한다.
 *
 * 정확한 위치는 못 얻는다(텔레그램은 위치·시간대 미제공, IP 는 메신저 서버 것) —
 * 확보 가능한 신호로 추정하고 출처를 표시한다:
 *  1. metadata.tz         : 웹 챗 브라우저가 보낸 IANA 시간대(정확) — start 라우트가 저장
 *  2. whatsapp.wa_id      : 전화 국가번호 → 대표 시간대 (러시아처럼 다중 시간대 국가는 수도 기준)
 *  3. metadata.language   : 언어 → 대표 시간대 (en 은 추정 불가 → null)
 */

const LANG_TZ: Record<string, string> = {
  ko: "Asia/Seoul",
  ru: "Europe/Moscow",
  kz: "Asia/Almaty",
  kk: "Asia/Almaty",
  zh: "Asia/Shanghai",
  ja: "Asia/Tokyo",
  // en: 추정 불가(전 세계) — 의도적으로 없음
};

// 국가번호 → 대표 시간대. +7 은 대역으로 카자흐(6xx/7xx)/러시아(그 외)를 가른다(waLang 과 동일 규칙).
function phoneTz(waId: string): string | null {
  const d = String(waId || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("7")) {
    const next = d.charAt(1);
    return next === "6" || next === "7" ? "Asia/Almaty" : "Europe/Moscow";
  }
  if (d.startsWith("82")) return "Asia/Seoul";
  if (d.startsWith("86")) return "Asia/Shanghai";
  if (d.startsWith("81")) return "Asia/Tokyo";
  if (d.startsWith("998")) return "Asia/Tashkent";
  if (d.startsWith("996")) return "Asia/Bishkek";
  if (d.startsWith("992")) return "Asia/Dushanbe";
  if (d.startsWith("994")) return "Asia/Baku";
  if (d.startsWith("993")) return "Asia/Ashgabat";
  if (d.startsWith("375")) return "Europe/Minsk";
  if (d.startsWith("380")) return "Europe/Kyiv";
  if (d.startsWith("374")) return "Asia/Yerevan";
  return null;
}

export type PatientTzGuess = {
  tz: string | null;
  /** browser=정확(웹 브라우저 제공) / phone·language=추정 */
  source: "browser" | "phone" | "language" | null;
};

export function guessPatientTimezone(thread: any): PatientTzGuess {
  const meta =
    thread?.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
      ? thread.metadata
      : {};
  if (typeof meta.tz === "string" && meta.tz.includes("/")) {
    return { tz: meta.tz, source: "browser" };
  }
  const waTz = phoneTz(meta.whatsapp?.wa_id);
  if (waTz) return { tz: waTz, source: "phone" };
  const langTz = LANG_TZ[String(meta.language || "").toLowerCase()];
  if (langTz) return { tz: langTz, source: "language" };
  return { tz: null, source: null };
}

export type PatientLocalTime = {
  /** "14:32" 형식 현지 시각 */
  label: string;
  /** 심야(22:00~07:59) — 알림으로 깨울 수 있는 시간대 */
  night: boolean;
  hour: number;
};

/** tz 기준 현지 시각 계산. 잘못된 tz 면 null(표시 생략). */
export function patientLocalTime(tz: string, now: Date = new Date()): PatientLocalTime | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    if (Number.isNaN(hour)) return null;
    // Intl 은 자정을 "24"로 줄 수 있다(en-GB h23 아님) — 0~23 정규화.
    const h = hour === 24 ? 0 : hour;
    return {
      label: `${String(h).padStart(2, "0")}:${minute}`,
      night: h >= 22 || h < 8,
      hour: h,
    };
  } catch {
    return null;
  }
}
