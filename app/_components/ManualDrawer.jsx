"use client";

/**
 * 계층별 백오피스 "사용설명서" 드로어.
 *
 * 사용: 각 포털 레이아웃에 <ManualDrawer role="admin" /> 한 줄 박으면
 *       우하단에 떠 있는 도움말 버튼 + 우측 슬라이드 패널이 생긴다.
 * 내용은 src/lib/manuals/index.js (단일 SoR)에서 읽는다 — 기능 바뀌면 거기만 고치면 됨.
 *
 * props:
 *   role        "admin" | "coordinator" | "hospital" | "agency" | "clinic"
 *   buttonLabel 버튼/제목에 쓸 라벨(기본 "사용설명서") — 다국어 포털은 번역 문자열 전달
 */

import { useState, useEffect } from "react";
import { BookOpen, X } from "lucide-react";
import { getManual } from "@/lib/manuals";

export default function ManualDrawer({ role, buttonLabel = "사용설명서" }) {
  const [open, setOpen] = useState(false);
  const manual = getManual(role);

  // ESC 닫기 + 열렸을 때 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!manual) return null;

  return (
    <>
      {/* 떠 있는 도움말 버튼 (우하단) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={buttonLabel}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-white text-gray-700 border border-gray-200 shadow-lg hover:shadow-xl hover:text-teal-700 hover:border-teal-200 transition-all duration-200 min-h-[44px]"
      >
        <BookOpen size={18} className="text-teal-600" />
        <span className="text-sm font-semibold hidden sm:inline">{buttonLabel}</span>
      </button>

      {/* 드로어 */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!open}
      >
        {/* 배경 */}
        <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

        {/* 패널 */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={manual.title}
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          {/* 헤더 */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <BookOpen size={16} className="text-teal-600 shrink-0" />
                {manual.title}
              </div>
              {manual.summary && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{manual.summary}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="close"
              className="p-1.5 -mr-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {manual.sections.map((sec, si) => (
              <section key={si}>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{sec.heading}</h3>
                {sec.intro && <p className="text-xs text-gray-500 mb-2.5 leading-relaxed">{sec.intro}</p>}
                <ul className="space-y-2">
                  {sec.items.map((item, ii) => {
                    const isObj = item && typeof item === "object";
                    return (
                      <li key={ii} className="flex gap-2.5 text-sm">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                        {isObj ? (
                          <span className="leading-relaxed">
                            <span className="font-semibold text-gray-800">{item.title}</span>
                            <span className="text-gray-500"> — {item.desc}</span>
                          </span>
                        ) : (
                          <span className="text-gray-600 leading-relaxed">{item}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          {/* 푸터 — 갱신일 */}
          {manual.updated && (
            <div className="px-5 py-3 border-t border-gray-100 text-[11px] text-gray-400 shrink-0">
              마지막 업데이트 {manual.updated} · 기능이 바뀌면 설명서도 함께 갱신됩니다
            </div>
          )}
        </div>
      </div>
    </>
  );
}
