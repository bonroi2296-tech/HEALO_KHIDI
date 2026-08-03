/**
 * healwith: 접수 확인 이메일 — 문의가 들어온 «그 자리에서» 진행상황 주소를 돌려준다.
 *
 * 왜 필요했나: 전에는 문의자에게 나가는 자동 메일이 하나도 없었다. 진행상황 주소
 * (inquiries.public_token)는 만들어져 저장돼 있는데 **브라우저 메모리 밖으로 나가는 길이 없어**,
 * 새로고침하면 본인도 자기 문의를 다시 못 찾았다(2026-08-03 조사).
 *
 * 단순 HTML (React Email 없이 — 이메일 클라이언트 호환성 최대화). 톤=infoRequest 템플릿과 동일.
 * 핵심: "가입 없이 이 주소로 계속 확인" + 가입은 «권유»만(강요 아님).
 */

import type { TrackingLang } from "@/lib/inquiry/trackingLink";

export interface InquiryReceivedProps {
  recipientName?: string;
  trackUrl: string;
  lang?: TrackingLang;
}

const STRINGS: Record<
  TrackingLang,
  {
    subject: string;
    greeting: (n: string) => string;
    intro: string;
    when: string;
    cta: string;
    noLogin: string;
    signup: string;
    footer: string;
  }
> = {
  ko: {
    subject: "healwith — 문의가 접수됐습니다",
    greeting: (n) => `안녕하세요${n ? `, ${n}님` : ""}.`,
    intro:
      "문의 주셔서 감사합니다. 담당 코디네이터가 내용을 확인하고 있습니다. 아래 주소에서 지금 어느 단계까지 왔는지 언제든 확인하실 수 있습니다.",
    when: "코디네이터가 영업일 1일 이내에 연락드립니다.",
    cta: "진행 상황 보기",
    noLogin: "※ 회원가입·로그인 없이 이 주소로 바로 보실 수 있습니다. 본인 전용 주소이니 공유하지 마세요.",
    signup: "가입하시면 단계가 바뀔 때 알림을 받고, 서류를 주고받거나 화상상담을 예약하실 수 있습니다.",
    footer: "healwith · 한국 암 치료 컨시어지",
  },
  en: {
    subject: "healwith — we've received your inquiry",
    greeting: (n) => `Hello${n ? `, ${n}` : ""},`,
    intro:
      "Thank you for reaching out. Your coordinator is reviewing your inquiry. You can check how far along it is at the link below, anytime.",
    when: "A coordinator will contact you within one business day.",
    cta: "See the progress",
    noLogin: "※ No sign-up or login needed — just open this link. It's yours only; please don't share it.",
    signup:
      "If you sign up, you'll get alerts when the stage changes, and you can share documents or book a video consultation.",
    footer: "healwith · Korea cancer-care concierge",
  },
  ru: {
    subject: "healwith — ваша заявка принята",
    greeting: (n) => `Здравствуйте${n ? `, ${n}` : ""}!`,
    intro:
      "Спасибо за обращение. Координатор изучает вашу заявку. По ссылке ниже вы в любой момент можете посмотреть, на каком этапе она находится.",
    when: "Координатор свяжется с вами в течение одного рабочего дня.",
    cta: "Посмотреть ход дела",
    noLogin:
      "※ Регистрация и вход не нужны — просто откройте ссылку. Она только для вас, не передавайте её другим.",
    signup:
      "Если зарегистрируетесь, будете получать уведомления о смене этапа, сможете обмениваться документами и записаться на видеоконсультацию.",
    footer: "healwith · Корейский центр онкологии для иностранцев",
  },
  kz: {
    subject: "healwith — өтініміңіз қабылданды",
    greeting: (n) => `Сәлеметсіз бе${n ? `, ${n}` : ""}!`,
    intro:
      "Хабарласқаныңызға рахмет. Үйлестіруші өтінішіңізді қарап жатыр. Төмендегі сілтемеден оның қай кезеңде екенін кез келген уақытта көре аласыз.",
    when: "Үйлестіруші бір жұмыс күні ішінде хабарласады.",
    cta: "Барысын көру",
    noLogin: "※ Тіркелу де, кіру де қажет емес — сілтемені ашыңыз. Ол тек сізге арналған, басқаларға бермеңіз.",
    signup:
      "Тіркелсеңіз, кезең өзгергенде хабарлама аласыз, құжат алмасып, бейнекеңеске жазыла аласыз.",
    footer: "healwith · Шетелдіктерге арналған Корея онкология орталығы",
  },
  zh: {
    subject: "healwith — 我们已收到您的咨询",
    greeting: (n) => `您好${n ? `，${n}` : ""}：`,
    intro: "感谢您的咨询。协调员正在查看您的内容。您可以随时通过下方链接查看目前进行到哪一步。",
    when: "协调员将在一个工作日内与您联系。",
    cta: "查看进度",
    noLogin: "※ 无需注册或登录，打开链接即可查看。此链接仅供您本人使用，请勿分享。",
    signup: "注册后，阶段变更时会收到提醒，还可以互传文件、预约视频问诊。",
    footer: "healwith · 韩国癌症诊疗管家",
  },
  ja: {
    subject: "healwith — お問い合わせを受け付けました",
    greeting: (n) => `こんにちは${n ? `、${n}様` : ""}。`,
    intro:
      "お問い合わせありがとうございます。担当コーディネーターが内容を確認しています。今どの段階まで進んでいるかは、下のリンクからいつでもご確認いただけます。",
    when: "コーディネーターが1営業日以内にご連絡します。",
    cta: "進捗を見る",
    noLogin: "※ 会員登録・ログインは不要です。このリンクを開くだけでご覧いただけます。本人専用のため共有しないでください。",
    signup: "ご登録いただくと、段階が変わったときに通知を受け取り、書類のやり取りやビデオ相談の予約ができます。",
    footer: "healwith · 韓国がん治療コンシェルジュ",
  },
};

export function renderInquiryReceivedEmail(props: InquiryReceivedProps): {
  subject: string;
  html: string;
  text: string;
} {
  const lang: TrackingLang = props.lang && STRINGS[props.lang] ? props.lang : "en";
  const s = STRINGS[lang];
  const name = (props.recipientName || "").trim();
  const url = props.trackUrl;

  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
    <div style="font-size:20px;font-weight:800;color:#0d9488;margin-bottom:24px;">healwith</div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
      <p style="font-size:15px;margin:0 0 14px;">${s.greeting(name)}</p>
      <p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 14px;">${s.intro}</p>
      <p style="font-size:13px;line-height:1.6;color:#64748b;margin:0 0 22px;">${s.when}</p>
      <a href="${url}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:12px;">${s.cta}</a>
      <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:22px 0 0;">${s.noLogin}</p>
      <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:10px 0 0;">${s.signup}</p>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:20px 0 0;">${s.footer}</p>
  </div>
</body></html>`;

  const text = `${s.greeting(name)}\n\n${s.intro}\n\n${s.when}\n\n${s.cta}: ${url}\n\n${s.noLogin}\n${s.signup}\n\n${s.footer}`;

  return { subject: s.subject, html, text };
}
