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
  lang?: "ko" | "en" | "ru" | "kz" | "zh" | "ja";
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
    disclaimer: "healwith는 의료기관이 아닙니다. 진단·치료는 한국의 면허 의료기관이 수행합니다.",
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
    disclaimer: "healwith is not a medical institution. Diagnosis / treatment by licensed Korean providers.",
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
    disclaimer: "healwith не является медицинским учреждением. Диагностику и лечение проводят лицензированные корейские клиники.",
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
    disclaimer: "healwith медициналық мекеме емес. Диагностика мен емді лицензиясы бар корей клиникалары жүргізеді.",
  },
  zh: {
    subject: "healwith 远程会诊邀请 — 请确认",
    greeting: (n: string) => `您好${n ? `，${n}` : ""}，`,
    intro: "您的 healwith 远程会诊已确认。请在预约时间点击下方按钮加入。",
    timeLabel: "预约时间",
    joinBtn: "进入会诊",
    reminder: "※ 此链接仅供您本人使用，请勿分享给他人。无需注册账户即可进入。",
    compat: "可在任何联网设备（电脑／平板／手机）上使用，推荐 Chrome 或 Safari，无需安装应用。",
    footer: "healwith · 韩国癌症诊疗礼宾服务",
    disclaimer: "healwith 并非医疗机构。诊断与治疗由持有执照的韩国医疗机构进行。",
  },
  ja: {
    subject: "healwith オンライン診療のご招待 — ご確認ください",
    greeting: (n: string) => `こんにちは${n ? `、${n}様` : ""}。`,
    intro: "healwith のオンライン診療が確定しました。予約時間に下のボタンからご参加ください。",
    timeLabel: "予約時間",
    joinBtn: "診療ルームに入る",
    reminder: "※ このリンクはご本人専用です。他の方と共有しないでください。アカウント登録は不要です。",
    compat: "インターネットに接続できるPC／タブレット／スマートフォンからご参加いただけます（Chrome・Safari推奨）。アプリのインストールは不要です。",
    footer: "healwith · 韓国がん治療コンシェルジュ",
    disclaimer: "healwith は医療機関ではありません。診断・治療は韓国の免許を持つ医療機関が行います。",
  },
};

