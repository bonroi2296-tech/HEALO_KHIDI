"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLangCodeFromCookie } from "../../src/lib/i18n";
import {
  ArrowRight,
  Shield,
  Video,
  FileText,
  Heart,
  Globe,
  Clock,
  ChevronRight,
} from "lucide-react";

const L = {
  hero: {
    title: {
      ko: "한국 최고의 암 전문 병원과\n원격으로 먼저 상담하세요",
      en: "Connect with Korea's Top\nCancer Specialists Remotely",
      ru: "Свяжитесь с лучшими\nонкологами Кореи удалённо",
      kz: "Кореяның үздік онкологтарымен\nқашықтан байланысыңыз",
      zh: "远程连接韩国顶级\n肿瘤专家",
      ja: "韓国トップのがん専門医と\nリモートで相談",
    },
    subtitle: {
      ko: "카자흐스탄 암환자를 위한 ICT 사전상담 · 사후관리 플랫폼",
      en: "ICT Pre-consultation & Post-care Platform for Cancer Patients",
      ru: "Платформа ИКТ предварительных консультаций и послеоперационного ухода для онкопациентов",
      kz: "Онкологиялық науқастарға арналған АКТ алдын ала кеңес беру және емнен кейінгі күтім платформасы",
      zh: "面向癌症患者的ICT术前咨询与术后管理平台",
      ja: "がん患者のためのICT事前相談・術後管理プラットフォーム",
    },
    cta: {
      ko: "무료 사전상담 시작하기",
      en: "Start Free Pre-consultation",
      ru: "Начать бесплатную консультацию",
      kz: "Тегін алдын ала кеңес бастау",
      zh: "开始免费预咨询",
      ja: "無料事前相談を始める",
    },
    ctaSub: {
      ko: "5분이면 충분합니다",
      en: "It only takes 5 minutes",
      ru: "Это займёт всего 5 минут",
      kz: "Бар болғаны 5 минут",
      zh: "只需5分钟",
      ja: "たった5分で完了",
    },
  },
  steps: {
    title: {
      ko: "어떻게 진행되나요?",
      en: "How It Works",
      ru: "Как это работает?",
      kz: "Қалай жұмыс істейді?",
      zh: "如何进行？",
      ja: "利用の流れ",
    },
    items: [
      {
        icon: "FileText",
        title: { ko: "1. 인테이크 작성", en: "1. Submit Intake", ru: "1. Заполните анкету", kz: "1. Сауалнаманы толтырыңыз", zh: "1. 填写资料", ja: "1. 問診票記入" },
        desc: { ko: "암종, 병기, 치료 이력 등 기본 정보를 입력합니다", en: "Enter your cancer type, stage, and treatment history", ru: "Укажите тип рака, стадию и историю лечения", kz: "Рак түрі, сатысы және ем тарихын көрсетіңіз", zh: "输入癌症类型、分期和治疗史", ja: "がんの種類、病期、治療歴を入力" },
      },
      {
        icon: "Shield",
        title: { ko: "2. 전문의 매칭", en: "2. Doctor Matching", ru: "2. Подбор врача", kz: "2. Дәрігер таңдау", zh: "2. 医生匹配", ja: "2. 専門医マッチング" },
        desc: { ko: "AI가 최적의 한국 암 전문의를 추천합니다", en: "AI recommends the best Korean oncologist for you", ru: "ИИ подберёт лучшего корейского онколога", kz: "AI сізге ең жақсы корей онкологын ұсынады", zh: "AI为您推荐最佳韩国肿瘤专家", ja: "AIが最適な韓国のがん専門医を推薦" },
      },
      {
        icon: "Video",
        title: { ko: "3. 화상 상담", en: "3. Video Consultation", ru: "3. Видеоконсультация", kz: "3. Бейне кеңес", zh: "3. 视频咨询", ja: "3. ビデオ相談" },
        desc: { ko: "실시간 통역과 함께 화상으로 상담합니다", en: "Consult via video with real-time interpretation", ru: "Консультация по видео с синхронным переводом", kz: "Нақты уақыттағы аудармамен бейне кеңес", zh: "实时翻译视频咨询", ja: "リアルタイム通訳付きビデオ相談" },
      },
      {
        icon: "Heart",
        title: { ko: "4. 사후관리", en: "4. Post-care", ru: "4. Послеоперационный уход", kz: "4. Емнен кейінгі күтім", zh: "4. 术后管理", ja: "4. 術後管理" },
        desc: { ko: "교육, 증상 추적, 재진 예약까지 지속 관리합니다", en: "Education, symptom tracking, and follow-up booking", ru: "Обучение, отслеживание симптомов и запись на повторный приём", kz: "Оқыту, симптомдарды бақылау және қайта қабылдауға жазылу", zh: "教育、症状追踪和复诊预约", ja: "教育、症状追跡、再診予約まで継続管理" },
      },
    ],
  },
  features: {
    title: {
      ko: "왜 HEALO인가요?",
      en: "Why HEALO?",
      ru: "Почему HEALO?",
      kz: "Неге HEALO?",
      zh: "为什么选择HEALO？",
      ja: "なぜHEALOなのか？",
    },
    items: [
      {
        icon: "Globe",
        title: { ko: "6개국어 실시간 통역", en: "Real-time Translation in 6 Languages", ru: "Перевод в реальном времени на 6 языках", kz: "6 тілде нақты уақыттағы аударма", zh: "6种语言实时翻译", ja: "6言語リアルタイム通訳" },
        desc: { ko: "한국어↔러시아어↔카자흐어 자동 통역", en: "Korean↔Russian↔Kazakh auto-interpretation", ru: "Корейский↔Русский↔Казахский автоперевод", kz: "Корей↔Орыс↔Қазақ авто аудармасы", zh: "韩语↔俄语↔哈萨克语自动翻译", ja: "韓国語↔ロシア語↔カザフ語自動通訳" },
      },
      {
        icon: "Shield",
        title: { ko: "의료 데이터 암호화", en: "Encrypted Medical Data", ru: "Зашифрованные медицинские данные", kz: "Шифрланған медициналық деректер", zh: "加密医疗数据", ja: "暗号化された医療データ" },
        desc: { ko: "진단서, 검사 결과 안전하게 보관", en: "Secure storage for medical records & test results", ru: "Безопасное хранение медицинских записей", kz: "Медициналық жазбаларды қауіпсіз сақтау", zh: "安全存储诊断书和检查结果", ja: "診断書・検査結果を安全に保管" },
      },
      {
        icon: "Clock",
        title: { ko: "24시간 이내 응답", en: "Response Within 24 Hours", ru: "Ответ в течение 24 часов", kz: "24 сағат ішінде жауап", zh: "24小时内回复", ja: "24時間以内に回答" },
        desc: { ko: "인테이크 접수 후 빠른 전문의 매칭", en: "Quick specialist matching after intake", ru: "Быстрый подбор специалиста после подачи заявки", kz: "Өтінім бергеннен кейін маман жылдам таңдалады", zh: "提交后快速匹配专家", ja: "受付後、迅速な専門医マッチング" },
      },
    ],
  },
  cancers: {
    title: {
      ko: "지원 암종",
      en: "Supported Cancer Types",
      ru: "Поддерживаемые типы рака",
      kz: "Қолдау көрсетілетін рак түрлері",
      zh: "支持的癌症类型",
      ja: "対応がん種",
    },
    items: [
      { emoji: "🫁", label: { ko: "위암", en: "Stomach", ru: "Рак желудка", kz: "Асқазан обыры", zh: "胃癌", ja: "胃がん" } },
      { emoji: "🩷", label: { ko: "유방암", en: "Breast", ru: "Рак молочной железы", kz: "Сүт безі обыры", zh: "乳腺癌", ja: "乳がん" } },
      { emoji: "🫀", label: { ko: "간암", en: "Liver", ru: "Рак печени", kz: "Бауыр обыры", zh: "肝癌", ja: "肝がん" } },
      { emoji: "🌬️", label: { ko: "폐암", en: "Lung", ru: "Рак лёгких", kz: "Өкпе обыры", zh: "肺癌", ja: "肺がん" } },
      { emoji: "🦋", label: { ko: "갑상선암", en: "Thyroid", ru: "Рак щитовидной железы", kz: "Қалқанша без обыры", zh: "甲状腺癌", ja: "甲状腺がん" } },
      { emoji: "🎗️", label: { ko: "기타 암종", en: "Others", ru: "Другие", kz: "Басқа", zh: "其他", ja: "その他" } },
    ],
  },
  bottomCta: {
    title: {
      ko: "지금 바로 시작하세요",
      en: "Get Started Now",
      ru: "Начните прямо сейчас",
      kz: "Қазір бастаңыз",
      zh: "立即开始",
      ja: "今すぐ始める",
    },
    desc: {
      ko: "카자흐스탄에서 한국 최고의 암 전문의와 상담하세요. 비용은 무료입니다.",
      en: "Consult with Korea's top oncologists from Kazakhstan. It's free.",
      ru: "Проконсультируйтесь с лучшими онкологами Кореи из Казахстана. Это бесплатно.",
      kz: "Қазақстаннан Кореяның үздік онкологтарымен кеңесіңіз. Тегін.",
      zh: "从哈萨克斯坦咨询韩国顶级肿瘤专家。完全免费。",
      ja: "カザフスタンから韓国トップのがん専門医に相談。無料です。",
    },
  },
};

