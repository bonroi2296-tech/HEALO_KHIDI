"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState([]); // 확인창에 «얼려서» 보여주고 그대로 저장할 목록
  // 이번 화면에서 저장한 `키|언어` → 고친 언어인가(true) / 기본값으로 되돌렸는가(false).
  // Set 이 아니라 Map 인 이유: 빈 값 저장(=오버라이드 삭제) 뒤에도 재검색 전까지는
  // 서버가 준 editedLangs 가 낡아 «고친 언어» 로 남아 있었다(독립 리뷰 지적).
  const [sessionEdits, setSessionEdits] = useState(() => new Map());
  const dialogRef = useRef();
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logTotal, setLogTotal] = useState(0);      // 전체 이력 건수(«몇 건 중 몇 건» 표시용)
  const [logLoading, setLogLoading] = useState(false);
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

  // old = 저장 전 값(서버 최신). 미리보기에서 «무엇을 무엇으로» 바꾸는지 보여주는 데 쓴다.
  const dirty = [];
  for (const key of Object.keys(values)) {
    for (const lang of LANGS) {
      const cur = values[key]?.[lang] ?? "";
      const old = original[key]?.[lang] ?? "";
      if (cur !== old) dirty.push({ key, lang, value: cur, old });
    }
  }

  // 확인창에 사람이 읽는 항목명을 같이 띄우기 위한 지도(키 → 라벨).
  // 홈 항목은 «홈 · 히어로 / 제목» 처럼 사람 이름이 있고, 사전 키는 라벨=키라 그때는 안 겹치게 뺀다.
  // (사용설명서가 「항목 이름을 확인하라」고 안내하는데 화면엔 점 경로만 있던 불일치 — 독립 리뷰 지적)
  const labelByKey = useMemo(() => {
    const m = {};
    for (const r of results) if (r.label && r.label !== r.key) m[r.key] = r.label;
    return m;
  }, [results]);

  // 「코디가 직접 고친 언어」 — 줄마다 언어 배지를 칠하는 기준(서버가 준 목록 + 이번 화면에서 방금 저장한 것).
  // 저장 직후엔 재검색 전이라 서버 목록이 낡으므로 방금 저장분을 더해 준다.
  const editedByKey = useMemo(() => {
    const m = {};
    for (const r of results) m[r.key] = new Set(r.editedLangs || []);
    return m;
  }, [results]);
  const isEditedLang = (key, lang) => {
    const id = `${key}|${lang}`;
    if (sessionEdits.has(id)) return sessionEdits.get(id); // 이번 화면에서 저장한 것이 서버값보다 최신
    return !!editedByKey[key]?.has(lang);
  };

  // 확인창을 열 때 목록을 «얼린다». 뒤늦게 도착한 검색(디바운스 300ms + 서버 왕복)이
  // original 을 갈아끼우면 화면의 목록이 읽는 도중 조용히 바뀔 수 있어서 — 얼려두면
  // «읽은 것 = 저장되는 것»이 구조로 보장된다(독립 리뷰 P2).
  const openConfirm = () => {
    if (dirty.length === 0) return;
    setPending(dirty);
    setConfirming(true);
  };

  const save = async () => {
    const updates = pending;
    if (!updates || updates.length === 0) return;
    setConfirming(false);
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/coordinator/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // old 는 미리보기 전용 — 서버로 보내지 않는다
        body: JSON.stringify({ updates: updates.map(({ key, lang, value }) => ({ key, lang, value })) }),
      });
      const data = await res.json();
      if (data.ok) {
        setEdit((p) => {
          const n = { ...p.original };
          for (const u of updates) n[u.key] = { ...n[u.key], [u.lang]: u.value };
          return { ...p, original: n };
        });
        setSessionEdits((prev) => {
          const n = new Map(prev);
          for (const u of updates) n.set(`${u.key}|${u.lang}`, (u.value ?? "") !== "");
          return n;
        });
        setMsg({ type: "ok", text: `저장됨 (${data.saved}건). 화면에 반영됩니다.` });
      } else setMsg({ type: "err", text: "저장 실패 (권한 또는 서버 오류)." });
    } catch { setMsg({ type: "err", text: "저장 실패 (네트워크)." }); } finally { setSaving(false); }
  };

  // 확인창: ESC 로 닫기 + 열릴 때 포커스를 창 안으로, 닫힐 때 원래 자리로.
  // Tab 이 뒤 화면으로 새 나가지 않게 창 안에서 돌린다(aria-modal 을 선언한 이상 실제로도 그래야 함).
  useEffect(() => {
    if (!confirming) return;
    const prev = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { setConfirming(false); return; }
      if (e.key !== "Tab") return;
      const f = dialogRef.current?.querySelectorAll("button, [tabindex]:not([tabindex='-1'])");
      if (!f || f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [confirming]);

  // 2026-07-29: 50건 고정이라 그 앞 이력이 통째로 안 보였다(실측 247건 중 50건).
  // 「더 보기」로 이어붙이고, 머릿글에 «전체 몇 건 중 몇 건» 을 보여준다.
  const PAGE = 50;
  const loadLogs = async (offset = 0) => {
    setLogLoading(true);
    try {
      const res = await fetch(`/api/coordinator/content?logs=1&offset=${offset}&limit=${PAGE}`);
      const data = await res.json();
      if (data.ok) {
        setLogs((prev) => (offset === 0 ? (data.logs || []) : [...prev, ...(data.logs || [])]));
        setLogTotal(typeof data.total === "number" ? data.total : (data.logs || []).length);
      }
    } catch {} finally { setLogLoading(false); }
  };

  const openLogs = async () => {
    setConfirming(false);
    setShowLog(true);
    setLogs([]);
    await loadLogs(0);
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
          {logs.length === 0 && !logLoading && <p className="text-sm text-gray-500">아직 변경 이력이 없습니다.</p>}
          {logTotal > 0 && (
            <p className="text-xs text-gray-600 mb-1">
              전체 <b className="text-gray-700">{logTotal}건</b> 중 <b className="text-gray-700">{logs.length}건</b> 보는 중 · 최근 것부터
            </p>
          )}
          {logs.map((lg) => (
            <div key={lg.id} className="text-xs bg-white border border-gray-100 rounded-lg p-3">
              {/* 2026-07-29: 여기가 `home.stats.items.0.label` 같은 **코드 이름만** 보여줬다.
                  코디는 그게 어느 화면인지 알 방법이 없었다(PO: «코디한테 코드 까뒤집어보라고 할까?»).
                  → 사람이 읽는 화면 이름 + 자리 + 「화면 열기」 링크를 앞에 세우고, 코드 이름은 뒤로 뺀다. */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                {lg.place?.screen ? (
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                    {lg.place.screen}
                  </span>
                ) : (
                  <span
                    className="text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded"
                    title={lg.place?.note || "이 문구가 어느 화면인지 아직 목록에 없습니다 — 알려주시면 채워 넣습니다"}
                  >
                    {lg.place?.note ? "화면 못 찾음" : "화면 미확인"}
                  </span>
                )}
                {lg.place?.where && <span className="text-[11px] text-gray-700">{lg.place.where}</span>}
                <span className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{LANG_LABEL[lg.lang] || lg.lang}</span>
                {lg.place?.path && (
                  <a
                    href={lg.place.path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-teal-700 underline hover:no-underline"
                  >
                    화면 열기 ↗
                  </a>
                )}
                {lg.place?.note && <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{lg.place.note}</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-gray-500 mb-1">
                <span>{new Date(lg.changed_at).toLocaleString("ko-KR")}</span>
                <span>·</span><span>{lg.editor_email}</span>
                <span>·</span><span className="font-mono text-gray-500 break-all">{lg.content_key}</span>
              </div>
              {/* 전후 비교: 취소선은 원문 글자를 가려 「원래 뭐였는지」가 안 읽혔다(PO 지적).
                  줄을 긋지 않고 색으로만 구분 — 이전=연빨강, 이후=연초록. 글씨는 700번대(AA). */}
              <div className="flex flex-wrap items-start gap-1.5 text-gray-700">
                {/* whitespace-pre-wrap: 줄바꿈만 바뀐 수정이 «이전=이후» 로 똑같아 보이지 않게 */}
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 whitespace-pre-wrap break-words">
                  {lg.old_value || "(빈칸)"}
                </span>
                {lg.from_default && (
                  <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded" title="이 문구를 처음 고친 것 — 이전 값은 원래 기본 문구입니다">
                    기본값
                  </span>
                )}
                <span className="text-gray-600">→</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 whitespace-pre-wrap break-words">
                  {lg.new_value || "(기본값으로 되돌림)"}
                </span>
              </div>
            </div>
          ))}
          {logLoading && <p className="text-sm text-gray-500 py-2">불러오는 중…</p>}
          {!logLoading && logs.length < logTotal && (
            <button
              onClick={() => loadLogs(logs.length)}
              className="w-full text-sm py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              더 보기 (남은 {logTotal - logs.length}건)
            </button>
          )}
          {!logLoading && logTotal > 0 && logs.length >= logTotal && (
            <p className="text-xs text-gray-600 text-center py-2">여기까지가 전부입니다 · 총 {logTotal}건</p>
          )}
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
          <p className="text-[11px] text-gray-600 mb-1">
            언어는 한 번 고르면 유지됩니다 · 줄마다 <span className="text-teal-700 font-semibold">진한 언어 표시</span>가 «직접 고친 언어»입니다(눌러서 그 언어로 전환) · 줄을 펼치면 6개어 전부 · 이미 고친 문구로도 검색됩니다
          </p>
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
                  <div className="flex flex-wrap items-center gap-2 mb-2">
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
                    {/* 언어 배지 (2026-07-28) — 접힌 줄은 「한국어 + 지금 고치는 언어」 두 칸만 보여준다.
                        그래서 «다른 언어에 내용이 있는지»를 알 방법이 아예 없었다:
                        코디가 카자흐어로 44곳을 저장한 뒤 다른 브라우저에서 열자(편집 언어 기본값=러시아어)
                        카자흐어 칸이 화면에서 빠져 「저장한 게 사라졌다」로 읽혔다(2026-07-28 실사고).
                        → 「코디가 직접 고친 언어」를 진하게 표시하고, 눌러서 그 언어로 바로 전환.
                        ⚠️ 처음엔 «내용이 있는 언어»로 칠했다가 버렸다 — 실측(205줄·배지 1,230개)에서
                        빈 언어가 **0개**라 전부 진하게 떠서 아무것도 구분하지 못했다(가드는 기본 상태에서 조용해야 한다). */}
                    {/* tabIndex=-1: 줄당 6개 × 최대 120줄 = 탭 정거장 720개가 저장 버튼 앞에 생긴다.
                        키보드 사용자는 맨 위 「편집 언어」 도구줄로 같은 일을 할 수 있으므로 이 배지는 마우스 전용(독립 리뷰 지적). */}
                    <div className="ml-auto flex items-center gap-0.5 flex-shrink-0">
                      {LANGS.map((l) => {
                        const edited = isEditedLang(r.key, l);
                        const now = l === editLang;
                        return (
                          <button
                            key={l}
                            onClick={() => pickLang(l)}
                            type="button"
                            tabIndex={-1}
                            aria-pressed={now}
                            aria-label={`${LANG_LABEL[l]} — ${now ? "지금 편집 중" : edited ? "직접 고친 언어" : "기본 문구 그대로"} · 누르면 이 언어를 편집합니다`}
                            title={`${LANG_LABEL[l]} — ${now ? "지금 편집 중" : edited ? "코디가 직접 고친 언어" : "기본 문구 그대로"} · 누르면 이 언어를 편집합니다`}
                            className={`text-[10px] leading-none px-1.5 py-1 rounded transition-colors ${
                              now
                                // 지금 편집 중이면서 «고친 언어» 이면 테두리를 더해 두 정보를 동시에 보인다
                                // (독립 리뷰 지적: 현재 언어 배지가 고친 여부를 가리고 있었다)
                                ? `bg-teal-700 text-white font-bold${edited ? " ring-1 ring-teal-300" : ""}`
                                : edited
                                  ? "text-teal-700 bg-teal-50 font-semibold hover:bg-teal-100"
                                  : "text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            {LANG_SHORT[l]}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [r.key]: !p[r.key] }))}
                      className="text-[11px] text-gray-500 hover:text-gray-600 flex-shrink-0"
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

          {/* 오른쪽 여백: 우하단에 떠 있는 「사용설명서」 버튼(ManualDrawer, `fixed bottom-* right-5`)이
              저장 버튼을 덮는다 — 저장바가 화면에 붙게 고친 뒤 실측으로 드러났다
              (elementFromPoint 가 설명서 버튼을 반환).
              폭을 버튼의 반응형에 맞춘다: 모바일은 라벨이 `hidden sm:inline` 이라 아이콘만(≈70px),
              sm 이상은 라벨까지(≈158px). 한 값으로 박으면 모바일에서 2배를 헛되게 먹는다. */}
          <div className="sticky bottom-[var(--cookie-banner-h,0px)] bg-white/90 backdrop-blur border-t border-gray-200 py-3 pr-20 sm:pr-36 flex items-center justify-between mt-6">
            <span className="text-sm text-gray-500">
              {dirty.length > 0 ? `${dirty.length}곳 변경됨` : "변경 없음"}
              {msg && <span className={`ml-3 ${msg.type === "ok" ? "text-teal-700" : "text-red-600"}`}>{msg.text}</span>}
            </span>
            <button
              onClick={openConfirm}
              disabled={dirty.length === 0 || saving}
              className="text-sm px-4 py-2 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>

          {/* 저장 전 미리보기 (2026-07-28, 반성문 #140).
              왜: 값이 한 줄씩 밀려 들어가는 사고(코디 붙여넣기·자동화 둘 다 겪음)는 값끼리 겹치지
              않아 「문구 중복」 배지가 원리상 못 잡는다. 유일하게 통하는 방어가 «무슨 항목을
              무엇에서 무엇으로 바꾸는지»를 저장 직전에 사람 눈앞에 놓는 것이다.
              색 표기는 변경 이력과 같게(이전=연빨강 / 이후=연초록) — 두 화면을 같은 언어로 읽게.
              z-[10000]: 쿠키 동의 배너가 `z-[9999] fixed bottom-0` 이라 그보다 낮으면 「이대로 저장」
              버튼이 배너에 덮인다(쿠키를 아직 안 누른 브라우저에서 실측 — 같은 이유로 하단 저장바도
              가려진다. 그건 이 화면만의 문제가 아니라 KNOWN_ISSUES 로 분리). */}
          {confirming && (
            <div
              className="fixed inset-0 z-[10000] bg-gray-900/40 flex items-end sm:items-center justify-center p-0 sm:p-6"
              // 누르기 «시작»이 바깥일 때만 닫는다 — 목록의 글자를 드래그해 복사하다
              // 바깥에서 손을 떼면 창이 사라지던 것 방지(독립 리뷰 P3).
              onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirming(false); }}
            >
              <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="저장 전 확인"
                className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] focus:outline-none"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">이렇게 바꿉니다 · {pending.length}곳</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    항목과 바뀌는 내용을 한 번만 확인해 주세요. 엉뚱한 줄이 바뀌고 있진 않은지 보는 자리입니다.
                  </p>
                </div>

                {/* tabIndex=0: 목록이 길면 키보드만 쓰는 사람도 스크롤해서 읽을 수 있어야 한다(독립 리뷰 C2) */}
                <div className="px-5 py-3 overflow-y-auto space-y-2.5" tabIndex={0}>
                  {pending.map((d) => (
                    <div key={`${d.key}|${d.lang}`} className="text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-gray-600 mb-1">
                        {labelByKey[d.key] && <span className="text-gray-700">{labelByKey[d.key]}</span>}
                        <span className="font-mono break-all text-gray-500">{d.key}</span>
                        <span className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">{LANG_LABEL[d.lang]}</span>
                      </div>
                      {/* whitespace-pre-wrap: 줄바꿈만 바뀐 수정이 «이전=이후» 로 똑같아 보이던 것 수정(독립 리뷰 C1).
                          줄바꿈은 화면 레이아웃을 바꾸는 실제 차이라 확인창에서 보여야 한다. */}
                      <div className="flex flex-wrap items-start gap-1.5 text-gray-700">
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 whitespace-pre-wrap break-words">
                          {d.old || "(빈칸)"}
                        </span>
                        <span className="text-gray-600">→</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 whitespace-pre-wrap break-words">
                          {d.value || "(기본값으로 되돌림)"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    다시 볼게요
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || pending.length === 0}
                    className="text-sm px-4 py-2 rounded-lg bg-teal-700 text-white font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    이대로 저장
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
