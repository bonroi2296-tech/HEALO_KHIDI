/**
 * healwith: 사후관리 단계별 «건강관리 교육» 안내 메일 (공고 ICT ⑤ — 건강관리 교육)
 *
 * 지원 언어: ko / en / ru / kz(=kk) / zh / ja — 카자흐어는 내부코드 kz·BCP47 kk·"kz-KZ" 어느 표기로 불러도 같다(resolveMailLang).
 * 순수 HTML — 이메일 클라이언트 호환성 최대화 (consultationReminder.ts 와 같은 규칙).
 *
 * 본문은 education_contents 에서 온다. **의료 지시가 아니라 일반 안내**임을 매 통에 적는다
 * (1인 운영 · 24시간 대응 약속 금지 규칙과 같은 취지).
 */

import { resolveMailLang, toBcp47 } from "../mailLang";

export interface EducationEmailItem {
  categoryLabel: string;
  title: string;
  body: string;
  mediaUrl?: string | null;
}

export interface EducationEmailProps {
  recipientName?: string;
  phaseLabel: string;
  items: EducationEmailItem[];
  /** 언어 — 내부코드(kz)·BCP47(kk)·지역 꼬리("kz-KZ")·대문자 전부 받아 템플릿이 정규화한다. 모르는 값은 ru. */
  lang?: string;
}

const STRINGS: Record<
  string,
  {
    subject: (phase: string) => string;
    greeting: (n: string) => string;
    intro: (phase: string) => string;
    more: string;
    footer: string;
    disclaimer: string;
  }
> = {
  ko: {
    subject: (p) => `[healwith] ${p} 건강관리 안내`,
    greeting: (n) => `안녕하세요${n ? `, ${n}님` : ""}.`,
    intro: (p) => `치료 후 ${p} 건강관리 안내를 보내드립니다.`,
    more: "궁금한 점은 이 메일에 회신하시면 담당 코디네이터가 확인합니다.",
    footer: "healwith · 한국 암 치료 컨시어지",
    disclaimer:
      "본 안내는 일반적인 건강관리 정보이며 진단·처방이 아닙니다. 증상이 있으면 담당 의료진 또는 현지 응급번호로 연락하세요.",
  },
  en: {
    subject: (p) => `[healwith] ${p} care guide`,
    greeting: (n) => `Hello${n ? `, ${n}` : ""},`,
    intro: (p) => `Here is your ${p} post-treatment care guide.`,
    more: "Reply to this email and your coordinator will get back to you.",
    footer: "healwith · Korea cancer-care concierge",
    disclaimer:
      "This is general health information, not a diagnosis or prescription. If you have symptoms, contact your care team or local emergency number.",
  },
  ru: {
    subject: (p) => `[healwith] Рекомендации: ${p}`,
    greeting: (n) => `Здравствуйте${n ? `, ${n}` : ""}!`,
    intro: (p) => `Направляем рекомендации по восстановлению — ${p}.`,
    more: "Ответьте на это письмо, и ваш координатор свяжется с вами.",
    footer: "healwith · Онкология в Корее",
    disclaimer:
      "Это общая информация о здоровье, а не диагноз или назначение. При появлении симптомов обратитесь к врачу или в местную скорую помощь.",
  },
  kz: {
    subject: (p) => `[healwith] ${p} — денсаулық нұсқаулығы`,
    greeting: (n) => `Сәлеметсіз бе${n ? `, ${n}` : ""}!`,
    intro: (p) => `Емнен кейінгі ${p} күтім нұсқаулығын жіберіп отырмыз.`,
    more: "Осы хатқа жауап жазсаңыз, үйлестіруші сізбен байланысады.",
    footer: "healwith · Кореядағы онкология консьерж",
    disclaimer:
      "Бұл жалпы ақпарат, диагноз немесе тағайындау емес. Симптомдар болса, дәрігерге немесе жедел жәрдемге хабарласыңыз.",
  },
  zh: {
    subject: (p) => `[healwith] ${p} 康复指南`,
    greeting: (n) => `您好${n ? `，${n}` : ""},`,
    intro: (p) => `这是您治疗后 ${p} 的康复管理指南。`,
    more: "如有疑问，请直接回复本邮件，协调员会与您联系。",
    footer: "healwith · 韩国癌症治疗管家",
    disclaimer: "本内容为一般健康信息，非诊断或处方。如出现症状，请联系医疗团队或当地急救电话。",
  },
  ja: {
    subject: (p) => `[healwith] ${p} の健康管理ガイド`,
    greeting: (n) => `こんにちは${n ? `、${n}様` : ""}。`,
    intro: (p) => `治療後 ${p} の健康管理ガイドをお送りします。`,
    more: "ご質問はこのメールに返信いただければ、担当コーディネーターが確認します。",
    footer: "healwith · 韓国がん治療コンシェルジュ",
    disclaimer:
      "本内容は一般的な健康情報であり、診断や処方ではありません。症状がある場合は担当医療者または現地の救急番号にご連絡ください。",
  },
};

const esc = (s: string) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** 본문 줄바꿈을 그대로 살린다(교육 본문은 목록형이 많다). */
const paragraphs = (body: string) =>
  esc(body)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 10px;line-height:1.7;color:#374151;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

export function renderEducationEmail(props: EducationEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  // 2026-09-06 까지는 키가 kk 뿐이라 부르는 쪽(dispatch-surveys 의 normalizeSurveyLang)이 kz→kk 로 바꿔 줘야만
  // 카자흐어였고, 매핑을 빠뜨린 새 호출부는 조용히 러시아어로 떨어지는 덫이었다 → 정규화를 템플릿(mailLang.ts)으로.
  const langKey = resolveMailLang(props.lang, STRINGS, "ru");
  const s = STRINGS[langKey];
  const name = props.recipientName || "";
  const items = props.items || [];

  const blocks = items
    .map(
      (it) => `
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:0 0 12px;">
        <div style="font-size:12px;font-weight:700;color:#0d6b52;background:#e2f5ee;display:inline-block;padding:2px 8px;border-radius:99px;">${esc(it.categoryLabel)}</div>
        <h3 style="margin:8px 0 8px;font-size:16px;color:#111827;">${esc(it.title)}</h3>
        ${paragraphs(it.body)}
        ${it.mediaUrl ? `<p style="margin:8px 0 0;"><a href="${esc(it.mediaUrl)}" style="color:#0d5f5f;">${esc(it.title)}</a></p>` : ""}
      </div>`
    )
    .join("");

  const html = `<!doctype html><html lang="${toBcp47(langKey)}"><body style="margin:0;padding:24px;background:#f6f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;">
    <p style="margin:0 0 6px;font-size:15px;color:#111827;">${esc(s.greeting(name))}</p>
    <p style="margin:0 0 18px;font-size:14px;color:#4b5563;">${esc(s.intro(props.phaseLabel))}</p>
    ${blocks}
    <p style="margin:16px 0 0;font-size:13px;color:#4b5563;">${esc(s.more)}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
    <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">${esc(s.disclaimer)}</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">${esc(s.footer)}</p>
  </div></body></html>`;

  const text = [
    s.greeting(name),
    s.intro(props.phaseLabel),
    "",
    ...items.map((it) => `■ [${it.categoryLabel}] ${it.title}\n${it.body}`),
    "",
    s.more,
    s.disclaimer,
    s.footer,
  ].join("\n");

  return { subject: s.subject(props.phaseLabel), html, text };
}
