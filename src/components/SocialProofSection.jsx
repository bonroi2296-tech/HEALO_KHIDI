"use client";

/**
 * SocialProofSection — 실제·검증 가능한 사회적 증거(후기) 섹션
 *
 * ⚠️ 원칙 (PO 지침 2026-06-20 "가짜 금지·실리뷰만"):
 *  - 환자 후기 본문을 임의로 지어내지 않는다(과거 홈에 있던 A.K./M.S./T.Y. 가짜 후기 제거).
 *  - 출처가 확인되는 사실/집계 평점만 게시하고, 각 항목에 출처 링크를 단다.
 *  - 실제 개별 후기는 외부 공개 플랫폼(모두닥·똑닥·네이버·공식 치료후기)으로 연결한다.
 *  - 한국 의료광고법상 의료기관 환자 후기 게재는 규제 대상 → 본문 후기 직접 게재 대신
 *    "외부 플랫폼에서 직접 확인" 방식이 안전.
 *
 * 출처(수집/확인 2026-06):
 *  - 모두닥 환자 평점 9.3/10 (강서점, 리뷰 7건): https://www.modoodoc.com/hospital/17167
 *  - 누적 치료사례 50,000건+ (면력한방병원 공식, 2024-11 기준): https://immunehospital.com
 *  - 공식 치료후기 게시판: https://immunehospital.com/pages/board/board.list.php?board_no=11
 */

