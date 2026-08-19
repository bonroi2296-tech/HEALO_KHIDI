'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, MapPin, Users, Shield, Leaf,
  ArrowRight, Award, Heart, CheckCircle2, Clock,
  ChevronRight, Stethoscope, ChevronDown,
  Phone, GraduationCap, Briefcase, BookOpen, Activity,
  X,
} from 'lucide-react';
import OrganIcon from '../_components/OrganIcon';

// 의사 사진은 public/doctors/ 에 자체 호스팅(핫링크 금지 — 원본 immunehospital.com이 파일명 변경/삭제하면 깨졌었음).
// 새 의사 추가 시: scripts/fetch-doctor-photos.mjs 로 사진을 받아 public/doctors/ 에 넣고 로컬 경로로 참조.
// 그래도 깨지면(파일 누락 등) 회색 아바타로 대체해 깨진 이미지 아이콘이 노출되지 않게.
const DOCTOR_FALLBACK = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#eef2f5"/><circle cx="80" cy="60" r="28" fill="#b6c2cc"/><rect x="34" y="98" width="92" height="70" rx="34" fill="#b6c2cc"/></svg>'
);
const onImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = DOCTOR_FALLBACK; };

import { getLangCodeFromCookie, t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';
import { localeHref } from '@/lib/i18n/config';
import { supabaseClient } from '@/lib/data/supabaseClient';
import { mapHospitalRow } from '@/lib/mapper';
import { DOCTOR_PHRASES } from '@/lib/content/doctorPhrases';
import { IMMUNE_DOCTOR_ROSTER as DOCTORS } from '@/lib/data/immuneDoctors';

/* ───────────────── i18n Labels ─────────────────
   화면 문구는 중앙 사전(src/lib/i18n)의 "hospitalsPage.*" 키로 이전됨 — t(key, lang)로 조회. */
const ICON_MAP = { Shield, Heart, Leaf };
const STRENGTH_ICONS = ['Shield', 'Heart', 'Leaf']; // hospitalsPage.strengths.item{N}Title/Desc 와 순서 일치


/* 의료진 28명(4개 지점) — 단일 원본은 src/lib/data/immuneDoctors.js.
   여기에 다시 베껴 두지 마라(사본이 갈라지면 한쪽만 고쳐진다 — 2026-08-18 실측). */

/* ───────────────── Branch Config ─────────────────
   지점명·주소 문구는 hospitalsPage.branch.<id>.name/.addr 키로 이전. id/status/tel은 로직·비표시 값이라 유지. */
const BRANCH_CONFIG = [
  { id: 'gangseo', status: 'registered', tel: '02-2039-8510' },
  { id: 'sinchon', status: 'registered', tel: '02-393-8510' },
  { id: 'gwangmyeong', status: 'registered', tel: '02-898-8510' },
  { id: 'seongdong', status: 'registered', tel: '02-2295-8510' },
];

// 암종 가이드: 표시 문구는 hospitalsPage.cancerGuide.<organ>.type/.approach 키로 이전. organ은 아이콘 식별자라 유지.
const CANCER_ORGANS = ['stomach', 'breast', 'liver', 'lung', 'thyroid', 'colon'];

/* ───────────────── Sub-components ───────────────── */

function StatusBadge({ status, lang }) {
  const cfg = {
    registered: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle2 size={14} /> },
    preparing:  { bg: 'bg-amber-100',   text: 'text-amber-800',   icon: <Clock size={14} /> },
    upcoming:   { bg: 'bg-gray-100',     text: 'text-gray-600',    icon: <Clock size={14} /> },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${c.bg} ${c.text} text-sm font-bold rounded-full`}>
      {c.icon} {t(`hospitalsPage.status.${status}`, lang)}
    </span>
  );
}

/* 세부 이력 문구 1개를 해당 언어로. DOCTORS 는 ko/en 만 들고 있고
   ru·kz·zh·ja 는 문구 사전(doctorPhrases)에서 찾는다. 사전에 없으면 영어 그대로. */
const tp = (s, lang) => (typeof s === 'string' && DOCTOR_PHRASES[s]?.[lang]) || s;

/* Helper: get localized array data (supports both plain arrays and {ko,en,...} objects) */
const la = (obj, lang) => {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (obj[lang]) return obj[lang];
  return (obj.en || obj.ko || []).map((s) => tp(s, lang));
};

/* ── Doctor Profile Modal (Large) ── */
function DoctorModal({ doc, l, lang, onClose }) {
  if (!doc) return null;
  const sections = [
    { key: '경력', icon: <Briefcase size={16} />, label: t('hospitalsPage.section.career', lang), data: la(doc.경력, lang) },
    { key: '학력', icon: <GraduationCap size={16} />, label: t('hospitalsPage.section.education', lang), data: la(doc.학력, lang) },
    { key: '활동', icon: <Activity size={16} />, label: t('hospitalsPage.section.activities', lang), data: la(doc.활동, lang) },
    { key: '논문', icon: <BookOpen size={16} />, label: t('hospitalsPage.section.publications', lang), data: la(doc.논문, lang) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-emerald-700 rounded-t-2xl p-8 text-white">
          <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition focus:outline-none focus:ring-2 focus:ring-teal-400">
            <X size={20} />
          </button>
          <div className="flex items-center gap-6">
            <img src={doc.photo} alt={l(doc.name)} onError={onImgError} className="w-32 h-32 rounded-2xl object-cover border-4 border-white/30 shadow-lg bg-white/10" />
            <div>
              <h3 className="text-2xl font-extrabold">{l(doc.name)}</h3>
              <p className="text-emerald-200 text-base font-semibold mt-1">{l(doc.position)}</p>
              {doc.subspecialty && <p className="text-white/70 text-sm mt-1">{l(doc.subspecialty)}</p>}
            </div>
          </div>
          {la(doc.keywords, lang).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {la(doc.keywords, lang).map((kw, i) => (
                <span key={i} className="px-2.5 py-1 bg-white/15 text-white/90 text-xs rounded-full">{kw}</span>
              ))}
            </div>
          )}
        </div>
        {/* Content */}
        <div className="p-8 space-y-6">
          {sections.map(sec => {
            if (!sec.data || sec.data.length === 0) return null;
            return (
              <div key={sec.key}>
                <h4 className="flex items-center gap-2 text-base font-bold text-gray-700 mb-3">
                  <span className="text-emerald-700">{sec.icon}</span>{sec.label}
                </h4>
                <ul className="space-y-1.5">
                  {sec.data.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-emerald-400 before:rounded-full">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Doctor Card (Large PC / Compact Mobile) ── */
function DoctorCard({ doc, l, lang, onSelect }) {
  const isLeader = !!doc.role;
  const roleBadge = doc.role === 'ceo' ? { label: 'CEO', color: 'bg-emerald-700 text-white' }
    : doc.role === 'wm' ? { label: 'WM', color: 'bg-blue-600 text-white' }
    : doc.role === 'cmo' ? { label: 'CMO', color: 'bg-purple-600 text-white' }
    : null;

  // 대표들은 경력 첫줄, 일반은 학력 첫줄 미리보기
  const career = la(doc.경력, lang);
  const edu = la(doc.학력, lang);
  const previewLines = [];
  if (career.length) previewLines.push(...career.slice(0, 2));
  if (edu.length && previewLines.length < 2) previewLines.push(...edu.slice(0, 2 - previewLines.length));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(doc)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(doc); } }}
      className={`bg-white rounded-2xl border cursor-pointer hover:shadow-md transition-all duration-200 group overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-400 ${
        isLeader ? 'border-emerald-200 ring-1 ring-emerald-50' : 'border-gray-200'
      }`}
    >
      {/* PC: horizontal layout / Mobile: compact */}
      <div className="flex flex-col sm:flex-row">
        {/* Photo — big on PC */}
        <div className="sm:w-40 lg:w-48 shrink-0">
          <img
            src={doc.thumb}
            alt={l(doc.name)}
            onError={onImgError}
            loading="lazy"
            className="w-full h-48 sm:h-full object-cover object-top bg-gray-100 group-hover:scale-[1.02] transition"
          />
        </div>

        {/* Info */}
        {/* min-w-0 필수: 자식 truncate(nowrap) 줄이 flex 아이템의 최소폭을 밀어올려 카드 밖으로 넘침 → overflow-hidden에 잘림 (반성문 #89) */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-extrabold text-lg">{l(doc.name)}</h4>
            {roleBadge && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${roleBadge.color}`}>{roleBadge.label}</span>
            )}
            {/* 전문의 검증 칩 — 실제 '전문의' 자격이 데이터에 있을 때만(전부 도배 금지·과장 금지) */}
            {doc.subspecialty?.ko?.includes("전문의") && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                <CheckCircle2 size={11} /> {t('hospitalsPage.specialist', lang)}
              </span>
            )}
          </div>
          <p className="text-emerald-700 font-semibold text-sm">{l(doc.position)}</p>
          {doc.subspecialty && (
            <p className="text-gray-500 text-xs mt-0.5">{l(doc.subspecialty)}</p>
          )}

          {/* Keywords */}
          {la(doc.keywords, lang).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {la(doc.keywords, lang).slice(0, 5).map((kw, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[11px] rounded-full">{kw}</span>
              ))}
            </div>
          )}

          {/* Preview lines */}
          {previewLines.length > 0 && (
            <div className="mt-3 space-y-0.5 hidden sm:block">
              {previewLines.map((line, i) => (
                <p key={i} className="text-xs text-gray-500 truncate">{line}</p>
              ))}
            </div>
          )}

          {/* Footer stats */}
          <div className="flex items-center gap-4 mt-auto pt-3 text-xs text-gray-300">
            {la(doc.논문, lang).length > 0 && (
              <span className="flex items-center gap-1 text-gray-500"><BookOpen size={11} /> {la(doc.논문, lang).length}</span>
            )}
            {career.length > 0 && (
              <span className="flex items-center gap-1 text-gray-500"><Briefcase size={11} /> {career.length}</span>
            )}
            {la(doc.활동, lang).length > 0 && (
              <span className="flex items-center gap-1 text-gray-500"><Activity size={11} /> {la(doc.활동, lang).length}</span>
            )}
            <span className="ml-auto text-emerald-700 font-semibold group-hover:text-emerald-700 transition text-xs">
              {t('hospitalsPage.viewProfile', lang)} →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Main Component ───────────────── */
