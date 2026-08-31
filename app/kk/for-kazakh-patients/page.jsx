import Link from "next/link";
import { whatsappWithText } from "@/lib/siteSettings";

// ─────────────────────────────────────────────────────────────
// 카자흐어 의료관광 랜딩페이지 — 검색광고 착지 페이지도 겸한다
// 키워드: Кореядағы онкологиялық емдеу, Корея медициналық туризм
//
// ⚠️ 광고 착지 규칙은 러시아어판(app/ru/for-russian-patients)과 동일하다.
//    ①「세포 치료·줄기세포」로 가는 직접 링크를 만들지 말 것
//    ②첫 제안은 「무료 2차 소견」으로
// ─────────────────────────────────────────────────────────────

// 광고에서 온 문의를 세는 장치 — 첫 메시지에 [KZ-ADS] 가 박혀서 온다.
const WA_SECOND_OPINION = whatsappWithText(
  "Сәлеметсіз бе! Жарнама бойынша хабарласып отырмын. Онколог дәрігердің екінші пікірін алғым келеді. [KZ-ADS]"
);

export const metadata = {
  // 루트 layout 의 title.template("%s | healwith")이 브랜드를 붙여준다 →
  // 여기서 "— healwith"를 또 쓰면 "… — healwith | healwith"로 중복 렌더된다(실측 확인).
  title: "Кореядағы онкологиялық емдеу | Медициналық туризм",
  description:
    "Оңтүстік Кореядағы онкологиялық емдеу: иммунотерапия, корей медицинасы. Immune Hospital — 50 000+ науқас. healwith толық консьерж қызметі. Тегін кеңес.",
  keywords: [
    "Кореядағы онкологиялық емдеу",
    "Корея медициналық туризм",
    "Кореяда рак емдеу",
    "иммунотерапия Корея",
    "Сеулдегі емхана",
    "Казахстан Корея медицина",
    "healwith Корея",
    "медициналық виза Корея",
  ],
  alternates: {
    canonical: "/kk/for-kazakh-patients",
    languages: {
      kk: "/kk/for-kazakh-patients",
      ru: "/ru/for-russian-patients",
      "x-default": "/",
    },
  },
  openGraph: {
    url: "/kk/for-kazakh-patients",
    title: "Кореядағы рак емдеу | healwith медициналық консьерж",
    description:
      "Оңтүстік Кореядағы онкологиялық емдеу. Immune Hospital: 50 000+ науқас, ITCR хаттамасы. Қазақ тілінде қолдау.",
    type: "website",
    locale: "kk_KZ",
  },
  // ⚠️ twitter 를 «반드시» 같이 둔다 — 이유는 app/ru/for-russian-patients/page.jsx 주석과 같다.
  //    openGraph 만 정의하면 twitter 카드만 루트의 영어 문구로 나간다(2026-08-31 실측).
  twitter: {
    card: "summary_large_image",
    title: "Кореядағы рак емдеу | healwith медициналық консьерж",
    description:
      "Оңтүстік Кореядағы онкологиялық емдеу. Immune Hospital: 50 000+ науқас, ITCR хаттамасы. Қазақ тілінде қолдау.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  name: "Кореядағы онкологиялық емдеу — healwith",
  description:
    "Қазақстандық онкологиялық науқастарға арналған Оңтүстік Кореяда медициналық туризм нұсқаулығы.",
  url: "https://healwith.co.kr/kk/for-kazakh-patients",
  inLanguage: "kk",
  audience: {
    "@type": "MedicalAudience",
    audienceType: "Patient",
    geographicArea: [
      { "@type": "Country", name: "Kazakhstan" },
      { "@type": "Country", name: "Kyrgyzstan" },
      { "@type": "Country", name: "Uzbekistan" },
    ],
  },
  about: {
    "@type": "MedicalCondition",
    name: "Онкология",
    alternateName: "Cancer",
  },
  provider: {
    "@type": "Organization",
    name: "healwith",
    url: "https://healwith.co.kr",
  },
};

const FAQ = [
  {
    q: "Корей тілін білмей-ақ емделуге болады ма?",
    a: "Иә. healwith барлық кезеңдерде — алғашқы кеңестен шығарылымға дейін қазақ және орыс тіліндегі аударманы қамтамасыз етеді.",
  },
  {
    q: "Кореяда рак емдеу қанша тұрады?",
    a: "Баға онкология түріне және емдеу бағдарламасына байланысты. Университеттік клиникалардағы ота — рак түріне қарай шамамен $3 000–18 500; Immune Hospital-дегі интегративті иммундық курс — аптасына $740-тан басталады. Тегін алдын ала есептеу ұсынамыз.",
  },
  {
    q: "Қазақстандықтарға Корея визасын алу оңай ма?",
    a: "Медициналық C-3-3 визасы 5–7 жұмыс күнінде ресімделеді. healwith барлық құжаттарды дайындауға көмектеседі.",
  },
  {
    q: "Емдеу курсы қанша уақытқа созылады?",
    a: "Иммунотерапияның минималды курсы — 2–4 апта. Қазақстандық науқастардың орташа тұру мерзімі — 4–8 апта.",
  },
];

export default function ForKazakhPatientsPage() {
  return (
    <>
      <script
        id="jsonld-kk-landing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-4xl mx-auto px-4 py-12 text-gray-800">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-teal-700 mb-4">
            Кореяда онкология емдеу
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Қазақстандық науқастарға арналған Оңтүстік Кореяға медициналық туризм.
            Иммунотерапия, корей дәстүрлі медицинасы, қазақ тіліндегі толық
            консьерж қызметі.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {/* 첫 버튼 = 왓츠앱 바로가기 (카자흐스탄 왓츠앱 이용률 83%, 웹폼은 잘 안 쓴다) */}
            <a
              href={WA_SECOND_OPINION}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-teal-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-800 transition"
            >
              Екінші пікір тегін · WhatsApp
            </a>
            <Link
              href="/kz/inquiry"
              className="border border-teal-600 text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
            >
              Өтініш қалдыру
            </Link>
          </div>
        </section>

        {/* ── Сандар (дереккөздермен) ──────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-700 mb-1">73,7%</div>
              <p className="text-sm text-gray-500">Кореяда обырдан 5 жылдық өмір сүру (2019–2023)</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-700 mb-1">2,01 млн</div>
              <p className="text-sm text-gray-500">2025 жылы Кореяны таңдаған шетелдік науқастар</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-700 mb-1">14 000+</div>
              <p className="text-sm text-gray-500">Қазақстаннан Кореяда емделген науқастар (2009–2024)</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            Дереккөздер: Корея Ұлттық онкология орталығы (ұлттық обыр тіркелімі); KHIDI шетелдік науқастар статистикасы.
          </p>
        </section>

        {/* ── Неге Корея ──────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Онкологияны емдеу үшін неге Оңтүстік Корея?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Жоғары технология",
                body: "Оңтүстік Корея онкология саласында әлемдік ТОП-5-те. Роботты хирургия, протон терапиясы, жаңа буын иммунотерапиясы.",
              },
              {
                title: "Корей дәстүрлі медицинасы",
                body: "Батыс онкологиясымен корей дәстүрлі медицинасының бірегей үйлесімі. Иммундық жүйені нығайтады, химиотерапияның жанама әсерін азайтады.",
              },
              {
                title: "Қолжетімді баға",
                body: "Кореядағы емдеу бағасы АҚШ немесе Германиямен салыстырғанда 30–60% арзан, ал медициналық көмек сапасы бірдей.",
              },
              {
                title: "Жылдам мерзім",
                body: "Жетекші мамандарға жазылу — 3–7 жұмыс күні. Алғашқы диагностика нәтижесі — 24–48 сағат ішінде.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="bg-teal-50 rounded-xl p-6">
                <h3 className="text-[clamp(24px,2.5vw,32px)] font-semibold text-teal-800 mb-2">{title}</h3>
                <p className="text-gray-700 text-sm">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Immune Hospital ──────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Immune Hospital (면력한방병원) — біздің серіктес
          </h2>
          <p className="text-gray-700 mb-4">
            Immune Hospital — Сеулдегі онкологиялық науқастарға арналған
            иммунотерапия бойынша мамандандырылған жетекші корей медицинасы клиникасы.
          </p>
          <ul className="space-y-2 text-gray-700 mb-6">
            <li>✓ 50 000+ онкологиялық науқасты емдеу жағдайлары</li>
            <li>✓ ITCR авторлық хаттамасы (иммундық терапияның 5 қағидасы)</li>
            <li>✓ Аспазшы-маман дайындаған емдік тамақтану</li>
            <li>✓ Сеул мен Кёнги ауданында 4 клиника</li>
            <li>✓ Қазақ және орыс тіліндегі аудармашылар</li>
          </ul>
          {/* 병원 상세로 보내지 않는다 — 그 페이지에 "stem cell therapy" 가 있어
              광고 심사에서 「세포 치료」로 걸릴 수 있다(파일 상단 주석 참조). */}
          <a
            href={WA_SECOND_OPINION}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 font-medium hover:underline"
          >
            Клиника туралы WhatsApp арқылы сұрау →
          </a>
        </section>

        {/* ── Қадамдар ─────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Емдеу процесі: қадамдар
          </h2>
          <ol className="space-y-4">
            {[
              { step: "1", title: "Онлайн кеңес", desc: "Нысанды толтырып, медициналық құжаттарды жүктеңіз. healwith ауру тарихын тегін талдайды." },
              { step: "2", title: "Емдеу жоспары мен баға", desc: "Immune Hospital дәрігерлері 3–5 жұмыс күні ішінде жеке жоспар жасайды. Баға есебі толық беріледі." },
              { step: "3", title: "Виза мен логистика", desc: "healwith C-3-3 медициналық визасын рәсімдеуге, клиника жанындағы тұрғын үйді брондауға және трансферді ұйымдастыруға көмектеседі." },
              { step: "4", title: "Кореядағы емдеу", desc: "Жеке менеджер барлық визиттерде ілеседі. Қазақ/орыс тіліндегі аудармашы қолдау көрсетеді." },
              { step: "5", title: "Кетуден кейінгі қолдау", desc: "Дәрігермен телемедициналық кеңестер, healwith қосымшасы арқылы онлайн мониторинг." },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-teal-700 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {step}
                </span>
                <div>
                  <strong className="text-gray-800">{title}</strong>
                  <p className="text-gray-600 text-sm mt-1">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Казахстанға арнайы ──────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Қазақстандықтарға арнайы ақпарат
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-6">
              <h3 className="text-[clamp(24px,2.5vw,32px)] font-semibold text-gray-800 mb-3">Виза</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• C-3-3 медициналық виза (90 күнге дейін)</li>
                <li>• Рәсімдеу мерзімі: 5–7 жұмыс күні</li>
                <li>• Алматы консулдығынан немесе онлайн өтінім</li>
                <li>• healwith құжаттар пакетін дайындайды</li>
              </ul>
              <Link href="/kz/visa" className="mt-4 block text-teal-700 text-sm hover:underline">
                Виза туралы толығырақ →
              </Link>
            </div>
            <div className="border rounded-xl p-6">
              <h3 className="text-[clamp(24px,2.5vw,32px)] font-semibold text-gray-800 mb-3">Рейстер</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Алматы — Сеул: тікелей рейс (6 сағат)</li>
                <li>• Нұр-Сұлтан — Сеул: транзитпен (8–10 сағат)</li>
                <li>• Air Astana, Korean Air тікелей рейстері бар</li>
                <li>• healwith ұшуды брондауға кеңес береді</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Жиі қойылатын сұрақтар
          </h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="border rounded-lg p-4 cursor-pointer">
                <summary className="font-medium text-gray-800">{q}</summary>
                <p className="mt-3 text-gray-600 text-sm">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="bg-teal-700 text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Тегін кеңес алыңыз</h2>
          <p className="mb-6 text-teal-100">
            Менеджерлеріміз 24 сағат ішінде жауап береді. Кеңес тегін және ешқандай
            міндеттеме жоқ.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={WA_SECOND_OPINION}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
            >
              WhatsApp арқылы жазу
            </a>
            <Link
              href="/kz/inquiry"
              className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-800 transition"
            >
              Өтініш қалдыру
            </Link>
          </div>
        </section>

        {/* ── Internal links ─────────────────────────────── */}
        <nav className="mt-10 pt-6 border-t text-sm text-gray-500 flex flex-wrap gap-4">
          <Link href="/ru/for-russian-patients" className="hover:text-teal-700">Орысша нұсқа</Link>
          <Link href="/kz/treatments" className="hover:text-teal-700">Емдеу түрлері</Link>
          <Link href="/kz/hospitals" className="hover:text-teal-700">Емханалар</Link>
          {/* Immune Hospital 직링크 제거 — 광고 심사 경로에서 「세포 치료」를 떼어내기 위함.
              병원 목록(/hospitals)을 통해서는 그대로 갈 수 있다. */}
          <Link href="/kz/visa" className="hover:text-teal-700">Виза</Link>
          <Link href="/kz/faq" className="hover:text-teal-700">FAQ</Link>
        </nav>
      </main>
    </>
  );
}
