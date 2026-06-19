/**
 * healwith: 원격 상담 초대 이메일 템플릿
 *
 * 단순 HTML (React Email 없이 — 이메일 클라이언트 호환성 최대화)
 */

export interface ConsultationInviteProps {
  recipientName?: string;
  inviteUrl: string;
  scheduledAt: string;           // ISO 문자열
  role?: string;                 // patient / doctor 등
  doctorName?: string;
  doctorSpecialty?: string;      // 전공 / 직위 (예: 종양학, 교수)
  hospitalName?: string;
  hospitalAddress?: string;
  lang?: "ko" | "en" | "ru" | "kz";
}

const STRINGS = {
  ko: {
    subject: "healwith 원격 상담 초대 — 확인 부탁드립니다",
    greeting: (n: string) => `안녕하세요${n ? `, ${n}님` : ""}.`,
    intro: "healwith 원격 상담 예약이 확정되었습니다. 예약 시각에 아래 버튼으로 접속해주세요.",
    timeLabel: "예약 시각",
    joinBtn: "상담 방 입장",
    reminder:
      "※ 이 링크는 본인 전용이며 타인에게 공유하지 마세요. 링크만 있으면 계정 가입 없이 입장 가능합니다.",
    compat:
      "인터넷 연결이 가능한 PC / 태블릿 / 스마트폰 어디에서든 접속 가능합니다 (Chrome, Safari 권장). 앱 설치 필요 없습니다.",
    footer: "healwith · 한국 암 치료 컨시어지",
  },
  en: {
    subject: "healwith telemedicine consultation invite",
    greeting: (n: string) => `Hello${n ? `, ${n}` : ""},`,
    intro: "Your healwith telemedicine consultation has been scheduled. Please click below to join at the appointment time.",
    timeLabel: "Scheduled time",
    joinBtn: "Join consultation",
    reminder:
      "※ This link is for you only — do not share. No account needed.",
    compat:
      "Works on any device with internet (PC / tablet / mobile). Chrome or Safari recommended. No app install needed.",
    footer: "healwith · Korea cancer-care concierge",
  },
  ru: {
    subject: "healwith — приглашение на онлайн-консультацию",
    greeting: (n: string) => `Здравствуйте${n ? `, ${n}` : ""}!`,
    intro: "Ваша онлайн-консультация с healwith подтверждена. Нажмите кнопку ниже во время консультации.",
    timeLabel: "Время",
    joinBtn: "Войти в консультацию",
    reminder:
      "※ Эта ссылка только для вас — не передавайте другим. Учётная запись не требуется.",
    compat:
      "Работает на любом устройстве с интернетом (ПК / планшет / телефон). Рекомендуется Chrome или Safari. Установка приложения не нужна.",
    footer: "healwith · Корейский центр онкологии для иностранцев",
  },
  kz: {
    subject: "healwith — онлайн кеңес беруге шақыру",
    greeting: (n: string) => `Сәлеметсіз бе${n ? `, ${n}` : ""}!`,
    intro: "healwith онлайн кеңесіңіз бекітілді. Белгіленген уақытта төмендегі түймені басыңыз.",
    timeLabel: "Уақыт",
    joinBtn: "Кеңеске қосылу",
    reminder:
      "※ Бұл сілтеме тек сізге арналған — басқаларға бермеңіз. Есептік жазба қажет емес.",
    compat:
      "Интернеті бар кез келген құрылғыда жұмыс істейді (ДК / планшет / телефон). Chrome немесе Safari ұсынылады.",
    footer: "healwith · Кореядағы онкология консьерж қызметі",
  },
};

