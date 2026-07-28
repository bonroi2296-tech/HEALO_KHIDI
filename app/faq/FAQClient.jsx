"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";
import { FAQ_CATEGORIES, FAQS } from "@/lib/faq/faqData";

export default function FAQClient() {
  const lang = useLang();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openIdx, setOpenIdx] = useState(null);

  const filtered =
    selectedCategory === "all"
      ? FAQS
      : FAQS.filter((f) => f.category === selectedCategory);

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="max-w-4xl mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-12">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
          {t("faqPage.eyebrow", lang)}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {t("faqPage.title", lang)}
        </h1>
        <div className="w-12 h-px bg-teal-700 mt-5 mb-5" />
        <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {t("faqPage.lede", lang)}
        </p>
      </section>

      {/* Category filter */}
      <section className="sticky top-14 md:top-16 z-20 bg-white/90 backdrop-blur border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center gap-2.5">
          <span className="text-xs text-gray-500 mr-1 shrink-0">
            {filtered.length} {t("faqPage.qaSuffix", lang)}
          </span>
          <FilterBtn
            active={selectedCategory === "all"}
            onClick={() => {
              setSelectedCategory("all");
              setOpenIdx(null);
            }}
          >
            {t("faqPage.all", lang)}
          </FilterBtn>
          {FAQ_CATEGORIES.map((cat) => (
            <FilterBtn
              key={cat.id}
              active={selectedCategory === cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setOpenIdx(null);
              }}
            >
              {t(cat.labelKey, lang)}
            </FilterBtn>
          ))}
        </div>
      </section>

      {/* FAQ list */}
      <section className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <div className="space-y-3 md:space-y-4">
          {filtered.map((faq, idx) => {
            const key = `${faq.category}-${idx}`;
            const open = openIdx === key;
            const catLabelKey = FAQ_CATEGORIES.find(
              (c) => c.id === faq.category
            )?.labelKey;
            const catLabel = catLabelKey ? t(catLabelKey, lang) : "";
            return (
              <div
                key={key}
                className="border border-gray-200 rounded-xl overflow-hidden bg-white transition-colors hover:border-teal-300"
              >
                <button
                  onClick={() => setOpenIdx(open ? null : key)}
                  aria-expanded={open}
                  className="w-full text-left flex items-start justify-between gap-4 p-5 md:p-6 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold tracking-wide text-teal-700 mb-1.5">
                      {String(idx + 1).padStart(2, "0")} · {catLabel}
                    </div>
                    <div className="text-base md:text-lg font-bold text-gray-900 leading-snug">
                      {t(faq.qKey, lang)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 mt-0.5 text-gray-400 transition-transform duration-200 ${
                      open ? "rotate-45 text-teal-700" : ""
                    }`}
                  >
                    <Plus size={22} />
                  </span>
                </button>
                {/* 접혀 있어도 답변을 DOM 에 남긴다 — 조건부 렌더({open && ...}) 금지.
                    크롤러·AI 답변엔진은 아코디언을 열어보지 않으므로, 조건부로 두면 프로덕션 HTML 이
                    "질문 17개, 답 0개"가 된다(2026-07-28 실측으로 확인된 실제 증상).
                    접기는 홈 FAQ 와 같은 max-height 방식. 다만 홈의 max-h-96(384px)은 이 페이지엔 모자란다
                    — 답변이 최대 700자라 모바일에서 잘린다 → 넉넉히 40rem.
                    aria-hidden: 화면에 안 보이는 동안 스크린리더가 읽지 않도록(크롤러는 무관). */}
                <div
                  aria-hidden={!open}
                  className={`overflow-hidden transition-all duration-300 ${
                    open ? "max-h-[40rem] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="px-5 md:px-6 pb-5 md:pb-6 -mt-1 text-sm md:text-base text-gray-600 leading-relaxed">
                    {t(faq.aKey, lang)}
                  </p>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="py-16 text-center text-sm text-gray-500">
              {t("faqPage.empty", lang)}
            </p>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-50 bg-teal-700 rounded-full px-3 py-1 mb-5">
            {t("faqPage.contactEyebrow", lang)}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">
            {t("faqPage.contactTitle", lang)}
          </h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-2xl mx-auto leading-relaxed">
            {t("faqPage.contactBody", lang)}
          </p>
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            {t("faqPage.contactBtn", lang)} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
        active
          ? "bg-teal-700 text-white"
          : "bg-white text-gray-600 border border-gray-200 hover:border-teal-300 hover:text-teal-700"
      }`}
    >
      {children}
    </button>
  );
}
