/**
 * healwith: «방문 전» 사후관리 메일 — 소견을 받고 아직 오지 않은 환자에게 D+3 · D+14 · D+30.
 *
 * 톤: 독촉이 아니라 «옆에 있다»는 안부. 24시간 답변 «약속»은 하지 않는다(1인 운영 규칙).
 * 순수 HTML(이메일 클라이언트 호환) — educationContent 템플릿과 같은 규칙.
 * 언어: ko / en / ru / kk(=kz) / zh / ja — resolveMailLang 이 정규화한다.
 */

import { resolveMailLang, toBcp47 } from "../mailLang";

export type PreVisitPhase = "d3" | "d14" | "d30";

export interface PreVisitFollowupProps {
  phase: PreVisitPhase;
  recipientName?: string;
  trackUrl: string;
  lang?: string;
}

type Copy = {
  subject: Record<PreVisitPhase, string>;
  greeting: (n: string) => string;
  body: Record<PreVisitPhase, string[]>;
  cta: string;
  reply: string;
  footer: string;
  disclaimer: string;
};

const STRINGS: Record<string, Copy> = {
  ko: {
    subject: {
      d3: "[healwith] 소견은 잘 받아보셨나요?",
      d14: "[healwith] 다음 단계를 함께 정해드릴까요?",
      d30: "[healwith] 요즘 어떻게 지내시나요?",
    },
    greeting: (n) => `안녕하세요${n ? `, ${n}님` : ""}.`,
    body: {
      d3: ["한국 전문의 소견을 전해드린 지 며칠 지났습니다. 이해가 어렵거나 더 묻고 싶은 점이 있으면 아래 링크에서 글을 남겨 주세요. 담당 코디네이터가 확인합니다."],
      d14: ["소견을 받으신 뒤 결정하기까지 시간이 필요하신 것 잘 압니다.", "예상 비용·일정·비자 절차 중 어느 것이든 먼저 알려드릴 수 있습니다. 궁금한 것을 아래 링크에 적어 주시면 답을 드리겠습니다."],
      d30: ["한 달이 지났습니다. 지금 상태가 어떠신지, 다른 병원에서 치료를 시작하셨는지 알려 주시면 그에 맞춰 도울 수 있습니다.", "치료 중이시라면 궁금한 점을 언제든 남겨 주세요. 더 이상 연락을 원하지 않으시면 이 메일에 그렇게 회신해 주시면 됩니다."],
    },
    cta: "진행 상황 보기 · 글 남기기",
    reply: "이 메일에 회신하셔도 담당 코디네이터에게 전달됩니다.",
    footer: "healwith · 한국 암 치료 컨시어지",
    disclaimer: "본 안내는 진단·처방이 아닙니다. 증상이 급하면 현지 의료진이나 응급실을 먼저 찾아 주세요.",
  },
  en: {
    subject: {
      d3: "[healwith] Did the specialist opinion reach you?",
      d14: "[healwith] Shall we work out the next step together?",
      d30: "[healwith] How are you doing these days?",
    },
    greeting: (n) => `Hello${n ? `, ${n}` : ""},`,
    body: {
      d3: ["A few days have passed since we sent you the Korean specialist's opinion. If anything is unclear or you have more questions, leave a note at the link below and your coordinator will pick it up."],
      d14: ["We understand that a decision after an opinion takes time.", "We can walk you through the estimated cost, the schedule, or the visa steps first. Write what you would like to know at the link below and we will answer."],
      d30: ["A month has passed. Let us know how you are and whether you have started treatment elsewhere, so we can help accordingly.", "If you are in treatment, you can still leave questions any time. If you would rather not hear from us, just reply to this email and say so."],
    },
    cta: "See progress · leave a note",
    reply: "Replying to this email also reaches your coordinator.",
    footer: "healwith · Korea cancer-care concierge",
    disclaimer: "This message is not a diagnosis or prescription. If symptoms are urgent, contact local medical staff or an emergency room first.",
  },
  ru: {
    subject: {
      d3: "[healwith] Вы получили заключение специалиста?",
      d14: "[healwith] Определим следующий шаг вместе?",
      d30: "[healwith] Как вы себя чувствуете?",
    },
    greeting: (n) => `Здравствуйте${n ? `, ${n}` : ""}!`,
    body: {
      d3: ["Прошло несколько дней с тех пор, как мы передали вам заключение корейского специалиста. Если что-то непонятно или появились вопросы, оставьте сообщение по ссылке ниже — координатор ответит."],
      d14: ["Мы понимаем, что после заключения нужно время на решение.", "Можем сначала рассказать о примерной стоимости, сроках или визе. Напишите, что вас интересует, по ссылке ниже — мы ответим."],
      d30: ["Прошёл месяц. Сообщите, как вы себя чувствуете и начали ли лечение в другой клинике, — мы поможем с учётом этого.", "Если вы уже лечитесь, вопросы можно оставлять в любое время. Если не хотите получать письма, просто ответьте на это письмо."],
    },
    cta: "Посмотреть статус · оставить сообщение",
    reply: "Ответ на это письмо также попадёт к вашему координатору.",
    footer: "healwith · консьерж по лечению рака в Корее",
    disclaimer: "Это не диагноз и не назначение. При срочных симптомах сначала обратитесь к местным врачам или в скорую помощь.",
  },
  kk: {
    subject: {
      d3: "[healwith] Маман қорытындысын алдыңыз ба?",
      d14: "[healwith] Келесі қадамды бірге шешейік пе?",
      d30: "[healwith] Қазір хал-жағдайыңыз қалай?",
    },
    greeting: (n) => `Сәлеметсіз бе${n ? `, ${n}` : ""}!`,
    body: {
      d3: ["Корей маманының қорытындысын жібергенімізге бірнеше күн өтті. Түсініксіз жері болса немесе сұрағыңыз болса, төмендегі сілтеме арқылы хабарлама қалдырыңыз — үйлестіруші жауап береді."],
      d14: ["Қорытындыдан кейін шешім қабылдауға уақыт керек екенін түсінеміз.", "Алдымен шамамен құны, мерзімі немесе виза туралы айта аламыз. Не білгіңіз келетінін төмендегі сілтеме арқылы жазыңыз — жауап береміз."],
      d30: ["Бір ай өтті. Хал-жағдайыңызды және басқа клиникада емді бастадыңыз ба, соны хабарлаңыз — соған қарай көмектесеміз.", "Егер емделіп жатсаңыз, сұрақтарыңызды кез келген уақытта қалдыра аласыз. Хат алғыңыз келмесе, осы хатқа жауап беріп айтыңыз."],
    },
    cta: "Барысын көру · хабарлама қалдыру",
    reply: "Осы хатқа жауап берсеңіз де, үйлестірушіге жетеді.",
    footer: "healwith · Кореядағы онкологиялық ем консьержі",
    disclaimer: "Бұл диагноз немесе тағайындау емес. Шұғыл белгілер болса, алдымен жергілікті дәрігерге немесе жедел жәрдемге хабарласыңыз.",
  },
  zh: {
    subject: {
      d3: "[healwith] 您收到专家意见了吗？",
      d14: "[healwith] 一起确定下一步好吗？",
      d30: "[healwith] 最近身体怎么样？",
    },
    greeting: (n) => `您好${n ? `，${n}` : ""}：`,
    body: {
      d3: ["我们把韩国专家的意见发给您已有几天。如有不清楚或想再问的地方，请在下方链接留言，协调员会查看。"],
      d14: ["我们理解收到意见后需要时间做决定。", "费用预估、日程或签证流程，哪一项都可以先为您说明。请在下方链接写下您想了解的内容，我们会回复。"],
      d30: ["已经过去一个月了。请告诉我们您现在的状况，以及是否已在其他医院开始治疗，我们会据此提供帮助。", "如果您正在治疗，随时可以留下问题。如不希望再收到邮件，直接回复本邮件告知即可。"],
    },
    cta: "查看进度 · 留言",
    reply: "直接回复本邮件也会转给您的协调员。",
    footer: "healwith · 韩国癌症治疗礼宾服务",
    disclaimer: "本邮件不构成诊断或处方。如症状紧急，请先联系当地医生或急诊。",
  },
  ja: {
    subject: {
      d3: "[healwith] 専門医の所見は届きましたか？",
      d14: "[healwith] 次のステップを一緒に決めませんか？",
      d30: "[healwith] 最近の体調はいかがですか？",
    },
    greeting: (n) => `こんにちは${n ? `、${n}様` : ""}。`,
    body: {
      d3: ["韓国の専門医の所見をお送りしてから数日が経ちました。わかりにくい点やご質問があれば、下のリンクからメッセージを残してください。担当コーディネーターが確認します。"],
      d14: ["所見を受け取ってから決めるまでに時間が必要なことは承知しています。", "費用の目安・日程・ビザ手続きのどれからでもご説明できます。知りたいことを下のリンクにお書きください。お答えします。"],
      d30: ["1か月が経ちました。今のご様子や、他の病院で治療を始められたかをお知らせいただければ、それに合わせてお手伝いします。", "治療中でしたら、ご質問はいつでもどうぞ。連絡を希望されない場合は、このメールにその旨ご返信ください。"],
    },
    cta: "進行状況を見る · メッセージを残す",
    reply: "このメールに返信いただいても担当コーディネーターに届きます。",
    footer: "healwith · 韓国がん治療コンシェルジュ",
    disclaimer: "本メールは診断・処方ではありません。症状が急な場合は、まず現地の医療機関や救急をご利用ください。",
  },
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderPreVisitFollowupEmail(props: PreVisitFollowupProps): { subject: string; html: string; text: string } {
  const lang = resolveMailLang(props.lang, STRINGS, "ru");
  const s = STRINGS[lang];
  const name = props.recipientName?.trim() || "";
  const paras = s.body[props.phase];

  const html = `<!doctype html><html lang="${toBcp47(lang)}"><body style="margin:0;padding:0;background:#f6f7f8;font-family:-apple-system,Segoe UI,Roboto,'Malgun Gothic',sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
<tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.6;">${esc(s.greeting(name))}</td></tr>
${paras.map((p) => `<tr><td style="padding:6px 28px;font-size:15px;line-height:1.7;">${esc(p)}</td></tr>`).join("")}
<tr><td style="padding:18px 28px 8px;"><a href="${esc(props.trackUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:8px;">${esc(s.cta)}</a></td></tr>
<tr><td style="padding:6px 28px 20px;font-size:12px;line-height:1.6;color:#6b7280;">${esc(s.reply)}</td></tr>
<tr><td style="padding:14px 28px 24px;border-top:1px solid #f3f4f6;font-size:11px;line-height:1.6;color:#9ca3af;">${esc(s.disclaimer)}<br>${esc(s.footer)}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [s.greeting(name), "", ...paras, "", `${s.cta}: ${props.trackUrl}`, "", s.reply, "", s.disclaimer, s.footer].join("\n");
  return { subject: s.subject[props.phase], html, text };
}
