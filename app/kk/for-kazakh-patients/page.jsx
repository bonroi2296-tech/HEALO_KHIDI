import Link from "next/link";
import Script from "next/script";

// ─────────────────────────────────────────────────────────────
// Yandex SEO 최적화 — 카자흐어 의료관광 랜딩페이지
// 키워드: Кореядағы онкологиялық емдеу, Корея медициналық туризм
// ─────────────────────────────────────────────────────────────

export const metadata = {
  title: "Кореядағы онкологиялық емдеу | Медициналық туризм — healwith",
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
    title: "Кореядағы рак емдеу | healwith медициналық консьерж",
    description:
      "Оңтүстік Кореядағы онкологиялық емдеу. Immune Hospital: 50 000+ науқас, ITCR хаттамасы. Қазақ тілінде қолдау.",
    type: "website",
    locale: "kk_KZ",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  name: "Кореядағы онкологиялық емдеу — healwith",
  description:
    "Қазақстандық онкологиялық науқастарға арналған Оңтүстік Кореяда медициналық туризм нұсқаулығы.",
  url: "https://khidi.healo.kr/kk/for-kazakh-patients",
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
    url: "https://khidi.healo.kr",
  },
};

const FAQ = [
  {
    q: "Корей тілін білмей-ақ емделуге болады ма?",
    a: "Иә. healwith барлық кезеңдерде — алғашқы кеңестен шығарылымға дейін қазақ және орыс тіліндегі аударманы қамтамасыз етеді.",
  },
  {
    q: "Кореяда рак емдеу қанша тұрады?",
    a: "Баға онкология түріне және емдеу бағдарламасына байланысты. Immune Hospital-дегі иммунотерапия айына $3 000-нан басталады. Тегін алдын ала есептеу ұсынамыз.",
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
      <Script
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
            <Link
              href="/consult/start"
              className="bg-teal-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-800 transition"
            >
              Тегін кеңес алу
            </Link>
            <Link
              href="/hospitals/immune"
              className="border border-teal-600 text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
            >
              Immune Hospital →
            </Link>
          </div>
        </section>

        {/* ── Сандар (дереккөздермен) ──────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-700 mb-1">72,9%</div>
              <p className="text-sm text-gray-500">Кореяда обырдан 5 жылдық өмір сүру (2018–2022)</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-700 mb-1">1,17 млн</div>
              <p className="text-sm text-gray-500">2024 жылы Кореяны таңдаған шетелдік науқастар</p>
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
                <h3 className="font-semibold text-teal-800 mb-2">{title}</h3>
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
          <Link
            href="/hospitals/immune"
            className="text-teal-700 font-medium hover:underline"
          >
            Immune Hospital туралы толығырақ →
          </Link>
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
              { step: "4", title: "Кореядағы емдеу", desc: "Жеке менеджер барлық визиттерде ілеседі. Қазақ/орыс тіліндегі аудармашы 24/7 қолжетімді." },
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
              <h3 className="font-semibold text-gray-800 mb-3">Виза</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• C-3-3 медициналық виза (90 күнге дейін)</li>
                <li>• Рәсімдеу мерзімі: 5–7 жұмыс күні</li>
                <li>• Алматы консулдығынан немесе онлайн өтінім</li>
                <li>• healwith құжаттар пакетін дайындайды</li>
              </ul>
              <Link href="/visa" className="mt-4 block text-teal-700 text-sm hover:underline">
                Виза туралы толығырақ →
              </Link>
            </div>
            <div className="border rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Рейстер</h3>
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
            <Link
              href="/consult/start"
              className="bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
            >
              Кеңеске жазылу
            </Link>
            <Link
              href="/treatments"
              className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-800 transition"
            >
              Емдеу түрлері →
            </Link>
          </div>
        </section>

        {/* ── Internal links ─────────────────────────────── */}
        <nav className="mt-10 pt-6 border-t text-sm text-gray-500 flex flex-wrap gap-4">
          <Link href="/ru/for-russian-patients" className="hover:text-teal-700">Орысша нұсқа</Link>
          <Link href="/treatments" className="hover:text-teal-700">Емдеу түрлері</Link>
          <Link href="/hospitals" className="hover:text-teal-700">Емханалар</Link>
          <Link href="/hospitals/immune" className="hover:text-teal-700">Immune Hospital</Link>
          <Link href="/visa" className="hover:text-teal-700">Виза</Link>
          <Link href="/faq" className="hover:text-teal-700">FAQ</Link>
        </nav>
      </main>
    </>
  );
}
