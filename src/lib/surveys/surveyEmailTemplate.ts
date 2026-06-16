/**
 * healwith: 환자 만족도 설문 이메일 템플릿
 *
 * consultationInvite.ts 와 동일한 구조 — 단순 HTML (React Email 없음)
 * 6개 언어: ko / en / ru / kk / zh / ja
 */

export interface SurveyEmailProps {
  recipientName?: string;
  surveyUrl: string;
  lang?: "ko" | "en" | "ru" | "kk" | "zh" | "ja";
}

const STRINGS = {
  ko: {
    subject: "healwith 서비스 만족도 설문에 참여해 주세요",
    greeting: (n: string) => `안녕하세요${n ? `, ${n}님` : ""}.`,
    intro:
      "저희 healwith 서비스를 이용해 주셔서 감사합니다. 보다 나은 서비스를 위해 짧은 만족도 설문에 참여해 주시면 감사하겠습니다.",
    btnLabel: "설문 참여하기 (2분)",
    notice: "※ 본 링크는 14일 후 만료됩니다.",
    footer: "healwith · 한국 암 치료 컨시어지",
    closing: "소중한 의견 감사드립니다.",
  },
  en: {
    subject: "Please share your healwith experience",
    greeting: (n: string) => `Hello${n ? `, ${n}` : ""},`,
    intro:
      "Thank you for using healwith. Please take 2 minutes to complete our satisfaction survey — your feedback helps us improve.",
    btnLabel: "Take the Survey (2 min)",
    notice: "※ This link expires in 14 days.",
    footer: "healwith · Korea Cancer-Care Concierge",
    closing: "We appreciate your feedback.",
  },
  ru: {
    subject: "healwith — поделитесь своим мнением",
    greeting: (n: string) => `Здравствуйте${n ? `, ${n}` : ""}!`,
    intro:
      "Спасибо, что воспользовались услугами healwith. Пожалуйста, уделите 2 минуты для заполнения анкеты — ваш отзыв поможет нам стать лучше.",
    btnLabel: "Пройти опрос (2 мин)",
    notice: "※ Ссылка действительна 14 дней.",
    footer: "healwith · Корейский онкологический консьерж",
    closing: "Благодарим за ваш отзыв.",
  },
  kk: {
    subject: "healwith — пікіріңізбен бөлісіңіз",
    greeting: (n: string) => `Сәлеметсіз бе${n ? `, ${n}` : ""}!`,
    intro:
      "healwith қызметін пайдаланғаныңызға рахмет. 2 минутты сауалнамаға арнаңыз — сіздің пікіріңіз бізге жақсара түсуге көмектеседі.",
    btnLabel: "Сауалнамаға қатысу (2 мин)",
    notice: "※ Сілтеме 14 күннен кейін жойылады.",
    footer: "healwith · Кореядағы онкология консьерж қызметі",
    closing: "Пікіріңізге рахмет.",
  },
  zh: {
    subject: "请分享您对healwith的使用体验",
    greeting: (n: string) => `您好${n ? `，${n}` : ""}！`,
    intro:
      "感谢您使用healwith服务。请花2分钟完成满意度调查——您的反馈将帮助我们不断改进。",
    btnLabel: "参与调查（2分钟）",
    notice: "※ 此链接将在14天后过期。",
    footer: "healwith · 韩国癌症治疗礼宾服务",
    closing: "感谢您宝贵的意见。",
  },
  ja: {
    subject: "healwithサービスへのご意見をお聞かせください",
    greeting: (n: string) => `こんにちは${n ? `、${n}様` : ""}。`,
    intro:
      "healwithサービスをご利用いただきありがとうございます。2分ほどで完了する満足度アンケートにご協力ください。",
    btnLabel: "アンケートに答える（2分）",
    notice: "※ このリンクは14日後に無効になります。",
    footer: "healwith · 韓国がん治療コンシェルジュ",
    closing: "ご意見をお寄せいただきありがとうございます。",
  },
} as const;

type Lang = keyof typeof STRINGS;

export function renderSurveyEmail(props: SurveyEmailProps) {
  const lang: Lang =
    props.lang && props.lang in STRINGS ? (props.lang as Lang) : "ko";
  const s = STRINGS[lang];
  const name = (props.recipientName || "").slice(0, 50);

  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${esc(s.intro)}</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f0e8;padding:24px 12px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" role="presentation"
      style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <tr>
        <td style="background:#0a0a0a;padding:32px 32px 24px;">
          <div style="font-family:'Playfair Display',Georgia,serif;color:#c8a96a;font-size:28px;letter-spacing:0.02em;">healwith</div>
          <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#c7c2b8;margin-top:4px;">${esc(s.footer)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:40px 32px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#0f172a;">${esc(s.greeting(name))}</p>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:#334155;">${esc(s.intro)}</p>

          <div style="text-align:center;margin:32px 0;">
            <a href="${esc(props.surveyUrl)}"
               style="display:inline-block;background:#c8a96a;color:#0a0a0a;text-decoration:none;
                      padding:14px 36px;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;
                      font-weight:600;border-radius:2px;">
              ${esc(s.btnLabel)}
            </a>
          </div>

          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#94a3b8;">${esc(s.notice)}</p>
          <p style="margin:16px 0 0;font-size:12px;color:#64748b;">${esc(s.closing)}</p>
          <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">${esc(props.surveyUrl)}</p>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;padding:16px 32px;font-size:10px;color:#94a3b8;text-align:center;line-height:1.6;">
          healwith is not a medical institution. Korea-licensed providers only.
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
    `${s.btnLabel}: ${props.surveyUrl}`,
    "",
    s.notice,
    "",
    s.closing,
    "",
    "— healwith",
  ].join("\n");

  return { subject: s.subject, html, text };
}

function esc(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
