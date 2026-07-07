"use client";

// src/components.jsx
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
// ✅ 성능 최적화: optimizePackageImports로 tree-shaking 최적화 (next.config.js에서 설정됨)
import {
  Search, MapPin, Globe, Menu, Star, Zap, ChevronDown, CheckCircle,
  MessageCircle, X, ArrowRight, Stethoscope, Building2, Settings,
  FileText, UserCheck, Clock, ShieldCheck, Shield, Sparkles, User, LogOut, Video, KeyRound
} from 'lucide-react';
import { getLangCodeFromCookie, setLangCookie, LANG_OPTIONS as I18N_LANG_OPTIONS, LANG_OPTIONS_PRIMARY, t } from "./lib/i18n";
import { useLang } from "./lib/i18n/LangContext";
import { localeSwitchTarget } from "./lib/i18n/config";
import Logo from "../components/brand/Logo";

/**
 * 유틸: 바깥 클릭 시 닫기
 */
const useOutsideClose = (isOpen, onClose) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClose();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);
  return ref;
};

// 렌더 언어: useLang()(LangContext, 서버가 initialLang 주입) — SSR부터 올바른 언어로 그린다(POSTMORTEMS #30).
const useLangCode = () => useLang();

const MY_PAGE_LABEL = {
  ko: '내 페이지', en: 'My Page', ru: 'Мой кабинет', kz: 'Менің бетім', zh: '我的页面', ja: 'マイページ',
};

const CHANGE_PW_LABEL = {
  ko: '비밀번호 변경', en: 'Change password', ru: 'Смена пароля', kz: 'Құпиясөзді өзгерту', zh: '修改密码', ja: 'パスワードの変更',
};

// "내 페이지" 링크를 역할별로 곧장 보낸다. (코디·에이전시가 /patient 들렀다 튕기는 hop 방지)
//   app_metadata.role 기준 — admin/coordinator/agency, 병원담당자(hospital_users)=isHospitalUser, 그 외 환자.
//   doctor 는 전용 포털 비활성화라 /patient 폴백(거의 안 쓰임).
function resolveMyPageHref(session, isAdmin, isHospitalUser) {
  const appRole = session?.user?.app_metadata?.role;
  if (isAdmin || appRole === 'admin') return '/admin';
  if (appRole === 'coordinator') return '/coordinator';
  if (appRole === 'agency') return '/agency';
  if (isHospitalUser) return '/hospital';
  return '/patient';
}

