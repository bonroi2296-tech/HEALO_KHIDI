"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import SocialProofSection from "@/components/SocialProofSection";

/* ───────── 제휴 병원 네트워크 (실제 제휴/협진 병원만) ─────────
   ⚠️ 서울아산·삼성서울 등은 실제 제휴기관이 아니므로 넣지 않음(가짜 금지).
   실제: 면력한방병원 4개 지점(제휴) + 협진 대학병원 4곳. */
const PARTNER_GROUPS = {
  immune: {
    label: { ko: "제휴 한방병원", en: "Partner Korean Medicine Hospitals", ru: "Партнёрские больницы корейской медицины", kz: "Серіктес корей медицинасы ауруханалары", zh: "合作韩方医院", ja: "提携韓方病院" },
    items: [
      { ko: "면력한방병원 강서점", en: "Immune Hospital Gangseo", ru: "Иммунная Клиника Кансо", kz: "Иммунная Клиника Кансо", zh: "免疫医院 江西院", ja: "免疫病院 江西院" },
      { ko: "면력한방병원 신촌점", en: "Immune Hospital Sinchon", ru: "Иммунная Клиника Синчхон", kz: "Иммунная Клиника Синчон", zh: "免疫医院 新村院", ja: "免疫病院 新村院" },
      { ko: "면력한방병원 광명점", en: "Immune Hospital Gwangmyeong", ru: "Иммунная Клиника Кванмён", kz: "Иммунная Клиника Кванмён", zh: "免疫医院 光明院", ja: "免疫病院 光明院" },
      { ko: "면력한방병원 성동점", en: "Immune Hospital Seongdong", ru: "Иммунная Клиника Сондон", kz: "Иммунная Клиника Сондон", zh: "免疫医院 城东院", ja: "免疫病院 城東院" },
    ],
  },
  university: {
    label: { ko: "협진 대학병원", en: "Cooperating University Hospitals", ru: "Сотрудничающие университетские больницы", kz: "Серіктес университеттік ауруханалар", zh: "协诊大学医院", ja: "協診大学病院" },
    items: [
      { ko: "이대서울병원", en: "Ewha Seoul Hospital", ru: "Больница Ихва Сеул", kz: "Ихва Сеул ауруханасы", zh: "梨大首尔医院", ja: "梨大ソウル病院" },
      { ko: "이대목동병원", en: "Ewha Mokdong Hospital", ru: "Больница Ихва Мокдон", kz: "Ихва Мокдон ауруханасы", zh: "梨大木洞医院", ja: "梨大木洞病院" },
      { ko: "고려대 구로병원", en: "Korea Univ. Guro Hospital", ru: "Больница Куро", kz: "Куро ауруханасы", zh: "高丽大九老医院", ja: "高麗大九老病院" },
      { ko: "신촌세브란스병원", en: "Sinchon Severance Hospital", ru: "Больница Северанс Синчхон", kz: "Синчон Северанс ауруханасы", zh: "新村世福兰斯医院", ja: "新村セブランス病院" },
    ],
  },
};
const PARTNER_SECTION = {
  title: { ko: "함께하는 병원 네트워크", en: "Our hospital network", ru: "Наша сеть больниц", kz: "Біздің аурухана желісі", zh: "我们的医院网络", ja: "私たちの病院ネットワーク" },
  lede: {
    ko: "수술·항암은 협진 대학병원에서, 면역·재활은 면력한방병원에서 — 하나의 네트워크로 끊김 없이 이어집니다.",
    en: "Surgery and chemotherapy at cooperating university hospitals; immune and rehabilitation care at Immune Hospital — connected as one seamless network.",
    ru: "Хирургия и химиотерапия — в университетских больницах-партнёрах; иммунный и реабилитационный уход — в Иммуногоспитале, как единая бесшовная сеть.",
    kz: "Хирургия мен химиотерапия — серіктес университет ауруханаларында; иммундық және оңалту күтімі — Иммунная Клиникада, бір үзіліссіз желі ретінде.",
    zh: "手术与化疗在协诊大学医院，免疫与康复在免疫医院 — 连接为一个无缝网络。",
    ja: "手術・抗がんは協診大学病院で、免疫・リハビリは免疫病院で — 一つのネットワークとして途切れなくつながります。",
  },
};


