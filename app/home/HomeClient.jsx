"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LangContext";
import { HOME_CONTENT } from "@/lib/content/homeContent";
import OrganIcon from "../_components/OrganIcon";
import {
  ArrowRight,
  Shield,
  Video,
  FileText,
  Heart,
  Globe,
  Clock,
  ChevronRight,
  ChevronDown,
  Leaf,
  Stethoscope,
  Award,
  Users,
  Building2,
  CheckCircle,
  Star,
  TrendingUp,
  Lock,
  Headphones,
  MessageCircle,
  MapPin,
  Mail,
  GraduationCap,
} from "lucide-react";
import SocialProofSection from "@/components/SocialProofSection";

/* ═══════════════════════════════════════════════════════
   PLACEHOLDER IMAGES (Unsplash — free, no auth required)

   나중에 실제 사진으로 교체하세요:
   - 의사 사진: 400x400px 이상, 정사각형, 배경 깔끔
   - 병원 사진: 800x500px 이상, 건물 외관 또는 내부
   - 히어로 배경: 1920x1080px 이상
   ═══════════════════════════════════════════════════════ */
const PLACEHOLDER = {
  // 📸 히어로 배경 — 회복톤(공원 산책) 2026-06-20 PO 취향 반영. 어두운 그라데이션 뒤 배경.
  // 히어로 배경은 90~95% 어두운 그라데이션에 덮여 거의 안 보임 → 원본 화질·폭 축소(LCP 바이트 절감).
  // 2026-06-23: 외부 Unsplash → 로컬화(LCP 경로에서 외부 fetch 의존성 제거, 엣지 캐시). next/image가 AVIF 변환.
  heroBg: "/images/hero/recovery-walk.jpg",
  // 📸 병원 2곳 — 교체: 면력한방병원 실제 사진으로 교체 권장 (800x500)
  hospitals: [
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=500&fit=crop",
  ],
};

/* ─────────────────────────────────────────
   i18n 텍스트
   ───────────────────────────────────────── */

const ICON_MAP = { FileText, Shield, Video, Heart, Globe, Clock, Leaf, Stethoscope, Award, Users, Building2, CheckCircle, Star, TrendingUp, Lock, Headphones };

/* ═══════════════════════════════════════════════════════
   PLACEHOLDER DATA — 실제 데이터로 교체 필요

   📋 병원에 요청할 것:
   1. 의사 4명의 프로필 사진 + 이름 + 직함 + 전공 + 경력
   2. 면력한방병원 로고 이미지 (PNG, 투명 배경)
   3. 협진 병원 로고 이미지 (PNG, 투명 배경)
   4. 병원 외관/내부 사진 2-3장
   5. 환자 후기 (익명 가능) 2-3건
   ═══════════════════════════════════════════════════════ */