const UserMenu = ({ session, onLogout, langCode, isHospitalUser, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useOutsideClose(isOpen, () => setIsOpen(false));
  const myPageHref = resolveMyPageHref(session, isAdmin, isHospitalUser);
  const myPageLabel = MY_PAGE_LABEL[langCode] || MY_PAGE_LABEL.en;

  const getInitials = (email) => {
    if (!email) return 'U';
    const name = email.split('@')[0];
    if (name.length === 1) return name.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(session?.user?.email);

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-full hover:bg-teal-200/70 transition-all group px-1 py-1"
        title={session?.user?.email}
        aria-label="Account menu"
      >
        <div className="h-8 w-8 rounded-full bg-teal-200 border border-teal-300 flex items-center justify-center text-teal-800 font-semibold text-xs group-hover:bg-teal-300 transition-all">
          {initials}
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 group-hover:text-teal-700 transition-all ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200/80 overflow-hidden z-50 text-gray-800 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-1">
                {t("auth.signedInAs", langCode)}
              </div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {session?.user?.email}
              </div>
            </div>
            <a
              href={myPageHref}
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 transition-colors flex items-center gap-2.5 text-gray-700 font-medium border-b border-gray-100"
            >
              <User size={15} className="text-teal-700" />
              <span>{myPageLabel}</span>
            </a>
            <a
              href="/account/password"
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 transition-colors flex items-center gap-2.5 text-gray-700 font-medium border-b border-gray-100"
            >
              <KeyRound size={15} className="text-teal-700" />
              <span>{CHANGE_PW_LABEL[langCode] || CHANGE_PW_LABEL.en}</span>
            </a>
            <button
              onClick={() => { setIsOpen(false); onLogout(); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 transition-colors flex items-center gap-2.5 text-red-600 font-medium"
            >
              <LogOut size={15} />
              <span>{t("auth.logout", langCode)}</span>
            </button>
          </div>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
        </>
      )}
    </div>
  );
};

// --- 1. 헤더 (langCode는 ClientShell에서 전달 — 푸터와 동일 소스) ---
export const Header = ({ setView, view, _handleGlobalInquiry, isMobileMenuOpen, setIsMobileMenuOpen, onNavClick, session, onLogout, siteConfig, isHospitalUser, langCode: langCodeProp }) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  // user_metadata.role은 클라이언트가 고칠 수 있어 어드민 판정에 사용 금지.
  // 서버측 단일 소스는 app_metadata.role. (ADMIN_EMAIL_ALLOWLIST는 서버에서만 체크)
  const isAdmin = session?.user?.app_metadata?.role === 'admin';
  const langCode = langCodeProp ?? getLangCodeFromCookie();
  const langRef = useOutsideClose(isLangOpen, () => setIsLangOpen(false));
  const LANG_OPTIONS = I18N_LANG_OPTIONS;

  const handleLanguageChange = (code) => {
    if (langCode === code) { setIsLangOpen(false); return; }
    setLangCookie(code);
    setIsLangOpen(false);
    // URL 언어화: 공개 페이지면 새 언어 주소로 이동(미들웨어가 쿠키를 URL언어로 덮어쓰므로 reload론 안 바뀜)
    const target = localeSwitchTarget(window.location.pathname, window.location.search, code);
    if (target) window.location.assign(target);
    else window.location.reload();
  };

  const currentLangLabel = LANG_OPTIONS.find((l) => l.code === langCode)?.label ?? langCode;

  const isActive = (targetView) => String(view).includes(targetView);

  // 러시아어·카자흐어만 컴팩트 헤더 — 6개 언어 중 라벨이 가장 길어 xl에서 빡빡함(PO 2026-07-07).
  // 타 언어는 기존 클래스 그대로(배치 불변). 값은 여백·글자만 한 단계 축소, 축(rounded·색·모션)은 동일.
  const denseNav = langCode === "ru" || langCode === "kz";
  const navItemSize = denseNav ? "px-1.5 text-[13px]" : "px-2.5 text-sm";

  return (
    <>
      <header className="bg-teal-100 text-slate-700 border-b border-teal-200 sticky top-0 z-50 shadow-sm pt-safe-area">
        <div className="max-w-7xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className={`flex items-center ${denseNav ? "gap-3" : "gap-6"} z-20`}>
            <div className="flex items-center cursor-pointer shrink-0" onClick={() => onNavClick('home')}>
              {siteConfig?.logo ? (
                  <img src={siteConfig.logo} alt="healwith" className="h-8 md:h-9 object-contain" />
              ) : (
                  <Logo tone="light" lang={langCode} />
              )}
            </div>
            <nav className="hidden xl:flex items-center gap-0.5">
              <a
                href="/telemedicine"
                className={`${navItemSize} py-1.5 rounded-full font-semibold transition-all text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 inline-flex items-center gap-1.5 whitespace-nowrap`}
              >
                {t("nav.telemedicine", langCode)}
                <span className="text-[9px] font-extrabold bg-teal-700 text-white px-1.5 py-0.5 rounded-full leading-none">NEW</span>
              </a>
              <button
                onClick={() => onNavClick('list_treatment')}
                className={`${navItemSize} py-1.5 rounded-full font-semibold transition-all whitespace-nowrap ${isActive('treatment') ? 'bg-teal-200 text-teal-800' : 'text-slate-600 hover:text-teal-700 hover:bg-teal-200/70'}`}
              >
                {t("nav.treatments", langCode)}
              </button>
              <button
                onClick={() => onNavClick('list_hospital')}
                className={`${navItemSize} py-1.5 rounded-full font-semibold transition-all whitespace-nowrap ${isActive('hospital') ? 'bg-teal-200 text-teal-800' : 'text-slate-600 hover:text-teal-700 hover:bg-teal-200/70'}`}
              >
                {t("nav.hospitals", langCode)}
              </button>
              <a
                href="/care-journey"
                className={`${navItemSize} py-1.5 rounded-full font-semibold transition-all text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 whitespace-nowrap`}
              >
                {t("nav.careJourney", langCode)}
              </a>
              <a
                href="/visa"
                className={`${navItemSize} py-1.5 rounded-full font-semibold transition-all text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 whitespace-nowrap`}
              >
                {t("nav.visa", langCode)}
              </a>
              <a
                href="/insurance"
                className={`${navItemSize} py-1.5 rounded-full font-semibold transition-all text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 whitespace-nowrap`}
              >
                {t("nav.insurance", langCode)}
              </a>
            </nav>
          </div>

          {/* Center: CTA (desktop) — 비활성화 (필요 시 복원) */}
          {/* {!isAdmin && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block z-30">
              <button
                onClick={handleGlobalInquiry}
                className="flex items-center gap-2 text-sm font-bold bg-white text-teal-700 px-6 py-2 rounded-full hover:bg-teal-50 transition shadow-md"
              >
                <Zap size={15} className="text-teal-700 fill-teal-600" />
                {t("cta.freePlan", langCode)}
              </button>
            </div>
          )} */}

          {/* Right: Lang + Auth + Portal (desktop) */}
          <div className={`hidden xl:flex items-center ${denseNav ? "gap-1" : "gap-1.5"} z-20`}>
            {/* Language */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                data-testid="lang-switcher"
                aria-label={t("a11y.changeLanguage", langCode)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 transition-all notranslate"
              >
                <Globe size={15} />
                <span className="text-sm font-medium">{currentLangLabel}</span>
                <ChevronDown size={13} className={`opacity-60 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 notranslate">
                  {LANG_OPTIONS_PRIMARY.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5 transition-colors ${langCode === lang.code ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <span>{lang.label}</span>
                      {langCode === lang.code && <CheckCircle size={13} className="ml-auto text-teal-700 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth */}
            {session ? (
              <UserMenu session={session} onLogout={onLogout} langCode={langCode} isHospitalUser={isHospitalUser} isAdmin={isAdmin} />
            ) : (
              <div className="flex items-center gap-1.5">
                <button onClick={() => setView('login')} className={`${denseNav ? "px-2 text-[13px]" : "px-3 text-sm"} py-1.5 font-medium text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 rounded-full transition-all whitespace-nowrap`}>
                  {t("auth.login", langCode)}
                </button>
                <button onClick={() => setView('signup')} className={`${denseNav ? "px-3 text-[13px]" : "px-4 text-sm"} py-1.5 font-semibold text-white bg-teal-700 rounded-full hover:bg-teal-800 transition-all whitespace-nowrap shadow-sm`}>
                  {t("auth.signup", langCode)}
                </button>
              </div>
            )}

            {/* Portal links */}
            {isHospitalUser && !isAdmin && (
              <a href="/hospital" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 rounded-full transition-all border border-teal-200" title="Hospital Portal">
                <Building2 size={13} /> Portal
              </a>
            )}
            {isAdmin && (
              <button onClick={() => setView('admin')} className="p-2 text-slate-500 hover:text-teal-700 hover:bg-teal-200/70 rounded-full transition-all" title="Admin Settings">
                <Settings size={18} />
              </button>
            )}
          </div>

          {/* Mobile: right actions */}
          <div className="xl:hidden flex items-center gap-2 z-20">
            {session && (
              <div className="w-7 h-7 rounded-full bg-teal-200 border border-teal-300 flex items-center justify-center text-teal-800 font-bold text-[10px]">
                {session.user.email.split('@')[0].substring(0, 2).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
              aria-expanded={isMobileMenuOpen}
              className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 rounded-lg transition-all"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-[85%] max-w-[320px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Mobile header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <Logo tone="light" size="sm" lang={langCode} />
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* User info (logged in) */}
              {session && (
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold text-sm">
                      {session.user.email.split('@')[0].substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{session.user.email.split('@')[0]}</div>
                      <div className="text-xs text-gray-400 truncate">{session.user.email}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Portal links */}
              {session && (
                <div className="px-5 pt-4 pb-2 space-y-2">
                  {!isHospitalUser && !isAdmin && (
                    <a href={resolveMyPageHref(session, isAdmin, isHospitalUser)} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 py-3 px-4 bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm">
                      <User size={16} /> {MY_PAGE_LABEL[langCode] || MY_PAGE_LABEL.en}
                    </a>
                  )}
                  {isHospitalUser && !isAdmin && (
                    <a href="/hospital" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 py-3 px-4 bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm">
                      <Building2 size={16} /> Hospital Portal
                    </a>
                  )}
                  {isAdmin && (
                    <button onClick={() => { setView('admin'); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-2.5 py-3 px-4 bg-gray-900 text-white rounded-xl text-sm font-semibold shadow-sm text-left">
                      <Settings size={16} /> Admin Dashboard
                    </button>
                  )}
                </div>
              )}

              {/* CTA (모바일) — 비활성화 (필요 시 복원) */}
              {/* {!isAdmin && (
                <div className="px-5 pt-2 pb-3">
                  <button
                    onClick={() => { handleGlobalInquiry(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-white text-teal-700 rounded-xl text-sm font-bold shadow-md border border-teal-100 hover:bg-teal-50 transition"
                  >
                    <Zap size={18} className="text-teal-700" />
                    {t("cta.freePlan", langCode)}
                  </button>
                </div>
              )} */}

              {/* Navigation */}
              <div className="px-5 py-3">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2 px-1">{t("nav.menu", langCode)}</div>
                <a href="/telemedicine" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left py-3 px-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors min-h-[44px] text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5"><Video size={16} className="text-teal-700 shrink-0" /> {t("nav.telemedicine", langCode)} <span className="text-[9px] font-extrabold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full leading-none">NEW</span></span>
                  <ArrowRight size={14} className="text-gray-300 shrink-0" />
                </a>
                <button onClick={() => onNavClick('list_treatment')} className={`w-full text-left py-3 px-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors min-h-[44px] ${isActive('treatment') ? 'text-teal-700 bg-teal-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <span className="flex items-center gap-2.5"><Stethoscope size={16} className="text-gray-400 shrink-0" /> {t("nav.treatments", langCode)}</span>
                  <ArrowRight size={14} className="text-gray-300 shrink-0" />
                </button>
                <button onClick={() => onNavClick('list_hospital')} className={`w-full text-left py-3 px-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors min-h-[44px] ${isActive('hospital') ? 'text-teal-700 bg-teal-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <span className="flex items-center gap-2.5"><Building2 size={16} className="text-gray-400 shrink-0" /> {t("nav.hospitals", langCode)}</span>
                  <ArrowRight size={14} className="text-gray-300 shrink-0" />
                </button>
                <a href="/care-journey" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left py-3 px-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors min-h-[44px] text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5"><MapPin size={16} className="text-gray-400 shrink-0" /> {t("nav.careJourney", langCode)}</span>
                  <ArrowRight size={14} className="text-gray-300 shrink-0" />
                </a>
                <a href="/visa" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left py-3 px-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors min-h-[44px] text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5"><Globe size={16} className="text-gray-400 shrink-0" /> {t("nav.visa", langCode)}</span>
                  <ArrowRight size={14} className="text-gray-300 shrink-0" />
                </a>
                <a href="/insurance" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left py-3 px-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors min-h-[44px] text-gray-700 hover:bg-gray-50">
                  <span className="flex items-center gap-2.5"><ShieldCheck size={16} className="text-gray-400 shrink-0" /> {t("nav.insurance", langCode)}</span>
                  <ArrowRight size={14} className="text-gray-300 shrink-0" />
                </a>
              </div>

              {/* Language — UI+콘텐츠 둘 다 지원하는 4개만 노출 */}
              <div className="px-5 py-3 border-t border-gray-100">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2 px-1">{t("nav.language", langCode)}</div>
                <div className="grid grid-cols-2 gap-1.5 notranslate">
                  {LANG_OPTIONS_PRIMARY.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${langCode === lang.code ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom: Auth */}
            <div className="border-t border-gray-100 px-5 py-4">
              {session ? (
                <>
                  <a href="/account/password" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-2.5 px-4 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                    <KeyRound size={16} className="text-teal-700" />
                    {CHANGE_PW_LABEL[langCode] || CHANGE_PW_LABEL.en}
                  </a>
                  <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full py-2.5 px-4 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                    <LogOut size={16} />
                    {t("auth.logout", langCode)}
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setView('login'); setIsMobileMenuOpen(false); }} className="flex-1 py-2.5 text-center text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg transition-colors">
                    {t("auth.login", langCode)}
                  </button>
                  <button onClick={() => { setView('signup'); setIsMobileMenuOpen(false); }} className="flex-1 py-2.5 text-center text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors">
                    {t("auth.signup", langCode)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- 2. 히어로 섹션 ---
export const HeroSection = ({ setView, searchTerm, setSearchTerm, siteConfig }) => {
  const langCode = useLangCode();
  return (
    <section className="relative mb-6 md:mb-12">
      <div className="relative pt-12 pb-16 md:pt-24 md:pb-20 text-center overflow-hidden bg-teal-900">
        <div className="absolute inset-0 z-0">
          {/* ✅ next/image로 최적화 (priority + sizes) */}
          {siteConfig?.hero && (
            <Image
              src={siteConfig.hero}
              alt="Hero Background"
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-60"
              quality={85}
            />
          )}
          {/* 그라데이션 오버레이 (이미지 있든 없든 적용) */}
          <div className="absolute inset-0 bg-gradient-to-b from-teal-950/80 via-teal-900/60 to-teal-800/90 mix-blend-multiply"></div>
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-4 flex flex-col items-center">
            <h1 className="text-[26px] sm:text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 leading-[1.15] drop-shadow-lg tracking-tight text-balance">
              {t("hero.title.line1", langCode)}{" "}
              <span className="text-teal-200 whitespace-nowrap">{t("hero.title.highlight", langCode)}</span>
            </h1>
            <p className="text-teal-50 text-xs sm:text-sm md:text-lg max-w-2xl mx-auto font-medium opacity-90 drop-shadow-md leading-relaxed text-balance">
              {t("hero.subtitle.line1", langCode)}
              {" "}
              {t("hero.subtitle.line2", langCode)}
            </p>
        </div>
      </div>
      <div className="relative z-20 max-w-2xl mx-auto px-4 -mt-8 md:-mt-10">
        <div className="bg-white p-2 md:p-2.5 rounded-full shadow-2xl flex items-center border border-gray-100">
            <Search className="text-teal-700 ml-3 md:ml-4 shrink-0" size={20} />
            <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("search.placeholder", langCode)}
            className="flex-1 p-3 md:p-4 text-gray-800 placeholder-gray-400 outline-none bg-transparent text-sm md:text-lg min-w-0 font-medium"
            onKeyDown={(e) => e.key === 'Enter' && setView('list_treatment')}
            />
            <button
            onClick={() => setView('list_treatment')}
            className="bg-teal-700 text-white px-5 md:px-8 py-2.5 md:py-3.5 rounded-full font-bold text-sm md:text-base hover:bg-teal-800 transition shadow-lg shrink-0"
            >
            {t("search.button", langCode)}
            </button>
        </div>
      </div>
    </section>
  );
};

// --- 3. 카드 리스트 섹션 ---
export const CardListSection = ({ title, items, onCardClick, type, showPartnerBadge }) => {
  const langCode = useLangCode();
  return (
    <section className="max-w-6xl mx-auto px-4 py-4 md:py-8">
      <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-4 md:mb-6">{title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onCardClick(item.id)}
            className="bg-white border border-gray-100 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-teal-500 transition-all duration-300 cursor-pointer group flex flex-row min-h-[140px] md:min-h-[224px] md:h-56"
          >
          <div className="w-40 md:w-auto md:h-full md:aspect-square relative bg-gray-200 overflow-hidden shrink-0">
            {(() => {
              const rawSrc = item.thumbnail_image || item.images?.[0] || '';
              const isValidUrl = rawSrc.startsWith('http://') || rawSrc.startsWith('https://') || rawSrc.startsWith('/');
              const imgSrc = isValidUrl ? rawSrc : '';
              const isExternal = imgSrc.includes('googleapis.com');
              if (isExternal) {
                return <img src={imgSrc} alt={type === 'hospital' ? item.name : item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500 absolute inset-0" referrerPolicy="no-referrer" loading="lazy" />;
              }
              return (
                <Image
                  src={imgSrc || `https://placehold.co/600x600.png?text=${encodeURIComponent(type === "hospital" ? "Hospital" : "Treatment")}`}
                  alt={type === 'hospital' ? item.name : item.title}
                  fill
                  sizes="(max-width: 768px) 160px, 224px"
                  className="object-cover group-hover:scale-105 transition duration-500"
                  quality={80}
                  unoptimized={!imgSrc}
                />
              );
            })()}
          </div>
          <div className="flex-1 p-3 md:p-5 flex flex-col justify-between min-w-0">
            <div>
              {type === 'hospital' ? (
                <div className="mb-1">
                  {showPartnerBadge && item.is_partner && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] md:text-[12px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full mb-1">
                      <Shield size={10} className="text-blue-500" />
                      {t("badge.healoPartner", langCode)}
                    </span>
                  )}
                  <h3 className="font-extrabold text-sm md:text-base text-gray-900 line-clamp-2 leading-snug group-hover:text-teal-700 transition">
                    {item.name}
                  </h3>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider truncate">
                      {item.hospital}
                    </p>
                  </div>
                  <h3 className="font-extrabold text-base md:text-lg text-gray-900 mb-1 line-clamp-2 leading-snug group-hover:text-teal-700 transition">
                    {item.title}
                  </h3>
                </>
              )}
              {item.tags && (
                <div className="flex flex-wrap gap-1 mb-1 md:mb-3">
                  {item.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="text-[11px] md:text-[12px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-extrabold">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-[10px] md:text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {type === 'hospital' ? item.description : item.desc}
              </div>
            </div>
            <div className="pt-2 mt-auto border-t border-gray-50 flex items-end justify-between">
              {type === 'treatment' ? (
                <div>
                  <p className="hidden md:block text-[11px] text-gray-400 uppercase font-extrabold">{t("card.estPrice", langCode)}</p>
                  <p className="text-teal-700 font-black text-sm md:text-sm">{item.price}</p>
                </div>
              ) : (
                <div className="flex items-start gap-1 text-[11px] md:text-xs text-gray-500 mr-2">
                  <MapPin size={10} className="md:w-3 md:h-3 mt-0.5" />
                  <span className="line-clamp-2 whitespace-normal">
                    {item.location}
                    {item.address_detail ? `, ${item.address_detail}` : ''}
                  </span>
                </div>
              )}
              {item.rating > 0 ? (
                <div className="flex items-center gap-1 text-xs font-extrabold text-gray-900 shrink-0">
                  <Star size={10} className="md:w-3 md:h-3 text-yellow-400 fill-yellow-400" />
                  <span>{item.rating}</span>
                  {item.ratingCount > 0 && <span className="text-gray-400 font-medium">({item.ratingCount})</span>}
                </div>
              ) : type === 'hospital' && (
                <span className="text-[10px] md:text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold border border-teal-100 shrink-0">New</span>
              )}
            </div>
          </div>
        </div>
        ))}
      </div>
    </section>
  );
};

