"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCoordinatorL, useDateLocale } from "@/lib/i18n/coordinator";
import { homeWhereParts } from "@/lib/content/keyLocation";

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
  // 화면 글자는 코디 포털 공유 사전에서(6개 언어). 상단바 언어 스위처를 바꾸면 즉시 바뀐다.
  const L = useCoordinatorL();
  const dateLoc = useDateLocale();
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
  const [logQ, setLogQ] = useState("");             // 이력 안에서 글자로 찾기
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
        setMsg({ type: "ok", text: L.ceSaved.replace("{n}", data.saved) });
      } else setMsg({ type: "err", text: L.ceSaveFail });
    } catch { setMsg({ type: "err", text: L.ceSaveFailNet }); } finally { setSaving(false); }
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
    setLogTotal(0);   // 이전에 보던 건수가 남아 「전체 247건 중 0건」 처럼 어긋나 보이던 것(독립 리뷰 지적)
    setLogQ("");
    await loadLogs(0);
  };

  // 이력 검색(2026-07-29 PO 요청) — 247건을 눈으로 훑을 순 없다.
  // ⚠️ 「불러온 것만」 걸러내면 **없는데 없다고 보이는** 거짓말이 된다(197건이 아직 안 왔으니).
  //    그래서 검색을 시작하면 먼저 나머지를 다 불러온 뒤 거른다.
  // ponytail: 서버 검색이 아니라 «전부 받아서 화면에서 거르기». 실측 247건 = 2번 요청이면 끝난다.
  //           이력이 수천 건이 되면 그때 서버 검색으로 바꿔라(그 전엔 코드만 늘어난다).
  // ⚠️ 한 글자 칠 때마다 부르면 **같은 줄이 여러 번 붙는다**(«췌장» = 두 번 호출 = 이력 두 벌).
  //    그래서 도는 동안엔 다시 들어오지 못하게 막는다.
  const loadingAllRef = useRef(false);
  const loadAllLogs = async () => {
    if (loadingAllRef.current) return;
    loadingAllRef.current = true;
    try {
      await loadAllLogsInner();
    } finally {
      loadingAllRef.current = false;
    }
  };
  const loadAllLogsInner = async () => {
    let have = logs.length;
    let total = logTotal;
    while (have < total) {
      setLogLoading(true);
      try {
        const res = await fetch(`/api/coordinator/content?logs=1&offset=${have}&limit=200`);
        const data = await res.json();
        if (!data.ok) break;
        const got = data.logs || [];
        if (got.length === 0) break;
        setLogs((prev) => [...prev, ...got]);
        have += got.length;
        total = typeof data.total === "number" ? data.total : total;
        setLogTotal(total);
      } catch { break; } finally { setLogLoading(false); }
    }
  };

  const onLogQ = (v) => {
    setLogQ(v);
    if (v.trim() && logs.length < logTotal) loadAllLogs();
  };

  // 「통계 / 항목1 · 문구」 같은 자리 이름을 **화면 언어로** 조립한다.
  // 서버가 준 한국어 문장(place.where)은 사전에 낱말이 없을 때의 폴백으로만 쓴다
  // (실측 2026-07-29: 러시아어 화면인데 이 자리 72칸 중 22칸이 한국어였다).
  const whereOf = (key, fallback, place) => {
    // 콘텐츠 파일 문구(치료법·암종·병원…)는 서버가 조각(구역·개체 이름·칸)을 준다 — 개체 이름은 고유명사라 그대로,
    // 구역·칸은 사전(ceSec_*·ceFld_*)으로. 안 주면 홈 문구 규칙 → 그것도 아니면 서버 한국어 문장.
    const fp = place?.whereParts;
    if (fp && fp.sectionKey) {
      const sec = L["ceSec_" + fp.sectionKey] || fp.sectionKey;
      const words = (fp.words || []).map((w) => {
        const base = L["ceFld_" + w.f] || w.f;
        return w.n ? `${base}${w.n}` : base;
      });
      return [sec, fp.entity, words.join(" · ")].filter(Boolean).join(" / ");
    }
    const parts = homeWhereParts(key);
    if (!parts) return fallback || null;
    const sec = L["ceSec_" + parts.sectionKey] || parts.sectionKey;
    const words = parts.words.map((w) => {
      const base = L["ceFld_" + w.f] || w.f;
      return w.n ? `${base}${w.n}` : base;
    });
    return words.length ? `${sec} / ${words.join(" · ")}` : sec;
  };

  // 「화면에서 보기」 주소 — 그 화면을 열면서 **그 문구가 있는 자리로 스크롤해 형광펜처럼 칠한다**
  // (크롬·엣지·사파리의 «글자 조각» 주소 기능 #:~:text=). 못 찾으면 그냥 화면만 열린다.
  // 2026-07-31 PO: «어느 화면에 어떻게 표시되고 있어요 미리보기 볼 수 있게 못하겠니».
  const previewHref = (path, values) => {
    if (!path) return null;
    // 공개 화면은 기본이 한국어라 한국어 값으로 찾는다. 없으면 지금 고치는 언어 값.
    const raw = (values?.ko || values?.[editLang] || "").trim();
    // 첫 문장만·60자 이내로 자른다 — 길면 줄바꿈·공백 차이로 못 찾는다.
    // 앞머리 이모지(⚠️ 등)는 떼어낸다 — 화면에선 따로 그려질 수 있어 글자 맞추기가 어긋난다.
    const needle = raw
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .split("\n")[0]
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    return needle.length >= 4 ? `${path}#:~:text=${encodeURIComponent(needle)}` : path;
  };

  // ── 미리보기 (2026-08-03 다시 만듦) ───────────────────────────────
  // 이전 판은 «새 탭으로 여는 링크»였다. PO 가 두 번 «미리보기로 해달라»고 했는데 링크로 줄여
  // 놨고, 게다가 병기 문구는 **2단계**에 있어 그냥 열면 채널 선택 화면만 떴다
  // («화면 열기 누르니깐 문의페이지 나오는데?»). → 이 자리에서 화면을 띄우고 그 문구를 칠한다.
  const [previewKey, setPreviewKey] = useState(null); // 지금 펼친 줄
  const [previewNote, setPreviewNote] = useState(""); // 못 찾았을 때 알릴 말

  /** 미리보기 창 안에서 그 문구를 찾아 노랗게 칠하고 그 자리로 스크롤. 같은 출처라 안이 보인다. */
  // ⚠️ 창이 «떴다»와 «그려졌다»는 다른 사건이다. 문의폼은 브라우저에서 그리는 화면이라
  //    onLoad 직후에 찾으면 아직 아무것도 없다(2026-08-03 실측: 0건). 몇 번 더 두드린다.
  const highlightSoon = (frame, needles) => {
    let tries = 0;
    const tick = () => {
      tries += 1;
      // 2.4초로는 모자랐다(2026-08-03 실측: 자주 묻는 질문 화면이 아직 준비 중이라 놓침).
      // 넉넉히 8초까지 두드린다 — 찾으면 즉시 멈추므로 빠른 화면에선 첫 번에 끝난다.
      if (highlightInFrame(frame, needles, tries >= 16)) return;
      if (tries < 16) setTimeout(tick, 500);
    };
    tick();
  };

  const highlightInFrame = (frame, needles, lastTry = true) => {
    setPreviewNote("");
    // ⚠️ 공유 참조(useRef)로 잡으면 «어느 창인지»가 어긋난다 — 2026-08-03 실측: 창은 떴는데
    //    한 번도 안 칠해졌고 안내문도 안 떴다. 창을 띄운 그 자리에서 «그 창»을 직접 넘겨받는다.
    const doc = frame?.contentDocument || frame?.contentWindow?.document;
    // 2글자 문구(「병기」·「모름」)가 실제로 많다 — 최소 길이를 길게 잡으면 그것들이 통째로 빠진다.
    const list = (Array.isArray(needles) ? needles : [needles]).filter((n) => n && n.length >= 2);
    if (!doc || list.length === 0) return true; // 찾을 글자가 없으면 더 두드릴 이유도 없다
    // 미리보기는 «사이트가 지금 쓰는 언어»로 뜬다(코디 포털 언어와 별개). 그래서 지금 고치는
    // 언어 값·한국어·영어를 모두 시도한다 — 하나라도 맞으면 칠한다.
    // ⚠️ 눈에 «보이는» 글자만 칠한다. 안 그러면 검색엔진용 데이터(JSON-LD)나 숨은 요소에
    //    칠해져 화면상 아무 일도 안 일어난 것처럼 보인다 — 2026-08-03 실측: 자주 묻는 질문
    //    미리보기가 `{"@context":"https://s…` 스크립트 안을 칠하고 있었다(같은 문답이
    //    검색엔진용으로도 박혀 있어서 그쪽이 먼저 걸린다).
    const HIDDEN_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE"]);
    const isVisible = (el) => {
      for (let n = el; n && n !== doc.body; n = n.parentElement) {
        if (HIDDEN_TAGS.has(n.tagName)) return false;
        if (n.hidden || n.getAttribute?.("aria-hidden") === "true") return false;
        const st = frame.contentWindow?.getComputedStyle?.(n);
        if (st && (st.display === "none" || st.visibility === "hidden")) return false;
      }
      return true;
    };
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !list.some((n) => node.nodeValue.includes(n))) continue;
      const el = node.parentElement;
      if (!el || !isVisible(el)) continue;
      el.style.background = "#fde68a";
      el.style.outline = "2px solid #f59e0b";
      el.style.borderRadius = "4px";
      el.scrollIntoView({ block: "center" });
      return true;
    }
    // 못 찾은 건 «없다»가 아니라 «이 화면에선 아직 안 보인다»일 수 있다 — 정직하게 알린다.
    if (lastTry) setPreviewNote(L.cePreviewNotFound || "이 화면에서 그 문구를 못 찾았어요 — 버튼을 눌러야 나오는 자리일 수 있어요.");
    return false;
  };

  /** 미리보기에서 찾을 글자 후보 — 지금 고치는 언어·한국어·영어를 다 준다.
   *  미리보기 창은 «사이트가 지금 쓰는 언어»로 뜨므로 편집 언어 하나만 주면 대개 못 찾는다. */
  const needleOf = (v) =>
    [v?.[editLang], v?.ko, v?.en]
      .filter(Boolean)
      .map((x) => String(x).replace(/^[^\p{L}\p{N}]+/u, "").split("\n")[0].trim().slice(0, 40))
      .filter((x) => x.length >= 2);

  const logNeedle = logQ.trim().toLowerCase();
  const shownLogs = !logNeedle
    ? logs
    : logs.filter((lg) =>
        [lg.new_value, lg.old_value, lg.content_key, lg.editor_email, lg.place?.screen, lg.place?.where]
          .some((s) => String(s || "").toLowerCase().includes(logNeedle))
      );

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
          <h1 className="text-xl font-bold text-gray-900">{L.ceTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{L.ceSubtitle}</p>
        </div>
        {/* shrink-0 whitespace-nowrap: 러시아어 라벨(「К редактированию」)이 길어 휴대폰 폭에서
            버튼이 세 줄로 찌그러졌다(2026-07-29 390px 실측). 줄바꿈 대신 제목 쪽이 좁아지게 둔다. */}
        <button
          onClick={() => (showLog ? setShowLog(false) : openLogs())}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0 whitespace-nowrap"
        >
          {showLog ? L.ceEditBtn : L.ceLogBtn}
        </button>
      </div>

      {showLog ? (
        <div className="space-y-2">
          {logs.length === 0 && !logLoading && <p className="text-sm text-gray-500">{L.ceLogEmpty}</p>}
          {logTotal > 0 && (
            <input
              type="search"
              value={logQ}
              onChange={(e) => onLogQ(e.target.value)}
              placeholder={L.ceLogSearchPh}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          )}
          {logTotal > 0 && (
            <p className="text-xs text-gray-600 mb-1">
              {logNeedle
                ? logLoading
                  ? L.ceLogLoadingAll.replace("{t}", logTotal)
                  : L.ceLogCountFound.replace("{t}", logTotal).replace("{n}", shownLogs.length)
                : L.ceLogCountAll.replace("{t}", logTotal).replace("{n}", logs.length)}
            </p>
          )}
          {logNeedle && !logLoading && shownLogs.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">{L.ceLogNoMatch.replace("{q}", logQ)}</p>
          )}
          {shownLogs.map((lg) => {
            // 화면 이름·비고는 사전에서(6개 언어). 사전에 없는 새 항목은 서버가 준 한국어로 폴백한다.
            const scrName = (lg.place?.screenId && L["ceScr_" + lg.place.screenId]) || lg.place?.screen || null;
            const noteText = (lg.place?.noteId && L["ceNote_" + lg.place.noteId]) || lg.place?.note || null;
            const whereName = whereOf(lg.content_key, lg.place?.where, lg.place);
            return (
            <div key={lg.id} className="text-xs bg-white border border-gray-100 rounded-lg p-3">
              {/* 2026-07-29: 여기가 `home.stats.items.0.label` 같은 **코드 이름만** 보여줬다.
                  코디는 그게 어느 화면인지 알 방법이 없었다(PO: «코디한테 코드 까뒤집어보라고 할까?»).
                  → 사람이 읽는 화면 이름 + 자리 + 「화면 열기」 링크를 앞에 세우고, 코드 이름은 뒤로 뺀다. */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                {scrName ? (
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                    {scrName}
                  </span>
                ) : (
                  <span
                    className="text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded"
                    title={noteText || L.ceScreenUnknownTitle}
                  >
                    {noteText ? L.ceScreenNotFound : L.ceScreenUnknown}
                  </span>
                )}
                {whereName && <span className="text-[11px] text-gray-700">{whereName}</span>}
                <span className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{LANG_LABEL[lg.lang] || lg.lang}</span>
                {lg.place?.path && (
                  <a
                    href={lg.place.path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-teal-700 underline hover:no-underline"
                  >
                    {L.ceOpenScreen}
                  </a>
                )}
                {noteText && <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{noteText}</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-gray-500 mb-1">
                <span>{new Date(lg.changed_at).toLocaleString(dateLoc)}</span>
                <span>·</span><span>{lg.editor_email}</span>
                <span>·</span><span className="font-mono text-gray-500 break-all">{lg.content_key}</span>
              </div>
              {/* 전후 비교: 취소선은 원문 글자를 가려 「원래 뭐였는지」가 안 읽혔다(PO 지적).
                  줄을 긋지 않고 색으로만 구분 — 이전=연빨강, 이후=연초록. 글씨는 700번대(AA). */}
              <div className="flex flex-wrap items-start gap-1.5 text-gray-700">
                {/* whitespace-pre-wrap: 줄바꿈만 바뀐 수정이 «이전=이후» 로 똑같아 보이지 않게 */}
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 whitespace-pre-wrap break-words">
                  {lg.old_value || L.ceEmptyValue}
                </span>
                {lg.from_default && (
                  <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded" title={L.ceDefaultBadgeTitle}>
                    {L.ceDefaultBadge}
                  </span>
                )}
                <span className="text-gray-600">→</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 whitespace-pre-wrap break-words">
                  {lg.new_value || L.ceRevertedToDefault}
                </span>
              </div>
            </div>
            );
          })}
          {logLoading && <p className="text-sm text-gray-500 py-2">{L.ceLoading}</p>}
          {/* 찾는 중엔 이미 전부 불러온 상태라 「더 보기」·「여기까지」를 띄우지 않는다(건수가 두 벌이라 헷갈린다) */}
          {!logNeedle && !logLoading && logs.length < logTotal && (
            <button
              onClick={() => loadLogs(logs.length)}
              className="w-full text-sm py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              {L.ceLoadMore.replace("{n}", logTotal - logs.length)}
            </button>
          )}
          {!logNeedle && !logLoading && logTotal > 0 && logs.length >= logTotal && (
            <p className="text-xs text-gray-600 text-center py-2">{L.ceLogEnd.replace("{n}", logTotal)}</p>
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
                placeholder={L.ceSearchPh}
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-500 mr-1">{L.ceEditLang}</span>
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
            {L.ceLangHint}
          </p>
          <p className="text-[11px] text-gray-500 mb-4">{L.ceLinebreakHint}</p>

          {loading && <p className="text-sm text-gray-500">{L.ceSearching}</p>}
          {!loading && query.trim() && results.length === 0 && (
            <p className="text-sm text-gray-500">{L.ceNoResult.replace("{q}", query)}</p>
          )}
          {!query.trim() && (
            <p className="text-sm text-gray-500">{L.ceStartHint}</p>
          )}

          {results.length > 0 && (hiddenCount > 0 || blockView) && (
            <div className="mb-3">
              <button
                onClick={toggleBlockView}
                className={`text-xs px-2.5 py-1 rounded-full border ${blockView ? "border-teal-400 text-teal-700 bg-teal-50" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                title={L.ceBlockTitle}
              >
                {blockView ? L.ceMatchedOnly : L.ceBlockShow.replace("{n}", hiddenCount)}
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
                    // 사전 문구의 묶음 제목 = 화면 이름. 서버는 한국어로 주므로 코디 언어로 바꿔 단다
                    // (홈 문구는 「홈 · 통계」처럼 구역까지 담고 있어 그대로 둔다).
                    <div className="text-xs font-medium text-gray-500 pt-2 first:pt-0">
                      {(r.section === r.place?.screen && r.place?.screenId && L["ceScr_" + r.place.screenId]) || r.section}
                    </div>
                  )}
                  <div className={`bg-white border rounded-xl p-3.5 ${dirty.some((d) => d.key === r.key) ? "border-teal-400" : "border-gray-200"}`}>
                  {/* 2026-07-31 PO 지적: 여기가 «costCalc.disclaimer» 같은 코드 이름만 보여줘서
                      «각각의 텍스트가 어디에 박혀 있는지 찾기가 어렵다»고 했다. 변경 이력에 이미
                      쓰던 것과 같은 방식으로 «어느 화면 · 어느 자리 + 화면에서 보기»를 앞에 세운다. */}
                  {(() => {
                    const scr = (r.place?.screenId && L["ceScr_" + r.place.screenId]) || r.place?.screen || null;
                    const note = (r.place?.noteId && L["ceNote_" + r.place.noteId]) || r.place?.note || null;
                    const where = whereOf(r.key, r.place?.where, r.place);
                    // reach = 그 문구가 실제로 «보이는» 자리(문의폼 2단계 등). 없으면 화면 첫 주소.
                    const reach = r.place?.reach || r.place?.path || null;
                    const href = previewHref(reach, r.values);
                    const isOpen2 = previewKey === r.key;
                    // 묶음 제목이 이미 화면 이름이면 줄마다 또 달지 않는다(같은 말이 두 번 뜬다).
                    const dupOfHeader = scr && r.section === r.place?.screen;
                    if (!scr && !note && !where && !href) return null;
                    return (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                        {scr && !dupOfHeader && (
                          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">{scr}</span>
                        )}
                        {where && <span className="text-[11px] text-gray-700">{where}</span>}
                        {reach && (
                          <button
                            type="button"
                            onClick={() => { setPreviewNote(""); setPreviewKey(isOpen2 ? null : r.key); }}
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${isOpen2 ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                          >
                            {isOpen2 ? (L.cePreviewClose || "미리보기 닫기") : (L.cePreviewOpen || "미리보기")}
                          </button>
                        )}
                        {href && (
                          <a href={href} target="_blank" rel="noreferrer" className="text-[11px] text-gray-500 underline hover:no-underline">
                            {L.ceOpenScreen}
                          </a>
                        )}
                        {note && <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{note}</span>}
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* 코드 이름은 뒤로 물리되 회색을 더 흐리게는 못 한다(대비 미달 — check:content 가 막는다) */}
                    <span className="text-xs text-gray-500 font-mono truncate" title={r.key}>{r.label}</span>
                    {r.matched === false && (
                      <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded" title={L.ceBlockBadgeTitle}>{L.ceBlockBadge}</span>
                    )}
                    {dupKeys.has(r.key) && (
                      <span
                        className="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded"
                        title={L.ceDupTitle}
                      >
                        {L.ceDup}
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
                            aria-label={`${LANG_LABEL[l]} — ${now ? L.ceLangNow : edited ? L.ceLangEdited : L.ceLangDefault} · ${L.ceLangSwitchHint}`}
                            title={`${LANG_LABEL[l]} — ${now ? L.ceLangNow : edited ? L.ceLangEditedLong : L.ceLangDefault} · ${L.ceLangSwitchHint}`}
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
                      {isOpen ? L.ceCollapse : L.ceExpand}
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

                  {/* 미리보기 — 새 탭이 아니라 «이 자리»에서 그 화면을 띄우고 문구를 칠한다.
                      2026-08-03 PO: «새 탭으로 말고 미리보기로 해달라니깐». 같은 출처라
                      창 안을 들여다볼 수 있어 문구를 찾아 노랗게 칠하고 그 자리로 스크롤한다. */}
                  {previewKey === r.key && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-gray-500">
                          {(r.place?.reach || r.place?.path)}
                        </span>
                        {previewNote && (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{previewNote}</span>
                        )}
                      </div>
                      <iframe
                        title={`preview-${r.key}`}
                        src={r.place?.reach || r.place?.path}
                        onLoad={(e) => highlightSoon(e.currentTarget, needleOf(values[r.key] || r.values))}
                        className="w-full h-[420px] rounded-lg border border-gray-200 bg-white"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        {L.cePreviewHint || "고친 문구는 저장한 뒤 새로고침하면 이 화면에도 반영됩니다."}
                      </p>
                    </div>
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
              {dirty.length > 0 ? L.ceChangedCount.replace("{n}", dirty.length) : L.ceNoChange}
              {msg && <span className={`ml-3 ${msg.type === "ok" ? "text-teal-700" : "text-red-600"}`}>{msg.text}</span>}
            </span>
            <button
              onClick={openConfirm}
              disabled={dirty.length === 0 || saving}
              className="text-sm px-4 py-2 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? L.ceSaving : L.ceSave}
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
                aria-label={L.ceConfirmTitle}
                className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] focus:outline-none"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">{L.ceConfirmHead.replace("{n}", pending.length)}</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    {L.ceConfirmDesc}
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
                          {d.old || L.ceEmptyValue}
                        </span>
                        <span className="text-gray-600">→</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 whitespace-pre-wrap break-words">
                          {d.value || L.ceRevertedToDefault}
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
                    {L.ceConfirmBack}
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || pending.length === 0}
                    className="text-sm px-4 py-2 rounded-lg bg-teal-700 text-white font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {L.ceConfirmSave}
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
