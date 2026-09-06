/**
 * healwith: 30분 전 상담 리마인더 이메일 템플릿
 *
 * 지원 언어: ko / en / ru / kz(=kk) / zh / ja — 카자흐어는 내부코드 kz·BCP47 kk·"kz-KZ" 어느 표기로 불러도 같다(resolveMailLang).
 * 순수 HTML (React Email 없이 — 이메일 클라이언트 호환성 최대화)
 * 기존 consultationInvite.ts 의 스타일/구조와 통일.
 */

import { resolveMailLang, toBcp47 } from "../mailLang";

export interface ConsultationReminderProps {
  recipientName?: string;
  joinUrl: string;
  scheduledAt: string; // ISO 문자열
  role?: string; // patient | doctor | interpreter | coordinator
  doctorName?: string;
  hospitalName?: string;
  /** 언어 — 내부코드(kz)·BCP47(kk)·지역 꼬리("kz-KZ")·대문자 전부 받아 템플릿이 정규화한다. 모르는 값은 ko. */
  lang?: string;
}

const STRINGS: Record<
  string,
  {
    subject: string;
    preheader: string;
    greeting: (n: string) => string;
    countdown: string;
    timeLabel: string;
    intro: string;
    joinBtn: string;
    alreadyHaveLink: string;
    footer: string;
    disclaimer: string;
  }
> = {
  ko: {
    subject: "⏰ [30분 후] healwith 원격 상담이 시작됩니다",
    preheader: "30분 뒤 상담 시작 — 지금 입장 준비하세요",
    greeting: (n: string) => `안녕하세요${n ? `, ${n}님` : ""}.`,
    countdown: "30분 후 상담 시작",
    timeLabel: "예약 시각",
    intro: "곧 원격 상담이 시작됩니다. 아래 버튼을 클릭해 상담 방에 입장해 주세요.",
    joinBtn: "지금 입장하기",
    alreadyHaveLink: "이미 초대 이메일을 받으신 경우 기존 링크로도 입장 가능합니다.",
    footer: "healwith · 한국 암 치료 컨시어지",
    disclaimer: "healwith는 의료기관이 아닙니다. 진단·치료는 한국의 면허 의료기관이 수행합니다.",
  },
  en: {
    subject: "⏰ [30 min] Your healwith consultation starts soon",
    preheader: "Consultation starting in 30 minutes — get ready",
    greeting: (n: string) => `Hello${n ? `, ${n}` : ""},`,
    countdown: "Starting in 30 minutes",
    timeLabel: "Scheduled time",
    intro: "Your telemedicine consultation is starting soon. Click the button below to join.",
    joinBtn: "Join now",
    alreadyHaveLink: "You can also use the link from your original invitation email.",
    footer: "healwith · Korea cancer-care concierge",
    disclaimer: "healwith is not a medical institution. Diagnosis / treatment by licensed Korean providers.",
  },
  ru: {
    subject: "⏰ [30 мин] Ваша консультация healwith скоро начнётся",
    preheader: "Консультация через 30 минут — приготовьтесь",
    greeting: (n: string) => `Здравствуйте${n ? `, ${n}` : ""}!`,
    countdown: "Начало через 30 минут",
    timeLabel: "Время",
    intro: "Ваша онлайн-консультация скоро начнётся. Нажмите кнопку ниже, чтобы войти.",
    joinBtn: "Войти сейчас",
    alreadyHaveLink: "Вы также можете использовать ссылку из исходного письма-приглашения.",
    footer: "healwith · Онкология в Корее",
    disclaimer: "healwith не является медицинским учреждением. Диагностику и лечение проводят лицензированные корейские клиники.",
  },
  kz: {
    subject: "⏰ [30 мин] healwith кеңесіңіз жақын арада басталады",
    preheader: "30 минуттан кейін кеңес — дайындалыңыз",
    greeting: (n: string) => `Сәлеметсіз бе${n ? `, ${n}` : ""}!`,
    countdown: "30 минуттан кейін басталады",
    timeLabel: "Уақыт",
    intro: "Сіздің онлайн кеңесіңіз жақын арада басталады. Кіру үшін төмендегі түймені басыңыз.",
    joinBtn: "Қазір кіру",
    alreadyHaveLink: "Бастапқы шақыру хатындағы сілтемені де пайдалана аласыз.",
    footer: "healwith · Кореядағы онкология консьерж",
    disclaimer: "healwith медициналық мекеме емес. Диагностика мен емді лицензиясы бар корей клиникалары жүргізеді.",
  },
  zh: {
    subject: "⏰ [30分钟后] 您的 healwith 会诊即将开始",
    preheader: "30分钟后开始会诊——请做好准备",
    greeting: (n: string) => `您好${n ? `，${n}` : ""},`,
    countdown: "30分钟后开始",
    timeLabel: "预约时间",
    intro: "您的在线会诊即将开始。请点击下方按钮进入会诊室。",
    joinBtn: "立即进入",
    alreadyHaveLink: "您也可以使用原始邀请邮件中的链接。",
    footer: "healwith · 韩国肿瘤医疗服务",
    disclaimer: "healwith 并非医疗机构。诊断与治疗由持有执照的韩国医疗机构进行。",
  },
  ja: {
    subject: "⏰ [30分後] healwith 遠隔診療がもうすぐ始まります",
    preheader: "30分後に診療開始 — ご準備ください",
    greeting: (n: string) => `こんにちは${n ? `、${n}様` : ""}。`,
    countdown: "30分後に開始",
    timeLabel: "予約時刻",
    intro: "遠隔診療がもうすぐ始まります。下のボタンをクリックして入室してください。",
    joinBtn: "今すぐ入室",
    alreadyHaveLink: "元の招待メールのリンクからも入室できます。",
    footer: "healwith · 韓国がん治療コンシェルジュ",
    disclaimer: "healwith は医療機関ではありません。診断・治療は韓国の免許を持つ医療機関が行います。",
  },
};

