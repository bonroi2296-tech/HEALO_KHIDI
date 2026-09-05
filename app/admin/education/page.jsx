"use client";

/**
 * 환자 교육자료 관리 (어드민)
 *
 * 이 표(education_contents)는 환자 화면 /patient/education 과 사후관리 발송에 그대로 나간다.
 * 그런데 2026-08-25 까지 «고칠 화면이 어디에도 없었다» — 어드민에도, 코디에도.
 * 마지막으로 손댄 날이 2026-04-17(피벗 전)이었던 이유가 그것이다.
 *
 * 선택지는 새로 만들지 않고 이미 있는 단일 출처를 그대로 쓴다:
 *   암종 = src/lib/inquiry/intakeLabels.js (CANCER_TYPES)
 *   분류·단계 = src/lib/followup/educationEngine.ts (CATEGORY_LABELS·PHASE_LABELS)
 * 여기서 목록을 따로 베끼면 환자 화면과 어긋난다.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { BookOpen, Plus, X, Check, AlertTriangle, Loader2 } from "lucide-react";
import { CANCER_TYPES, optLabel } from "@/lib/inquiry/intakeLabels";
import { CATEGORY_LABELS, PHASE_LABELS } from "@/lib/followup/educationEngine";

const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];
const LANG_NAMES = { ko: "한국어", en: "English", ru: "Русский", kz: "Қазақша", zh: "中文", ja: "日本語" };

const CATEGORIES = Object.keys(CATEGORY_LABELS);
const PHASES = Object.keys(PHASE_LABELS);

const INP = "border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white w-full";

const emptyDraft = () => ({
  cancer_type: "stomach",
  content_type: "diet",
  send_at_phase: "week_1",
  media_url: "",
  is_published: true,
  ...Object.fromEntries(LANGS.flatMap((l) => [[`title_${l}`, ""], [`body_${l}`, ""]])),
});

/** 6개 언어 중 제목이 비어 있는 언어 — 「번역 빠짐」을 목록에서 바로 보이게 한다. */
function missingLangs(item) {
  return LANGS.filter((l) => !(item[`title_${l}`] || "").trim());
}

