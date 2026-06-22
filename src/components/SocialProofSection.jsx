"use client";

/**
 * SocialProofSection — 신뢰 근거(당당한 마케팅 톤)
 *
 * ⚠️ 원칙: 가짜 후기·평점 금지(과거 홈의 A.K./M.S./T.Y. 가짜 후기 제거 이력)는 그대로 지키되,
 *  방어적 표현("지어낸 후기 대신…")·외국인에게 무의미한 한국 평점 플랫폼 링크(모두닥·네이버)는
 *  제거(PO 피드백 2026-06-21). 대신 **긍정적·실제 자격/숫자**만 자신있게 제시한다.
 *
 * 게시 데이터(전부 실제):
 *  - 누적 치료 사례 50,000건+ (면력한방병원 공식)
 *  - 제휴·협진 병원 8곳 (면력한방 4지점 + 협진 대학병원 4곳)
 *  - 6개 언어 실시간 통역 (서비스 기능)
 *  - 외국인환자 유치의료기관 등록 (보건복지부)
 */

import { HeartPulse, Building2, Languages, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";

const ICONS = [HeartPulse, Building2, Languages, ShieldCheck];

const COPY = {
  ko: {
    eyebrow: "믿고 맡기는 케어",
    title: "한국 의료 네트워크가\n처음부터 끝까지 함께합니다",
    lede: "검증된 협진 병원과 전담 통역·코디네이터가 진단부터 회복까지 동행합니다.",
    items: [
      { big: "50,000+", sub: "누적 치료 사례" },
      { big: "8곳", sub: "제휴·협진 병원 (양·한방)" },
      { big: "6개 언어", sub: "실시간 통역" },
      { big: "유치의료기관 등록", sub: "보건복지부 인증" },
    ],
  },
  en: {
    eyebrow: "Care you can trust",
    title: "Korea's medical network,\nwith you from start to finish",
    lede: "Vetted partner hospitals and a dedicated interpreter-coordinator accompany you from diagnosis to recovery.",
    items: [
      { big: "50,000+", sub: "treatment cases" },
      { big: "8", sub: "partner & cooperating hospitals" },
      { big: "6 languages", sub: "live interpretation" },
      { big: "Registered facility", sub: "Int'l patient care (MOHW)" },
    ],
  },
  ru: {
    eyebrow: "Забота, которой можно доверять",
    title: "Медицинская сеть Кореи —\nс вами от начала до конца",
    lede: "Проверенные больницы-партнёры и персональный переводчик-координатор сопровождают вас от диагностики до восстановления.",
    items: [
      { big: "50 000+", sub: "случаев лечения" },
      { big: "8", sub: "больниц-партнёров" },
      { big: "6 языков", sub: "синхронный перевод" },
      { big: "Аккредитация", sub: "для иностранных пациентов (Минздрав)" },
    ],
  },
  kz: {
    eyebrow: "Сенуге болатын күтім",
    title: "Корея медициналық желісі —\nбасынан аяғына дейін сізбен",
    lede: "Тексерілген серіктес ауруханалар мен жеке аудармашы-координатор диагностикадан сауығуға дейін қасыңызда.",
    items: [
      { big: "50 000+", sub: "емдеу жағдайы" },
      { big: "8", sub: "серіктес аурухана" },
      { big: "6 тіл", sub: "синхронды аударма" },
      { big: "Тіркелген мекеме", sub: "шетелдік науқастарға (ДСМ)" },
    ],
  },
  zh: {
    eyebrow: "值得信赖的诊疗",
    title: "韩国医疗网络，\n全程陪伴始终",
    lede: "经过审核的协诊医院与专属翻译协调员，从诊断到康复全程陪同。",
    items: [
      { big: "50,000+", sub: "累计治疗案例" },
      { big: "8家", sub: "合作·协诊医院" },
      { big: "6种语言", sub: "实时翻译" },
      { big: "已注册机构", sub: "外国患者诊疗（保健福祉部）" },
    ],
  },
  ja: {
    eyebrow: "信頼できるケア",
    title: "韓国の医療ネットワークが\n最初から最後まで寄り添います",
    lede: "審査を経た提携病院と専任の通訳コーディネーターが、診断から回復まで同行します。",
    items: [
      { big: "50,000+", sub: "累計治療事例" },
      { big: "8施設", sub: "提携・協診病院" },
      { big: "6言語", sub: "リアルタイム通訳" },
      { big: "登録医療機関", sub: "外国人患者誘致（保健福祉部）" },
    ],
  },
};

export default function SocialProofSection({ className = "" }) {
  const lang = useLang() || "ko";
  const c = COPY[lang] || COPY.ko;

  return (
    <section className={`bg-white py-10 md:py-16 ${className}`}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-10">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-3">
            {c.eyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 whitespace-pre-line leading-snug">{c.title}</h2>
          <p className="mt-3 text-sm md:text-base text-gray-500 leading-relaxed max-w-2xl mx-auto">{c.lede}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {c.items.map((it, i) => {
            const Icon = ICONS[i] || HeartPulse;
            return (
              <div
                key={i}
                className="border border-gray-200 rounded-2xl p-5 md:p-6 text-center flex flex-col items-center hover:border-teal-300 hover:shadow-sm transition-all"
              >
                <Icon size={26} className="text-teal-700 mb-2.5" aria-hidden="true" />
                <div className="text-lg md:text-xl font-extrabold text-gray-900 leading-tight">{it.big}</div>
                <p className="text-xs md:text-sm text-gray-500 mt-1 leading-snug">{it.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
