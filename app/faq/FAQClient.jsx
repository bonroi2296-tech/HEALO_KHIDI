"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useLang } from "../../src/lib/i18n/LangContext";
import { FAQ_CATEGORIES, FAQS } from "../../src/lib/faq/faqData";

const COPY = {
  ko: {
    eyebrow: "자주 묻는 질문",
    title: "궁금하신 모든 것",
    lede: "외국인 환자들이 한국 치료 전·중에 가장 자주 묻는 질문들입니다. 원하는 답이 없으면 메시지 주세요.",
    all: "전체",
    qaSuffix: "개의 질문",
    empty: "해당 카테고리의 질문이 없습니다.",
    contactEyebrow: "문의",
    contactTitle: "다른 궁금한 점이 있으신가요?",
    contactBody: "코디네이터가 선호 언어로, 영업일 기준 하루 안에 개인적으로 답변드립니다.",
    contactBtn: "대화 시작하기",
  },
  en: {
    eyebrow: "Questions",
    title: "Everything you're wondering",
    lede: "Common questions from international patients before and during their care in Korea. Didn't find yours? Send us a message.",
    all: "All",
    qaSuffix: "questions",
    empty: "No questions in this category.",
    contactEyebrow: "Contact",
    contactTitle: "Still have questions?",
    contactBody: "Our coordinator will answer personally in your language, within one business day.",
    contactBtn: "Start a conversation",
  },
  ru: {
    eyebrow: "Вопросы",
    title: "Всё, что вас интересует",
    lede: "Самые частые вопросы иностранных пациентов до и во время лечения в Корее. Не нашли свой? Напишите нам.",
    all: "Все",
    qaSuffix: "вопросов",
    empty: "В этой категории пока нет вопросов.",
    contactEyebrow: "Контакт",
    contactTitle: "Остались вопросы?",
    contactBody: "Наш координатор ответит лично на вашем языке в течение одного рабочего дня.",
    contactBtn: "Начать разговор",
  },
  kz: {
    eyebrow: "Сұрақтар",
    title: "Сізді қызықтыратын барлық нәрсе",
    lede: "Шетелдік науқастардың Кореяда емделу алдында және кезінде жиі қоятын сұрақтары. Жауабын таппадыңыз ба? Бізге хабарласыңыз.",
    all: "Барлығы",
    qaSuffix: "сұрақ",
    empty: "Бұл санатта сұрақтар жоқ.",
    contactEyebrow: "Байланыс",
    contactTitle: "Сұрақтарыңыз қалды ма?",
    contactBody: "Координаторымыз бір жұмыс күні ішінде сіздің тіліңізде жеке жауап береді.",
    contactBtn: "Сөйлесуді бастау",
  },
  zh: {
    eyebrow: "常见问题",
    title: "您想了解的一切",
    lede: "国际患者在韩国治疗前及治疗中最常问的问题。没找到您的问题？请给我们留言。",
    all: "全部",
    qaSuffix: "个问题",
    empty: "该分类暂无问题。",
    contactEyebrow: "联系",
    contactTitle: "还有疑问吗？",
    contactBody: "我们的协调员将在一个工作日内，以您偏好的语言为您亲自解答。",
    contactBtn: "开始对话",
  },
  ja: {
    eyebrow: "よくある質問",
    title: "気になることのすべて",
    lede: "外国人患者が韓国での治療前・治療中に最もよく尋ねる質問です。お探しの答えがなければメッセージをお送りください。",
    all: "すべて",
    qaSuffix: "件の質問",
    empty: "このカテゴリーには質問がありません。",
    contactEyebrow: "お問い合わせ",
    contactTitle: "他にご不明な点はありますか？",
    contactBody: "コーディネーターが営業日基準で1日以内に、ご希望の言語で個別にお答えします。",
    contactBtn: "会話を始める",
  },
};

export default function FAQClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openIdx, setOpenIdx] = useState(null);

  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";

  const filtered =
    selectedCategory === "all"
      ? FAQS
      : FAQS.filter((f) => f.category === selectedCategory);

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="max-w-4xl mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-12">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
          {copy.eyebrow}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {copy.title}
        </h1>
        <div className="w-12 h-px bg-teal-600 mt-5 mb-5" />
        <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {copy.lede}
        </p>
      </section>

      {/* Category filter */}
      <section className="sticky top-14 md:top-16 z-20 bg-white/90 backdrop-blur border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center gap-2.5">
          <span className="text-xs text-gray-400 mr-1 shrink-0">
            {filtered.length} {copy.qaSuffix}
          </span>
          <FilterBtn
            active={selectedCategory === "all"}
            onClick={() => {
              setSelectedCategory("all");
              setOpenIdx(null);
            }}
          >
            {copy.all}
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
              {l(cat.labels)}
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
            const catLabel = l(
              FAQ_CATEGORIES.find((c) => c.id === faq.category)?.labels || {}
            );
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
                    <div className="text-xs font-bold tracking-wide text-teal-600 mb-1.5">
                      {String(idx + 1).padStart(2, "0")} · {catLabel}
                    </div>
                    <div className="text-base md:text-lg font-bold text-gray-900 leading-snug">
                      {l(faq.q)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 mt-0.5 text-gray-400 transition-transform duration-200 ${
                      open ? "rotate-45 text-teal-600" : ""
                    }`}
                  >
                    <Plus size={22} />
                  </span>
                </button>
                {open && (
                  <div className="px-5 md:px-6 pb-5 md:pb-6 -mt-1">
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      {l(faq.a)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="py-16 text-center text-sm text-gray-400">
              {copy.empty}
            </p>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-50 bg-teal-500 rounded-full px-3 py-1 mb-5">
            {copy.contactEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">
            {copy.contactTitle}
          </h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-2xl mx-auto leading-relaxed">
            {copy.contactBody}
          </p>
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            {copy.contactBtn} <ArrowRight size={18} />
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
          ? "bg-teal-600 text-white"
          : "bg-white text-gray-600 border border-gray-200 hover:border-teal-300 hover:text-teal-700"
      }`}
    >
      {children}
    </button>
  );
}