// 면력한방병원 4개 지점 대표원장 (강서·신촌·광명·성동 — 전 지점 외국인환자 유치의료기관 등록)
// 📸 사진은 면력한방병원 공식 사이트에서 가져옴 (self-host, public/immune/doctor/)
const DOCTORS_DATA = [
  { name: { ko: "황이준 대표원장", en: "Dr. Hwang Yi-jun", ru: "Д-р Хван Иджун", kz: "Д-р Хван Иджун", zh: "黄以准 代表院长", ja: "黄以準 代表院長" }, title: { ko: "면력한방병원 강서점 대표원장", en: "Chief Director, Immune Hospital Gangseo", ru: "Главный директор, Иммунная Клиника Кансо", kz: "Бас директор, Иммунная Клиника Кансо", zh: "免疫医院 江西 代表院长", ja: "免疫病院 江西 代表院長" }, specialty: { ko: "한방 면역 종양학 · 통합 암 케어", en: "Korean Medicine Immuno-Oncology", ru: "Иммуноонкология корейской медицины", kz: "Корей медицинасы иммуноонкологиясы", zh: "韩方免疫肿瘤学", ja: "韓方免疫腫瘍学" }, exp: "", img: "/immune/doctor/gangeo-dr-hwang-ijun.png" },
  { name: { ko: "유형진 대표원장", en: "Dr. Yu Hyung-jin", ru: "Д-р Ю Хёнджин", kz: "Д-р Ю Хёнджин", zh: "柳炯进 代表院长", ja: "柳炯進 代表院長" }, title: { ko: "면력한방병원 신촌점 대표원장", en: "Chief Director, Immune Hospital Sinchon", ru: "Главный директор, Иммунная Клиника Синчхон", kz: "Бас директор, Иммунная Клиника Синчхон", zh: "免疫医院 新村 代表院长", ja: "免疫病院 新村 代表院長" }, specialty: { ko: "한방 면역 치료 · 암 통합 케어", en: "Korean Medicine Immunotherapy · Cancer Care", ru: "Иммунотерапия · Онкологическая помощь", kz: "Иммунотерапия · Онкологиялық көмек", zh: "韩方免疫治疗 · 癌症综合护理", ja: "韓方免疫治療 · がん統合ケア" }, exp: "", img: "/immune/doctor/sinchon-dr-yoo-hyeongjin.png" },
  { name: { ko: "배길준 대표원장", en: "Dr. Bae Gil-jun", ru: "Д-р Пэ Гильчжун", kz: "Д-р Пэ Гильчжун", zh: "裴吉俊 代表院长", ja: "裴吉俊 代表院長" }, title: { ko: "면력한방병원 광명점 대표원장", en: "Chief Director, Immune Hospital Gwangmyeong", ru: "Главный директор, Иммунная Клиника Кванмён", kz: "Бас директор, Иммунная Клиника Кванмён", zh: "免疫医院 光明 代表院长", ja: "免疫病院 光明 代表院長" }, specialty: { ko: "통합면역 · 암환자 케어", en: "Integrative Immunology · Cancer Care", ru: "Интегративная иммунология · Помощь онкопациентам", kz: "Интегративті иммунология · Онкологиялық көмек", zh: "综合免疫 · 癌症患者护理", ja: "統合免疫 · がん患者ケア" }, exp: "", img: "/immune/doctor/gwangmyeong-dr-bae-giljun.png" },
  { name: { ko: "강주안 대표원장", en: "Dr. Kang Ju-an", ru: "Д-р Кан Джуан", kz: "Д-р Кан Джуан", zh: "姜周安 代表院长", ja: "姜周安 代表院長" }, title: { ko: "면력한방병원 성동점 대표원장", en: "Chief Director, Immune Hospital Seongdong", ru: "Главный директор, Иммунная Клиника Сондон", kz: "Бас директор, Иммунная Клиника Сондон", zh: "免疫医院 城东 代表院长", ja: "免疫病院 城東 代表院長" }, specialty: { ko: "한방내과 · 면역통합의학", en: "Korean Internal Medicine · Integrative Immunology", ru: "Корейская внутренняя медицина · Интегративная иммунология", kz: "Корей ішкі медицинасы · Интегративті иммунология", zh: "韩方内科 · 综合免疫医学", ja: "韓方内科 · 免疫統合医学" }, exp: "", img: "/immune/doctor/seongdong-dr-kang-juan.png" },
];