// --- 4. 플로팅 버튼 및 기타 ---
export const FloatingInquiryBtn = ({ onClick }) => {
  const langCode = useLangCode();
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-2 group cursor-pointer pb-safe-area" onClick={onClick}>
      <div className="bg-white text-gray-800 text-xs font-extrabold px-3 py-2 rounded-xl shadow-md border border-gray-100 mb-1 animate-bounce">
        {t("floatingHelp", langCode)} 💬
      </div>
      <button aria-label={t("floatingHelp", langCode)} className="w-14 h-14 min-w-[56px] min-h-[56px] bg-teal-700 hover:bg-teal-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform transform hover:scale-110 active:scale-95 relative touch-target">
        <MessageCircle size={28} fill="currentColor" className="text-teal-100" />
        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
      </button>
    </div>
  );
};

export const PersonalConciergeCTA = ({ onClick, className = "" }) => {
  const langCode = useLangCode();
  return (
    <section className={`max-w-6xl mx-auto px-4 ${className}`}>
      <div className="rounded-3xl border border-teal-100 bg-teal-50/50 p-4 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 text-center md:text-left">
        <div className="min-w-0">
          <div className="flex items-center justify-center md:justify-start gap-2 text-teal-700 text-xs font-extrabold tracking-widest">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100">✨</span>
            <span>{t("cta.badge", langCode)}</span>
          </div>
          <h3 className="mt-2 md:mt-3 text-xl md:text-3xl font-extrabold text-gray-900 leading-tight text-balance">
            {t("cta.title", langCode)}
          </h3>
          <p className="mt-1.5 md:mt-2 text-gray-700 text-xs md:text-base text-balance leading-relaxed">
            {t("cta.subtitle", langCode)}
          </p>
        </div>
        <div className="shrink-0 mt-2 md:mt-0">
          <button onClick={onClick} className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-full bg-teal-700 text-white font-extrabold text-sm md:text-base shadow-lg hover:bg-teal-800 transition">
            {t("cta.button", langCode)}
          </button>
        </div>
      </div>
    </section>
  );
};