/* ───────── i18n (6개 언어) ───────── */
const COPY = {
  ko: {
    eyebrow: "토탈 케어 컨시어지",
    heroTitle: "진단부터 회복까지,\n끊김 없는 치료 여정",
    heroLede:
      "healwith는 병원 하나를 골라드리는 곳이 아닙니다. 한국 도착 전 온라인 상담부터 진단·수술·면역 회복, 귀국 후 관리까지 — 암 치료의 전 과정을 함께 설계하고 동행합니다.",
    heroCta: "상담 시작하기",
    modelTitle: "왜 '병원 매칭'이 아니라 '케어 경로'인가",
    modelBody:
      "암 치료는 한 번의 수술로 끝나지 않습니다. healwith는 면역·재활 전문 한방병원과 수술·항암 중심의 협진 대학병원이 하나의 네트워크로 연결되어, 진단 결과에 따라 필요한 치료를 단계별로 이어드립니다. 환자는 매번 새 병원을 찾을 필요가 없습니다.",
    statsTitle: "숫자로 보는 한국 암치료",
    stats: [
      { value: "72.9%", label: "암 5년 생존율 (2018–2022)" },
      { value: "201만+", label: "2025년 한국을 찾은 외국인 환자" },
    ],
    statsSource: "출처: 국립암센터 국가암등록통계, 한국보건산업진흥원(KHIDI) 외국인환자 유치 실적",
    whyCareTitle: "수술 후, 왜 면역·재활 케어가 필요할까요",
    whyCareLede:
      "암 치료는 수술이나 항암으로 끝나지 않습니다. 떨어진 면역력과 부작용을 회복기에 어떻게 관리하느냐가 그다음을 좌우합니다. healwith 제휴 면력 한방병원은 이 회복 단계를 전문적으로 돕습니다.",
    whyCare: [
      { title: "체계적인 면역·재활 관리", body: "수술·항암 후 약해진 면역력과 통증·부작용을 한방 면역치료, 통증재활 등으로 전문 의료진이 환자 상태에 맞춰 단계별로 관리합니다." },
      { title: "맞춤 영양·입원식", body: "암종과 회복 상태에 맞춘 입원식과 영양 관리로 체력을 보강합니다. 해외 환자의 식문화도 함께 고려합니다." },
      { title: "편안한 회복 환경·언어 지원", body: "복잡한 상급병원과 달리 차분한 환경에서 회복에 집중할 수 있고, 외국인 환자를 위한 통역과 코디네이터가 함께합니다." },
    ],
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
      "healwith isn't a service that just picks a hospital for you. From online consultation before you arrive, through diagnosis, surgery, and immune recovery, to post-return care — we design and accompany the entire cancer treatment journey with you.",
    heroCta: "Start a consultation",
    modelTitle: "Why a 'care path', not 'hospital matching'",
    modelBody:
      "Cancer treatment doesn't end with a single surgery. healwith connects Korean Medicine hospitals specializing in immune and rehabilitation care with cooperating university hospitals focused on surgery and chemotherapy — as one network — so each stage of care follows your diagnosis. You never have to search for a new hospital each time.",
    statsTitle: "Korea's cancer care, in numbers",
    stats: [
      { value: "72.9%", label: "5-year cancer survival rate (2018–2022)" },
      { value: "2.01M+", label: "international patients chose Korea in 2025" },
    ],
    statsSource: "Sources: National Cancer Center Korea (national cancer registry); KHIDI foreign patient statistics",
    whyCareTitle: "After surgery, why immune & rehabilitation care matters",
    whyCareLede:
      "Cancer treatment doesn't end with surgery or chemotherapy. How you manage weakened immunity and side effects during recovery shapes what comes next. healwith's partner Korean Medicine hospitals specialize in this recovery stage.",
    whyCare: [
      { title: "Structured immune & rehab care", body: "Specialists manage weakened immunity, pain, and side effects after surgery or chemo — through Korean-medicine immunotherapy and pain rehabilitation, step by step, tailored to your condition." },
      { title: "Tailored nutrition & meals", body: "Inpatient meals and nutrition planning matched to your cancer type and recovery state help rebuild strength. We also consider international patients' dietary needs." },
      { title: "Calm recovery environment & language support", body: "Unlike a busy tertiary hospital, you can focus on recovery in a calm setting — with interpretation and a coordinator dedicated to international patients." },
    ],
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
      "healwith — это не сервис, который просто подбирает больницу. От онлайн-консультации до приезда, через диагностику, операцию и иммунное восстановление, до ухода после возвращения — мы вместе с вами планируем весь путь лечения рака и сопровождаем вас.",
    heroCta: "Начать консультацию",
    modelTitle: "Почему «маршрут лечения», а не «подбор больницы»",
    modelBody:
      "Лечение рака не заканчивается одной операцией. healwith объединяет в единую сеть больницы корейской медицины (иммунотерапия и реабилитация) и сотрудничающие университетские больницы (хирургия и химиотерапия), чтобы каждый этап следовал за вашим диагнозом. Вам не нужно каждый раз искать новую больницу.",
    statsTitle: "Лечение рака в Корее в цифрах",
    stats: [
      { value: "72,9%", label: "5-летняя выживаемость при раке (2018–2022)" },
      { value: "2,01 млн+", label: "иностранных пациентов выбрали Корею в 2025" },
    ],
    statsSource: "Источники: Национальный онкологический центр Кореи (национальный реестр рака); статистика иностранных пациентов KHIDI",
    whyCareTitle: "После операции: почему важен иммунный и реабилитационный уход",
    whyCareLede:
      "Лечение рака не заканчивается операцией или химиотерапией. То, как вы восстанавливаете ослабленный иммунитет и справляетесь с побочными эффектами, определяет дальнейшее. Партнёрские больницы корейской медицины healwith специализируются на этом этапе восстановления.",
    whyCare: [
      { title: "Системный иммунный и реабилитационный уход", body: "Специалисты поэтапно управляют ослабленным иммунитетом, болью и побочными эффектами после операции или химиотерапии — с помощью иммунотерапии корейской медицины и реабилитации, с учётом вашего состояния." },
      { title: "Индивидуальное питание", body: "Стационарное питание и план питания, подобранные под тип рака и состояние, помогают восстановить силы. Учитываем и пищевые предпочтения иностранных пациентов." },
      { title: "Спокойная среда и языковая поддержка", body: "В отличие от загруженной крупной больницы, вы можете сосредоточиться на восстановлении в спокойной обстановке — с переводом и координатором для иностранных пациентов." },
    ],
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
      "healwith — жай ғана аурухана таңдап беретін қызмет емес. Келмес бұрынғы онлайн кеңестен бастап диагностика, операция, иммундық қалпына келу, оралғаннан кейінгі күтімге дейін — біз сізбен бірге обырды емдеудің бүкіл жолын жоспарлаймыз және серік боламыз.",
    heroCta: "Кеңесті бастау",
    modelTitle: "Неге «аурухана таңдау» емес, «емдеу жолы»",
    modelBody:
      "Обырды емдеу бір операциямен бітпейді. healwith иммундық және оңалту маманданған корей медицинасы ауруханалары мен хирургия, химиотерапияға бағытталған серіктес университет ауруханаларын бір желіге біріктіреді — әр кезең сіздің диагнозыңызға сай жалғасады. Сізге әр жолы жаңа аурухана іздеудің қажеті жоқ.",
    statsTitle: "Кореядағы обыр емі — сандармен",
    stats: [
      { value: "72,9%", label: "обырдан 5 жылдық өмір сүру (2018–2022)" },
      { value: "2,01 млн+", label: "2025 жылы Кореяны таңдаған шетелдік науқастар" },
    ],
    statsSource: "Дереккөздер: Корея Ұлттық онкология орталығы (ұлттық обыр тіркелімі); KHIDI шетелдік науқастар статистикасы",
    whyCareTitle: "Операциядан кейін иммундық және оңалту күтімі неге маңызды",
    whyCareLede:
      "Обырды емдеу операциямен немесе химиотерапиямен бітпейді. Әлсіреген иммунитет пен жанама әсерлерді қалпына келу кезінде қалай басқаратыныңыз келесі кезеңді айқындайды. healwith серіктес корей медицинасы ауруханалары осы кезеңге маманданған.",
    whyCare: [
      { title: "Жүйелі иммундық және оңалту күтімі", body: "Мамандар операциядан немесе химиотерапиядан кейінгі әлсіреген иммунитет, ауырсыну мен жанама әсерлерді корей медицинасы иммунотерапиясы мен оңалту арқылы кезең-кезеңімен басқарады." },
      { title: "Жеке тамақтану", body: "Обыр түрі мен жағдайға сай стационарлық тамақ пен тамақтану жоспары күшті қалпына келтіруге көмектеседі. Шетелдік науқастардың тамақ мәдениетін де ескереміз." },
      { title: "Тыныш орта және тілдік қолдау", body: "Қарбалас ірі ауруханадан айырмашылығы — тыныш ортада қалпына келуге назар аудара аласыз, аударма мен координатор қасыңызда." },
    ],
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
      "healwith 不是只为您挑选一家医院的服务。从抵达前的在线咨询，到诊断、手术、免疫康复，再到回国后的管理——我们与您共同设计并陪伴癌症治疗的全过程。",
    heroCta: "开始咨询",
    modelTitle: "为什么是「治疗路径」而非「医院匹配」",
    modelBody:
      "癌症治疗不会因一次手术而结束。healwith 将专注免疫·康复的韩方医院与以手术·化疗为主的协诊大学医院连接为一个网络，根据诊断结果逐阶段衔接所需治疗。患者无需每次重新寻找医院。",
    statsTitle: "数据看韩国癌症诊疗",
    stats: [
      { value: "72.9%", label: "癌症五年生存率（2018–2022）" },
      { value: "201万+", label: "2025年赴韩就医的国际患者" },
    ],
    statsSource: "来源：韩国国立癌症中心（国家癌症登记统计）；KHIDI 外国患者统计",
    whyCareTitle: "手术后，为什么需要免疫与康复护理",
    whyCareLede:
      "癌症治疗不会因手术或化疗而结束。在康复期如何管理下降的免疫力和副作用，决定了之后的走向。healwith 合作的韩方医院专注于这一康复阶段。",
    whyCare: [
      { title: "系统的免疫与康复管理", body: "专科医疗团队通过韩方免疫治疗、疼痛康复等，针对患者状态逐阶段管理术后或化疗后下降的免疫力、疼痛与副作用。" },
      { title: "定制营养与住院餐", body: "根据癌种与康复状态定制的住院餐与营养管理帮助恢复体力，并兼顾海外患者的饮食文化。" },
      { title: "安静的康复环境与语言支持", body: "不同于繁忙的大型医院，您可在安静环境中专注康复，并有为外国患者提供的翻译与协调员陪同。" },
    ],
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
      "healwithは病院を一つ選ぶだけのサービスではありません。来韓前のオンライン相談から、診断・手術・免疫回復、帰国後の管理まで——がん治療の全過程を一緒に設計し、寄り添います。",
    heroCta: "相談を始める",
    modelTitle: "なぜ「病院マッチング」ではなく「ケア経路」なのか",
    modelBody:
      "がん治療は一度の手術で終わりません。healwithは免疫・リハビリ専門の韓方病院と、手術・抗がん中心の協診大学病院を一つのネットワークでつなぎ、診断結果に応じて必要な治療を段階的につなげます。患者様は毎回新しい病院を探す必要がありません。",
    statsTitle: "数字で見る韓国のがん医療",
    stats: [
      { value: "72.9%", label: "がん5年生存率（2018–2022）" },
      { value: "201万+", label: "2025年に韓国を選んだ外国人患者" },
    ],
    statsSource: "出典：韓国国立がんセンター（国家がん登録統計）；KHIDI 外国人患者統計",
    whyCareTitle: "手術後、なぜ免疫・リハビリケアが必要か",
    whyCareLede:
      "がん治療は手術や抗がん剤で終わりません。回復期に低下した免疫力と副作用をどう管理するかが、その後を左右します。healwith提携の韓方病院はこの回復段階を専門に支えます。",
    whyCare: [
      { title: "体系的な免疫・リハビリ管理", body: "手術や抗がん剤後に弱った免疫力・痛み・副作用を、韓方免疫治療や疼痛リハビリで専門医療陣が状態に合わせて段階的に管理します。" },
      { title: "オーダーメイドの栄養・入院食", body: "がんの種類と回復状態に合わせた入院食と栄養管理で体力を回復します。海外患者の食文化にも配慮します。" },
      { title: "落ち着いた回復環境・言語支援", body: "混雑した大病院と異なり、落ち着いた環境で回復に集中でき、外国人患者向けの通訳とコーディネーターが寄り添います。" },
    ],
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
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
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
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors"
        >
          {c.heroCta} <ArrowRight size={18} />
        </Link>
        {/* 회복톤 실사진 — 공원 산책(회복·동행) / PO 1차 교체 2026-06-20 */}
        <div className="relative mt-10 md:mt-12 h-56 md:h-80 overflow-hidden rounded-2xl border border-gray-100">
          <Image
            src="https://images.unsplash.com/photo-1671530725345-cc4a2cf5db04?w=1600&auto=format&fit=crop&q=85"
            alt={c.eyebrow}
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
      </section>

      {/* Model explanation */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{c.modelTitle}</h2>
          <p className="text-base text-gray-600 leading-relaxed max-w-3xl">{c.modelBody}</p>
        </div>
      </section>

      {/* Partner hospital network */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{PARTNER_SECTION.title[lang] || PARTNER_SECTION.title.ko}</h2>
        <p className="text-base text-gray-600 leading-relaxed max-w-3xl mb-8 md:mb-10">{PARTNER_SECTION.lede[lang] || PARTNER_SECTION.lede.ko}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {["university", "immune"].map((key) => {
            const g = PARTNER_GROUPS[key];
            return (
              <div key={key} className="border border-gray-200 rounded-2xl p-6 md:p-7">
                <h3 className="text-sm font-bold text-teal-700 mb-4">{g.label[lang] || g.label.ko}</h3>
                <ul className="space-y-2.5">
                  {g.items.map((h, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm md:text-base text-gray-800">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-teal-600" aria-hidden="true" />
                      {h[lang] || h.ko}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why Korea — credibility stats */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">{c.statsTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {c.stats.map((s, i) => (
            <div key={i} className="border border-gray-200 rounded-2xl p-6 md:p-7">
              <div className="text-3xl md:text-4xl font-extrabold text-teal-700 mb-2 tabular-nums">{s.value}</div>
              <p className="text-sm text-gray-500 leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">{c.statsSource}</p>
      </section>

      {/* Why immune/rehab care matters */}
      <section className="max-w-4xl mx-auto px-4 pt-0 pb-12 md:pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{c.whyCareTitle}</h2>
        <p className="text-base text-gray-600 leading-relaxed max-w-3xl mb-8 md:mb-10">{c.whyCareLede}</p>
        {/* 회복톤 실사진 — 푸드테라피(맞춤 영양·입원식) / PO 1차 교체 2026-06-20 */}
        <div className="relative mb-8 md:mb-10 h-48 md:h-64 overflow-hidden rounded-2xl border border-gray-100">
          <Image
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&auto=format&fit=crop&q=85"
            alt={c.whyCareTitle}
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {c.whyCare.map((w, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl p-5 md:p-6 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">{w.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5 steps — connected vertical timeline */}
      <section className="max-w-4xl mx-auto px-4 pt-0 pb-12 md:pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10">{c.stepsTitle}</h2>
        <ol className="relative">
          {/* 세로 연결선 (타임라인) */}
          <span
            className="absolute left-[18px] top-3 bottom-3 w-px bg-teal-200"
            aria-hidden="true"
          />
          {c.steps.map((s, i) => (
            <li key={i} className="relative flex gap-4 md:gap-6 pb-7 last:pb-0">
              <span className="relative z-10 shrink-0 w-9 h-9 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-sm ring-4 ring-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 border border-gray-200 rounded-xl p-5 md:p-6 hover:border-teal-300 hover:shadow-sm transition-all">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Social proof — 실제·검증 가능한 평가 (가짜 후기 금지) */}
      <div className="border-t border-gray-100">
        <SocialProofSection />
      </div>


      {/* Closing CTA */}
      <section className="bg-teal-700">
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