export function renderConsultationInviteEmail(props: ConsultationInviteProps) {
  const lang = (props.lang && STRINGS[props.lang]) ? props.lang : "ko";
  const s = STRINGS[lang];
  const name = (props.recipientName || "").slice(0, 50);
  // 시간대 명시 — 코디는 KST로 입력하지만 환자는 해외(CIS 등)라 시간대 라벨이 없으면 혼란.
  // KST(상담이 진행되는 한국 시간) + UTC(글로벌 표준) 를 모두 라벨과 함께 표기.
  const locale =
    lang === "ko" ? "ko-KR" : lang === "ru" || lang === "kz" ? "ru-RU" : "en-US";
  const fmtIn = (timeZone: string) =>
    new Date(props.scheduledAt).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    });
  // 예: "2026. 10. 5. (월) 오후 2:00 GMT+9  ·  오전 5:00 UTC"
  const scheduledFormatted = `${fmtIn("Asia/Seoul")}  ·  ${fmtIn("UTC")}`;

  // 병원 / 의사 카드 — 환자가 "어디 / 누구" 를 명확히 알도록 큰 카드로 표시
  const hospitalDoctorCard =
    props.hospitalName || props.doctorName
      ? `
<tr><td style="padding:16px 0 8px;">
  <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:linear-gradient(180deg,#ffffff 0%,#fafafa 100%);border:1px solid #c8a96a;border-left:3px solid #c8a96a;border-radius:4px;">
    <tr><td style="padding:18px 20px;">
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#c8a96a;margin-bottom:10px;">
        ${lang === "ko" ? "담당 기관 및 의료진" : lang === "ru" ? "Медицинское учреждение" : lang === "kz" ? "Медициналық мекеме" : "Medical provider"}
      </div>
      ${
        props.hospitalName
          ? `<div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;line-height:1.3;color:#0a0a0a;margin-bottom:4px;">${escape(props.hospitalName)}</div>`
          : ""
      }
      ${
        props.hospitalAddress
          ? `<div style="font-size:12px;color:#64748b;margin-bottom:12px;">📍 ${escape(props.hospitalAddress)}</div>`
          : ""
      }
      ${
        props.doctorName
          ? `
      <table cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px dashed #e2e8f0;padding-top:12px;width:100%;">
        <tr>
          <td style="width:40px;vertical-align:top;padding-right:10px;">
            <div style="width:36px;height:36px;border-radius:50%;background:#c8a96a;color:#0a0a0a;text-align:center;line-height:36px;font-weight:700;font-size:14px;font-family:Arial;">
              ${escape((props.doctorName || "D").slice(0, 1).toUpperCase())}
            </div>
          </td>
          <td style="vertical-align:middle;">
            <div style="font-size:15px;font-weight:600;color:#0f172a;">Dr. ${escape(props.doctorName)}</div>
            ${
              props.doctorSpecialty
                ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escape(props.doctorSpecialty)}</div>`
                : ""
            }
          </td>
        </tr>
      </table>`
          : ""
      }
    </td></tr>
  </table>
</td></tr>`
      : "";


  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${s.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
  ${escape(s.intro)}
</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f0e8;padding:24px 12px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <tr>
        <td style="background:#0a0a0a;padding:32px 32px 24px;">
          <div style="font-family:'Playfair Display',Georgia,serif;color:#c8a96a;font-size:28px;letter-spacing:0.02em;">healwith</div>
          <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#c7c2b8;margin-top:4px;">${escape(s.footer)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:40px 32px 16px;">
          <p style="margin:0 0 16px;font-size:15px;color:#0f172a;">${escape(s.greeting(name))}</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#334155;">${escape(s.intro)}</p>

          <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0 8px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:12px 0;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">${escape(s.timeLabel)}:</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${escape(scheduledFormatted)}</td></tr>
          </table>

          ${hospitalDoctorCard}

          <div style="text-align:center;margin:32px 0;">
            <a href="${escape(props.inviteUrl)}"
               style="display:inline-block;background:#c8a96a;color:#0a0a0a;text-decoration:none;padding:14px 32px;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;border-radius:2px;">
              ${escape(s.joinBtn)}
            </a>
          </div>

          <p style="margin:16px 0 8px;font-size:12px;line-height:1.6;color:#64748b;">${escape(s.compat)}</p>
          <p style="margin:8px 0;font-size:12px;line-height:1.6;color:#dc2626;">${escape(s.reminder)}</p>

          <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">
            ${escape(props.inviteUrl)}
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;padding:16px 32px;font-size:10px;color:#94a3b8;text-align:center;line-height:1.6;">
          healwith is not a medical institution. Diagnosis / treatment by licensed Korean providers.
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`.trim();

  const text = [
    s.greeting(name),
    "",
    s.intro,
    "",
    `${s.timeLabel}: ${scheduledFormatted}`,
    props.hospitalName ? `🏥 ${props.hospitalName}` : "",
    props.hospitalAddress ? `   ${props.hospitalAddress}` : "",
    props.doctorName
      ? `👨‍⚕️ Dr. ${props.doctorName}${props.doctorSpecialty ? ` (${props.doctorSpecialty})` : ""}`
      : "",
    "",
    `${s.joinBtn}: ${props.inviteUrl}`,
    "",
    s.compat,
    "",
    s.reminder,
    "",
    "— healwith",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: s.subject,
    html,
    text,
  };
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
