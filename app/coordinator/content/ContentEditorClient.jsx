"use client";

import { useMemo, useState } from "react";

const LANG_LABEL = {
  ko: "한국어",
  en: "English",
  ru: "Русский",
  kz: "Қазақша",
  zh: "中文",
  ja: "日本語",
};

export default function ContentEditorClient({ items, logs, langs }) {
  const [values, setValues] = useState(() => {
    const v = {};
    for (const it of items) v[it.key] = { ...it.values };
    return v;
  });
  const [original] = useState(() => {
    const v = {};
    for (const it of items) v[it.key] = { ...it.values };
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showLog, setShowLog] = useState(false);

  const dirty = useMemo(() => {
    const out = [];
    for (const it of items) {
      for (const lang of langs) {
        const cur = values[it.key]?.[lang] ?? "";
        if (cur !== (original[it.key]?.[lang] ?? "")) out.push({ key: it.key, lang, value: cur });
      }
    }
    return out;
  }, [values, items, langs, original]);

  const sections = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (!map.has(it.section)) map.set(it.section, []);
      map.get(it.section).push(it);
    }
    return [...map.entries()];
  }, [items]);

  const onChange = (key, lang, val) => {
    setValues((prev) => ({ ...prev, [key]: { ...prev[key], [lang]: val } }));
    setMsg(null);
  };

  const save = async () => {
    if (dirty.length === 0) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/coordinator/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: dirty }),
      });
      const data = await res.json();
      if (data.ok) {
        for (const u of dirty) original[u.key][u.lang] = u.value;
        setMsg({ type: "ok", text: `저장됨 (${data.saved}건). 홈에 반영됩니다.` });
      } else {
        setMsg({ type: "err", text: "저장 실패. 권한 또는 서버 오류." });
      }
    } catch {
      setMsg({ type: "err", text: "저장 실패. 네트워크 오류." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">콘텐츠 편집 · 홈페이지</h1>
          <p className="text-sm text-gray-500 mt-1">문구를 언어별로 고치고 저장하면 홈에 바로 반영됩니다.</p>
        </div>
        <button
          onClick={() => setShowLog((s) => !s)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          {showLog ? "편집으로" : "변경 이력"}
        </button>
      </div>

      {showLog ? (
        <div className="space-y-2">
          {(logs || []).length === 0 && <p className="text-sm text-gray-400">아직 변경 이력이 없습니다.</p>}
          {(logs || []).map((lg) => (
            <div key={lg.id} className="text-xs bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex gap-2 text-gray-500 mb-1">
                <span>{new Date(lg.changed_at).toLocaleString("ko-KR")}</span>
                <span>·</span>
                <span>{lg.editor_email}</span>
                <span>·</span>
                <span className="font-mono">{lg.content_key} ({lg.lang})</span>
              </div>
              <div className="text-gray-700">
                <span className="line-through text-gray-400">{lg.old_value || "(없음)"}</span>
                {" → "}
                <span>{lg.new_value}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {sections.map(([section, secItems]) => (
            <div key={section} className="mb-6">
              <h2 className="text-sm font-bold text-teal-800 mb-3">{section}</h2>
              <div className="space-y-3">
                {secItems.map((it) => (
                  <div key={it.key} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-800">{it.label}</span>
                      {it.overridden && (
                        <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded">편집됨</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {langs.map((lang) => {
                        const changed = (values[it.key]?.[lang] ?? "") !== (original[it.key]?.[lang] ?? "");
                        return (
                          <div key={lang}>
                            <div className={`text-[11px] mb-1 ${changed ? "text-teal-700" : "text-gray-400"}`}>
                              {LANG_LABEL[lang]}
                              {changed && " · 변경됨"}
                            </div>
                            <textarea
                              value={values[it.key]?.[lang] ?? ""}
                              onChange={(e) => onChange(it.key, lang, e.target.value)}
                              rows={2}
                              className={`w-full text-sm rounded-lg border px-2 py-1.5 resize-y focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                                changed ? "border-teal-400" : "border-gray-200"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

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
