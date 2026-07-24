"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];
const LANG_LABEL = { ko: "한국어", en: "English", ru: "Русский", kz: "Қазақша", zh: "中文", ja: "日本語" };
const LANG_SHORT = { ko: "한", en: "EN", ru: "РУ", kz: "ҚЗ", zh: "中", ja: "日" };

// 여러 줄 문구도 한 칸에서 통째로 수정(줄바꿈 보존). 줄 수만큼 자동으로 늘어난다.
function Field({ value, onChange, dirty, size = "sm" }) {
  const v = value ?? "";
  return (
    <textarea
      rows={Math.max(1, String(v).split("\n").length)}
      value={v}
      onChange={onChange}
      className={`flex-1 ${size === "xs" ? "text-xs" : "text-sm"} rounded border px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 ${dirty ? "border-teal-400" : "border-gray-200"}`}
    />
  );
}

export default function ContentEditorClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editLang, setEditLang] = useState("ru");
  const [expanded, setExpanded] = useState({});
  // values/original 을 한 상태로 — 검색 새로고침 때 "dirty 보존 + 나머지 서버값" 판단에 둘 다 필요
  const [edit, setEdit] = useState({ values: {}, original: {} });
  const { values, original } = edit;
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState([]);
  const debounceRef = useRef();

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("cms-edit-lang");
    if (saved && LANGS.includes(saved)) setEditLang(saved);
  }, []);
  const pickLang = (l) => {
    setEditLang(l);
    try { localStorage.setItem("cms-edit-lang", l); } catch {}
  };

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/coordinator/content?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.ok) {
        setResults(data.results || []);
        // 서버 최신값으로 새로고침(빈값 저장=원문 복원 뒤에도 편집기가 실제 화면과 일치),
        // 단 아직 저장 안 한 편집(dirty)은 보존.
        setEdit((prev) => {
          const nextValues = { ...prev.values };
          const nextOriginal = { ...prev.original };
          for (const r of data.results || []) {
            const cur = prev.values[r.key] || {};
            const orig = prev.original[r.key] || {};
            const v = {};
            for (const l of LANGS) {
              const isDirty = (cur[l] ?? "") !== (orig[l] ?? "");
              v[l] = isDirty ? (cur[l] ?? "") : (r.values[l] ?? "");
            }
            nextValues[r.key] = v;
            nextOriginal[r.key] = { ...r.values };
          }
          return { values: nextValues, original: nextOriginal };
        });
      }
    } catch {} finally { setLoading(false); }
  }, []);

  const onQuery = (v) => {
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 300);
  };

  const onChange = (key, lang, val) => {
    setEdit((p) => ({ ...p, values: { ...p.values, [key]: { ...p.values[key], [lang]: val } } }));
    setMsg(null);
  };

  const dirty = [];
  for (const key of Object.keys(values)) {
    for (const lang of LANGS) {
      const cur = values[key]?.[lang] ?? "";
      if (cur !== (original[key]?.[lang] ?? "")) dirty.push({ key, lang, value: cur });
    }
  }

  const save = async () => {
    if (dirty.length === 0) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/coordinator/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: dirty }),
      });
      const data = await res.json();
      if (data.ok) {
        setEdit((p) => {
          const n = { ...p.original };
          for (const u of dirty) n[u.key] = { ...n[u.key], [u.lang]: u.value };
          return { ...p, original: n };
        });
        setMsg({ type: "ok", text: `저장됨 (${data.saved}건). 화면에 반영됩니다.` });
      } else setMsg({ type: "err", text: "저장 실패 (권한 또는 서버 오류)." });
    } catch { setMsg({ type: "err", text: "저장 실패 (네트워크)." }); } finally { setSaving(false); }
  };

  const openLogs = async () => {
    setShowLog(true);
    try {
      const res = await fetch("/api/coordinator/content?logs=1");
      const data = await res.json();
      if (data.ok) setLogs(data.logs || []);
    } catch {}
  };

  const refLang = editLang === "ko" ? "en" : "ko";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">콘텐츠 편집 · 전 화면</h1>
          <p className="text-sm text-gray-500 mt-0.5">문구를 검색해 고치면 해당 화면에 바로 반영됩니다.</p>
        </div>
        <button
          onClick={() => (showLog ? setShowLog(false) : openLogs())}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          {showLog ? "편집으로" : "변경 이력"}
        </button>
      </div>

      {showLog ? (
        <div className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-gray-400">아직 변경 이력이 없습니다.</p>}
          {logs.map((lg) => (
            <div key={lg.id} className="text-xs bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex flex-wrap gap-2 text-gray-500 mb-1">
                <span>{new Date(lg.changed_at).toLocaleString("ko-KR")}</span>
                <span>·</span><span>{lg.editor_email}</span>
                <span>·</span><span className="font-mono">{lg.content_key} ({lg.lang})</span>
              </div>
              <div className="text-gray-700">
                <span className="line-through text-gray-400">{lg.old_value || "(없음)"}</span> → <span>{lg.new_value}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-1">
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1">
              <span className="text-gray-400 text-sm">🔍</span>
              <input
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="전 화면 텍스트 검색 (예: 상담, консультация)"
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400 mr-1">편집 언어</span>
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => pickLang(l)}
                  className={`text-xs px-2 py-1 rounded ${editLang === l ? "bg-teal-600 text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  {LANG_SHORT[l]}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mb-4">언어는 한 번 고르면 유지됩니다 · 줄을 펼치면 6개어 전부 · 이미 고친 문구로도 검색됩니다</p>

          {loading && <p className="text-sm text-gray-400">검색 중…</p>}
          {!loading && query.trim() && results.length === 0 && (
            <p className="text-sm text-gray-400">"{query}" 로 찾은 문구가 없습니다.</p>
          )}
          {!query.trim() && (
            <p className="text-sm text-gray-400">위에서 바꾸고 싶은 문구를 검색하세요 (한국어·러시아어 등 아무 언어).</p>
          )}

          <div className="space-y-2.5">
            {results.map((r, i) => {
              const isOpen = !!expanded[r.key];
              const newSection = i === 0 || results[i - 1].section !== r.section;
              return (
                <Fragment key={r.key}>
                  {newSection && (
                    <div className="text-xs font-medium text-gray-500 pt-2 first:pt-0">{r.section}</div>
                  )}
                  <div className={`bg-white border rounded-xl p-3.5 ${dirty.some((d) => d.key === r.key) ? "border-teal-400" : "border-gray-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 truncate">{r.label}</span>
                    {r.matched === false && (
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded" title="검색어와 직접 일치하진 않지만 같은 화면 블록이라 함께 표시">같은 블록</span>
                    )}
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [r.key]: !p[r.key] }))}
                      className="ml-auto text-[11px] text-gray-400 hover:text-gray-600"
                    >
                      {isOpen ? "접기 ▲" : "6개어 펼치기 ▾"}
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {LANGS.map((l) => (
                        <div key={l} className="flex items-start gap-2">
                          <span className={`text-[11px] w-9 flex-shrink-0 pt-1.5 ${l === editLang ? "text-teal-700" : "text-gray-400"}`}>{LANG_SHORT[l]}</span>
                          <Field
                            size="xs"
                            value={values[r.key]?.[l]}
                            onChange={(e) => onChange(r.key, l, e.target.value)}
                            dirty={(values[r.key]?.[l] ?? "") !== (original[r.key]?.[l] ?? "")}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className="text-[11px] text-gray-400 w-16 flex-shrink-0 pt-1.5">{LANG_LABEL[refLang]}</span>
                        <Field
                          value={values[r.key]?.[refLang]}
                          onChange={(e) => onChange(r.key, refLang, e.target.value)}
                          dirty={(values[r.key]?.[refLang] ?? "") !== (original[r.key]?.[refLang] ?? "")}
                        />
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] text-teal-700 w-16 flex-shrink-0 pt-1.5">{LANG_LABEL[editLang]}</span>
                        <Field
                          value={values[r.key]?.[editLang]}
                          onChange={(e) => onChange(r.key, editLang, e.target.value)}
                          dirty={(values[r.key]?.[editLang] ?? "") !== (original[r.key]?.[editLang] ?? "")}
                        />
                      </div>
                    </>
                  )}
                  </div>
                </Fragment>
              );
            })}
          </div>

          <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-200 py-3 flex items-center justify-between mt-6">
            <span className="text-sm text-gray-500">
              {dirty.length > 0 ? `${dirty.length}곳 변경됨` : "변경 없음"}
              {msg && <span className={`ml-3 ${msg.type === "ok" ? "text-teal-700" : "text-red-600"}`}>{msg.text}</span>}
            </span>
            <button
              onClick={save}
              disabled={dirty.length === 0 || saving}
              className="text-sm px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
