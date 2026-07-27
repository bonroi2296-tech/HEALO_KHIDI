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
  UserCheck,
  HeartHandshake,
} from "lucide-react";
import SocialProofSection from "@/components/SocialProofSection";

// 이용 절차 4단계 아이콘 (2026-07-24 PO 확정 C안: 아이콘 + STEP 번호 — 옛 그라데이션 번호배지 대체)
const STEP_ICONS = [FileText, UserCheck, Video, HeartHandshake];

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
// 문구(이름·직함·전문분야)는 HOME_CONTENT.doctors.items — 코디 콘텐츠 편집기에서 수정.
// 여기엔 사진 등 비문구 메타만 (HOME_CONTENT.doctors.items 와 순서 일치 필수).
const DOCTORS_META = [
  { img: "/immune/doctor/gangeo-dr-hwang-ijun.png" },
  { img: "/immune/doctor/sinchon-dr-yoo-hyeongjin.png" },
  { img: "/immune/doctor/gwangmyeong-dr-bae-giljun.png" },
  { img: "/immune/doctor/seongdong-dr-kang-juan.png" },
];

// 📸 교체 대상: 병원 로고 이미지 — 실제 로고 URL로 교체
// 문구(병원명·설명)는 HOME_CONTENT.partners.items — 코디 콘텐츠 편집기에서 수정.
// 여기엔 slug·배지·이미지 등 비문구 메타만 (HOME_CONTENT.partners.items 와 순서 일치 필수).
const PARTNERS_META = [
  { slug: "immunehospital-magok", badge: "partner", img: "/images/hospitals/immunehospital-magok/1.jpg?v=3" },
  { slug: "immunehospital-sinchon", badge: "partner", img: "/images/hospitals/immunehospital-sinchon/1.jpg?v=3" },
  { slug: "immunehospital-gwangmyeong", badge: "partner", img: "/images/hospitals/immunehospital-gwangmyeong/1.jpg?v=3" },
  { slug: "immunehospital-seongdong", badge: "partner", img: "/images/hospitals/immunehospital-seongdong/1.jpg?v=3" },
  { slug: "ewha-seoul", badge: "university", img: "/images/hospitals/ewha-seoul/1.jpg?v=3" },
  { slug: "ewha-mokdong", badge: "university", img: "/images/hospitals/ewha-mokdong/1.jpg?v=3" },
  { slug: "korea-guro", badge: "university", img: "/images/hospitals/korea-guro/1.jpg?v=3" },
  { slug: "severance-sinchon", badge: "university", img: "/images/hospitals/severance-sinchon/1.jpg?v=3" },
];

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
            <p className="text-slate-400 text-xs md:text-sm mt-3 whitespace-pre-line">{l(L.hero.ctaSub)}</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS — Why Korea?
          ══════════════════════════════════════════ */}
      <section className="bg-white py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4 whitespace-pre-line">{l(L.stats.title)}</h2>
            <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto whitespace-pre-line">{l(L.stats.subtitle)}</p>
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
          📸 사진 교체: DOCTORS_META 배열. 문구(이름·직함·전문분야)는 코디 콘텐츠 편집기에서
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4 whitespace-pre-line">{l(L.doctors.title)}</h2>
            <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto whitespace-pre-line">{l(L.doctors.subtitle)}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {(L.doctors.items || []).map((doc, i) => (
              <div key={i} className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200 group">
                {/* next/image 필수 — 원본 PNG 는 592px·290KB 인데 화면엔 180px 로 나온다.
                    날 <img> 로 두면 4장에 960KB(홈 전송량의 1/3). next/image 가 webp·크기맞춤
                    으로 장당 ~10KB 까지 줄인다 (2026-07-27 PageSpeed 실측). */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <Image
                    src={DOCTORS_META[i]?.img}
                    alt={l(doc.name)}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
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
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4 whitespace-pre-line">{l(L.services.title)}</h2>
            <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto whitespace-pre-line">{l(L.services.subtitle)}</p>
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
                  <h3 className="font-bold text-base md:text-xl mb-2 md:mb-3 text-gray-900 whitespace-pre-line">{l(item.title)}</h3>
                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed whitespace-pre-line">{l(item.desc)}</p>
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
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-center text-gray-900 mb-8 md:mb-12 whitespace-pre-line">{l(L.process.title)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {L.process.steps.map((step, i) => {
              const StepIcon = STEP_ICONS[i] || FileText;
              return (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center mb-2 md:mb-3 shrink-0">
                    <StepIcon size={22} />
                  </div>
                  <div>
                    <div className="text-[10px] md:text-[11px] font-semibold tracking-wide text-teal-700 mb-0.5">STEP {i + 1}</div>
                    <h3 className="font-bold text-xs md:text-lg text-gray-900 mb-0.5 md:mb-1 whitespace-pre-line">{l(step.title)}</h3>
                    <p className="text-gray-500 text-[10px] md:text-sm leading-snug whitespace-pre-line">{l(step.desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CANCER TYPES
          ══════════════════════════════════════════ */}
      <section className="bg-white py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-center text-gray-900 mb-8 md:mb-12 whitespace-pre-line">{l(L.cancers.title)}</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
            {L.cancers.items.map((c, i) => (
              <div key={i} role="button" tabIndex={0} onClick={() => router.push("/treatments")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push("/treatments"); } }} className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5 text-center cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-100 group focus:outline-none focus:ring-2 focus:ring-teal-400">
                <div className="mb-1 md:mb-3 flex justify-center text-teal-600">
                  <OrganIcon name={c.organ} className="w-7 h-7 md:w-10 md:h-10" />
                </div>
                <div className="font-bold text-xs md:text-sm text-gray-800 mb-0.5 md:mb-1 whitespace-pre-line">{l(c.label)}</div>
                <div className="text-[9px] md:text-[11px] text-teal-700 font-semibold leading-tight whitespace-pre-line">{l(c.stat)}</div>
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
          📸 사진 교체: PARTNERS_META 배열. 문구(병원명·설명)는 코디 콘텐츠 편집기에서
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 md:mb-4 whitespace-pre-line">{l(L.partners.title)}</h2>
            <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto whitespace-pre-line">{l(L.partners.subtitle)}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-5">
            {(L.partners.items || []).map((h, i) => {
              const meta = PARTNERS_META[i] || {};
              const isPartner = meta.badge === "partner";
              const badgeClass = isPartner
                ? "bg-teal-50 text-teal-700"
                : "bg-blue-50 text-blue-700";
              const badgeLabel = isPartner ? l(L.misc.badgePartner) : l(L.misc.badgeUniversity);
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/hospitals/${meta.slug}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/hospitals/${meta.slug}`); } }}
                  className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <div className="relative h-24 sm:h-32 md:h-40 overflow-hidden bg-gray-100">
                    {/* next/image: 로컬 병원 사진을 webp/avif·디바이스 크기로 자동 최적화 + 기본 lazy.
                        (각 원본 JPEG 180~456KB → 모바일 수십 KB) onError는 사진 없을 때 안전망. */}
                    <Image
                      src={(meta.img || "").split("?")[0]}
                      alt={l(h.name)}
                      fill
                      // 모바일에선 높이 96px 짜리 썸네일이라 기본 화질(75)은 과하다 — 육안 차이 없이
                      // 장당 수십 KB 절감 (2026-07-27 PageSpeed: 이 카드 한 장이 40KB 였음).
                      quality={60}
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
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-center text-gray-900 mb-6 md:mb-10 whitespace-pre-line">{l(L.faq.title)}</h2>

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
            {(L.faq[faqTab] || []).map((item, i) => {
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
              <h2 className="text-xl md:text-3xl font-extrabold text-gray-900 mb-2 md:mb-3 whitespace-pre-line">{l(L.emergency.title)}</h2>
              <p className="text-gray-500 text-sm md:text-base mb-5 md:mb-8 whitespace-pre-line">{l(L.emergency.subtitle)}</p>
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
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-4 md:mb-6 whitespace-pre-line">{l(L.bottomCta.title)}</h2>
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
      → DOCTORS_META[i].img 를 실제 URL로 교체

   2. 병원 사진 (2장)
      - 크기: 800x500px 이상
      - 내용: 건물 외관 또는 로비/진료실
      → PARTNERS_META[i].img 를 실제 URL로 교체

   3. 히어로 배경 (1장)
      - 크기: 1920x1080px 이상
      - 내용: 병원 내부 또는 의료진 단체사진
      → PLACEHOLDER.heroBg 를 실제 URL로 교체

   4. 병원 로고 (선택)
      - PNG 투명 배경, 200x80px 이상
      → 별도 로고 섹션 추가 가능
   ═══════════════════════════════════════════════════════ */
