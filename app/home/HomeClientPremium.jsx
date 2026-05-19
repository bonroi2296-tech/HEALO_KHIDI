"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLang } from "../../src/lib/i18n/LangContext";
import { supabaseClient } from "../../src/lib/data/supabaseClient";
import { mapHospitalRow } from "../../src/lib/mapper";
import { getLangCodeFromCookie } from "../../src/lib/i18n";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  ButtonOutline,
  LinkArrow,
  Chip,
  Stat,
  FilmGrain,
} from "../../components/healo/Primitives";
import Nav from "../../components/healo/Nav";
import Footer from "../../components/healo/Footer";
import { PHOTOS, IMMUNE_PHOTOS, PHOTO_FILTER, IMMUNE_PHOTO_FILTER } from "../../components/healo/Photos";

const COPY = {
  en: {
    navCurrent: "home",
    eyebrowHero: "01 — Concierge care, Korea",
    heroTitleA: "Expert cancer care,",
    heroTitleB: "guided end to end.",
    heroLede:
      "HEALO coordinates every step — from first consultation to follow-up — with Korea's most experienced oncology teams. For patients from anywhere in the world.",
    ctaPrimary: "Request consultation",
    ctaSecondary: "How it works",
    heroCaption: "Immune Hospital · Gangseo",
    disclaimer:
      "We are not a medical institution. All diagnosis and treatment is delivered by licensed Korean providers.",

    statsEyebrow: "02 — By the numbers",
    stats: [
      { num: "99.9", unit: "%", label: "Thyroid 5-yr survival" },
      { num: "93.8", unit: "%", label: "Breast 5-yr survival" },
      { num: "3,200", unit: "+", label: "Cases per year" },
      { num: "24/7", unit: "", label: "Concierge support" },
    ],

    servicesEyebrow: "03 — What we handle",
    servicesTitle: "The entire journey,",
    servicesTitleItalic: "handled quietly.",
    services: [
      {
        eyebrow: "Hospital matching",
        title: "Hospital matching",
        body:
          "Multidisciplinary screening across Korea's top cancer centers — matched to your diagnosis, language, budget, and timeline.",
      },
      {
        eyebrow: "Visa & stay",
        title: "Visa and arrival",
        body:
          "C-3-3 and G-1 medical visa preparation, airport pickup, and curated stay options near your treatment center.",
      },
      {
        eyebrow: "Translation",
        title: "Medical translation",
        body:
          "Professional interpreters in Korean-Russian, Korean-English, and Korean-Kazakh — present at every consultation.",
      },
      {
        eyebrow: "Coordination",
        title: "End-to-end coordination",
        body:
          "One dedicated coordinator from first inquiry through post-treatment follow-up, operating in your time zone.",
      },
    ],

    // 원격협진 — USP 전면
    telemedicineEyebrow: "03 — Telemedicine · Our USP",
    telemedicineTitle: "Talk to a Korean specialist",
    telemedicineTitleItalic: "before you board the plane.",
    telemedicineLede:
      "No visa. No flight. Start with a real-time video consultation with Korea's top oncologists from wherever you are — then decide whether to travel.",
    telemedicineFeatures: [
      {
        icon: "🎥",
        title: "HD video consultation",
        desc: "Ultra-low-latency WebRTC. Works on laptop, tablet, and mobile. No app install.",
      },
      {
        icon: "🗣️",
        title: "Real-time interpretation",
        desc: "Korean ↔ Russian / Kazakh / English / Chinese. Medical-grade AI + human interpreters when needed.",
      },
      {
        icon: "📄",
        title: "Secure document review",
        desc: "Upload MRI, CT, pathology — Korean specialists review and discuss live during the call.",
      },
      {
        icon: "🔒",
        title: "Medical-grade security",
        desc: "AES-256 encryption end-to-end. PIPA §28-8 / HIPAA-ready. Your records, your consent.",
      },
    ],
    telemedicineCtaPrimary: "Start a remote consultation",
    telemedicineCtaSecondary: "See how it works",

    hospitalsEyebrow: "04 — Partner hospitals",
    hospitalsTitle: "Selected for outcomes,",
    hospitalsTitleItalic: "not for show.",
    hospitalsLede:
      "Every partner is vetted for oncology specialization, international patient experience, and language support. No sponsored placements.",
    hospitals: [
      {
        name: "Asan Medical Center",
        specialty: "Comprehensive cancer",
        meta: "2,700 beds · Seoul",
        photo: PHOTOS.hospital1,
      },
      {
        name: "Samsung Medical Center",
        specialty: "Precision oncology",
        meta: "1,970 beds · Seoul",
        photo: PHOTOS.hospital2,
      },
      {
        name: "Severance Hospital",
        specialty: "Robotic & minimally invasive",
        meta: "2,450 beds · Seoul",
        photo: PHOTOS.hospital3,
      },
    ],

    processEyebrow: "05 — The process",
    processTitle: "Four steps, carefully paced.",
    process: [
      {
        step: "01",
        title: "Intake",
        body: "Share your diagnosis and priorities. We review within 24 hours.",
      },
      {
        step: "02",
        title: "Matching",
        body: "We present two or three suitable hospitals with clear pricing.",
      },
      {
        step: "03",
        title: "Travel",
        body: "We prepare visa paperwork and arrange arrival logistics.",
      },
      {
        step: "04",
        title: "Treatment",
        body: "Your coordinator accompanies every appointment through discharge.",
      },
    ],

    ctaEyebrow: "Begin",
    ctaTitle: "A single inquiry starts everything.",
    ctaBody:
      "No account, no payment. Share what you know, and we respond within one business day.",
    ctaSecondaryLabel: "Or start with a remote video consultation →",
  },

  ko: {
    navCurrent: "home",
    eyebrowHero: "01 — 한국 암 치료 컨시어지",
    heroTitleA: "국제 암환자의 한국 치료,",
    heroTitleB: "처음부터 끝까지.",
    heroLede:
      "HEALO는 첫 상담부터 사후 관리까지 한국 최고 수준 종양학 팀과 함께 조용히 코디네이팅합니다. 전 세계 어디에서 오시든.",
    ctaPrimary: "상담 신청",
    ctaSecondary: "진행 방식 보기",
    heroCaption: "면력한방병원 강서",
    disclaimer:
      "HEALO는 의료기관이 아닙니다. 진단과 치료는 한국의 면허를 갖춘 의료진이 수행합니다.",

    statsEyebrow: "02 — 숫자로 보는",
    stats: [
      { num: "99.9", unit: "%", label: "갑상선암 5년 생존율" },
      { num: "93.8", unit: "%", label: "유방암 5년 생존율" },
      { num: "3,200", unit: "+", label: "연간 진료 케이스" },
      { num: "24/7", unit: "", label: "컨시어지 지원" },
    ],

    servicesEyebrow: "03 — 맡아드리는 것",
    servicesTitle: "여정 전체를",
    servicesTitleItalic: "조용히 책임집니다.",
    services: [
      {
        eyebrow: "병원 매칭",
        title: "병원 매칭",
        body:
          "진단·언어·예산·일정에 맞춰 한국 최상위 암센터들 중 다학제 심사를 거친 2-3곳을 제안드립니다.",
      },
      {
        eyebrow: "비자·체류",
        title: "비자와 체류",
        body:
          "메디컬 비자(C-3-3, G-1) 준비, 공항 픽업, 진료 병원 근처 체류 옵션 전체를 사전 준비합니다.",
      },
      {
        eyebrow: "의료 통역",
        title: "의료 전문 통역",
        body:
          "한·러, 한·영, 한·카자흐 전문 의료 통역사가 모든 진료에 동행합니다.",
      },
      {
        eyebrow: "코디네이션",
        title: "전 과정 코디네이션",
        body:
          "첫 문의부터 치료 후 경과 관리까지, 전담 코디네이터 한 분이 이용자의 시간대에 맞춰 함께합니다.",
      },
    ],

    // 원격협진 — USP 전면
    telemedicineEyebrow: "03 — 원격협진 · HEALO 의 USP",
    telemedicineTitle: "비행기 타기 전에",
    telemedicineTitleItalic: "한국 전문의와 먼저 만나세요.",
    telemedicineLede:
      "비자도, 항공편도 필요 없습니다. 계신 그 자리에서 실시간 영상 상담으로 한국 최고의 암 전문의와 만난 뒤 — 한국 방문 여부를 결정하세요.",
    telemedicineFeatures: [
      {
        icon: "🎥",
        title: "HD 영상 상담",
        desc: "초저지연 WebRTC. 노트북/태블릿/모바일 어디서든. 앱 설치 불필요.",
      },
      {
        icon: "🗣️",
        title: "실시간 의료 통역",
        desc: "한-러 / 한-카자흐 / 한-영 / 한-중. 의료 전문 AI + 필요 시 인간 통역사.",
      },
      {
        icon: "📄",
        title: "보안 문서 공유",
        desc: "MRI, CT, 조직검사 업로드 — 한국 전문의가 상담 중 실시간 판독.",
      },
      {
        icon: "🔒",
        title: "의료 등급 보안",
        desc: "End-to-end AES-256 암호화. PIPA §28조의8 / HIPAA 준수. 본인 동의 기반.",
      },
    ],
    telemedicineCtaPrimary: "원격 상담 시작하기",
    telemedicineCtaSecondary: "진행 방식 보기",

    hospitalsEyebrow: "04 — 제휴 병원",
    hospitalsTitle: "과시를 위한 것이 아닌,",
    hospitalsTitleItalic: "성과로 선정했습니다.",
    hospitalsLede:
      "모든 제휴 병원은 종양학 전문성, 외국인 환자 진료 경험, 언어 지원을 기준으로 선별됩니다. 스폰서 제휴는 없습니다.",
    hospitals: [
      {
        name: "서울아산병원",
        specialty: "종합 암센터",
        meta: "2,700병상 · 서울",
        photo: PHOTOS.hospital1,
      },
      {
        name: "삼성서울병원",
        specialty: "정밀 종양학",
        meta: "1,970병상 · 서울",
        photo: PHOTOS.hospital2,
      },
      {
        name: "세브란스병원",
        specialty: "로봇·최소침습 수술",
        meta: "2,450병상 · 서울",
        photo: PHOTOS.hospital3,
      },
    ],

    processEyebrow: "05 — 진행 방식",
    processTitle: "네 단계, 신중한 속도로.",
    process: [
      {
        step: "01",
        title: "문의",
        body: "진단과 우선순위를 공유해 주시면 24시간 내 검토합니다.",
      },
      {
        step: "02",
        title: "매칭",
        body: "투명한 견적과 함께 적합한 병원 2-3곳을 제안합니다.",
      },
      {
        step: "03",
        title: "여정",
        body: "비자 서류와 입국 로지스틱스를 대행합니다.",
      },
      {
        step: "04",
        title: "치료",
        body: "전담 코디네이터가 모든 진료에 동행하고 퇴원까지 함께합니다.",
      },
    ],

    ctaEyebrow: "시작하기",
    ctaTitle: "한 번의 문의로 모든 것이 시작됩니다.",
    ctaBody: "계정도 결제도 필요 없습니다. 아시는 만큼만 공유해 주시면 영업일 기준 하루 안에 답변드립니다.",
    ctaSecondaryLabel: "혹은 원격 영상 상담으로 먼저 만나보기 →",
  },

  ru: {
    navCurrent: "home",
    eyebrowHero: "01 — Консьерж-сопровождение, Корея",
    heroTitleA: "Лечение рака в Корее,",
    heroTitleB: "от начала до конца.",
    heroLede:
      "HEALO координирует каждый шаг — от первой консультации до постлечения — с самыми опытными онкологическими командами Кореи. Для пациентов из любой страны.",
    ctaPrimary: "Оставить заявку",
    ctaSecondary: "Как это работает",
    heroCaption: "Immune Hospital · Кансо",
    disclaimer:
      "HEALO не является медицинским учреждением. Диагностика и лечение выполняются лицензированными корейскими специалистами.",

    statsEyebrow: "02 — В цифрах",
    stats: [
      { num: "99.9", unit: "%", label: "Выживаемость: рак щитовидной железы, 5 лет" },
      { num: "93.8", unit: "%", label: "Выживаемость: рак молочной железы, 5 лет" },
      { num: "3,200", unit: "+", label: "Случаев в год" },
      { num: "24/7", unit: "", label: "Поддержка консьержа" },
    ],

    servicesEyebrow: "03 — Что мы берём на себя",
    servicesTitle: "Весь путь",
    servicesTitleItalic: "под нашим контролем.",
    services: [
      {
        eyebrow: "Подбор клиники",
        title: "Подбор клиники",
        body:
          "Мультидисциплинарный скрининг среди ведущих онкоцентров Кореи — по диагнозу, языку, бюджету и срокам.",
      },
      {
        eyebrow: "Виза и пребывание",
        title: "Виза и прибытие",
        body:
          "Оформление медицинских виз C-3-3 и G-1, встреча в аэропорту, подобранное жильё рядом с клиникой.",
      },
      {
        eyebrow: "Перевод",
        title: "Медицинский перевод",
        body:
          "Профессиональные переводчики: корейский-русский, корейский-английский, корейский-казахский — на каждой консультации.",
      },
      {
        eyebrow: "Координация",
        title: "Сквозная координация",
        body:
          "Один выделенный координатор от первого обращения до постлечения, работающий в вашем часовом поясе.",
      },
    ],

    telemedicineEyebrow: "03 — Телемедицина · Наше УТП",
    telemedicineTitle: "Поговорите с корейским специалистом",
    telemedicineTitleItalic: "ещё до вылета.",
    telemedicineLede:
      "Без визы. Без перелёта. Начните с видеоконсультации с ведущими онкологами Кореи — затем решайте, ехать ли.",
    telemedicineFeatures: [
      {
        icon: "🎥",
        title: "HD-видеоконсультация",
        desc: "WebRTC с минимальной задержкой. Работает на ноутбуке, планшете и мобильном. Без установки приложения.",
      },
      {
        icon: "🗣️",
        title: "Перевод в реальном времени",
        desc: "Корейский ↔ русский / казахский / английский / китайский. Медицинский ИИ + живые переводчики при необходимости.",
      },
      {
        icon: "📄",
        title: "Безопасный обзор документов",
        desc: "Загрузите МРТ, КТ, гистологию — корейские специалисты обсуждают результаты в прямом эфире.",
      },
      {
        icon: "🔒",
        title: "Медицинский уровень безопасности",
        desc: "Сквозное шифрование AES-256. Соответствие PIPA §28-8 / HIPAA. Ваши данные, ваше согласие.",
      },
    ],
    telemedicineCtaPrimary: "Начать удалённую консультацию",
    telemedicineCtaSecondary: "Посмотреть, как это работает",

    hospitalsEyebrow: "04 — Партнёрские клиники",
    hospitalsTitle: "Выбраны по результатам,",
    hospitalsTitleItalic: "а не по рекламе.",
    hospitalsLede:
      "Каждый партнёр проверен на онкологическую специализацию, опыт работы с иностранными пациентами и языковую поддержку. Никаких спонсорских размещений.",
    hospitals: [
      { name: "Asan Medical Center", specialty: "Комплексная онкология", meta: "2,700 коек · Сеул", photo: PHOTOS.hospital1 },
      { name: "Samsung Medical Center", specialty: "Прецизионная онкология", meta: "1,970 коек · Сеул", photo: PHOTOS.hospital2 },
      { name: "Severance Hospital", specialty: "Роботизированная и малоинвазивная хирургия", meta: "2,450 коек · Сеул", photo: PHOTOS.hospital3 },
    ],

    processEyebrow: "05 — Процесс",
    processTitle: "Четыре этапа, без спешки.",
    process: [
      { step: "01", title: "Заявка", body: "Поделитесь диагнозом и приоритетами. Рассмотрим в течение 24 часов." },
      { step: "02", title: "Подбор", body: "Предложим две-три подходящие клиники с прозрачной стоимостью." },
      { step: "03", title: "Поездка", body: "Подготовим визовые документы и организуем прибытие." },
      { step: "04", title: "Лечение", body: "Координатор сопровождает каждый приём вплоть до выписки." },
    ],

    ctaEyebrow: "Начать",
    ctaTitle: "Одна заявка запускает весь процесс.",
    ctaBody: "Ни аккаунта, ни оплаты. Расскажите, что знаете — ответим в течение одного рабочего дня.",
    ctaSecondaryLabel: "Или начните с онлайн-консультации →",
  },

  kz: {
    navCurrent: "home",
    eyebrowHero: "01 — Кореядағы консьерж-қолдау",
    heroTitleA: "Кореяда онкологиялық емдеу,",
    heroTitleB: "басынан соңына дейін.",
    heroLede:
      "HEALO бірінші консультациядан кейінгі бақылауға дейін әрбір қадамды Кореяның ең тәжірибелі онкология командаларымен үнсіз үйлестіреді. Әлемнің кез келген нүктесінен.",
    ctaPrimary: "Өтініш қалдыру",
    ctaSecondary: "Қалай жұмыс істейді",
    heroCaption: "Immune Hospital · Каңсо",
    disclaimer:
      "HEALO медициналық мекеме емес. Диагностика мен емдеуді Кореяның лицензиясы бар мамандары жүргізеді.",

    statsEyebrow: "02 — Сандармен",
    stats: [
      { num: "99.9", unit: "%", label: "Қалқанша безі қатерлі ісігі: 5 жылдық тірі қалу" },
      { num: "93.8", unit: "%", label: "Сүт безі қатерлі ісігі: 5 жылдық тірі қалу" },
      { num: "3,200", unit: "+", label: "Жылдық кейстер" },
      { num: "24/7", unit: "", label: "Консьерж қолдауы" },
    ],

    servicesEyebrow: "03 — Біз атқаратын жұмыс",
    servicesTitle: "Бүкіл жол",
    servicesTitleItalic: "біздің бақылауда.",
    services: [
      { eyebrow: "Аурухана іріктеу", title: "Аурухана іріктеу", body: "Диагноз, тіл, бюджет және мерзімге сай Кореяның үздік онкоцентрлерін мультидисциплинарлық тұрғыда іріктейміз." },
      { eyebrow: "Виза және қалу", title: "Виза мен келу", body: "Медициналық виза (C-3-3, G-1), әуежайдан қарсы алу, емдеу орталығына жақын тұру нұсқалары." },
      { eyebrow: "Аударма", title: "Медициналық аударма", body: "Корей-орыс, корей-ағылшын, корей-қазақ кәсіби медициналық аудармашылар әр кездесуде." },
      { eyebrow: "Координация", title: "Толық координация", body: "Бірінші өтініштен емдеуден кейінгі бақылауға дейін — бір координатор сіздің уақыт белдеуінде." },
    ],

    telemedicineEyebrow: "03 — Телемедицина · Біздің USP",
    telemedicineTitle: "Ұшаққа отырмас бұрын",
    telemedicineTitleItalic: "корей маманымен сөйлесіңіз.",
    telemedicineLede:
      "Виза да, ұшақ та қажет емес. Тұрған жеріңізден Кореяның үздік онкологтарымен тікелей бейне-консультация — содан кейін сапар туралы шешім қабылдаңыз.",
    telemedicineFeatures: [
      { icon: "🎥", title: "HD бейне-консультация", desc: "Төмен кідірісті WebRTC. Ноутбук, планшет, мобильді. Қосымша орнатудың қажеті жоқ." },
      { icon: "🗣️", title: "Нақты уақыттағы аударма", desc: "Корей ↔ орыс / қазақ / ағылшын / қытай. Медициналық AI + қажет болса — тірі аудармашы." },
      { icon: "📄", title: "Қауіпсіз құжат көру", desc: "МРТ, КТ, гистология жүктеңіз — корей мамандары тікелей эфирде талдайды." },
      { icon: "🔒", title: "Медициналық деңгейдегі қауіпсіздік", desc: "Толық AES-256 шифрлау. PIPA §28-8 / HIPAA сәйкестік. Сіздің деректеріңіз — сіздің келісіміңіз." },
    ],
    telemedicineCtaPrimary: "Қашықтан консультация бастау",
    telemedicineCtaSecondary: "Қалай жұмыс істейтінін көру",

    hospitalsEyebrow: "04 — Серіктес аурухналар",
    hospitalsTitle: "Нәтиже үшін таңдалған,",
    hospitalsTitleItalic: "жарнама үшін емес.",
    hospitalsLede:
      "Әр серіктес — онкологиялық маманданумен, шетелдік пациенттермен жұмыс тәжірибесімен және тілдік қолдаумен таңдалды. Демеуші орындар жоқ.",
    hospitals: [
      { name: "Asan Medical Center", specialty: "Кешенді онкология", meta: "2,700 төсек · Сеул", photo: PHOTOS.hospital1 },
      { name: "Samsung Medical Center", specialty: "Дәл онкология", meta: "1,970 төсек · Сеул", photo: PHOTOS.hospital2 },
      { name: "Severance Hospital", specialty: "Роботты және минималды инвазивті хирургия", meta: "2,450 төсек · Сеул", photo: PHOTOS.hospital3 },
    ],

    processEyebrow: "05 — Процесс",
    processTitle: "Төрт қадам, асықпай.",
    process: [
      { step: "01", title: "Өтініш", body: "Диагноз бен приоритеттерді бөлісіңіз. 24 сағат ішінде қараймыз." },
      { step: "02", title: "Іріктеу", body: "Ашық бағамен екі-үш лайықты ауруханы ұсынамыз." },
      { step: "03", title: "Сапар", body: "Виза құжаттарын дайындап, келуді ұйымдастырамыз." },
      { step: "04", title: "Емдеу", body: "Координатор әр қабылдауға еріп, шығаруға дейін бірге болады." },
    ],

    ctaEyebrow: "Бастау",
    ctaTitle: "Бір өтініш — барлығының басы.",
    ctaBody: "Аккаунт та, төлем де қажет емес. Білгеніңізді жіберіңіз — бір жұмыс күні ішінде жауап береміз.",
    ctaSecondaryLabel: "Немесе алдымен онлайн-кеңеспен танысу →",
  },

  zh: {
    navCurrent: "home",
    eyebrowHero: "01 — 韩国癌症治疗礼宾服务",
    heroTitleA: "韩国癌症治疗,",
    heroTitleB: "全程陪伴。",
    heroLede:
      "HEALO 与韩国最有经验的肿瘤团队一起,从首次咨询到后续随访,全程安静地为您协调每一步。欢迎来自世界各地的患者。",
    ctaPrimary: "申请咨询",
    ctaSecondary: "了解流程",
    heroCaption: "Immune Hospital · 江西",
    disclaimer: "HEALO 不是医疗机构。诊断与治疗由韩国持证医疗人员执行。",

    statsEyebrow: "02 — 数据实绩",
    stats: [
      { num: "99.9", unit: "%", label: "甲状腺癌 5 年生存率" },
      { num: "93.8", unit: "%", label: "乳腺癌 5 年生存率" },
      { num: "3,200", unit: "+", label: "年接诊病例" },
      { num: "24/7", unit: "", label: "礼宾支持" },
    ],

    servicesEyebrow: "03 — 我们负责的部分",
    servicesTitle: "整个就医旅程,",
    servicesTitleItalic: "由我们安静承担。",
    services: [
      { eyebrow: "医院匹配", title: "医院匹配", body: "根据诊断、语言、预算和时间安排,从韩国顶尖癌症中心中进行多学科筛选。" },
      { eyebrow: "签证与住宿", title: "签证与接机", body: "C-3-3 与 G-1 医疗签证办理、机场接送、就诊医院附近的精选住宿。" },
      { eyebrow: "翻译", title: "医疗翻译", body: "韩-俄、韩-英、韩-哈萨克专业医疗翻译全程陪同每次就诊。" },
      { eyebrow: "协调", title: "全程协调", body: "从首次咨询到治疗后随访,专属协调员按您的时区陪伴。" },
    ],

    telemedicineEyebrow: "03 — 远程医疗 · 我们的核心优势",
    telemedicineTitle: "在登机前",
    telemedicineTitleItalic: "先与韩国专家通话。",
    telemedicineLede: "无需签证、无需机票。在您所在的地方,通过实时视频与韩国顶尖肿瘤专家会诊,再决定是否赴韩。",
    telemedicineFeatures: [
      { icon: "🎥", title: "HD 视频咨询", desc: "超低延迟 WebRTC。笔记本、平板、手机均可,无需安装应用。" },
      { icon: "🗣️", title: "实时翻译", desc: "韩 ↔ 俄 / 哈萨克 / 英 / 中。医疗级 AI + 必要时人工翻译。" },
      { icon: "📄", title: "安全文档审阅", desc: "上传 MRI、CT、病理 — 韩国专家在通话中实时审阅并讨论。" },
      { icon: "🔒", title: "医疗级安全", desc: "端到端 AES-256 加密。符合 PIPA §28-8 / HIPAA。您的记录,您同意。" },
    ],
    telemedicineCtaPrimary: "开始远程咨询",
    telemedicineCtaSecondary: "了解流程",

    hospitalsEyebrow: "04 — 合作医院",
    hospitalsTitle: "以疗效入选,",
    hospitalsTitleItalic: "不以门面取人。",
    hospitalsLede: "每家合作医院均基于肿瘤专科能力、国际患者经验和语言支持进行筛选。没有赞助位。",
    hospitals: [
      { name: "Asan Medical Center", specialty: "综合癌症中心", meta: "2,700 床 · 首尔", photo: PHOTOS.hospital1 },
      { name: "Samsung Medical Center", specialty: "精准肿瘤学", meta: "1,970 床 · 首尔", photo: PHOTOS.hospital2 },
      { name: "Severance Hospital", specialty: "机器人与微创手术", meta: "2,450 床 · 首尔", photo: PHOTOS.hospital3 },
    ],

    processEyebrow: "05 — 流程",
    processTitle: "四个步骤,节奏从容。",
    process: [
      { step: "01", title: "咨询", body: "分享您的诊断与优先事项,我们在 24 小时内审阅。" },
      { step: "02", title: "匹配", body: "提供两到三家合适的医院与透明报价。" },
      { step: "03", title: "赴韩", body: "为您准备签证文件并安排入境接待。" },
      { step: "04", title: "治疗", body: "专属协调员陪同每次就诊直至出院。" },
    ],

    ctaEyebrow: "开始",
    ctaTitle: "一次咨询,启动全部流程。",
    ctaBody: "无需账户、无需付款。告诉我们您所知道的,我们会在一个工作日内回复。",
    ctaSecondaryLabel: "或从远程视频咨询开始 →",
  },

  ja: {
    navCurrent: "home",
    eyebrowHero: "01 — 韓国がん治療コンシェルジュ",
    heroTitleA: "韓国でのがん治療を、",
    heroTitleB: "最初から最後まで。",
    heroLede:
      "HEALO は初回相談からアフターケアまで、韓国屈指の腫瘍チームとともに静かにコーディネートします。世界のどこからでも。",
    ctaPrimary: "相談を申し込む",
    ctaSecondary: "進め方を見る",
    heroCaption: "Immune Hospital · 江西",
    disclaimer: "HEALO は医療機関ではありません。診断と治療は韓国の免許を持つ医療従事者が行います。",

    statsEyebrow: "02 — 数字で見る",
    stats: [
      { num: "99.9", unit: "%", label: "甲状腺がん 5 年生存率" },
      { num: "93.8", unit: "%", label: "乳がん 5 年生存率" },
      { num: "3,200", unit: "+", label: "年間症例数" },
      { num: "24/7", unit: "", label: "コンシェルジュ対応" },
    ],

    servicesEyebrow: "03 — 私たちが担うこと",
    servicesTitle: "旅程のすべてを、",
    servicesTitleItalic: "静かに担います。",
    services: [
      { eyebrow: "病院マッチング", title: "病院マッチング", body: "診断・言語・予算・日程に合わせ、韓国トップのがんセンターの中から多職種審査を経て提案します。" },
      { eyebrow: "ビザ・滞在", title: "ビザと到着", body: "医療ビザ(C-3-3、G-1)手配、空港送迎、治療病院近くの滞在先を事前に整えます。" },
      { eyebrow: "通訳", title: "医療通訳", body: "韓-露、韓-英、韓-カザフの医療専門通訳がすべての診療に同行します。" },
      { eyebrow: "コーディネート", title: "一貫コーディネート", body: "最初のお問い合わせから治療後のフォローまで、専任コーディネーター一人がご利用者の時差に合わせて対応します。" },
    ],

    telemedicineEyebrow: "03 — 遠隔診療 · 当社のUSP",
    telemedicineTitle: "飛行機に乗る前に、",
    telemedicineTitleItalic: "韓国の専門医とお話しください。",
    telemedicineLede: "ビザも航空券も不要。今いる場所から韓国トップの腫瘍医とリアルタイムビデオ相談 — その上で訪韓を判断してください。",
    telemedicineFeatures: [
      { icon: "🎥", title: "HD ビデオ相談", desc: "超低遅延 WebRTC。ノート PC・タブレット・スマホ対応。アプリ不要。" },
      { icon: "🗣️", title: "リアルタイム通訳", desc: "韓 ↔ 露 / カザフ / 英 / 中。医療グレード AI と必要に応じて人間通訳。" },
      { icon: "📄", title: "安全な書類共有", desc: "MRI・CT・病理をアップロード — 韓国専門医が相談中にリアルタイムで判読。" },
      { icon: "🔒", title: "医療グレードのセキュリティ", desc: "エンドツーエンド AES-256 暗号化。PIPA §28-8 / HIPAA 準拠。あなたの記録、あなたの同意で。" },
    ],
    telemedicineCtaPrimary: "遠隔相談を始める",
    telemedicineCtaSecondary: "進め方を見る",

    hospitalsEyebrow: "04 — 提携病院",
    hospitalsTitle: "派手さではなく、",
    hospitalsTitleItalic: "実績で選びました。",
    hospitalsLede: "すべての提携病院は腫瘍専門性、外国人患者対応経験、言語サポートを基準に選定されています。スポンサー掲載はありません。",
    hospitals: [
      { name: "Asan Medical Center", specialty: "総合がんセンター", meta: "2,700 床 · ソウル", photo: PHOTOS.hospital1 },
      { name: "Samsung Medical Center", specialty: "精密腫瘍学", meta: "1,970 床 · ソウル", photo: PHOTOS.hospital2 },
      { name: "Severance Hospital", specialty: "ロボット・低侵襲手術", meta: "2,450 床 · ソウル", photo: PHOTOS.hospital3 },
    ],

    processEyebrow: "05 — 進め方",
    processTitle: "4ステップ、慎重なペースで。",
    process: [
      { step: "01", title: "お問い合わせ", body: "診断と優先事項を共有してください。24 時間以内に確認します。" },
      { step: "02", title: "マッチング", body: "透明な見積とともに適した病院 2〜3 カ所を提案します。" },
      { step: "03", title: "渡航", body: "ビザ書類と入国ロジスティクスを代行します。" },
      { step: "04", title: "治療", body: "専任コーディネーターがすべての診療に同行し、退院まで伴走します。" },
    ],

    ctaEyebrow: "はじめる",
    ctaTitle: "一度のお問い合わせで、すべてが始まります。",
    ctaBody: "アカウントも決済も不要。知っている範囲でお知らせいただければ、営業日 1 日以内にお返事します。",
    ctaSecondaryLabel: "またはまずオンライン診療から →",
  },
};