export default function EducationAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null); // 편집 중인 자료(신규면 id 없음)
  const [lang, setLang] = useState("ko");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/education", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "unknown");
        return;
      }
      setItems(json.items || []);
    } catch {
      setError("서버 연결 실패");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // 암종별로 묶어서 보여준다 — 18건이 한 줄로 늘어서면 뭐가 빠졌는지 안 보인다.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = it.cancer_type || "(미분류)";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return [...map.entries()];
  }, [items]);

  const save = async () => {
    if (!draft) return;
    if (!draft.cancer_type) { setError("암종을 고르세요"); return; }
    if (!(draft.title_ko || "").trim()) { setError("한국어 제목은 반드시 필요합니다"); return; }
    setSaving(true);
    setError(null);
    try {
      const isNew = !draft.id;
      const res = await fetch("/api/admin/education", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error || "저장 실패"); return; }
      setSaved(isNew ? "새 자료를 추가했습니다" : "저장했습니다");
      setDraft(null);
      await load();
      setTimeout(() => setSaved(null), 3000);
    } catch {
      setError("서버 연결 실패");
    } finally {
      setSaving(false);
    }
  };

  const cancerLabel = (code) => {
    const found = CANCER_TYPES.find((c) => c.value === code);
    return found ? optLabel(found, "ko") : code;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={22} className="text-teal-700" />
            환자 교육자료
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            환자 화면(내 진료 관리 → 암 가이드)과 사후관리 발송에 나가는 글입니다. 6개 언어로 관리합니다.
          </p>
        </div>
        {!draft && (
          <button
            onClick={() => { setDraft(emptyDraft()); setLang("ko"); }}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition"
          >
            <Plus size={16} /> 새 자료
          </button>
        )}
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-2 bg-teal-50 border border-teal-100 text-teal-800 rounded-xl px-4 py-3 text-sm">
          <Check size={16} /> {saved}
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* 편집 패널 */}
      {draft && (
        <section className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700">
              {draft.id ? "자료 수정" : "새 자료 추가"}
            </h2>
            <button onClick={() => { setDraft(null); setError(null); }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <label className="text-xs text-gray-500">
              암종
              <select className={INP + " mt-1"} value={draft.cancer_type || ""}
                onChange={(e) => setDraft({ ...draft, cancer_type: e.target.value })}>
                {CANCER_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{optLabel(c, "ko")}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-500">
              분류
              <select className={INP + " mt-1"} value={draft.content_type || ""}
                onChange={(e) => setDraft({ ...draft, content_type: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c].ko}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-500">
              보내는 시점
              <select className={INP + " mt-1"} value={draft.send_at_phase || ""}
                onChange={(e) => setDraft({ ...draft, send_at_phase: e.target.value })}>
                {PHASES.map((p) => (
                  <option key={p} value={p}>{PHASE_LABELS[p].ko}</option>
                ))}
              </select>
            </label>
          </div>

          {/* 언어 탭 */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {LANGS.map((l) => {
              const filled = (draft[`title_${l}`] || "").trim();
              return (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition min-h-[36px] ${
                    lang === l ? "bg-teal-700 text-white" : filled ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  {LANG_NAMES[l]}{!filled && lang !== l ? " ·비어있음" : ""}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <label className="block text-xs text-gray-500">
              제목 ({LANG_NAMES[lang]}){lang === "ko" && <span className="text-red-600"> *필수</span>}
              <input className={INP + " mt-1"} value={draft[`title_${lang}`] || ""}
                onChange={(e) => setDraft({ ...draft, [`title_${lang}`]: e.target.value })} />
            </label>
            <label className="block text-xs text-gray-500">
              본문 ({LANG_NAMES[lang]})
              <textarea rows={10} className={INP + " mt-1 leading-relaxed"} value={draft[`body_${lang}`] || ""}
                onChange={(e) => setDraft({ ...draft, [`body_${lang}`]: e.target.value })} />
            </label>
            <label className="block text-xs text-gray-500">
              사진·영상 주소 (선택)
              <input className={INP + " mt-1"} value={draft.media_url || ""} placeholder="https://…"
                onChange={(e) => setDraft({ ...draft, media_url: e.target.value })} />
            </label>
          </div>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="w-4 h-4 accent-teal-700" checked={!!draft.is_published}
                onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} />
              환자에게 보이기
            </label>
            <div className="flex gap-2">
              <button onClick={() => { setDraft(null); setError(null); }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                취소
              </button>
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition disabled:opacity-50">
                {saving && <Loader2 size={15} className="animate-spin" />} 저장
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 목록 */}
      {loading ? (
        <p className="text-sm text-gray-500 py-10 text-center">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 py-10 text-center">등록된 교육자료가 없습니다.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([cancer, list]) => (
            <section key={cancer}>
              <h2 className="text-sm font-bold text-gray-700 mb-2">
                {cancerLabel(cancer)} <span className="text-gray-500 font-normal">· {list.length}건</span>
              </h2>
              <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                {list.map((it) => {
                  const missing = missingLangs(it);
                  return (
                    <button
                      key={it.id}
                      onClick={() => { setDraft({ ...it }); setLang("ko"); setError(null); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition min-h-[44px]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {it.title_ko || "(제목 없음)"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {CATEGORY_LABELS[it.content_type]?.ko || it.content_type || "-"}
                            {" · "}
                            {PHASE_LABELS[it.send_at_phase]?.ko || it.send_at_phase || "-"}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          {missing.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-100">
                              {missing.length}개 언어 비어있음
                            </span>
                          )}
                          {!it.is_published && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium">
                              숨김
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
