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
  // 기본 = 일치한 것만 (처음 보는 사람이 안 헷갈리게). 켜면 같은 화면 블록까지 함께 표시.
  const [blockView, setBlockView] = useState(false);
  const debounceRef = useRef();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("cms-edit-lang");
    if (saved && LANGS.includes(saved)) setEditLang(saved);
    if (localStorage.getItem("cms-block-view") === "1") setBlockView(true);
  }, []);
  const pickLang = (l) => {
    setEditLang(l);
    try { localStorage.setItem("cms-edit-lang", l); } catch {}
  };
  const toggleBlockView = () => {
    setBlockView((v) => {
      try { localStorage.setItem("cms-block-view", v ? "0" : "1"); } catch {}
      return !v;
    });
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

  // 기본은 검색어와 직접 일치한 줄만. 토글을 켜면 같은 화면 블록(제목·부제·카드)까지 함께.
  const visible = blockView ? results : results.filter((r) => r.matched !== false);
  const hiddenCount = results.length - visible.length;

  // 2026-07-28 가드: 「같은 선택지 묶음」 안에서 편집 언어 문구가 겹치는 줄을 표시한다.
  // 왜: 붙여넣기로 고치다 «폐암·췌장암 버튼이 둘 다 대장암»이 돼 실서비스 문의폼에 하루 가까이 노출됐다.
  // 선택지 라벨이 겹치면 환자가 무엇을 고르는지 알 수 없다 — 저장 전에 눈에 띄게만 한다(막지는 않음).
  //
  // ⚠️ 「화면에 뜬 아무 줄이나」와 비교하면 안 된다: 서로 다른 화면이 같은 단어를 쓰는 건 정상이라
  // («Другое» 8줄, «Рак лёгких» 5줄 …) 배지가 기본 상태로 도배돼 신호 가치가 0이 된다.
  // 그래서 키의 부모 경로가 같은 «형제»끼리만 본다 (intakeLabels.cancer.lung ↔ .pancreatic).
  const parentOf = (key) => key.slice(0, key.lastIndexOf("."));
  const dupKeys = new Set();
  {
    const seen = new Map(); // `${부모}|${값}` → 먼저 본 키
    for (const r of visible) {
      const v = (values[r.key]?.[editLang] ?? "").trim();
      if (!v) continue;
      const id = `${parentOf(r.key)}|${v}`;
      const first = seen.get(id);
      if (first) { dupKeys.add(first); dupKeys.add(r.key); }
      else seen.set(id, r.key);
    }
  }

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
          {logs.length === 0 && <p className="text-sm text-gray-500">아직 변경 이력이 없습니다.</p>}
          {logs.map((lg) => (
            <div key={lg.id} className="text-xs bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex flex-wrap gap-2 text-gray-500 mb-1">
                <span>{new Date(lg.changed_at).toLocaleString("ko-KR")}</span>
                <span>·</span><span>{lg.editor_email}</span>
                <span>·</span><span className="font-mono">{lg.content_key} ({lg.lang})</span>
              </div>
              {/* 전후 비교: 취소선은 원문 글자를 가려 「원래 뭐였는지」가 안 읽혔다(PO 지적).
                  줄을 긋지 않고 색으로만 구분 — 이전=연빨강, 이후=연초록. 글씨는 700번대(AA). */}
              <div className="flex flex-wrap items-center gap-1.5 text-gray-700">
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                  {lg.old_value || "(빈칸)"}
                </span>
                {lg.from_default && (
                  <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded" title="이 문구를 처음 고친 것 — 이전 값은 원래 기본 문구입니다">
                    기본값
                  </span>
                )}
                <span className="text-gray-600">→</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  {lg.new_value || "(기본값으로 되돌림)"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-1">
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1">
              <span className="text-gray-500 text-sm">🔍</span>
              <input
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="전 화면 텍스트 검색 (예: 상담, консультация)"
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-500 mr-1">편집 언어</span>
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => pickLang(l)}
                  className={`text-xs px-2 py-1 rounded ${editLang === l ? "bg-teal-700 text-white font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  {LANG_SHORT[l]}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-600 mb-1">언어는 한 번 고르면 유지됩니다 · 줄을 펼치면 6개어 전부 · 이미 고친 문구로도 검색됩니다</p>
          <p className="text-[11px] text-gray-500 mb-4">줄바꿈(Enter)은 화면에 그대로 반영됩니다 · 줄바꿈 없이 길게 쓰면 화면 폭에 맞춰 자동 줄바꿈 · 줄바꿈이 안 먹는 화면을 발견하면 알려주세요</p>

          {loading && <p className="text-sm text-gray-500">검색 중…</p>}
          {!loading && query.trim() && results.length === 0 && (
            <p className="text-sm text-gray-500">"{query}" 로 찾은 문구가 없습니다.</p>
          )}
          {!query.trim() && (
            <p className="text-sm text-gray-500">위에서 바꾸고 싶은 문구를 검색하세요 (한국어·러시아어 등 아무 언어).</p>
          )}

          {results.length > 0 && (hiddenCount > 0 || blockView) && (
            <div className="mb-3">
              <button
                onClick={toggleBlockView}
                className={`text-xs px-2.5 py-1 rounded-full border ${blockView ? "border-teal-400 text-teal-700 bg-teal-50" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                title="같은 화면 블록의 다른 문구(제목·부제·카드)를 함께 보고 한 번에 고칠 수 있습니다"
              >
                {blockView ? "일치한 것만 보기" : `같은 블록 함께 보기 (+${hiddenCount}줄)`}
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {visible.map((r, i) => {
              const isOpen = !!expanded[r.key];
              const newSection = i === 0 || visible[i - 1].section !== r.section;
              return (
                <Fragment key={r.key}>
                  {newSection && (
                    <div className="text-xs font-medium text-gray-500 pt-2 first:pt-0">{r.section}</div>
                  )}
                  <div className={`bg-white border rounded-xl p-3.5 ${dirty.some((d) => d.key === r.key) ? "border-teal-400" : "border-gray-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 truncate">{r.label}</span>
                    {r.matched === false && (
                      <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded" title="검색어와 직접 일치하진 않지만 같은 화면 블록이라 함께 표시">같은 블록</span>
                    )}
                    {dupKeys.has(r.key) && (
                      <span
                        className="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded"
                        title="같은 묶음의 다른 선택지와 문구가 똑같습니다. 선택 버튼끼리 글자가 겹치면 환자가 무엇을 고르는지 알 수 없습니다 — 확인해 주세요."
                      >
                        문구 중복
                      </span>
                    )}
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [r.key]: !p[r.key] }))}
                      className="ml-auto text-[11px] text-gray-500 hover:text-gray-600"
                    >
                      {isOpen ? "접기 ▲" : "6개어 펼치기 ▾"}
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {LANGS.map((l) => (
                        <div key={l} className="flex items-start gap-2">
                          <span className={`text-[11px] w-9 flex-shrink-0 pt-1.5 ${l === editLang ? "text-teal-700" : "text-gray-500"}`}>{LANG_SHORT[l]}</span>
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
                        <span className="text-[11px] text-gray-500 w-16 flex-shrink-0 pt-1.5">{LANG_LABEL[refLang]}</span>
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
              className="text-sm px-4 py-2 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