export default function HospitalsClient() {
  const router = useRouter();
  const lang = useLang(); // 서버가 URL 언어로 렌더(SEO). 쿠키 직독 대신 LangContext.
  const [partnerHospitals, setPartnerHospitals] = useState([]);
  const [expandedBranch, setExpandedBranch] = useState('gangseo');
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // 이름(name)·직위(position)는 사전에 없어 영어 그대로 나가고(영어 통일 — PO 결정 2026-07-27),
  // 세부전공(subspecialty)처럼 사전에 있는 문구만 해당 언어로 바뀐다.
  const l = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || tp(obj['en'], lang) || '';
  };

  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabaseClient
        .from('hospitals')
        .select('*')
        .eq('is_published', true)
        .not('slug', 'like', 'immunehospital%')
        .order('display_order', { ascending: true, nullsFirst: false })
        .limit(6);
      if (data) {
        const langCode = getLangCodeFromCookie();
        setPartnerHospitals(data.map(r => mapHospitalRow(r, langCode)).filter(Boolean));
      }
    };
    fetchPartners();
  }, []);

  const branchRefs = useRef({});
  const toggleBranch = (id) => {
    const willOpen = expandedBranch !== id;
    setExpandedBranch(willOpen ? id : null);
    if (!willOpen) return;
    // 밀림 방지: 클릭한 지점 헤더를 고정헤더 바로 아래(상단)에 붙이고, 위 지점이 접히는 애니(200ms)
    // 동안 매 프레임 위치를 다시 잡는다. 예전엔 스크롤을 애니 '전' 한 번만 해서, 위 지점이 뒤늦게
    // 접히며 화면이 튀어 방금 연 지점이 화면 밖으로 사라졌다(rAF 1회 → 프레임별 pin 으로 교체).
    const GAP = 80; // 고정헤더(h-14/16=56~64px) 아래 여백 (scroll-mt-20 과 동일)
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
    const start = now();
    const pin = () => {
      const el = branchRefs.current[id];
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (Math.abs(top - GAP) > 1) window.scrollBy(0, top - GAP);
      if (!reduce && now() - start < 280) requestAnimationFrame(pin);
    };
    requestAnimationFrame(pin);
  };
  const branchDoctors = (branchId) => DOCTORS.filter(d => d.branch === branchId);

  return (
    <div className="min-h-screen bg-white">
      {selectedDoctor && <DoctorModal doc={selectedDoctor} l={l} lang={lang} onClose={() => setSelectedDoctor(null)} />}

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-emerald-800 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            <Award size={16} /> {t('hospitalsPage.consortium.badge', lang)}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">{t('hospitalsPage.consortium.name', lang)}</h1>
          <p className="text-emerald-200 text-xl font-medium mb-4">{t('hospitalsPage.consortium.role', lang)}</p>
          <p className="text-white/80 text-base md:text-lg max-w-3xl leading-relaxed mb-10">{t('hospitalsPage.consortium.desc', lang)}</p>

          <div className="flex flex-wrap gap-3 mb-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-base">
              <span className="text-white font-bold text-xl tabular-nums">4</span>
              <span className="text-emerald-200 ml-2">{t('hospitalsPage.heroBranches', lang)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-base">
              <span className="text-white font-bold text-xl tabular-nums">28</span>
              <span className="text-emerald-200 ml-2">{t('hospitalsPage.heroDoctors', lang)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-base inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-300" />
              <span className="text-emerald-200">{t('hospitalsPage.heroRegistered', lang)}</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/intake')}
            className="bg-white text-emerald-800 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2 text-lg"
          >
            {t('hospitalsPage.cta', lang)} <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── Branch Network + Doctors ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('hospitalsPage.branches', lang)}</h2>
        <p className="text-gray-500 text-base mb-6">{t('hospitalsPage.branchesDesc', lang)}</p>
        {/* 면력 대표 페이지 입구. 이게 없어서 /hospitals/immune 이 목록에서 도달 불가한
            고아였다(2026-07-22 실측: 목록·홈에서 링크 0). 목록 → 대표 페이지 동선을 만든다. */}
        <Link
          href="/hospitals/immune"
          className="touch-link inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 mb-8"
        >
          {t('hospitalsPage.immuneOverview', lang)} <ArrowRight size={15} />
        </Link>

        <div className="space-y-5">
          {BRANCH_CONFIG.map(branch => {
            const docs = branchDoctors(branch.id);
            const isOpen = expandedBranch === branch.id;
            const isUpcoming = branch.status === 'upcoming';

            return (
              <div key={branch.id} data-testid="hospital-card" ref={el => { branchRefs.current[branch.id] = el; }} className={`scroll-mt-20 border-2 rounded-2xl overflow-hidden transition-all duration-200 ${
                branch.status === 'registered' ? 'border-emerald-200' :
                branch.status === 'preparing' ? 'border-amber-200' : 'border-gray-200'
              } ${isOpen ? 'shadow-xl' : 'hover:shadow-md'}`}>
                {/* Branch header */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  className={`p-6 md:p-8 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-teal-400 ${isOpen ? 'bg-gray-50/50' : 'hover:bg-gray-50/30'}`}
                  onClick={() => !isUpcoming && docs.length > 0 && toggleBranch(branch.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!isUpcoming && docs.length > 0) toggleBranch(branch.id); } }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        branch.status === 'registered' ? 'bg-emerald-100' :
                        branch.status === 'preparing' ? 'bg-amber-50' : 'bg-gray-100'
                      }`}>
                        <Building2 size={28} className={
                          branch.status === 'registered' ? 'text-emerald-700' :
                          branch.status === 'preparing' ? 'text-amber-600' : 'text-gray-400'
                        } />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl md:text-2xl">{t(`hospitalsPage.branch.${branch.id}.name`, lang)}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin size={14} /> {t(`hospitalsPage.branch.${branch.id}.addr`, lang)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {docs.length > 0 && (
                        <span className="text-sm text-gray-500 flex items-center gap-1 hidden sm:flex">
                          <Users size={16} /> {docs.length}{t('hospitalsPage.doctorsLabel', lang)}
                        </span>
                      )}
                      {branch.tel && (
                        <span className="text-sm text-gray-500 hidden md:flex items-center gap-1">
                          <Phone size={14} /> {branch.tel}
                        </span>
                      )}
                      {docs.length > 0 && (
                        <ChevronDown size={24} className={`text-gray-400 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <StatusBadge status={branch.status} lang={lang} />
                  </div>
                </div>

                {/* Expanded: Doctor grid — grid-rows 0fr→1fr 로 높이를 부드럽게 펼침(즉시 나타나 아래를 밀어내던 '툭' 끊김 제거). 네이티브 CSS, 라이브러리 없음. */}
                {docs.length > 0 && (
                  <div inert={!isOpen ? true : undefined} className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className={`border-t-2 border-gray-100 bg-gray-50/30 px-4 sm:px-6 md:px-8 py-6 md:py-8 transition-all duration-200 motion-reduce:transition-none ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                          {docs.map(doc => (
                            <DoctorCard key={doc.id} doc={doc} l={l} lang={lang} onSelect={setSelectedDoctor} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Strengths ── */}
      <section className="bg-emerald-50 py-14">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">{t('hospitalsPage.strengths.title', lang)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STRENGTH_ICONS.map((iconName, i) => {
              const Icon = ICON_MAP[iconName];
              return (
                <div key={i} className="bg-white rounded-2xl p-8 border border-emerald-100">
                  <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-5">
                    <Icon size={28} className="text-emerald-700" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{t(`hospitalsPage.strengths.item${i + 1}Title`, lang)}</h3>
                  <p className="text-base text-gray-500 leading-relaxed">{t(`hospitalsPage.strengths.item${i + 1}Desc`, lang)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Partner Hospitals ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('hospitalsPage.partnerHospitals.title', lang)}</h2>
        <p className="text-gray-500 text-base mb-8">{t('hospitalsPage.partnerHospitals.desc', lang)}</p>
        {partnerHospitals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {partnerHospitals.map(h => (
              <Link key={h.id} href={localeHref(`/hospitals/${h.slug || h.id}`, lang)} data-testid="hospital-card" className="block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-teal-300 transition cursor-pointer group focus:outline-none focus:ring-2 focus:ring-teal-400">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                    <Stethoscope size={24} className="text-teal-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base group-hover:text-teal-700 transition line-clamp-1">{h.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={12} /><span className="truncate">{h.location}</span></p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{h.description}</p>
                {h.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {h.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-teal-700 font-medium">
                  {t('hospitalsPage.viewDetails', lang)} <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t('hospitalsPage.comingSoon', lang)}</p>
          </div>
        )}
      </section>

      {/* ── Cancer Type Guide ── */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('hospitalsPage.cancerCare.title', lang)}</h2>
          <p className="text-gray-500 text-base mb-8">{t('hospitalsPage.cancerCare.desc', lang)}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CANCER_ORGANS.map((organ, i) => (
              <div key={i} role="button" tabIndex={0} onClick={() => router.push('/inquiry')} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push('/inquiry'); } }} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-teal-200 transition cursor-pointer group focus:outline-none focus:ring-2 focus:ring-teal-400">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-teal-600"><OrganIcon name={organ} className="w-9 h-9" /></span>
                  <h3 className="font-bold text-lg group-hover:text-teal-700 transition">{t(`hospitalsPage.cancerGuide.${organ}.type`, lang)}</h3>
                </div>
                <p className="text-base text-gray-500 leading-relaxed">{t(`hospitalsPage.cancerGuide.${organ}.approach`, lang)}</p>
                <div className="flex items-center gap-1 mt-4 text-sm text-teal-700 font-medium">
                  {t('hospitalsPage.cta', lang)} <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-10 md:p-16 text-center text-white">
          <div className="flex justify-center gap-3 mb-5">
            <Stethoscope size={28} className="text-teal-200" />
            <span className="text-teal-200 text-xl">+</span>
            <Leaf size={28} className="text-emerald-200" />
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4">
            {t('hospitalsPage.ewTitle', lang)}
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8 text-lg">
            {t('hospitalsPage.ewDesc', lang)}
          </p>
          <button onClick={() => router.push('/intake')} className="bg-white text-teal-700 font-bold px-10 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2 text-lg">
            {t('hospitalsPage.cta', lang)} <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
