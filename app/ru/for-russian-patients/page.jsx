import Link from "next/link";
import { whatsappWithText } from "@/lib/siteSettings";
import { ORG_ID } from "@/lib/seo/structuredData";

// ─────────────────────────────────────────────────────────────
// 러시아어 의료관광 랜딩페이지 — 검색광고 착지 페이지도 겸한다
// 키워드: лечение рака в Корее, медицинский туризм Корея, онкология Южная Корея
//
// ⚠️ 광고 착지라서 지켜야 하는 것 2가지 (2026-07-28):
//  1) 「세포 치료·줄기세포」로 가는 길을 만들지 말 것.
//     구글 의료광고 정책이 "추측에 의한 의료 행위, 실험적 의료 행위, 세포 치료,
//     유전자 치료"를 제한 대상으로 명시했고, 심사는 착지 페이지와 그 링크를 함께 본다.
//     (병원 소개 페이지에 「줄기세포 치료」가 있어 히어로 버튼에서 링크를 뺐다)
//  2) 첫 제안은 「무료 2차 소견」으로. 수술 견적을 먼저 들이밀면 대화가 끊긴다.
// ─────────────────────────────────────────────────────────────

// 광고에서 온 문의를 세는 유일하게 확실한 장치 — 환자가 보내는 첫 메시지에 [RU-ADS] 가
// 박혀서 온다. 쿠키 동의 여부와 무관하게 100% 잡힌다.
const WA_SECOND_OPINION = whatsappWithText(
  "Здравствуйте! Я по объявлению. Хочу получить второе мнение онколога. [RU-ADS]"
);