export const MobileBottomNav = ({ view, onInquiry, onNavClick }) => {
  const langCode = useLangCode();
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-white border-t border-gray-200 pb-safe-area shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
      <div className="grid grid-cols-3 h-16 items-center relative">
        <button onClick={() => onNavClick('list_treatment')} className={`flex flex-col items-center justify-center gap-1 h-full w-full active:scale-95 transition ${String(view).includes('treatment') ? 'text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <Stethoscope size={24} strokeWidth={String(view).includes('treatment') ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{t("nav.treatments", langCode)}</span>
        </button>
        <div className="relative flex justify-center h-full pointer-events-none"> 
           <button onClick={onInquiry} className="pointer-events-auto absolute -top-5 flex flex-col items-center group">
              <div className="w-14 h-14 rounded-full bg-teal-700 shadow-lg shadow-teal-100 flex items-center justify-center text-white mb-1 transform group-active:scale-95 transition border-[3px] border-white">
                  <MessageCircle size={24} fill="currentColor" className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-teal-700">{t("process.inquiry", langCode)}</span>
           </button>
        </div>
        <button onClick={() => onNavClick('list_hospital')} className={`flex flex-col items-center justify-center gap-1 h-full w-full active:scale-95 transition ${String(view).includes('hospital') ? 'text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <Building2 size={24} strokeWidth={String(view).includes('hospital') ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{t("nav.hospitals", langCode)}</span>
        </button>
      </div>
    </div>
  );
};

// (OfferBanner 삭제 — 2026-07-02 전수 감사: 어디서도 마운트 안 되는 죽은 컴포넌트인데
//  미정의 i18n 키(offer.*)를 참조해, 되살리는 순간 키 원문이 화면에 노출될 지뢰였음.
//  필요해지면 git 히스토리에서 복원 + 키부터 정의할 것.)

// 🔥 [NEW] 6. 프로세스 스텝 (Process Steps) - 막연한 불안감 해소
export const ProcessSteps = () => {
  const langCode = useLangCode();
  const steps = [
    { key: "process.inquiry", icon: FileText },
    { key: "process.matching", icon: Search },
    { key: "process.travel", icon: Globe },
    { key: "process.care", icon: ShieldCheck },
  ];
  return (
    <div className="py-6 border-t border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">{t("process.title", langCode)}</h3>
      <div className="grid grid-cols-4 gap-2 relative">
        <div className="hidden md:block absolute top-4 left-0 right-0 h-0.5 bg-gray-100 -z-10 translate-y-2"></div>
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-teal-500 text-teal-700 flex items-center justify-center font-bold text-lg shadow-sm mb-2 z-10">
              <s.icon size={20} />
            </div>
            <div className="text-xs font-bold text-gray-900">{t(s.key, langCode)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