// 📸 교체 대상: 병원 로고 이미지 — 실제 로고 URL로 교체
const PARTNERS_DATA = [
  // 면력한방병원 3개 지점 (제휴 병원) — 공식 사이트 이미지
  { slug: "immunehospital-magok", badge: "partner", name: { ko: "면력한방병원 강서점", en: "Immune Hospital Gangseo", ru: "Иммунная Клиника Кансо", kz: "Иммунная Клиника Кансо", zh: "免疫医院 江西院", ja: "免疫病院 江西院" }, desc: { ko: "강서 소재 한방 면역치료 병원", en: "Korean Medicine immunotherapy in Gangseo", ru: "Иммунотерапия корейской медицины в Кансо", kz: "Кансодағы корей медицинасы иммунотерапиясы", zh: "江西韩方免疫治疗医院", ja: "江西の韓方免疫治療病院" }, img: "/images/hospitals/immunehospital-magok/1.jpg?v=3" },
  { slug: "immunehospital-sinchon", badge: "partner", name: { ko: "면력한방병원 신촌점", en: "Immune Hospital Sinchon", ru: "Иммунная Клиника Синчхон", kz: "Иммунная Клиника Синчон", zh: "免疫医院 新村院", ja: "免疫病院 新村院" }, desc: { ko: "서대문구 연세로 소재", en: "On Yonsei-ro, Seodaemun-gu", ru: "На Ёнсе-ро, Содэмун-гу", kz: "Ёнсе-ро, Содэмун-гу", zh: "位于延世路", ja: "延世路に位置" }, img: "/images/hospitals/immunehospital-sinchon/1.jpg?v=3" },
  { slug: "immunehospital-gwangmyeong", badge: "partner", name: { ko: "면력한방병원 광명점", en: "Immune Hospital Gwangmyeong", ru: "Иммунная Клиника Кванмён", kz: "Иммунная Клиника Кванмён", zh: "免疫医院 光明院", ja: "免疫病院 光明院" }, desc: { ko: "광명 철산동 소재", en: "In Cheolsan-dong, Gwangmyeong", ru: "Чхольсан-дон, Кванмён", kz: "Кванмён, Чхольсан-дон", zh: "位于光明市铁山洞", ja: "光明市鉄山洞に位置" }, img: "/images/hospitals/immunehospital-gwangmyeong/1.jpg?v=3" },
  { slug: "immunehospital-seongdong", badge: "partner", name: { ko: "면력한방병원 성동점", en: "Immune Hospital Seongdong", ru: "Иммунная Клиника Сондон", kz: "Иммунная Клиника Сондон", zh: "免疫医院 城东院", ja: "免疫病院 城東院" }, desc: { ko: "서울 성동구 신규 개원", en: "Newly opened in Seongdong-gu, Seoul", ru: "Недавно открыт в Сондон-гу, Сеул", kz: "Сеул Сондон-гуда жаңадан ашылды", zh: "首尔城东区新开院", ja: "ソウル城東区に新規開院" }, img: "/images/hospitals/immunehospital-seongdong/1.jpg?v=3" },
  // 협진 대학병원 4곳
  { slug: "ewha-seoul", badge: "university", name: { ko: "이대서울병원", en: "Ewha Seoul Hospital", ru: "Больница Ихва Сеул", kz: "Ихва Сеул ауруханасы", zh: "梨大首尔医院", ja: "梨大ソウル病院" }, desc: { ko: "서울 마곡 소재 최신 대학병원", en: "Modern university hospital in Magok, Seoul", ru: "Современная больница в Магоке", kz: "Магоктағы заманауи аурухана", zh: "首尔麻谷现代化大学医院", ja: "ソウル麻谷の最新大学病院" }, img: "/images/hospitals/ewha-seoul/1.jpg?v=3" },
  { slug: "ewha-mokdong", badge: "university", name: { ko: "이대목동병원", en: "Ewha Mokdong Hospital", ru: "Больница Ихва Мокдон", kz: "Ихва Мокдон ауруханасы", zh: "梨大木洞医院", ja: "梨大木洞病院" }, desc: { ko: "이화여자대학교 의료원 목동", en: "Ewha Medical Center, Mokdong", ru: "Медицинский центр Ихва, Мокдон", kz: "Ихва медициналық орталығы, Мокдон", zh: "梨花医疗院木洞", ja: "梨花医療院木洞" }, img: "/images/hospitals/ewha-mokdong/1.jpg?v=3" },
  { slug: "korea-guro", badge: "university", name: { ko: "고려대 구로병원", en: "Korea Univ. Guro Hospital", ru: "Больница Куро", kz: "Куро ауруханасы", zh: "高丽大九老医院", ja: "高麗大九老病院" }, desc: { ko: "고려대학교 의과대학 부속", en: "Korea University College of Medicine", ru: "При медфакультете Корёского университета", kz: "Корё университеті медицина факультеті", zh: "高丽大学医学院附属", ja: "高麗大学医学部附属" }, img: "/images/hospitals/korea-guro/1.jpg?v=3" },
  { slug: "severance-sinchon", badge: "university", name: { ko: "신촌세브란스병원", en: "Severance Hospital", ru: "Больница Северанс", kz: "Северанс ауруханасы", zh: "世福兰斯医院", ja: "セブランス病院" }, desc: { ko: "연세대학교 세브란스병원", en: "Yonsei University Severance Hospital", ru: "Больница Северанс университета Ёнсе", kz: "Ёнсе университетінің Северанс ауруханасы", zh: "延世大学世福兰斯医院", ja: "延世大学セブランス病院" }, img: "/images/hospitals/severance-sinchon/1.jpg?v=3" },
];