export default function HomeClientPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const isKo = lang === "ko";

  // 실제 DB에서 병원 데이터 fetch (Google Places enriched)
  const [dbHospitals, setDbHospitals] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient
          .from("hospitals")
          .select("*")
          .eq("is_published", true)
          .not("thumbnail_image", "is", null)
          .order("display_order", { ascending: true, nullsFirst: false })
          .limit(3);
        if (data && data.length > 0) {
          const langCode = getLangCodeFromCookie();
          setDbHospitals(
            data.map((r) => {
              const mapped = mapHospitalRow(r, langCode);
              return {
                name: mapped?.name || r.name_ko || r.name_en,
                photo: r.thumbnail_image,
                specialty: r.tags?.[0] || "Partner hospital",
                meta: r.address || "Seoul",
                slug: r.slug,
                rating: r.external_ratings?.google?.rating,
              };
            })
          );
        }
      } catch {
        /* use fallback */
      }
    })();
  }, []);
  const hospitalsToShow = dbHospitals && dbHospitals.length > 0 ? dbHospitals : copy.hospitals;

  return (
    <div style={{ background: "var(--cream-0)", minHeight: "100vh" }}>
      <Nav current="home" />

      {/* ==================== HERO ==================== */}
      <section
        className="healo-hero-section"
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div
          className="healo-hero-inner"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            position: "relative",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
            gap: 48,
            alignItems: "center",
            minHeight: "calc(100svh - 152px)",
            padding: "48px 24px 56px",
          }}
        >
          <div
            className="healo-hero-top"
            style={{
              borderTop: "1px solid var(--gold-tint)",
              paddingTop: 34,
              minWidth: 0,
            }}
          >
            <Eyebrow>{copy.eyebrowHero}</Eyebrow>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(36px, 4.2vw, 68px)",
                lineHeight: 1.08,
                letterSpacing: "-0.01em",
                margin: "20px 0 28px",
                maxWidth: 720,
                wordBreak: "keep-all",
              }}
            >
              {copy.heroTitleA}{" "}
              <span style={{ fontStyle: "italic", color: "var(--gold-0)" }}>
                {copy.heroTitleB}
              </span>
            </h1>

            <div
              className="healo-hero-grid"
              style={{
                display: "grid",
                gap: 32,
                alignItems: "end",
                marginBottom: 0,
              }}
            >
              <div>
                <Rule />
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 300,
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "var(--fg-on-dark-2)",
                    maxWidth: 520,
                    margin: "14px 0 22px",
                  }}
                >
                  {copy.heroLede}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    flexWrap: "wrap",
                  }}
                >
                  <Link href="/inquiry" style={{ textDecoration: "none" }}>
                    <ButtonGold>{copy.ctaPrimary}</ButtonGold>
                  </Link>
                  <LinkArrow href="#process" onDark>
                    {copy.ctaSecondary}
                  </LinkArrow>
                </div>
              </div>
              <div className="healo-hero-disclaimer">
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: 13,
                    color: "var(--fg-on-dark-4)",
                    margin: 0,
                    maxWidth: 340,
                    lineHeight: 1.7,
                  }}
                >
                  {copy.disclaimer}
                </p>
              </div>
            </div>
          </div>

          {/* Hero photo */}
          <div
            className="healo-hero-photo"
            style={{
              position: "relative",
              width: "100%",
              overflow: "hidden",
              minHeight: 440,
              height: "min(58svh, 560px)",
              border: "1px solid var(--gold-tint)",
            }}
          >
            <img
              src={IMMUNE_PHOTOS.team}
              alt="HEALO · Immune Hospital team"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 35%",
                display: "block",
                filter: IMMUNE_PHOTO_FILTER,
              }}
            />
            <div style={{ position: "absolute", left: 24, bottom: 24 }}>
              <Eyebrow>{isKo ? "제휴 병원" : "Partner hospital"}</Eyebrow>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 22,
                  color: "var(--fg-on-dark-1)",
                  marginTop: 8,
                  fontWeight: 400,
                }}
              >
                {copy.heroCaption}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== TELEMEDICINE RIBBON ==================== */}
        <div
          style={{
            borderTop: "1px solid var(--gold-tint)",
            background: "linear-gradient(90deg, var(--ink-0) 0%, #141210 100%)",
            color: "var(--fg-on-dark-1, #f5f0e8)",
          }}
        >
          <Link
            href="/telemedicine"
            style={{
              display: "block",
              maxWidth: 1240,
              margin: "0 auto",
              padding: "20px 24px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 280 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    background: "var(--gold-0, #c8a96a)",
                    color: "var(--ink-0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  🎥
                </div>
                <div style={{ lineHeight: 1.3 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--gold-0, #c8a96a)",
                      letterSpacing: "0.24em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    {lang === "ko" ? "NEW · 원격협진 정식 오픈" : "NEW · Telemedicine now live"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--fg-on-dark-1)",
                    }}
                  >
                    {lang === "ko"
                      ? "한국 오기 전, 먼저 영상으로 전문의와 상담하세요"
                      : lang === "ru"
                      ? "Поговорите с корейским специалистом до поездки"
                      : lang === "kz"
                      ? "Сапарға шықпас бұрын корей маманымен сөйлесіңіз"
                      : "Talk to a Korean specialist before you travel"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "var(--gold-0, #c8a96a)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderBottom: "1px solid var(--gold-0)",
                  paddingBottom: 2,
                }}
              >
                {lang === "ko" ? "상담 예약하기" : lang === "ru" ? "Записаться" : "Book now"} →
              </div>
            </div>
          </Link>
        </div>

        {/* ==================== STATS STRIP ==================== */}
        <div
          style={{
            borderTop: "1px solid var(--gold-tint)",
            marginTop: 0,
          }}
        >
          <div
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              padding: "48px 24px 64px",
            }}
          >
            <Eyebrow tone="muted-dark">{copy.statsEyebrow}</Eyebrow>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 32,
                marginTop: 24,
              }}
            >
              {copy.stats.map((s, i) => (
                <Stat key={i} num={s.num} unit={s.unit} label={s.label} onDark />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES 섹션 삭제 (2026-04-21): "진행 방식(PROCESS)" 섹션과 내용 중복.
          병원 매칭 / 비자 / 통역 / 코디네이션 4종은 Process 4단계(문의→매칭→여정→치료) 와
          같은 축을 다르게 분해한 것이라 사용자가 같은 얘길 두 번 읽게 됨.
          서비스 스코프 자체는 히어로 lede + /telemedicine / /about 에서 커버. */}

      {/* ==================== TELEMEDICINE (USP) ==================== */}
      <section
        style={{
          background:
            "linear-gradient(180deg, var(--ink-0) 0%, var(--ink-0) 60%, #0f1a17 100%)",
          color: "var(--fg-on-dark-1, #f5f0e8)",
          padding: "120px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative gold frame */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 32,
            right: 32,
            width: 120,
            height: 120,
            borderTop: "1px solid var(--gold-0, #c8a96a)",
            borderRight: "1px solid var(--gold-0, #c8a96a)",
            opacity: 0.3,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            width: 120,
            height: 120,
            borderBottom: "1px solid var(--gold-0, #c8a96a)",
            borderLeft: "1px solid var(--gold-0, #c8a96a)",
            opacity: 0.3,
          }}
        />

        <div style={{ maxWidth: 1240, margin: "0 auto", position: "relative" }}>
          <div style={{ maxWidth: 900 }}>
            <Eyebrow tone="muted-dark">{copy.telemedicineEyebrow}</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(40px, 5.5vw, 80px)",
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                margin: "32px 0 32px",
              }}
            >
              {copy.telemedicineTitle}
              <br />
              <span style={{ fontStyle: "italic", color: "var(--gold-0, #c8a96a)" }}>
                {copy.telemedicineTitleItalic}
              </span>
            </h2>
            <Rule width={64} color="gold" />
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(16px, 1.3vw, 19px)",
                lineHeight: 1.7,
                color: "var(--fg-on-dark-2, #c7c2b8)",
                margin: "32px 0 64px",
                maxWidth: 720,
              }}
            >
              {copy.telemedicineLede}
            </p>
          </div>

          {/* 4 Feature grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 32,
              marginBottom: 64,
            }}
          >
            {copy.telemedicineFeatures.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: "32px 24px",
                  background: "rgba(200, 169, 106, 0.04)",
                  border: "1px solid rgba(200, 169, 106, 0.2)",
                  borderRadius: 2,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 20,
                    fontWeight: 500,
                    margin: "0 0 12px",
                    color: "var(--fg-on-dark-1, #f5f0e8)",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: "var(--fg-on-dark-2, #c7c2b8)",
                    margin: 0,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Link href="/inquiry" style={{ textDecoration: "none" }}>
              <ButtonGold>{copy.telemedicineCtaPrimary}</ButtonGold>
            </Link>
            <Link
              href="#process"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--fg-on-dark-2, #c7c2b8)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.25)",
                paddingBottom: 4,
              }}
            >
              {copy.telemedicineCtaSecondary} →
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== HOSPITALS ==================== */}
      <section style={{ background: "var(--paper)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div
            className="healo-hospitals-head"
            style={{
              display: "grid",
              gridTemplateColumns: "5fr 6fr",
              gap: 48,
              alignItems: "end",
              marginBottom: 48,
            }}
          >
            <div>
              <Eyebrow>{copy.hospitalsEyebrow}</Eyebrow>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(36px, 5vw, 72px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.005em",
                  margin: "24px 0 0",
                  color: "var(--fg-on-light-1)",
                }}
              >
                {copy.hospitalsTitle}
                <br />
                <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
                  {copy.hospitalsTitleItalic}
                </span>
              </h2>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  lineHeight: 1.75,
                  color: "var(--fg-on-light-2)",
                  margin: 0,
                  maxWidth: 520,
                }}
              >
                {copy.hospitalsLede}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 32,
            }}
          >
            {hospitalsToShow.map((h, i) => (
              <article key={h.slug || i}>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 5",
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <img
                    src={h.photo}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: PHOTO_FILTER,
                    }}
                  />
                </div>
                <Eyebrow tone="muted">{h.specialty}</Eyebrow>
                <h3
                  translate="no"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    color: "var(--fg-on-light-1)",
                    margin: "8px 0",
                  }}
                >
                  {h.name}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--fg-on-light-3)",
                    letterSpacing: "0.04em",
                    margin: 0,
                  }}
                >
                  {h.meta}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PROCESS ==================== */}
      <section
        id="process"
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.processEyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 72px)",
              lineHeight: 1.08,
              margin: "24px 0 64px",
              color: "var(--fg-on-dark-1)",
              maxWidth: 900,
            }}
          >
            {copy.processTitle}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 32,
              borderTop: "1px solid var(--gold-tint)",
              paddingTop: 32,
            }}
          >
            {copy.process.map((p, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 64,
                    fontWeight: 400,
                    color: "var(--gold-0)",
                    lineHeight: 1,
                    marginBottom: 16,
                  }}
                >
                  {p.step}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--fg-on-dark-1)",
                    margin: "0 0 8px",
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "var(--fg-on-dark-2)",
                    margin: 0,
                  }}
                >
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section style={{ background: "var(--cream-0)", padding: "96px 24px" }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <Eyebrow>{copy.ctaEyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.15,
              margin: "24px 0 24px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {copy.ctaTitle}
          </h2>
          <Rule width={64} style={{ margin: "24px auto" }} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.7,
              color: "var(--fg-on-light-2)",
              margin: "24px 0 40px",
            }}
          >
            {copy.ctaBody}
          </p>
          <Link href="/inquiry" style={{ textDecoration: "none" }}>
            <ButtonGold>{copy.ctaPrimary}</ButtonGold>
          </Link>
          {copy.ctaSecondaryLabel && (
            <div style={{ marginTop: 28 }}>
              <Link
                href="/telemedicine"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--gold-2)",
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                  borderBottom: "1px solid transparent",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = "var(--gold-2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = "transparent";
                }}
              >
                {copy.ctaSecondaryLabel}
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />

      {/* Mobile responsive */}
      <style jsx>{`
        @media (max-width: 768px) {
          :global(.healo-hero-inner) {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
            min-height: auto !important;
            padding: 28px 18px 32px !important;
          }
          :global(.healo-hero-top) {
            padding-top: 24px !important;
          }
          :global(.healo-hero-photo) {
            min-height: 260px !important;
            height: 48svh !important;
          }
          :global(.healo-hero-grid),
          :global(.healo-hospitals-head) {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </div>
  );
}