export function renderConsultationInviteEmail(props: ConsultationInviteProps) {
  const lang = (props.lang && STRINGS[props.lang]) ? props.lang : "ko";
  const s = STRINGS[lang];
  const name = (props.recipientName || "").slice(0, 50);
  // 시간대 명시 — 코디는 KST로 입력하지만 환자는 해외(CIS 등)라 시간대 라벨이 없으면 혼란.
  // KST(상담이 진행되는 한국 시간) + UTC(글로벌 표준) 를 모두 라벨과 함께 표기.
  const locale =
    lang === "ko" ? "ko-KR"
    : lang === "ru" || lang === "kz" ? "ru-RU"
    : lang === "zh" ? "zh-CN"
    : lang === "ja" ? "ja-JP"
    : "en-US";
  // ponytail: 한국 시각은 timeZoneName "long"("한국 표준시"/"Korean Standard Time"/"Корея, стандартное время")
  // — "GMT+9" 만 보면 어느 나라 시간인지 안 보인다(2026-08-03 PO 지적). UTC 는 long 이 장황해 short 유지.
  const fmtIn = (timeZone: string, timeZoneName?: "short" | "long") =>
    new Date(props.scheduledAt).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
      timeZoneName,
    });
  // 예: "пн, 3 авг. 2026, 15:00 Корея, стандартное время  ·  06:00 UTC"
  // ⛔ 「상대 국가를 골라 현지 시각을 적는다」는 안 한다(2026-08-03 PO): 코디가 매번 국적을 확인해야
  //    하고 틀리면 «잘못된 시각»을 통지하게 된다. 현지 시각 환산은 첨부한 일정 파일(icsInvite.ts)이
  //    받는 사람 달력에서 자동으로 한다 — 사람이 고를 일이 없다.
  // 한 줄에 몰아넣으면 "Корея, стандартное время" 처럼 긴 이름에서 줄이 흘러넘쳐 라벨과 어긋난다
  // → 굵은 한국 시각 한 줄 + 회색 UTC 한 줄로 쌓는다.
  const scheduledKst = fmtIn("Asia/Seoul", "long");
  const scheduledUtc = fmtIn("UTC", "short");

  // 「혹시 첨부가 안 열릴 때」의 대비책(2026-08-03 PO) — 주요 도시 시각을 시:분만 한 줄로.
  // 코디가 국가를 고르는 게 아니라 «메일 언어»로 정해지므로 사람 실수가 낄 자리가 없다.
  const CITIES: Record<string, { tz: string; name: string }[]> = {
    ru: [
      { tz: "Asia/Almaty", name: "Алматы" },
      { tz: "Asia/Tashkent", name: "Ташкент" },
      { tz: "Asia/Bishkek", name: "Бишкек" },
      { tz: "Europe/Moscow", name: "Москва" },
    ],
    kz: [
      { tz: "Asia/Almaty", name: "Алматы" },
      { tz: "Asia/Tashkent", name: "Ташкент" },
      { tz: "Asia/Bishkek", name: "Бишкек" },
      { tz: "Europe/Moscow", name: "Мәскеу" },
    ],
    zh: [{ tz: "Asia/Shanghai", name: "北京" }],
    ja: [{ tz: "Asia/Tokyo", name: "東京" }],
    // ko·en 은 대상 지역이 특정되지 않아 넣지 않는다(UTC 한 줄로 충분).
  };
  const hhmm = (tz: string) =>
    new Date(props.scheduledAt).toLocaleString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  const cityTimes = (CITIES[lang] || []).map((c) => `${c.name} ${hhmm(c.tz)}`).join("  ·  ");

  const scheduledFormatted = [scheduledKst, scheduledUtc, cityTimes]
    .filter(Boolean)
    .join("  ·  "); // 글자만 있는 대체 본문용

  // 병원 / 의사 카드 — 환자가 "어디 / 누구" 를 명확히 알도록 카드로 표시 (legacy teal 톤)
  const hospitalDoctorCard =
    props.hospitalName || props.doctorName
      ? `
<tr><td style="padding:16px 0 8px;">
  <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#f0fdfa;border:1px solid #ccfbf1;border-left:3px solid #0d9488;border-radius:12px;">
    <tr><td style="padding:18px 20px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#0d9488;margin-bottom:10px;">
        ${lang === "ko" ? "담당 기관 및 의료진" : lang === "ru" ? "Медицинское учреждение" : lang === "kz" ? "Медициналық мекеме" : lang === "zh" ? "医疗机构及医生" : lang === "ja" ? "担当機関・医療スタッフ" : "Medical provider"}
      </div>
      ${
        props.hospitalName
          ? `<div style="font-size:18px;font-weight:700;line-height:1.3;color:#0f172a;margin-bottom:4px;">${escape(props.hospitalName)}</div>`
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
      <table cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px solid #ccfbf1;padding-top:12px;width:100%;">
        <tr>
          <td style="width:40px;vertical-align:top;padding-right:10px;">
            <div style="width:36px;height:36px;border-radius:50%;background:#0d9488;color:#ffffff;text-align:center;line-height:36px;font-weight:700;font-size:14px;font-family:Arial;">
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
<body style="margin:0;padding:0;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
  ${escape(s.intro)}
</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f6f7f8;padding:24px 12px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:28px 32px 20px;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:22px;font-weight:800;color:#0d9488;letter-spacing:-0.01em;">healwith</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">${escape(s.footer)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 16px;">
          <p style="margin:0 0 16px;font-size:15px;color:#0f172a;">${escape(s.greeting(name))}</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#334155;">${escape(s.intro)}</p>

          <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0 8px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:12px 0;">
            <tr><td style="padding:8px 0;">
              <div style="color:#64748b;font-size:13px;margin-bottom:4px;">${escape(s.timeLabel)}</div>
              <div style="color:#0f172a;font-size:15px;font-weight:700;">${escape(scheduledKst)}</div>
              <div style="color:#64748b;font-size:13px;margin-top:2px;">${escape(scheduledUtc)}</div>
              ${
                cityTimes
                  ? `<div style="color:#64748b;font-size:13px;margin-top:6px;">${escape(cityTimes)}</div>`
                  : ""
              }
            </td></tr>
          </table>

          ${hospitalDoctorCard}

          <div style="text-align:center;margin:32px 0;">
            <a href="${escape(props.inviteUrl)}"
               style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:15px;font-weight:700;border-radius:12px;">
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
        <td style="background:#f8fafc;padding:16px 32px;font-size:10px;color:#94a3b8;text-align:center;line-height:1.6;border-top:1px solid #f1f5f9;">
          ${escape(s.disclaimer)}
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