const ICON_MAP = { FileText, Shield, Video, Heart, Globe, Clock };

export default function HomeClient() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.["en"] || "";

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-teal-300 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-block bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            🇰🇿 🇰🇷 Kazakhstan × Korea Medical Bridge
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 whitespace-pre-line">
            {l(L.hero.title)}
          </h1>

          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            {l(L.hero.subtitle)}
          </p>

          <button
            onClick={() => router.push("/intake")}
            className="bg-white text-teal-700 font-bold text-lg px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 inline-flex items-center gap-2"
          >
            {l(L.hero.cta)} <ArrowRight size={20} />
          </button>
          <p className="text-white/60 text-sm mt-3">{l(L.hero.ctaSub)}</p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">{l(L.steps.title)}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {L.steps.items.map((step, i) => {
            const Icon = ICON_MAP[step.icon];
            return (
              <div key={i} className="relative text-center p-6">
                {i < 3 && (
                  <div className="hidden md:block absolute top-12 -right-3 text-gray-300">
                    <ChevronRight size={24} />
                  </div>
                )}
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon size={24} className="text-teal-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">{l(step.title)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{l(step.desc)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Supported Cancer Types ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{l(L.cancers.title)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {L.cancers.items.map((c, i) => (
              <div
                key={i}
                onClick={() => router.push("/intake")}
                className="bg-white rounded-xl p-5 text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border border-gray-100"
              >
                <div className="text-3xl mb-2">{c.emoji}</div>
                <div className="font-semibold text-sm text-gray-700">{l(c.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why HEALO ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">{l(L.features.title)}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {L.features.items.map((f, i) => {
            const Icon = ICON_MAP[f.icon];
            return (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={22} className="text-teal-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">{l(f.title)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{l(f.desc)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{l(L.bottomCta.title)}</h2>
          <p className="text-white/80 mb-8 text-lg">{l(L.bottomCta.desc)}</p>
          <button
            onClick={() => router.push("/intake")}
            className="bg-white text-teal-700 font-bold text-lg px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 inline-flex items-center gap-2"
          >
            {l(L.hero.cta)} <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
