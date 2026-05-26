import Link from "next/link";
import Script from "next/script";

// ─────────────────────────────────────────────────────────────
// Yandex SEO 최적화 — 러시아어 의료관광 랜딩페이지
// 키워드: лечение рака в Корее, медицинский туризм Корея, онкология Южная Корея
// ─────────────────────────────────────────────────────────────

export const metadata = {
  title: "Лечение рака в Корее | Медицинский туризм — HEALO",
  description:
    "Лечение онкологии в Южной Корее: иммунотерапия, корейская медицина, онкология. Клиника Immune Hospital — 50 000+ пациентов. Полный консьерж-сервис от HEALO. Бесплатная консультация.",
  keywords: [
    "лечение рака в Корее",
    "медицинский туризм Корея",
    "онкология Южная Корея",
    "иммунотерапия Корея",
    "корейская медицина рак",
    "лечение в Сеуле",
    "онкоклиника Корея",
    "медицинская виза Корея",
    "HEALO Корея",
  ],
  alternates: {
    canonical: "/ru/for-russian-patients",
    languages: {
      ru: "/ru/for-russian-patients",
      kk: "/kk/for-kazakh-patients",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "Лечение рака в Корее | HEALO — Медицинский консьерж",
    description:
      "Онкологическое лечение в Южной Корее. Immune Hospital: 50 000+ случаев, протокол ITCR, иммунотерапия корейской медицины. Поддержка на русском языке.",
    type: "website",
    locale: "ru_RU",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  name: "Лечение рака в Корее — HEALO",
  description:
    "Справочник по медицинскому туризму для онкологических пациентов из России и СНГ. Иммунотерапия, корейская медицина, визовая поддержка.",
  url: "https://khidi.healo.kr/ru/for-russian-patients",
  inLanguage: "ru",
  audience: {
    "@type": "MedicalAudience",
    audienceType: "Patient",
    geographicArea: [
      { "@type": "Country", name: "Russia" },
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
    name: "HEALO",
    url: "https://khidi.healo.kr",
  },
};

const FAQ = [
  {
    q: "Можно ли лечиться в Корее без знания корейского языка?",
    a: "Да. HEALO обеспечивает сопровождение на русском языке на всех этапах: от первичной консультации до выписки.",
  },
  {
    q: "Сколько стоит лечение рака в Корее?",
    a: "Стоимость зависит от типа онкологии и программы лечения. Иммунотерапия в Immune Hospital начинается от $3 000 в месяц. Мы предоставляем бесплатный предварительный расчёт.",
  },
  {
    q: "Какая виза нужна для лечения в Корее?",
    a: "Для медицинского лечения оформляется виза C-3-3 (краткосрочный медицинский визит) или D-2 при длительном курсе. HEALO помогает со всеми документами.",
  },
  {
    q: "Как долго длится курс лечения?",
    a: "Минимальный курс иммунотерапии — 2–4 недели. Длительность зависит от стадии заболевания. Среднее пребывание пациентов из СНГ — 4–8 недель.",
  },
];

export default function ForRussianPatientsPage() {
  return (
    <>
      <Script
        id="jsonld-ru-landing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-4xl mx-auto px-4 py-12 text-gray-800">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-teal-700 mb-4">
            Лечение рака в Корее
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Медицинский туризм в Южную Корею для онкологических пациентов.
            Иммунотерапия, корейская медицина, полный консьерж-сервис на русском
            языке.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/consult/start"
              className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              Бесплатная консультация
            </Link>
            <Link
              href="/hospitals/immune"
              className="border border-teal-600 text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
            >
              Immune Hospital →
            </Link>
          </div>
        </section>

        {/* ── Цифры (с источниками) ────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-600 mb-1">72,9%</div>
              <p className="text-sm text-gray-500">5-летняя выживаемость при раке в Корее (2018–2022)</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-600 mb-1">1,17 млн</div>
              <p className="text-sm text-gray-500">иностранных пациентов выбрали Корею в 2024 году</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-600 mb-1">16 000+</div>
              <p className="text-sm text-gray-500">пациентов из России прошли лечение в Корее (2009–2024)</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            Источники: Национальный онкологический центр Кореи (национальный реестр рака); статистика иностранных пациентов KHIDI.
          </p>
        </section>

        {/* ── Почему Корея ────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Почему Южная Корея для лечения онкологии?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Передовые технологии",
                body: "Южная Корея входит в топ-5 мировых лидеров по онкологии. Роботизированная хирургия, протонная терапия, иммунотерапия нового поколения.",
              },
              {
                title: "Корейская медицина (ханый)",
                body: "Уникальная интеграция традиционной корейской медицины с западной онкологией. Повышает иммунитет, снижает побочные эффекты химиотерапии.",
              },
              {
                title: "Доступная стоимость",
                body: "Стоимость лечения в Корее на 30–60% ниже, чем в США или Германии при сопоставимом качестве медицинской помощи.",
              },
              {
                title: "Быстрые сроки",
                body: "Запись к ведущим специалистам — от 3 до 7 рабочих дней. Результаты первичной диагностики — в течение 24–48 часов.",
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
            Immune Hospital (면력한방병원) — наш партнёр
          </h2>
          <p className="text-gray-700 mb-4">
            Immune Hospital — ведущая клиника корейской медицины в Сеуле,
            специализирующаяся на иммунотерапии для онкологических пациентов.
          </p>
          <ul className="space-y-2 text-gray-700 mb-6">
            <li>✓ Более 50 000 случаев лечения онкологических пациентов</li>
            <li>✓ Авторский протокол ITCR (5 принципов иммунной терапии)</li>
            <li>✓ Лечебное питание, разработанное шеф-поваром</li>
            <li>✓ 4 клиники в Сеуле и районе Кёнги</li>
            <li>✓ Переводчики на русском языке</li>
          </ul>
          <Link
            href="/hospitals/immune"
            className="text-teal-600 font-medium hover:underline"
          >
            Подробнее об Immune Hospital →
          </Link>
        </section>

        {/* ── Процесс ─────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Как проходит лечение: пошагово
          </h2>
          <ol className="space-y-4">
            {[
              { step: "1", title: "Онлайн-консультация", desc: "Заполните форму и загрузите медицинские документы. HEALO анализирует историю болезни бесплатно." },
              { step: "2", title: "План лечения и стоимость", desc: "Врачи Immune Hospital готовят индивидуальный план в течение 3–5 рабочих дней. Вы получаете детальный расчёт стоимости." },
              { step: "3", title: "Виза и логистика", desc: "HEALO помогает оформить медицинскую визу C-3-3, бронирует жильё рядом с клиникой и организует трансфер." },
              { step: "4", title: "Лечение в Корее", desc: "Персональный менеджер сопровождает вас на всех визитах. Русскоязычный переводчик доступен 24/7." },
              { step: "5", title: "Поддержка после выезда", desc: "Телемедицинские консультации с врачом, мониторинг состояния онлайн через приложение HEALO." },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
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

        {/* ── Виза и расходы ───────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Виза и ориентировочные расходы
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Медицинская виза в Корею</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Виза C-3-3: краткосрочная (до 90 дней)</li>
                <li>• Срок оформления: 5–7 рабочих дней</li>
                <li>• Документы: паспорт, письмо клиники, страховка</li>
                <li>• HEALO готовит пакет документов</li>
              </ul>
              <Link href="/visa" className="mt-4 block text-teal-600 text-sm hover:underline">
                Подробнее о визе →
              </Link>
            </div>
            <div className="border rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Примерные расходы</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Иммунотерапия: от $3 000/мес.</li>
                <li>• Жильё рядом с клиникой: от $800/мес.</li>
                <li>• Перелёт (Алматы — Сеул): от $400</li>
                <li>• Диагностика: от $500</li>
              </ul>
              <Link href="/consult/start" className="mt-4 block text-teal-600 text-sm hover:underline">
                Получить точный расчёт →
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Часто задаваемые вопросы
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
        <section className="bg-teal-600 text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Начните бесплатную консультацию</h2>
          <p className="mb-6 text-teal-100">
            Наши менеджеры ответят в течение 24 часов. Консультация бесплатна и ни к чему
            не обязывает.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/consult/start"
              className="bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
            >
              Записаться на консультацию
            </Link>
            <Link
              href="/treatments"
              className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              Виды лечения →
            </Link>
          </div>
        </section>

        {/* ── Internal links ─────────────────────────────── */}
        <nav className="mt-10 pt-6 border-t text-sm text-gray-500 flex flex-wrap gap-4">
          <Link href="/ru" className="hover:text-teal-600">Главная (RU)</Link>
          <Link href="/treatments" className="hover:text-teal-600">Виды лечения</Link>
          <Link href="/hospitals" className="hover:text-teal-600">Больницы</Link>
          <Link href="/hospitals/immune" className="hover:text-teal-600">Immune Hospital</Link>
          <Link href="/visa" className="hover:text-teal-600">Виза</Link>
          <Link href="/faq" className="hover:text-teal-600">FAQ</Link>
        </nav>
      </main>
    </>
  );
}