export const metadata = {
  // 루트 layout 의 title.template("%s | healwith")이 브랜드를 붙여준다 →
  // 여기서 "— healwith"를 또 쓰면 "… — healwith | healwith"로 중복 렌더된다(실측 확인).
  // 러시아어는 글자가 길어 중복분이 구글 제목 잘림(약 60자)을 유발 → 정작 중요한 키워드가 밀림.
  title: "Лечение рака в Корее | Медицинский туризм",
  description:
    "Лечение онкологии в Южной Корее: иммунотерапия, корейская медицина, онкология. Клиника Immune Hospital — 50 000+ пациентов. Полный консьерж-сервис от healwith. Бесплатная консультация.",
  keywords: [
    "лечение рака в Корее",
    "лечение онкологии в Корее",
    "второе мнение онколога",
    "второе мнение при раке",
    "стоимость лечения рака в Корее",
    "лучшие онкологи Кореи",
    "медицинский туризм Корея",
    "онкология Южная Корея",
    "иммунотерапия Корея",
    "корейская медицина рак",
    "лечение в Сеуле",
    "онкоклиника Корея",
    "медицинская виза Корея",
    "healwith Корея",
  ],
  // ru ↔ kk 두 랜딩은 서로를 가리키므로(상호참조 성립) 그 짝만 남긴다.
  // x-default 를 뺀 이유(2026-08-31): "/" 는 200 이 아니라 «감지 언어로 308 되는 주소»이고,
  // 홈 쪽은 이 랜딩들을 되가리키지 않는다 = 비상호. hreflang 은 상호참조가 성립해야 유효해서
  // 구글이 표기를 통째로 무시할 수 있고, 그 전에 「이 러시아어 랜딩의 기본판은 영어 홈」이라는
  // 틀린 신호부터 준다. app/sitemap.js 가 같은 이유로 이 둘의 hreflang 을 이미 뺐는데
  // 페이지 쪽만 안 따라와 있었다(문서-코드 어긋남).
  alternates: {
    canonical: "/ru/for-russian-patients",
    languages: {
      ru: "/ru/for-russian-patients",
      kk: "/kk/for-kazakh-patients",
    },
  },
  openGraph: {
    url: "/ru/for-russian-patients",
    title: "Лечение рака в Корее | healwith — Медицинский консьерж",
    description:
      "Онкологическое лечение в Южной Корее. Immune Hospital: 50 000+ случаев, протокол ITCR, иммунотерапия корейской медицины. Поддержка на русском языке.",
    type: "website",
    locale: "ru_RU",
  },
  // ⚠️ twitter 를 «반드시» 같이 둔다 (2026-08-31 실측으로 추가).
  //    openGraph 만 정의하면 twitter 는 루트 layout 것을 그대로 물려받는다 → 이 화면은
  //    제목·og 가 러시아어인데 twitter 카드만 "healwith | Korea Cancer Care…"(영어)로 나갔다.
  //    여기는 Yandex 색인 자산이자 광고 착지다 — 공유 카드가 영어면 클릭 전에 이탈한다.
  twitter: {
    card: "summary_large_image",
    title: "Лечение рака в Корее | healwith — Медицинский консьерж",
    description:
      "Онкологическое лечение в Южной Корее. Immune Hospital: 50 000+ случаев, протокол ITCR. Поддержка на русском языке.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  name: "Лечение рака в Корее — healwith",
  description:
    "Справочник по медицинскому туризму для онкологических пациентов из России и СНГ. Иммунотерапия, корейская медицина, визовая поддержка.",
  url: "https://healwith.co.kr/ru/for-russian-patients",
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
  // @id 로 layout 의 브랜드 엔티티(#organization)를 가리킨다 — 예전처럼 이름만 적으면
  // 검색엔진이 «별개 회사»로 읽어 브랜드 신호(sameAs·설명·서비스국가)가 둘로 쪼개진다.
  provider: { "@id": ORG_ID },
};

const FAQ = [
  {
    q: "Можно ли лечиться в Корее без знания корейского языка?",
    a: "Да. healwith обеспечивает сопровождение на русском языке на всех этапах: от первичной консультации до выписки.",
  },
  {
    q: "Сколько стоит лечение рака в Корее?",
    a: "Стоимость зависит от типа онкологии и программы лечения. Хирургия в университетских клиниках — примерно $3 000–18 500 в зависимости от типа рака; интегративный иммунный курс в Immune Hospital — от $740 в неделю. Предварительный расчёт бесплатен.",
  },
  {
    q: "Какая виза нужна для лечения в Корее?",
    a: "Для медицинского лечения оформляется виза C-3-3 (краткосрочный медицинский визит) или G-1-10 при длительном курсе лечения. healwith помогает со всеми документами.",
  },
  {
    q: "Как долго длится курс лечения?",
    a: "Минимальный курс иммунотерапии — 2–4 недели. Длительность зависит от стадии заболевания. Среднее пребывание пациентов из СНГ — 4–8 недель.",
  },
];

export default function ForRussianPatientsPage() {
  return (
    <>
      <script
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
            {/* 첫 버튼 = 왓츠앱 바로가기. 카자흐스탄은 왓츠앱을 인구의 83%가 쓰고
                웹폼은 잘 쓰지 않는다 → 폼을 한 단계 거치지 않고 바로 대화를 연다. */}
            <a
              href={WA_SECOND_OPINION}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-teal-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-800 transition"
            >
              Второе мнение бесплатно · WhatsApp
            </a>
            <Link
              href="/ru/inquiry"
              className="border border-teal-600 text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
            >
              Оставить заявку
            </Link>
          </div>
        </section>

        {/* ── Цифры (с источниками) ────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-700 mb-1">73,7%</div>
              <p className="text-sm text-gray-500">5-летняя выживаемость при раке в Корее (2019–2023)</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-700 mb-1">2,01 млн</div>
              <p className="text-sm text-gray-500">иностранных пациентов выбрали Корею в 2025 году</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold text-teal-700 mb-1">16 000+</div>
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
                <h3 className="text-[clamp(24px,2.5vw,32px)] font-semibold text-teal-800 mb-2">{title}</h3>
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
          {/* 병원 상세로 보내지 않는다 — 그 페이지에 "stem cell therapy" 가 있어
              광고 심사에서 「세포 치료」로 걸릴 수 있다(파일 상단 주석 참조).
              대신 바로 대화를 연다. */}
          <a
            href={WA_SECOND_OPINION}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 font-medium hover:underline"
          >
            Спросить о клинике в WhatsApp →
          </a>
        </section>

        {/* ── Процесс ─────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Как проходит лечение: пошагово
          </h2>
          <ol className="space-y-4">
            {[
              { step: "1", title: "Онлайн-консультация", desc: "Заполните форму и загрузите медицинские документы. healwith анализирует историю болезни бесплатно." },
              { step: "2", title: "План лечения и стоимость", desc: "Врачи Immune Hospital готовят индивидуальный план в течение 3–5 рабочих дней. Вы получаете детальный расчёт стоимости." },
              { step: "3", title: "Виза и логистика", desc: "healwith помогает оформить медицинскую визу C-3-3, бронирует жильё рядом с клиникой и организует трансфер." },
              { step: "4", title: "Лечение в Корее", desc: "Персональный менеджер сопровождает вас на всех визитах. Русскоязычный переводчик сопровождает вас." },
              { step: "5", title: "Поддержка после выезда", desc: "Телемедицинские консультации с врачом, мониторинг состояния онлайн через приложение healwith." },
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

        {/* ── Виза и расходы ───────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Виза и ориентировочные расходы
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-6">
              <h3 className="text-[clamp(24px,2.5vw,32px)] font-semibold text-gray-800 mb-3">Медицинская виза в Корею</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Виза C-3-3: краткосрочная (до 90 дней)</li>
                <li>• Срок оформления: 5–7 рабочих дней</li>
                <li>• Документы: паспорт, письмо клиники, страховка</li>
                <li>• healwith готовит пакет документов</li>
              </ul>
              <Link href="/ru/visa" className="mt-4 block text-teal-700 text-sm hover:underline">
                Подробнее о визе →
              </Link>
            </div>
            {/* 가격 출처 = src/lib/chat/careReference.ts (면력한방병원 암 진료비 안내 2026-06 · PO 제공) — 가격 개정 시 거기와 같이 갱신.
                단 항공권 줄은 진료비 자료가 아니라 일반 시세 참고치(예외). */}
            <div className="border rounded-xl p-6">
              <h3 className="text-[clamp(24px,2.5vw,32px)] font-semibold text-gray-800 mb-3">Ориентировочные цены (международный тариф)</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Онкохирургия в университетских клиниках: $3 000–18 500 (по типу рака)</li>
                <li>• Интегративный иммунный курс (стационар): $740–1 480/нед., палата отдельно</li>
                <li>• Диагностика: КТ $220–450 · МРТ $600–750 · ПЭТ-КТ $750–1 000</li>
                <li>• Перелёт (Алматы — Сеул): от $400</li>
              </ul>
              <p className="text-[11px] text-gray-400 mt-3">
                Диапазоны ориентировочные, а не фиксированные цены. Точная стоимость — после изучения медицинских документов; предварительный расчёт бесплатен.
              </p>
              <Link href="/ru/inquiry" className="mt-4 block text-teal-700 text-sm hover:underline">
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
        <section className="bg-teal-700 text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Начните бесплатную консультацию</h2>
          <p className="mb-6 text-teal-100">
            Наши менеджеры ответят в течение 24 часов. Консультация бесплатна и ни к чему
            не обязывает.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={WA_SECOND_OPINION}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
            >
              Написать в WhatsApp
            </a>
            <Link
              href="/ru/inquiry"
              className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-800 transition"
            >
              Оставить заявку
            </Link>
          </div>
        </section>

        {/* ── Internal links ─────────────────────────────── */}
        <nav className="mt-10 pt-6 border-t text-sm text-gray-500 flex flex-wrap gap-4">
          <Link href="/ru" className="hover:text-teal-700">Главная (RU)</Link>
          <Link href="/ru/treatments" className="hover:text-teal-700">Виды лечения</Link>
          <Link href="/ru/hospitals" className="hover:text-teal-700">Больницы</Link>
          {/* Immune Hospital 직링크 제거 — 광고 심사 경로에서 「세포 치료」를 떼어내기 위함.
              병원 목록(/hospitals)을 통해서는 그대로 갈 수 있다. */}
          <Link href="/ru/visa" className="hover:text-teal-700">Виза</Link>
          <Link href="/ru/faq" className="hover:text-teal-700">FAQ</Link>
        </nav>
      </main>
    </>
  );
}
