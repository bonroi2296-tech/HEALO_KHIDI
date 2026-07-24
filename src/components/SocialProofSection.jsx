"use client";

/**
 * SocialProofSection — 신뢰 근거(당당한 마케팅 톤)
 *
 * ⚠️ 원칙: 가짜 후기·평점 금지(과거 홈의 A.K./M.S./T.Y. 가짜 후기 제거 이력)는 그대로 지키되,
 *  방어적 표현("지어낸 후기 대신…")·외국인에게 무의미한 한국 평점 플랫폼 링크(모두닥·네이버)는
 *  제거(PO 피드백 2026-06-21). 대신 **긍정적·실제 자격/숫자**만 자신있게 제시한다.
 *
 * 게시 데이터(전부 실제):
 *  - 누적 치료 사례 50,000건+ (면력한방병원 공식)
 *  - 제휴·협진 병원 8곳 (면력한방 4지점 + 협진 대학병원 4곳)
 *  - 6개 언어 실시간 통역 (서비스 기능)
 *  - 외국인환자 유치의료기관 등록 (보건복지부)
 */

import { HeartPulse, Building2, Languages, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

const ICONS = [HeartPulse, Building2, Languages, ShieldCheck];

// 문구는 전부 중앙 사전 socialProof.* 키 — 코디 콘텐츠 편집기에서 검색·수정 가능.
export default function SocialProofSection({ className = "" }) {
  const lang = useLang() || "ko";
  const c = {
    eyebrow: t("socialProof.eyebrow", lang),
    title: t("socialProof.title", lang),
    lede: t("socialProof.lede", lang),
    items: [1, 2, 3, 4].map((n) => ({
      big: t(`socialProof.stat${n}Big`, lang),
      sub: t(`socialProof.stat${n}Sub`, lang),
    })),
  };

  return (
    <section className={`bg-white py-10 md:py-16 ${className}`}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-10">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-3">
            {c.eyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 whitespace-pre-line leading-snug">{c.title}</h2>
          <p className="mt-3 text-sm md:text-base text-gray-500 leading-relaxed max-w-2xl mx-auto">{c.lede}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {c.items.map((it, i) => {
            const Icon = ICONS[i] || HeartPulse;
            return (
              <div
                key={i}
                className="border border-gray-200 rounded-2xl p-5 md:p-6 text-center flex flex-col items-center hover:border-teal-300 hover:shadow-sm transition-all"
              >
                <Icon size={26} className="text-teal-700 mb-2.5" aria-hidden="true" />
                <div className="text-lg md:text-xl font-extrabold text-gray-900 leading-tight">{it.big}</div>
                <p className="text-xs md:text-sm text-gray-500 mt-1 leading-snug">{it.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