import { Star, ExternalLink, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";

const COPY = {
  ko: {
    eyebrow: "실제 환자들의 평가",
    title: "지어낸 후기 대신, 검증 가능한 평가로",
    lede: "면력한방병원의 실제 환자 평가는 외부 공개 플랫폼에서 직접 확인하실 수 있습니다. 아래 수치는 모두 출처가 있는 실제 데이터입니다.",
    ratingLabel: "환자 평점",
    ratingSub: "모두닥 · 강서점 (리뷰 7건)",
    casesValue: "50,000건+",
    casesLabel: "누적 치료사례",
    casesSub: "면력한방병원 공식 (2024-11 기준)",
    regLabel: "외국인환자 유치의료기관 등록",
    regSub: "보건복지부 등록 의료기관",
    linksTitle: "실제 환자 후기 직접 보기",
    links: [
      { label: "모두닥 후기", url: "https://www.modoodoc.com/hospital/17167" },
      { label: "똑닥 후기", url: "https://ddocdoc.com/hospital/60f5150c275696001875e0d0" },
      { label: "네이버 검색", url: "https://map.naver.com/p/search/면력한방병원" },
      { label: "공식 치료후기", url: "https://immunehospital.com/pages/board/board.list.php?board_no=11" },
    ],
    note: "출처 표시: 위 평점·집계는 외부 공개 플랫폼 및 면력한방병원 공식 자료 기준(2026-06 확인)이며, healwith가 임의로 작성한 후기가 아닙니다.",
  },
  en: {
    eyebrow: "What real patients say",
    title: "Verifiable ratings, not invented testimonials",
    lede: "Real patient feedback for Immune Hospital is available on public external platforms. Every figure below is sourced, real data.",
    ratingLabel: "Patient rating",
    ratingSub: "Modoodoc · Gangseo (7 reviews)",
    casesValue: "50,000+",
    casesLabel: "Cumulative treatment cases",
    casesSub: "Immune Hospital official (as of Nov 2024)",
    regLabel: "Registered for International Patient Care",
    regSub: "Registered with the Ministry of Health & Welfare",
    linksTitle: "Read real patient reviews directly",
    links: [
      { label: "Modoodoc reviews", url: "https://www.modoodoc.com/hospital/17167" },
      { label: "Ddocdoc reviews", url: "https://ddocdoc.com/hospital/60f5150c275696001875e0d0" },
      { label: "Naver search", url: "https://map.naver.com/p/search/면력한방병원" },
      { label: "Official cases", url: "https://immunehospital.com/pages/board/board.list.php?board_no=11" },
    ],
    note: "Source: ratings and figures above are from public external platforms and Immune Hospital official materials (verified Jun 2026). They are not testimonials written by healwith.",
  },
  ru: {
    eyebrow: "Что говорят реальные пациенты",
    title: "Проверяемые оценки, а не выдуманные отзывы",
    lede: "Реальные отзывы пациентов о больнице доступны на публичных внешних платформах. Все цифры ниже — реальные данные с указанием источника.",
    ratingLabel: "Оценка пациентов",
    ratingSub: "Modoodoc · Кансо (7 отзывов)",
    casesValue: "50 000+",
    casesLabel: "Случаев лечения (всего)",
    casesSub: "Официально Immune Hospital (на ноябрь 2024)",
    regLabel: "Зарегистрировано для иностранных пациентов",
    regSub: "Регистрация в Министерстве здравоохранения",
    linksTitle: "Читать реальные отзывы напрямую",
    links: [
      { label: "Отзывы Modoodoc", url: "https://www.modoodoc.com/hospital/17167" },
      { label: "Отзывы Ddocdoc", url: "https://ddocdoc.com/hospital/60f5150c275696001875e0d0" },
      { label: "Поиск Naver", url: "https://map.naver.com/p/search/면력한방병원" },
      { label: "Офиц. случаи", url: "https://immunehospital.com/pages/board/board.list.php?board_no=11" },
    ],
    note: "Источник: оценки и цифры выше взяты с публичных внешних платформ и из официальных материалов больницы (проверено в июне 2026). Это не отзывы, написанные healwith.",
  },
  kz: {
    eyebrow: "Нақты пациенттер не дейді",
    title: "Ойдан шығарылған пікір емес, тексерілетін баға",
    lede: "Аурухана туралы нақты пациент пікірлерін ашық сыртқы платформалардан тікелей көре аласыз. Төмендегі сандардың бәрі — дереккөзі бар нақты деректер.",
    ratingLabel: "Пациент бағасы",
    ratingSub: "Modoodoc · Кансо (7 пікір)",
    casesValue: "50 000+",
    casesLabel: "Жинақталған емдеу жағдайлары",
    casesSub: "Immune Hospital ресми (2024 қараша)",
    regLabel: "Шетелдік науқастарға тіркелген",
    regSub: "Денсаулық сақтау министрлігінде тіркелген",
    linksTitle: "Нақты пікірлерді тікелей оқу",
    links: [
      { label: "Modoodoc пікірлері", url: "https://www.modoodoc.com/hospital/17167" },
      { label: "Ddocdoc пікірлері", url: "https://ddocdoc.com/hospital/60f5150c275696001875e0d0" },
      { label: "Naver іздеу", url: "https://map.naver.com/p/search/면력한방병원" },
      { label: "Ресми жағдайлар", url: "https://immunehospital.com/pages/board/board.list.php?board_no=11" },
    ],
    note: "Дереккөз: жоғарыдағы бағалар мен сандар ашық сыртқы платформалар мен аурухананың ресми материалдарынан алынды (2026 маусымда тексерілді). Бұл healwith жазған пікір емес.",
  },
  zh: {
    eyebrow: "真实患者的评价",
    title: "可验证的评分，而非编造的评价",
    lede: "免疫医院的真实患者反馈可在公开的外部平台直接查看。以下数据均为有据可查的真实数据。",
    ratingLabel: "患者评分",
    ratingSub: "Modoodoc · 江西院（7条评价）",
    casesValue: "50,000+",
    casesLabel: "累计治疗案例",
    casesSub: "免疫医院官方（截至2024年11月）",
    regLabel: "外国患者诊疗机构注册",
    regSub: "保健福祉部注册医疗机构",
    linksTitle: "直接查看真实患者评价",
    links: [
      { label: "Modoodoc评价", url: "https://www.modoodoc.com/hospital/17167" },
      { label: "Ddocdoc评价", url: "https://ddocdoc.com/hospital/60f5150c275696001875e0d0" },
      { label: "Naver搜索", url: "https://map.naver.com/p/search/면력한방병원" },
      { label: "官方案例", url: "https://immunehospital.com/pages/board/board.list.php?board_no=11" },
    ],
    note: "来源：以上评分与数据来自公开外部平台及免疫医院官方资料（2026年6月核实），并非healwith撰写的评价。",
  },
  ja: {
    eyebrow: "実際の患者さんの評価",
    title: "作り話ではなく、検証可能な評価を",
    lede: "免疫病院の実際の患者評価は、公開された外部プラットフォームで直接ご確認いただけます。以下の数値はすべて出典のある実データです。",
    ratingLabel: "患者評価",
    ratingSub: "Modoodoc · 江西院（レビュー7件）",
    casesValue: "50,000件+",
    casesLabel: "累計治療事例",
    casesSub: "免疫病院公式（2024年11月時点）",
    regLabel: "外国人患者誘致医療機関登録",
    regSub: "保健福祉部 登録医療機関",
    linksTitle: "実際の患者レビューを直接見る",
    links: [
      { label: "Modoodocレビュー", url: "https://www.modoodoc.com/hospital/17167" },
      { label: "Ddocdocレビュー", url: "https://ddocdoc.com/hospital/60f5150c275696001875e0d0" },
      { label: "Naver検索", url: "https://map.naver.com/p/search/면력한방병원" },
      { label: "公式事例", url: "https://immunehospital.com/pages/board/board.list.php?board_no=11" },
    ],
    note: "出典：上記の評価・数値は公開外部プラットフォームおよび免疫病院公式資料に基づきます（2026年6月確認）。healwithが作成したレビューではありません。",
  },
};

export default function SocialProofSection({ className = "" }) {
  const lang = useLang() || "ko";
  const c = COPY[lang] || COPY.ko;

  return (
    <section className={`bg-white py-10 md:py-16 ${className}`}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-10">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-3">
            {c.eyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{c.title}</h2>
          <p className="mt-3 text-sm md:text-base text-gray-500 leading-relaxed max-w-2xl mx-auto">{c.lede}</p>
        </div>

        {/* 출처 있는 실제 수치 3종 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {/* 평점 */}
          <div className="border border-gray-200 rounded-2xl p-5 md:p-6 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="text-3xl md:text-4xl font-extrabold text-teal-700">9.3</span>
              <span className="text-base md:text-lg text-gray-400 font-semibold">/ 10</span>
            </div>
            <div className="flex justify-center gap-0.5 mb-2" aria-hidden="true">
              {[...Array(5)].map((_, j) => (
                <Star key={j} size={13} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-sm font-semibold text-gray-800">{c.ratingLabel}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.ratingSub}</p>
          </div>

          {/* 치료사례 */}
          <div className="border border-gray-200 rounded-2xl p-5 md:p-6 text-center">
            <div className="text-3xl md:text-4xl font-extrabold text-teal-700 mb-2">{c.casesValue}</div>
            <p className="text-sm font-semibold text-gray-800">{c.casesLabel}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.casesSub}</p>
          </div>

          {/* 등록 */}
          <div className="border border-gray-200 rounded-2xl p-5 md:p-6 text-center flex flex-col items-center justify-center">
            <ShieldCheck size={30} className="text-teal-700 mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-800 leading-snug">{c.regLabel}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.regSub}</p>
          </div>
        </div>

        {/* 실제 후기 외부 링크 */}
        <div className="mt-7 md:mt-8 text-center">
          <p className="text-sm font-semibold text-gray-700 mb-3">{c.linksTitle}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {c.links.map((lnk, i) => (
              <a
                key={i}
                href={lnk.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-teal-300 hover:text-teal-700 transition-colors"
              >
                {lnk.label}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 text-[11px] text-gray-400 leading-relaxed text-center max-w-2xl mx-auto">
          {c.note}
        </p>
      </div>
    </section>
  );
}