// FAQ 데이터 (실제 내용 — 교체 불필요)
const FAQ_DATA = {
  general: [
    { q: { ko: "healwith는 어떤 서비스인가요?", en: "What is healwith?", ru: "Что такое healwith?", kz: "healwith дегеніміз не?", zh: "healwith是什么？", ja: "healwithとは？" }, a: { ko: "healwith는 해외 암환자가 한국 전문의와 원격 화상 사전상담을 받고, 한국 방문 치료 및 사후관리까지 원스톱으로 지원받을 수 있는 ICT 플랫폼입니다.", en: "healwith is an ICT platform that enables international cancer patients to receive remote video pre-consultations with Korean specialists, with one-stop support from treatment to follow-up care.", ru: "healwith — это ИКТ-платформа для дистанционных видеоконсультаций с корейскими онкологами и комплексной поддержки от лечения до послеоперационного наблюдения.", kz: "healwith — кореялық мамандармен қашықтан бейне кеңес алуға арналған ICT платформасы.", zh: "healwith是帮助海外癌症患者与韩国专家进行远程视频预咨询的ICT平台，提供从治疗到术后管理的一站式支持。", ja: "healwithは海外がん患者が韓国の専門医とリモートビデオ事前相談を受け、治療からフォローアップまでワンストップで支援するICTプラットフォームです。" } },
    { q: { ko: "비용이 발생하나요?", en: "Is there any cost?", ru: "Это платно?", kz: "Ақылы ма?", zh: "需要费用吗？", ja: "費用はかかりますか？" }, a: { ko: "사전상담 접수와 전문의 상담 배정은 무료입니다. 실제 화상 상담 및 치료 비용은 별도이며, 상담 전 안내해드립니다.", en: "Intake submission and specialist consultation arrangement are free. Video consultation and treatment costs are separate and will be communicated beforehand.", ru: "Подача заявки и организация консультации специалиста бесплатны. Стоимость консультации и лечения сообщается заранее.", kz: "Өтінім беру және маман кеңесін ұйымдастыру тегін. Кеңес және ем құны алдын ала хабарланады.", zh: "提交资料和专家咨询安排是免费的。视频咨询和治疗费用另计，会提前告知。", ja: "インテーク提出と専門医相談の手配は無料です。ビデオ相談・治療費用は別途、事前にご案内します。" } },
  ],
  consultation: [
    { q: { ko: "상담은 어떻게 진행되나요?", en: "How does the consultation work?", ru: "Как проходит консультация?", kz: "Кеңес қалай жүргізіледі?", zh: "咨询如何进行？", ja: "相談はどのように進みますか？" }, a: { ko: "인테이크 양식을 제출하면 24시간 이내에 전문의 상담을 배정해드립니다. 이후 화상 통화로 AI 실시간 통역과 함께 상담이 진행됩니다.", en: "After submitting your intake form, we arrange a specialist consultation within 24 hours. The consultation is conducted via video call with AI real-time interpretation.", ru: "После подачи анкеты мы организуем консультацию специалиста в течение 24 часов. Консультация проходит по видеосвязи с ИИ-переводом.", kz: "Сауалнаманы жібергеннен кейін 24 сағат ішінде маман кеңесін ұйымдастырамыз. Кеңес AI аудармамен бейне байланыс арқылы жүргізіледі.", zh: "提交资料后24小时内为您安排专家咨询。咨询通过视频通话进行，配有AI实时翻译。", ja: "問診票提出後24時間以内に専門医相談を手配します。AI通訳付きビデオ通話で相談が行われます。" } },
    { q: { ko: "어떤 언어로 상담할 수 있나요?", en: "What languages are supported?", ru: "На каких языках?", kz: "Қандай тілдерде?", zh: "支持哪些语言？", ja: "対応言語は？" }, a: { ko: "한국어, 영어, 러시아어, 중국어, 일본어, 카자흐어 총 6개 언어를 AI 실시간 통역으로 지원합니다.", en: "We support 6 languages: Korean, English, Russian, Chinese, Japanese, and Kazakh with AI real-time interpretation.", ru: "Мы поддерживаем 6 языков: корейский, английский, русский, китайский, японский и казахский.", kz: "6 тілді қолдаймыз: корей, ағылшын, орыс, қытай, жапон және қазақ.", zh: "支持6种语言：韩语、英语、俄语、中文、日语、哈萨克语，配有AI实时翻译。", ja: "韓国語・英語・ロシア語・中国語・日本語・カザフ語の6言語をAI通訳で対応します。" } },
  ],
  cost: [
    { q: { ko: "한국 치료비는 얼마나 드나요?", en: "How much does treatment in Korea cost?", ru: "Сколько стоит лечение в Корее?", kz: "Кореядағы ем қанша тұрады?", zh: "韩国治疗费用是多少？", ja: "韓国の治療費はいくらですか？" }, a: { ko: "일반적으로 미국 대비 1/3 수준이며, 암종과 치료 방법에 따라 다릅니다. 사전상담 시 예상 비용을 안내해드립니다.", en: "Generally about 1/3 of US costs, varying by cancer type and treatment. Estimated costs are provided during pre-consultation.", ru: "Обычно около 1/3 стоимости в США. Точная стоимость зависит от типа рака и лечения.", kz: "АҚШ құнының шамамен 1/3. Нақты құн рак түрі мен емге байланысты.", zh: "通常约为美国费用的1/3，具体取决于癌症类型和治疗方案。预咨询时会提供预估费用。", ja: "一般的に米国の約1/3で、がん種と治療法により異なります。事前相談時に概算費用をご案内します。" } },
    { q: { ko: "비자는 어떻게 준비하나요?", en: "How do I prepare my visa?", ru: "Как подготовить визу?", kz: "Визаны қалай дайындауға болады?", zh: "如何准备签证？", ja: "ビザはどう準備しますか？" }, a: { ko: "단기 치료는 C-3-3(의료관광) 비자, 장기 치료는 G-1-10 비자가 필요합니다. healwith가 비자 유형 안내 및 필요 서류 체크리스트를 제공합니다.", en: "Short-term treatment requires a C-3-3 (medical tourism) visa, long-term requires G-1-10. healwith provides visa type guidance and document checklists.", ru: "Краткосрочное лечение — виза C-3-3, долгосрочное — G-1-10. healwith предоставляет рекомендации по визам.", kz: "Қысқа мерзімді ем — C-3-3 визасы, ұзақ мерзімді — G-1-10. healwith виза бойынша кеңес береді.", zh: "短期治疗需要C-3-3（医疗旅游）签证，长期治疗需要G-1-10签证。healwith提供签证类型指南和文件清单。", ja: "短期治療はC-3-3（医療観光）ビザ、長期はG-1-10ビザが必要です。healwithがビザ案内と必要書類チェックリストを提供します。" } },
  ],
};

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function HomeClient({ content } = {}) {
  const router = useRouter();
  const lang = useLang(); // 서버가 URL 언어로 렌더(SEO). 쿠키 직독 대신 LangContext.
  // 콘텐츠: 서버(page.jsx)가 DB 오버라이드를 병합해 넘겨준 값 → 없으면 기본값(HOME_CONTENT).
  const L = content || HOME_CONTENT;
  const [faqTab, setFaqTab] = useState("general");
  const [openFaq, setOpenFaq] = useState(null);
  const l = (obj) => obj?.[lang] || obj?.["en"] || "";

  return (
    <div className="min-h-screen bg-white">

      {/* ══════════════════════════════════════════
          HERO — 배경 이미지 + 오버레이
          ══════════════════════════════════════════ */}
      <section className="relative text-white overflow-hidden">
        {/* 📸 교체: 실제 병원/의료진 사진 (1920x1080 이상) */}
        <div className="absolute inset-0">
          <Image src={PLACEHOLDER.heroBg} alt="" fill priority fetchPriority="high" quality={55} sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-teal-900/90 to-slate-900/95" />
        </div>
        {/* Glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-700/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-24">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4 md:mb-6 whitespace-pre-line tracking-tight">
              {l(L.hero.title)}
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-slate-200 mb-6 md:mb-8 max-w-2xl mx-auto whitespace-pre-line leading-relaxed">
              {l(L.hero.subtitle)}
            </p>
            <button
              onClick={() => router.push("/inquiry")}
              className="group bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-base md:text-lg px-8 py-4 md:px-10 md:py-5 rounded-2xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all duration-200 inline-flex items-center gap-2 md:gap-3"
            >
              {l(L.hero.cta)}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-slate-400 text-xs md:text-sm mt-3">{l(L.hero.ctaSub)}</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS — Why Korea?
          ══════════════════════════════════════════ */}
      <section className="bg-white py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4">{l(L.stats.title)}</h2>
            <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">{l(L.stats.subtitle)}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {L.stats.items.map((item, i) => (
              <div key={i} className="text-center p-4 md:p-6 rounded-xl md:rounded-2xl bg-teal-50 border border-teal-100 hover:shadow-md transition-shadow duration-200">
                <div className="text-2xl sm:text-3xl md:text-5xl font-black text-teal-700 mb-1 md:mb-3 tabular-nums">{typeof item.value === 'string' ? item.value : l(item.value)}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-gray-500 font-medium whitespace-pre-line leading-snug md:leading-relaxed">{l(item.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DOCTORS — 협력 의료진
          📸 교체 방법: DOCTORS_DATA 배열에서 img, name, title, specialty 수정
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4">{l(L.doctors.title)}</h2>
            <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">{l(L.doctors.subtitle)}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {DOCTORS_DATA.map((doc, i) => (
              <div key={i} className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200 group">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={doc.img}
                    alt={l(doc.name)}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 md:p-5">
                  <h3 className="font-bold text-sm md:text-lg text-gray-900 leading-snug">{l(doc.name)}</h3>
                  <p className="text-teal-700 text-xs md:text-sm font-medium mt-0.5 md:mt-1 leading-snug">{l(doc.title)}</p>
                  <p className="text-gray-500 text-[10px] md:text-xs mt-0.5 md:mt-1 line-clamp-1">{l(doc.specialty)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-5 md:mt-8">
            <button
              onClick={() => router.push("/hospitals")}
              className="text-teal-700 font-semibold text-xs md:text-sm hover:text-teal-700 inline-flex items-center gap-1 transition"
            >
              {l(L.doctors.viewAll)} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SERVICES — What healwith Does
          ══════════════════════════════════════════ */}
      <section className="bg-white py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4">{l(L.services.title)}</h2>
            <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">{l(L.services.subtitle)}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
            {L.services.items.map((item, i) => {
              const Icon = ICON_MAP[item.icon];
              const colors = [
                { bg: "bg-teal-100", icon: "text-teal-700", border: "border-teal-200" },
                { bg: "bg-blue-100", icon: "text-blue-600", border: "border-blue-200" },
                { bg: "bg-emerald-100", icon: "text-emerald-700", border: "border-emerald-200" },
                { bg: "bg-purple-100", icon: "text-purple-600", border: "border-purple-200" },
              ][i];
              return (
                <div key={i} className={`bg-white rounded-xl md:rounded-2xl p-5 md:p-7 border ${colors.border} hover:shadow-lg transition-shadow duration-300`}>
                  <div className={`w-10 h-10 md:w-12 md:h-12 ${colors.bg} rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-5`}>
                    <Icon size={20} className={`${colors.icon} md:hidden`} />
                    <Icon size={24} className={`${colors.icon} hidden md:block`} />
                  </div>
                  <h3 className="font-bold text-base md:text-xl mb-2 md:mb-3 text-gray-900">{l(item.title)}</h3>
                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{l(item.desc)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROCESS — How It Works
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-center text-gray-900 mb-8 md:mb-12">{l(L.process.title)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {L.process.steps.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+28px)] w-[calc(100%-56px)] h-0.5 bg-gradient-to-r from-teal-300 to-teal-100" />
                )}
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-sm md:text-lg mb-2 md:mb-4 shrink-0 relative z-10 shadow-lg shadow-teal-500/20">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-bold text-xs md:text-lg text-gray-900 mb-0.5 md:mb-1">{l(step.title)}</h3>
                  <p className="text-gray-500 text-[10px] md:text-sm leading-snug">{l(step.desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CANCER TYPES
          ══════════════════════════════════════════ */}
      <section className="bg-white py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-center text-gray-900 mb-8 md:mb-12">{l(L.cancers.title)}</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
            {L.cancers.items.map((c, i) => (
              <div key={i} role="button" tabIndex={0} onClick={() => router.push("/treatments")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push("/treatments"); } }} className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5 text-center cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-100 group focus:outline-none focus:ring-2 focus:ring-teal-400">
                <div className="mb-1 md:mb-3 flex justify-center text-teal-600">
                  <OrganIcon name={c.organ} className="w-7 h-7 md:w-10 md:h-10" />
                </div>
                <div className="font-bold text-xs md:text-sm text-gray-800 mb-0.5 md:mb-1">{l(c.label)}</div>
                <div className="text-[9px] md:text-[11px] text-teal-700 font-semibold leading-tight">{l(c.stat)}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-5 md:mt-8">
            <button onClick={() => router.push("/treatments")} className="text-teal-700 font-semibold text-xs md:text-sm hover:text-teal-700 inline-flex items-center gap-1 transition">
              {l(L.misc.viewTreatments)} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PARTNER HOSPITALS
          📸 교체 방법: PARTNERS_DATA 배열에서 img, name, desc 수정
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4">{l(L.partners.title)}</h2>
            <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">{l(L.partners.subtitle)}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-5">
            {PARTNERS_DATA.map((h, i) => {
              const isPartner = h.badge === "partner";
              const badgeClass = isPartner
                ? "bg-teal-50 text-teal-700"
                : "bg-blue-50 text-blue-700";
              const badgeLabel = isPartner ? l(L.misc.badgePartner) : l(L.misc.badgeUniversity);
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/hospitals/${h.slug}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/hospitals/${h.slug}`); } }}
                  className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <div className="relative h-24 sm:h-32 md:h-40 overflow-hidden bg-gray-100">
                    {/* next/image: 로컬 병원 사진을 webp/avif·디바이스 크기로 자동 최적화 + 기본 lazy.
                        (각 원본 JPEG 180~456KB → 모바일 수십 KB) onError는 사진 없을 때 안전망. */}
                    <Image
                      src={h.img.split("?")[0]}
                      alt={l(h.name)}
                      fill
                      sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                      onError={(e) => { if (e.currentTarget.src.includes("_coming-soon")) return; e.currentTarget.onerror = null; e.currentTarget.src = "/images/hospitals/_coming-soon.svg?v=3"; }}
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2.5 md:p-4">
                    <div className={`inline-block text-[9px] md:text-[10px] font-semibold px-1.5 md:px-2 py-0.5 rounded-full mb-1 md:mb-2 ${badgeClass}`}>
                      {badgeLabel}
                    </div>
                    <h3 className="font-bold text-xs md:text-sm text-gray-900 mb-0.5 md:mb-1 group-hover:text-teal-700 transition-colors leading-snug">{l(h.name)}</h3>
                    <p className="text-gray-500 text-[10px] md:text-[11px] leading-snug md:leading-relaxed line-clamp-2 hidden sm:block">{l(h.desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SOCIAL PROOF — 실제·검증 가능한 평가 (가짜 후기 금지)
          ══════════════════════════════════════════ */}
      <SocialProofSection />

      {/* ══════════════════════════════════════════
          FAQ — 탭 + 아코디언
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-10 md:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-center text-gray-900 mb-6 md:mb-10">{l(L.faq.title)}</h2>

          {/* Tabs */}
          <div className="flex justify-center gap-1.5 md:gap-2 mb-6 md:mb-8">
            {Object.entries(L.faq.tabs).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setFaqTab(key); setOpenFaq(null); }}
                className={`px-3 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all ${
                  faqTab === key
                    ? "bg-teal-700 text-white shadow-lg shadow-teal-500/20"
                    : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {l(label)}
              </button>
            ))}
          </div>

          {/* Accordion */}
          <div className="space-y-2 md:space-y-3">
            {FAQ_DATA[faqTab]?.map((item, i) => {
              const isOpen = openFaq === `${faqTab}-${i}`;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : `${faqTab}-${i}`)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-gray-50 transition"
                  >
                    <span className="font-semibold text-gray-800 text-xs md:text-sm pr-4">{l(item.q)}</span>
                    <ChevronDown size={18} className={`text-gray-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="px-4 md:px-5 pb-4 md:pb-5 text-gray-500 text-xs md:text-sm leading-relaxed">{l(item.a)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          EMERGENCY CTA — 즉시 상담
          ══════════════════════════════════════════ */}
      <section className="bg-white py-10 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 rounded-xl md:rounded-2xl p-5 md:p-10 border border-red-100">
            <div className="text-center">
              <h2 className="text-xl md:text-3xl font-extrabold text-gray-900 mb-2 md:mb-3">{l(L.emergency.title)}</h2>
              <p className="text-gray-500 text-sm md:text-base mb-5 md:mb-8">{l(L.emergency.subtitle)}</p>
              <div className="flex flex-col sm:flex-row justify-center gap-2 md:gap-4">
                <a href="mailto:admin@healwith.co.kr" className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-gray-700 text-sm md:text-base font-medium hover:border-teal-300 hover:shadow-md transition-all">
                  <Mail size={16} className="text-teal-700" />
                  admin@healwith.co.kr
                </a>
                <button
                  onClick={() => router.push("/inquiry")}
                  className="inline-flex items-center justify-center gap-2 bg-teal-700 text-white rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base font-medium hover:bg-teal-800 transition-colors shadow-lg shadow-teal-600/20"
                >
                  <MessageCircle size={16} />
                  {l(L.misc.onlineInquiry)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TRUST BADGES (compact)
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-8 md:py-14">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            {L.trust?.items?.map((item, i) => {
              const Icon = ICON_MAP[item.icon];
              return (
                <div key={i} className="flex items-start gap-3 md:gap-4 bg-white rounded-xl p-4 md:p-6 border border-gray-100">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-50 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base text-gray-900 mb-0.5 md:mb-1">{l(item.title)}</h3>
                    <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{l(item.desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BOTTOM CTA
          ══════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 text-white py-14 md:py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-teal-700/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] md:w-[300px] md:h-[300px] bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-4 md:mb-6">{l(L.bottomCta.title)}</h2>
          <p className="text-slate-200 text-sm md:text-base mb-6 md:mb-10 whitespace-pre-line leading-relaxed">{l(L.bottomCta.desc)}</p>
          <button
            onClick={() => router.push("/inquiry")}
            className="group bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-base md:text-lg px-8 py-4 md:px-10 md:py-5 rounded-2xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all duration-200 inline-flex items-center gap-2 md:gap-3"
          >
            {l(L.hero.cta)}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mt-6 md:mt-10 text-xs md:text-sm text-slate-400">
            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-teal-400" />{l(L.bottomCta.free)}</span>
            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-teal-400" />{l(L.bottomCta.fast)}</span>
            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-teal-400" />{l(L.bottomCta.noObligation)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   📋 사진 교체 가이드 (병원에 전달용)

   1. 의사 프로필 사진 (4장)
      - 크기: 400x400px 이상, 정사각형
      - 배경: 깔끔한 단색 또는 병원 배경
      - 복장: 가운 착용 권장
      → DOCTORS_DATA[i].img 를 실제 URL로 교체

   2. 병원 사진 (2장)
      - 크기: 800x500px 이상
      - 내용: 건물 외관 또는 로비/진료실
      → PARTNERS_DATA[i].img 를 실제 URL로 교체

   3. 히어로 배경 (1장)
      - 크기: 1920x1080px 이상
      - 내용: 병원 내부 또는 의료진 단체사진
      → PLACEHOLDER.heroBg 를 실제 URL로 교체

   4. 병원 로고 (선택)
      - PNG 투명 배경, 200x80px 이상
      → 별도 로고 섹션 추가 가능
   ═══════════════════════════════════════════════════════ */
