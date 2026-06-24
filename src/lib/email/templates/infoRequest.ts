/**
 * healwith: 추가 정보 요청 이메일 — 코디가 환자에게 Step2 상세 인테이크 폼 링크를 보낼 때.
 *
 * 단순 HTML (React Email 없이 — 이메일 클라이언트 호환성 최대화). 톤=상담초대 템플릿과 동일.
 * 핵심: "로그인 없이 링크로 바로 작성" 을 강조(저마찰 — 회원가입/앱설치 요구 안 함).
 */

export type EmailLang = "ko" | "en" | "ru" | "kz" | "zh" | "ja";

export interface InfoRequestProps {
  recipientName?: string;
  formUrl: string;
  lang?: EmailLang;
}

const STRINGS: Record<
  EmailLang,
  {
    subject: string;
    greeting: (n: string) => string;
    intro: string;
    why: string;
    cta: string;
    noLogin: string;
    footer: string;
  }
> = {
  ko: {
    subject: "healwith — 치료 안내를 위해 몇 가지만 더 알려주세요",
    greeting: (n) => `안녕하세요${n ? `, ${n}님` : ""}.`,
    intro:
      "문의 주셔서 감사합니다. 더 정확한 치료 안내와 병원 매칭을 위해 현재 상황(진단·치료 단계·희망 일정 등)을 조금만 더 알려주시면 담당 코디네이터가 바로 도와드리겠습니다.",
    why: "이 정보는 적합한 종양 병원·치료 경로를 찾고, 의료비자·일정을 준비하는 데 쓰입니다.",
    cta: "추가 정보 입력하기",
    noLogin:
      "※ 회원가입·앱 설치 없이 이 링크로 바로 작성하실 수 있습니다. 본인 전용 링크이니 공유하지 마세요.",
    footer: "healwith · 한국 암 치료 컨시어지",
  },
  en: {
    subject: "healwith — a few more details to guide your treatment",
    greeting: (n) => `Hello${n ? `, ${n}` : ""},`,
    intro:
      "Thank you for reaching out. To give you accurate treatment guidance and match the right hospital, please share a little more about your situation (diagnosis, treatment stage, preferred timing). Your coordinator will take it from there.",
    why: "We use this to find the right oncology hospital and care path, and to help prepare your medical visa and schedule.",
    cta: "Add your details",
    noLogin:
      "※ No sign-up or app needed — just open this link and fill it in. This link is for you only; please don't share it.",
    footer: "healwith · Korea cancer-care concierge",
  },
  ru: {
    subject: "healwith — несколько деталей, чтобы помочь с лечением",
    greeting: (n) => `Здравствуйте${n ? `, ${n}` : ""}!`,
    intro:
      "Спасибо за обращение. Чтобы дать точные рекомендации по лечению и подобрать подходящую больницу, расскажите немного о вашей ситуации (диагноз, этап лечения, желаемые сроки). Дальше вам поможет ваш координатор.",
    why: "Эти данные нужны, чтобы подобрать онкологическую больницу и план лечения, а также помочь с медицинской визой и расписанием.",
    cta: "Заполнить данные",
    noLogin:
      "※ Регистрация и приложение не нужны — просто откройте ссылку и заполните. Ссылка только для вас, не передавайте её другим.",
    footer: "healwith · Корейский центр онкологии для иностранцев",
  },
  kz: {
    subject: "healwith — емдеуге бағыт беру үшін бірнеше дерек",
    greeting: (n) => `Сәлеметсіз бе${n ? `, ${n}` : ""}!`,
    intro:
      "Хабарласқаныңызға рахмет. Дұрыс емдеу бағытын беру және қолайлы ауруханамен сәйкестендіру үшін жағдайыңыз туралы (диагноз, емдеу кезеңі, қалаған уақыт) аздап толығырақ айтып беріңіз. Әрі қарай координаторыңыз көмектеседі.",
    why: "Бұл деректер онкологиялық ауруханаmen емдеу жоспарын таңдауға, медициналық виза мен кестені дайындауға қажет.",
    cta: "Деректерді толтыру",
    noLogin:
      "※ Тіркелу де, қосымша да қажет емес — сілтемені ашып, толтырыңыз. Сілтеме тек сізге арналған, басқаларға бермеңіз.",
    footer: "healwith · Шетелдіктерге арналған Корея онкология орталығы",
  },
  zh: {
    subject: "healwith — 为您的治疗，请再补充几项信息",
    greeting: (n) => `您好${n ? `，${n}` : ""}：`,
    intro:
      "感谢您的咨询。为给您准确的治疗建议并匹配合适的医院，请再补充一些您的情况（诊断、治疗阶段、期望时间）。之后由您的协调员为您跟进。",
    why: "这些信息用于匹配肿瘤医院与治疗路径，并协助准备医疗签证和日程。",
    cta: "补充信息",
    noLogin:
      "※ 无需注册或安装应用——打开链接填写即可。此链接仅供您本人使用，请勿分享。",
    footer: "healwith · 韩国癌症诊疗管家",
  },
  ja: {
    subject: "healwith — 治療のご案内のため、もう少し教えてください",
    greeting: (n) => `こんにちは${n ? `、${n}様` : ""}。`,
    intro:
      "お問い合わせありがとうございます。より正確な治療のご案内と病院マッチングのため、現在の状況（診断・治療段階・希望時期など）を少し教えてください。あとは担当コーディネーターが対応します。",
    why: "この情報は、適切ながん病院と治療経路の選定、医療ビザ・日程の準備に使用します。",
    cta: "情報を入力する",
    noLogin:
      "※ 会員登録・アプリ不要 — このリンクを開いて入力するだけです。本人専用リンクのため共有しないでください。",
    footer: "healwith · 韓国がん治療コンシェルジュ",
  },
};

export function renderInfoRequestEmail(props: InfoRequestProps): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: EmailLang = props.lang && STRINGS[props.lang] ? props.lang : "en";
  const s = STRINGS[lang];
  const name = (props.recipientName || "").trim();
  const url = props.formUrl;

  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
    <div style="font-size:20px;font-weight:800;color:#0d9488;margin-bottom:24px;">healwith</div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
      <p style="font-size:15px;margin:0 0 14px;">${s.greeting(name)}</p>
      <p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 14px;">${s.intro}</p>
      <p style="font-size:13px;line-height:1.6;color:#64748b;margin:0 0 22px;">${s.why}</p>
      <a href="${url}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:12px;">${s.cta}</a>
      <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:22px 0 0;">${s.noLogin}</p>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:20px 0 0;">${s.footer}</p>
  </div>
</body></html>`;

  const text = `${s.greeting(name)}\n\n${s.intro}\n\n${s.why}\n\n${s.cta}: ${url}\n\n${s.noLogin}\n\n${s.footer}`;

  return { subject: s.subject, html, text };
}
