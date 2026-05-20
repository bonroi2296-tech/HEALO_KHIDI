"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLang } from "../../src/lib/i18n/LangContext";

/* ───────── i18n (6개 언어) ───────── */
const COPY = {
  ko: {
    eyebrow: "토탈 케어 컨시어지",
    heroTitle: "진단부터 회복까지,\n끊김 없는 치료 여정",
    heroLede:
      "HEALO는 병원 하나를 골라드리는 곳이 아닙니다. 한국 도착 전 온라인 상담부터 진단·수술·면역 회복, 귀국 후 관리까지 — 암 치료의 전 과정을 함께 설계하고 동행합니다.",
    heroCta: "상담 시작하기",
    modelTitle: "왜 '병원 매칭'이 아니라 '케어 경로'인가",
    modelBody:
      "암 치료는 한 번의 수술로 끝나지 않습니다. HEALO는 면역·재활 전문 한방병원과 수술·항암 중심의 협진 대학병원이 하나의 네트워크로 연결되어, 진단 결과에 따라 필요한 치료를 단계별로 이어드립니다. 환자는 매번 새 병원을 찾을 필요가 없습니다.",
    stepsTitle: "당신의 치료 여정, 5단계",
    steps: [
      { title: "온라인 상담", body: "AI 상담사와 코디네이터가 6개 언어로 응대합니다. 한국에 오기 전, 집에서 궁금증을 먼저 해결하세요." },
      { title: "원격 진단", body: "보유하신 의료 기록을 바탕으로 제휴 병원 의료진이 검토하고, 한국에서의 치료 방향을 안내합니다." },
      { title: "케어 경로 설계", body: "수술이 필요하면 협진 대학병원으로 연결하고, 면역 강화·재활은 한방병원에서 이어집니다. 당신에게 맞는 경로를 함께 설계합니다." },
      { title: "체류 중 동행", body: "한국 체류 기간 동안 의료 통역, 병원 동행, 생활 지원까지 코디네이터가 함께합니다." },
      { title: "귀국 후 관리", body: "귀국 후에도 원격 상담으로 후속 관리를 이어갑니다. 치료는 한 번의 방문으로 끝나지 않습니다." },
    ],
    closingTitle: "치료 여정, 어디서부터 시작할지 함께 정해요",
    closingBody: "1분이면 충분합니다. 코디네이터가 선호하시는 언어로 연락드립니다.",
    closingCta: "상담 신청하기",
  },
  en: {
    eyebrow: "Total Care Concierge",
    heroTitle: "From diagnosis to recovery —\na seamless care journey",
    heroLede:
      "HEALO isn't a service that just picks a hospital for you. From online consultation before you arrive, through diagnosis, surgery, and immune recovery, to post-return care — we design and accompany the entire cancer treatment journey with you.",
    heroCta: "Start a consultation",
    modelTitle: "Why a 'care path', not 'hospital matching'",
    modelBody:
      "Cancer treatment doesn't end with a single surgery. HEALO connects Korean Medicine hospitals specializing in immune and rehabilitation care with cooperating university hospitals focused on surgery and chemotherapy — as one network — so each stage of care follows your diagnosis. You never have to search for a new hospital each time.",
    stepsTitle: "Your care journey, in 5 steps",
    steps: [
      { title: "Online consultation", body: "Our AI assistant and coordinators respond in 6 languages. Resolve your questions from home, before you travel to Korea." },
      { title: "Remote diagnosis", body: "Our partner medical teams review your existing records and explain the treatment direction available in Korea." },
      { title: "Care path design", body: "If surgery is needed, we connect you to a cooperating university hospital; immune care and rehabilitation continue at the Korean Medicine hospital. We design the right path with you." },
      { title: "On-site companionship", body: "During your stay in Korea, coordinators support you with medical interpretation, hospital visits, and daily-life assistance." },
      { title: "Post-return care", body: "After you return home, follow-up care continues via remote consultation. Treatment doesn't end with a single visit." },
    ],
    closingTitle: "Let's decide together where your journey begins",
    closingBody: "One minute is enough. A coordinator will contact you in your preferred language.",
    closingCta: "Request a consultation",
  },
  ru: {
    eyebrow: "Консьерж полного цикла",
    heroTitle: "От диагностики до выздоровления —\nнепрерывный маршрут лечения",
    heroLede:
      "HEALO — это не сервис, который просто подбирает больницу. От онлайн-консультации до приезда, через диагностику, операцию и иммунное восстановление, до ухода после возвращения — мы вместе с вами планируем весь путь лечения рака и сопровождаем вас.",
    heroCta: "Начать консультацию",
    modelTitle: "Почему «маршрут лечения», а не «подбор больницы»",
    modelBody:
      "Лечение рака не заканчивается одной операцией. HEALO объединяет в единую сеть больницы корейской медицины (иммунотерапия и реабилитация) и сотрудничающие университетские больницы (хирургия и химиотерапия), чтобы каждый этап следовал за вашим диагнозом. Вам не нужно каждый раз искать новую больницу.",
    stepsTitle: "Ваш маршрут лечения в 5 шагов",
    steps: [
      { title: "Онлайн-консультация", body: "ИИ-консультант и координаторы отвечают на 6 языках. Решите вопросы из дома, до поездки в Корею." },
      { title: "Дистанционная диагностика", body: "Медицинские команды партнёров изучают ваши документы и объясняют возможное направление лечения в Корее." },
      { title: "Разработка маршрута", body: "Если нужна операция — направляем в университетскую больницу; иммунный уход и реабилитация продолжаются в больнице корейской медицины. Мы разрабатываем подходящий маршрут вместе с вами." },
      { title: "Сопровождение на месте", body: "Во время пребывания в Корее координаторы помогают с медицинским переводом, визитами в больницу и бытовыми вопросами." },
      { title: "Уход после возвращения", body: "После возвращения домой наблюдение продолжается через дистанционные консультации. Лечение не заканчивается одним визитом." },
    ],
    closingTitle: "Решим вместе, с чего начать ваш путь",
    closingBody: "Достаточно одной минуты. Координатор свяжется с вами на удобном языке.",
    closingCta: "Запросить консультацию",
  },
  kz: {
    eyebrow: "Толық циклді консьерж",
    heroTitle: "Диагностикадан сауығуға дейін —\nүзіліссіз емдеу жолы",
    heroLede:
      "HEALO — жай ғана аурухана таңдап беретін қызмет емес. Келмес бұрынғы онлайн кеңестен бастап диагностика, операция, иммундық қалпына келу, оралғаннан кейінгі күтімге дейін — біз сізбен бірге обырды емдеудің бүкіл жолын жоспарлаймыз және серік боламыз.",
    heroCta: "Кеңесті бастау",
    modelTitle: "Неге «аурухана таңдау» емес, «емдеу жолы»",
    modelBody:
      "Обырды емдеу бір операциямен бітпейді. HEALO иммундық және оңалту маманданған корей медицинасы ауруханалары мен хирургия, химиотерапияға бағытталған серіктес университет ауруханаларын бір желіге біріктіреді — әр кезең сіздің диагнозыңызға сай жалғасады. Сізге әр жолы жаңа аурухана іздеудің қажеті жоқ.",
    stepsTitle: "Сіздің емдеу жолыңыз, 5 қадам",
    steps: [
      { title: "Онлайн кеңес", body: "AI кеңесшісі мен координаторлар 6 тілде жауап береді. Кореяға келмес бұрын сұрақтарыңызды үйден шешіңіз." },
      { title: "Қашықтан диагностика", body: "Серіктес медициналық топтар сіздің құжаттарыңызды қарап, Кореядағы емдеу бағытын түсіндіреді." },
      { title: "Емдеу жолын жоспарлау", body: "Операция қажет болса университет ауруханасына жолдаймыз; иммундық күтім мен оңалту корей медицинасы ауруханасында жалғасады. Сізге сай жолды бірге жоспарлаймыз." },
      { title: "Жерде серік болу", body: "Кореяда болу кезінде координаторлар медициналық аударма, ауруханаға еріп жүру және тұрмыстық қолдау көрсетеді." },
      { title: "Оралғаннан кейінгі күтім", body: "Үйге оралғаннан кейін де қашықтан кеңес арқылы бақылау жалғасады. Емдеу бір сапармен бітпейді." },
    ],
    closingTitle: "Жолыңызды қайдан бастайтынымызды бірге шешейік",
    closingBody: "Бір минут жеткілікті. Координатор сізге қолайлы тілде хабарласады.",
    closingCta: "Кеңеске өтініш беру",
  },
  zh: {
    eyebrow: "全程护理礼宾",
    heroTitle: "从诊断到康复，\n不间断的治疗旅程",
    heroLede:
      "HEALO 不是只为您挑选一家医院的服务。从抵达前的在线咨询，到诊断、手术、免疫康复，再到回国后的管理——我们与您共同设计并陪伴癌症治疗的全过程。",
    heroCta: "开始咨询",
    modelTitle: "为什么是「治疗路径」而非「医院匹配」",
    modelBody:
      "癌症治疗不会因一次手术而结束。HEALO 将专注免疫·康复的韩方医院与以手术·化疗为主的协诊大学医院连接为一个网络，根据诊断结果逐阶段衔接所需治疗。患者无需每次重新寻找医院。",
    stepsTitle: "您的治疗旅程，5个阶段",
    steps: [
      { title: "在线咨询", body: "AI 助手与协调员以6种语言为您服务。来韩之前，先在家中解决疑问。" },
      { title: "远程诊断", body: "合作医院的医疗团队根据您的病历进行评估，并说明在韩国的治疗方向。" },
      { title: "治疗路径设计", body: "如需手术，连接协诊大学医院；免疫强化与康复在韩方医院继续进行。我们与您共同设计合适的路径。" },
      { title: "停留期间陪同", body: "在韩停留期间，协调员提供医疗翻译、陪同就诊及生活支持。" },
      { title: "回国后管理", body: "回国后通过远程咨询持续进行后续管理。治疗不会因一次到访而结束。" },
    ],
    closingTitle: "让我们一起决定从何处开始您的旅程",
    closingBody: "一分钟即可。协调员将以您偏好的语言与您联系。",
    closingCta: "申请咨询",
  },
  ja: {
    eyebrow: "トータルケアコンシェルジュ",
    heroTitle: "診断から回復まで、\n途切れない治療の旅",
    heroLede:
      "HEALOは病院を一つ選ぶだけのサービスではありません。来韓前のオンライン相談から、診断・手術・免疫回復、帰国後の管理まで——がん治療の全過程を一緒に設計し、寄り添います。",
    heroCta: "相談を始める",
    modelTitle: "なぜ「病院マッチング」ではなく「ケア経路」なのか",
    modelBody:
      "がん治療は一度の手術で終わりません。HEALOは免疫・リハビリ専門の韓方病院と、手術・抗がん中心の協診大学病院を一つのネットワークでつなぎ、診断結果に応じて必要な治療を段階的につなげます。患者様は毎回新しい病院を探す必要がありません。",
    stepsTitle: "あなたの治療の旅、5ステップ",
    steps: [
      { title: "オンライン相談", body: "AIアシスタントとコーディネーターが6言語で対応します。来韓前に、ご自宅で疑問を解決しましょう。" },
      { title: "遠隔診断", body: "お持ちの医療記録をもとに提携病院の医療陣が検討し、韓国での治療方針をご案内します。" },
      { title: "ケア経路の設計", body: "手術が必要なら協診大学病院へ連携し、免疫強化・リハビリは韓方病院で続きます。あなたに合った経路を一緒に設計します。" },
      { title: "滞在中の同行", body: "韓国滞在中、医療通訳・病院同行・生活支援までコーディネーターが寄り添います。" },
      { title: "帰国後の管理", body: "帰国後も遠隔相談でフォローアップを継続します。治療は一度の訪問で終わりません。" },
    ],
    closingTitle: "あなたの旅をどこから始めるか、一緒に決めましょう",
    closingBody: "1分で十分です。コーディネーターがご希望の言語でご連絡します。",
    closingCta: "相談を申し込む",
  },
};

export default function CareJourneyClient() {
  const lang = useLang() || "ko";
  const c = COPY[lang] || COPY.ko;

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
          {c.eyebrow}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight whitespace-pre-line">
          {c.heroTitle}
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {c.heroLede}
        </p>
        <Link
          href="/inquiry"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
        >
          {c.heroCta} <ArrowRight size={18} />
        </Link>
      </section>

      {/* Model explanation */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{c.modelTitle}</h2>
          <p className="text-base text-gray-600 leading-relaxed max-w-3xl">{c.modelBody}</p>
        </div>
      </section>

      {/* 5 steps */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10">{c.stepsTitle}</h2>
        <ol className="space-y-5">
          {c.steps.map((s, i) => (
            <li
              key={i}
              className="flex gap-4 md:gap-5 border border-gray-200 rounded-xl p-5 md:p-6 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <span className="shrink-0 w-9 h-9 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center text-sm">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      <section className="bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{c.closingTitle}</h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-xl mx-auto leading-relaxed">{c.closingBody}</p>
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            {c.closingCta} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