export function renderConsultationReminderEmail(props: ConsultationReminderProps): {
  subject: string;
  html: string;
  text: string;
} {
  // 표기 정규화는 한 곳(mailLang.ts)에서 — 모르는 값이면 ko 로 폴백(카자흐어가 여기서 새면 «한국어 메일»이 간다).
  const langKey = resolveMailLang(props.lang, STRINGS, "ko");
  const s = STRINGS[langKey];
  const name = (props.recipientName || "").slice(0, 50);

  const localeMap: Record<string, string> = {
    ko: "ko-KR",
    en: "en-US",
    ru: "ru-RU",
    kz: "ru-RU",
    zh: "zh-CN",
    ja: "ja-JP",
  };
  // ⚠️ 시간대 이름은 Intl 에 맡기지 않는다 — 상자마다 "오후 03:00 대한민국 표준시"/"PM 03:00
  //    한국 표준시" 로 갈렸다(2026-08-04 실측, 초대 메일과 동일 사유). 24시간제 + 우리 문구로 고정.
  const KST_LABEL: Record<string, string> = {
    ko: "한국 표준시",
    en: "Korea time (KST)",
    ru: "время Кореи",
    kz: "Корея уақыты",
    zh: "韩国时间",
    ja: "韓国時間",
  };
  const scheduledFormatted =
    new Date(props.scheduledAt).toLocaleString(localeMap[langKey] ?? "ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Seoul", // 상담은 한국시간 진행 — 서버(UTC) 기준으로 찍히면 시각이 틀림
    }) + ` ${KST_LABEL[langKey] ?? KST_LABEL.ko}`;

  // 의사/병원 카드 (있을 때만)
  const providerCard =
    props.hospitalName || props.doctorName
      ? `
<tr><td style="padding:12px 0 8px;">
  <table cellpadding="0" cellspacing="0" style="width:100%;background:#f0fdfa;border:1px solid #ccfbf1;border-left:3px solid #0d9488;border-radius:12px;">
    <tr><td style="padding:14px 16px;">
      ${props.hospitalName ? `<div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:2px;">${esc(props.hospitalName)}</div>` : ""}
      ${props.doctorName ? `<div style="font-size:12px;color:#64748b;">Dr. ${esc(props.doctorName)}</div>` : ""}
    </td></tr>
  </table>
</td></tr>`
      : "";

  // 30분 카운트다운 배지
  const countdownBadge = `
<tr><td style="text-align:center;padding:24px 0 16px;">
  <div style="display:inline-block;background:#fee2e2;border:1.5px solid #fca5a5;border-radius:20px;padding:8px 20px;">
    <span style="font-size:13px;font-weight:700;color:#dc2626;letter-spacing:0.05em;">⏰ ${esc(s.countdown)}</span>
  </div>
</td></tr>`;

  const html = `
<!DOCTYPE html>
<html lang="${toBcp47(langKey)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${esc(s.preheader)}</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f6f7f8;padding:24px 12px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
      <!-- 헤더 -->
      <tr>
        <td style="padding:28px 32px 20px;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:22px;font-weight:800;color:#0d9488;letter-spacing:-0.01em;">healwith</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">${esc(s.footer)}</div>
        </td>
      </tr>
      <!-- 본문 -->
      <tr>
        <td style="padding:32px 32px 16px;">
          <table cellpadding="0" cellspacing="0" style="width:100%;">
            ${countdownBadge}
            <tr><td>
              <p style="margin:0 0 12px;font-size:15px;color:#0f172a;">${esc(s.greeting(name))}</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#334155;">${esc(s.intro)}</p>
            </td></tr>
            <!-- 시간 표 -->
            <tr><td>
              <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 8px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:10px 0;">
                <tr>
                  <td style="padding:8px 0;color:#64748b;font-size:13px;">${esc(s.timeLabel)}:</td>
                  <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${esc(scheduledFormatted)}</td>
                </tr>
              </table>
            </td></tr>
            ${providerCard}
            <!-- 입장 버튼 -->
            <tr><td style="text-align:center;padding:28px 0 16px;">
              <a href="${esc(props.joinUrl)}"
                 style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:15px;font-weight:700;border-radius:12px;">
                ${esc(s.joinBtn)}
              </a>
            </td></tr>
            <tr><td>
              <p style="margin:8px 0;font-size:12px;line-height:1.6;color:#64748b;">${esc(s.alreadyHaveLink)}</p>
              <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">${esc(props.joinUrl)}</p>
            </td></tr>
          </table>
        </td>
      </tr>
      <!-- 푸터 -->
      <tr>
        <td style="background:#f8fafc;padding:16px 32px;font-size:10px;color:#94a3b8;text-align:center;line-height:1.6;">
          ${esc(s.disclaimer)}
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
    `⏰ ${s.countdown}`,
    "",
    s.intro,
    "",
    `${s.timeLabel}: ${scheduledFormatted}`,
    props.hospitalName ? `🏥 ${props.hospitalName}` : "",
    props.doctorName ? `👨‍⚕️ Dr. ${props.doctorName}` : "",
    "",
    `${s.joinBtn}: ${props.joinUrl}`,
    "",
    s.alreadyHaveLink,
    "",
    "— healwith",
  ]
    .filter((l) => l !== undefined && l !== null)
    .join("\n");

  return { subject: s.subject, html, text };
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
