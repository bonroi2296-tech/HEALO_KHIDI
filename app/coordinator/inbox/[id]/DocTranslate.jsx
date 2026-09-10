"use client";

/**
 * 코디 인박스 — 외국 의료서류 «원문 1:1 번역» 공용 부품.
 *
 * 왜 따로 뺐나 (2026-09-10, 문의 #316):
 *   번역 단추가 «환자가 낸 첨부»에만 달려 있었다. 그런데 이대(EUMC)가 러시아어로 보내온
 *   진료비 견적서는 «환자에게 보낼 서류»(case_shared_documents) 칸에 올라가 그 단추가 없었다 —
 *   PO 가 자기 백오피스에 든 문서를 못 읽었다. 서버(/api/attachments/translate)는 두 칸을 이미
 *   똑같이 처리할 수 있었다(같은 attachments 버킷, 같은 inquiry/ 경로). **없던 건 화면뿐이다.**
 *   그래서 화면 부품을 이 파일로 빼서 두 칸이 같은 것을 쓴다 — 복붙본이 갈라지지 않게.
 *
 * 담긴 것: 출력 언어 목록·고지문 / 인쇄(PDF) / 번역 결과 화면 / 서버 호출 묶음(useDocTranslate).
 * 번역·검증·저장·용어등록 로직 자체는 서버(src/lib/documents/translateDoc.ts)에 그대로 있다.
 */

import { useState, useRef } from "react";
import { FileText, Copy, Check, X, ShieldCheck, Pencil, ChevronLeft, ChevronRight, Languages } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useCoordinatorL } from "@/lib/i18n/coordinator";
import { scrollBehavior } from "@/lib/a11y/prefersReducedMotion";

// HTML 이스케이프(모델 출력을 새 창에 안전 렌더).
function escHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 첨부 번역 출력 언어(코디=한글 / 병원의뢰=영문 / 환자·에이전시=러시아어). 고지문은 출력 언어에 맞춘다.
export const OUT_LANGS = [{ key: "ko", label: "한" }, { key: "en", label: "EN" }, { key: "ru", label: "RU" }];
export const DISCLAIMER = {
  ko: "원문을 그대로 옮긴 번역입니다(요약 아님). 숫자·정상범위는 원본과 대조하세요.",
  en: "Faithful full translation (not a summary). Verify numbers and reference ranges against the original.",
  ru: "Дословный полный перевод (не резюме). Сверяйте цифры и референсные значения с оригиналом.",
};
export const TR_LABEL = { ko: "한글 번역", en: "Translation", ru: "Перевод" };

// 번역 결과를 깨끗한 새 창으로 열어 인쇄 → 'PDF로 저장'. 한글+키릴이 한 줄에 섞여 있어
// @react-pdf(단일 폰트) 로는 깨진다 → 브라우저 인쇄(시스템 폰트)가 유일하게 안전. 새 의존성 0.
export function printTranslation(doc, name, lang = "ko", msgPopupBlocked = "") {
  const sections = (doc.sections || []).map((s) => {
    let inner = "";
    if (s.title) inner += `<h2>${escHtml(s.title)}</h2>`;
    if (s.note) inner += `<p class="note">${escHtml(s.note)}</p>`;
    if (Array.isArray(s.columns) && Array.isArray(s.rows) && s.rows.length) {
      const head = `<tr>${s.columns.map((c) => `<th>${escHtml(c)}</th>`).join("")}</tr>`;
      const body = s.rows.map((r) => `<tr>${(r?.cells || []).map((c) => `<td>${escHtml(c)}</td>`).join("")}</tr>`).join("");
      inner += `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
    }
    if (s.text) inner += `<p class="text">${escHtml(s.text)}</p>`;
    return `<section>${inner}</section>`;
  }).join("");

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<title>${escHtml(name || doc.docType)} — ${escHtml(TR_LABEL[lang] || TR_LABEL.ko)}</title>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,"Malgun Gothic","Segoe UI",sans-serif;color:#111;margin:24px;font-size:12px}
h1{font-size:16px;margin:0 0 2px}
.sub{color:#555;margin:0 0 4px}
.disc{color:#888;font-size:10px;margin:0 0 16px}
h2{font-size:13px;margin:18px 0 6px}
.note{color:#555;white-space:pre-wrap;margin:0 0 6px}
.text{white-space:pre-wrap;line-height:1.5}
table{width:100%;border-collapse:collapse;margin:4px 0 8px}
th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f3f4f6}
@media print{body{margin:12mm}tr{page-break-inside:avoid}}
</style></head><body>
<h1>${escHtml(doc.docType)}</h1>
<p class="sub">원본: ${escHtml(name || "")} · healwith ${escHtml(TR_LABEL[lang] || TR_LABEL.ko)}</p>
<p class="disc">${escHtml(DISCLAIMER[lang] || DISCLAIMER.ko)}</p>
${sections}
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert(msgPopupBlocked); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* 사용자가 수동 인쇄 */ } }, 400);
}

// 외국 검사지 번역 결과(요약 아님, 원문 1:1). 표는 가로 스크롤(반응형).
// 기능: 숫자검증(원본 대조) · 수정(코디 교정→저장) · 용어 사전 등록(다음 번역에 반영).
export function TranslatedDocView({ doc, onCopy, copied, onPdf, lang = "ko", onVerify, verify, onSave, onGlossary }) {
  // 화면 글자는 코디 언어로(번역 결과물의 언어 lang 과는 별개다 — 섞지 말 것).
  const L = useCoordinatorL();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [gSrc, setGSrc] = useState("");
  const [gTgt, setGTgt] = useState("");
  const [gDone, setGDone] = useState(false);
  const langLabel = (OUT_LANGS.find((o) => o.key === lang) || {}).label || lang;
  const view = editing && draft ? draft : doc;

  // 쪽 고르기 — 20쪽짜리를 한 줄로 쭉 늘어놓으면 못 본다(PO 요청 2026-08-03).
  // 번역이 쪽별로 돌아가서 각 칸에 page 가 붙어 있다. 옛 번역엔 없으니 그때는 그냥 다 보여준다.
  const [pageSel, setPageSel] = useState(1); // 0 = 전체
  const allSections = view.sections || [];
  const pageList = [...new Set(allSections.map((s) => s?.page).filter(Boolean))].sort((a, b) => a - b);
  const curPage = !pageList.length || pageSel === 0 ? 0 : (pageList.includes(pageSel) ? pageSel : pageList[0]);
  // 편집 저장은 «원래 번호»로 해야 한다 — 걸러낸 순서로 쓰면 엉뚱한 칸이 바뀐다.
  const shown = allSections
    .map((s, i) => [s, i])
    .filter(([s]) => curPage === 0 || s?.page === curPage);
  // 쪽을 넘기면 «그 쪽의 처음»부터 보이게 맨 위로 올린다. 안 그러면 긴 쪽을 읽고 넘겼을 때
  // 화면이 그 자리에 남아 새 쪽의 중간부터 보인다(PO 지적 2026-08-10).
  const topRef = useRef(null);
  const goPage = (n) => {
    setPageSel(n);
    requestAnimationFrame(() => {
      // 파일 이름 줄까지 보이게 «첨부 카드 통째»로 올린다(PO 2026-08-10). 못 찾으면 번역 카드 머리로.
      const card = topRef.current?.closest("[data-attachment-card]") || topRef.current;
      card?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
    });
  };
  const pageStep = (d) => {
    const at = pageList.indexOf(curPage);
    const next = pageList[Math.max(0, Math.min(pageList.length - 1, at + d))];
    if (next) goPage(next);
  };

  function startEdit() { setDraft(JSON.parse(JSON.stringify(doc))); setEditing(true); }
  function cancelEdit() { setEditing(false); setDraft(null); }
  function patch(updater) {
    setDraft((prev) => { const next = JSON.parse(JSON.stringify(prev)); updater(next); return next; });
  }
  async function save() {
    setSaving(true);
    await onSave?.(draft);
    setSaving(false); setEditing(false); setDraft(null);
  }
  async function submitGlossary() {
    const src = gSrc.trim(), tgt = gTgt.trim();
    if (!src || !tgt) return;
    await onGlossary?.(src, tgt);
    setGDone(true); setGSrc(""); setGTgt("");
    setTimeout(() => setGDone(false), 2500);
  }

  return (
    <div>
      {/* 쪽을 넘겼을 때 돌아올 자리.
          여유를 크게(6rem) 둔다 — 화면 맨 위에 붙박이 머리띠(약 65px)가 떠 있어서, 여유가 작으면
          카드 머리와 안내문이 그 밑에 깔려 «중간부터» 보인다(실측 2026-08-10: 여유 1rem 이면 19px 에
          멈춰 머리띠에 가려짐). */}
      <div ref={topRef} className="scroll-mt-24" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-700 shrink-0">
            {doc.docTypeShort}
          </span>
          <span className="text-xs text-gray-500 truncate">{doc.docType}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {editing ? (
            <>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-teal-300 bg-teal-700 text-white hover:bg-teal-700 transition disabled:opacity-50">
                {saving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={13} />} 저장
              </button>
              <button onClick={cancelEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition">
                <X size={13} /> {L.atCancel}
              </button>
            </>
          ) : (
            <>
              <button onClick={onVerify} disabled={verify?.loading} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition disabled:opacity-50" title={L.atVerifyTitle}>
                {verify?.loading ? <span className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /> : <ShieldCheck size={13} />} 숫자검증
              </button>
              <button onClick={startEdit} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition" title={L.atEditNote}>
                <Pencil size={13} /> {L.atEdit}
              </button>
              <button onClick={onPdf} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition" title={L.atPdfTitle}>
                <FileText size={13} /> PDF
              </button>
              <button onClick={onCopy} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition">
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? L.atCopied : L.atCopy}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 숫자검증 결과 배너 — 어긋난 항목만 (번역값 / 원본재판독값) 쌍으로 */}
      {verify && !verify.loading && (
        verify.error ? (
          <p className="text-xs text-amber-700 mb-2">{L.atErrVerify}</p>
        ) : verify.mismatches?.length ? (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mb-2 space-y-1">
            <div className="font-medium">⚠️ 원본과 다르게 읽힌 숫자 {verify.mismatches.length}곳 — 원본을 직접 확인하세요</div>
            <ul className="space-y-0.5">
              {verify.mismatches.map((m, i) => (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className="text-amber-900">{m.item || L.atItemFallback}</span>
                  <span>{L.atTranslate} <b>{m.translated}</b> {L.atVerifyReread} <b>{m.source}</b></span>
                </li>
              ))}
            </ul>
            <div className="text-[11px] text-amber-600">{L.atVerifyWarn}</div>
          </div>
        ) : (
          <p className="text-xs text-teal-700 mb-2">{L.atVerifyOk}</p>
        )
      )}

      <p className="text-[11px] text-gray-500 mb-3">
        {DISCLAIMER[lang] || DISCLAIMER.ko}
      </p>
      <div className="space-y-4">
        {shown.map(([s, si]) => (
          <div key={si}>
            {s.title && <div className="text-sm font-semibold text-gray-700 mb-1">{s.title}</div>}
            {s.note != null && s.note !== "" && (
              editing ? (
                <textarea value={s.note} onChange={(e) => patch((d) => { d.sections[si].note = e.target.value; })}
                  rows={2} className="w-full text-xs text-gray-600 border border-gray-200 rounded px-1.5 py-1 mb-1.5" />
              ) : (
                <p className="text-xs text-gray-500 mb-1.5 whitespace-pre-wrap">{s.note}</p>
              )
            )}
            {Array.isArray(s.columns) && Array.isArray(s.rows) && s.rows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      {s.columns.map((c, ci) => (
                        <th key={ci} className="text-left font-medium px-2.5 py-1.5 whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r, ri) => (
                      <tr key={ri} className="border-t border-gray-100">
                        {(r?.cells || []).map((cell, ci) => (
                          <td key={ci} className="px-2.5 py-1.5 text-gray-800 align-top">
                            {editing ? (
                              <input value={cell ?? ""} onChange={(e) => patch((d) => { d.sections[si].rows[ri].cells[ci] = e.target.value; })}
                                className="w-full min-w-[5rem] border border-gray-200 rounded px-1 py-0.5 text-xs" />
                            ) : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.text != null && s.text !== "" && (
              editing ? (
                <textarea value={s.text} onChange={(e) => patch((d) => { d.sections[si].text = e.target.value; })}
                  rows={4} className="w-full text-sm text-gray-800 border border-gray-200 rounded px-1.5 py-1" />
              ) : (
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{s.text}</p>
              )
            )}
          </div>
        ))}
      </div>

      {/* 쪽 고르기 — 원본 쪽 번호 그대로. 「전체」는 예전처럼 쭉 이어서 본다(인쇄·복사 전 확인용). */}
      {pageList.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-gray-100">
          <button onClick={() => pageStep(-1)} disabled={curPage === 0 || curPage === pageList[0]}
            className="p-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30" aria-label="이전 쪽">
            <ChevronLeft size={14} />
          </button>
          <div className="flex items-center gap-1 flex-wrap">
            {pageList.map((p) => (
              <button key={p} onClick={() => goPage(p)}
                className={`min-w-[1.75rem] px-1.5 py-1 rounded-md border text-xs transition ${
                  curPage === p ? "border-teal-700 bg-teal-700 text-white font-semibold"
                               : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => pageStep(1)} disabled={curPage === 0 || curPage === pageList[pageList.length - 1]}
            className="p-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30" aria-label="다음 쪽">
            <ChevronRight size={14} />
          </button>
          <button onClick={() => goPage(curPage === 0 ? pageList[0] : 0)}
            className={`ml-1 px-2 py-1 rounded-md border text-xs transition ${
              curPage === 0 ? "border-teal-700 bg-teal-700 text-white font-semibold"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
            전체
          </button>
          <span className="text-[11px] text-gray-500 ml-auto">원본 {pageList.length}쪽</span>
        </div>
      )}

      {/* 편집 모드: 용어 사전 등록(원문→대상언어). 다음 번역부터 반영 */}
      {editing && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-end gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-500 mb-0.5">{L.atGlossarySrc}</span>
            <input value={gSrc} onChange={(e) => setGSrc(e.target.value)} placeholder={L.atGlossarySrcPh}
              className="border border-gray-200 rounded px-1.5 py-1 text-xs w-40" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-500 mb-0.5">번역({langLabel})</span>
            <input value={gTgt} onChange={(e) => setGTgt(e.target.value)} placeholder={L.atGlossaryTgtPh}
              className="border border-gray-200 rounded px-1.5 py-1 text-xs w-48" />
          </div>
          <button onClick={submitGlossary} disabled={!gSrc.trim() || !gTgt.trim()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition disabled:opacity-40">
            {L.atGlossaryAdd}
          </button>
          {gDone && <span className="text-xs text-teal-700">{L.atGlossaryDone}</span>}
        </div>
      )}
    </div>
  );
}

/**
 * 번역 상태·서버 호출 묶음. 첨부 칸과 「환자에게 보낼 서류」 칸이 같은 것을 쓴다.
 *
 * 키는 `${경로}::${출력언어}` — 같은 파일을 한/영/러로 각각 받아두고 오갈 수 있어야 한다.
 * 서버는 (path, lang) 로 캐시하므로 두 번째부터는 모델을 다시 부르지 않는다(비용 0).
 */
export function useDocTranslate() {
  const [loadingKey, setLoadingKey] = useState(null);   // 번역 중인 키
  const [entries, setEntries] = useState({});           // key -> { doc } | { error }
  const [langByPath, setLangByPath] = useState({});     // path -> 출력 언어(기본 ko)
  const [verifyByKey, setVerifyByKey] = useState({});   // key -> { loading } | { mismatches } | { error }
  const [copiedKey, setCopiedKey] = useState(null);

  const tKey = (path, lg) => `${path}::${lg}`;
  const langOf = (path) => langByPath[path] || "ko";
  const setLang = (path, lg) => setLangByPath((prev) => ({ ...prev, [path]: lg }));
  const entryOf = (path, lg) => entries[tKey(path, lg)];
  const verifyOf = (path, lg) => verifyByKey[tKey(path, lg)];

  // 인증 헤더 — 코디 화면은 Bearer 토큰으로 서버 창구를 부른다.
  async function authHeaders() {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` };
  }

  // 앞의 «/» 는 서버 경로검증(inquiry/ 로 시작)에 걸린다 — 여기서 한 번 털고 보낸다.
  const cleanOf = (path) => (path.startsWith("/") ? path.slice(1) : path);

  async function post(body) {
    const headers = await authHeaders();
    if (!headers) return { ok: false, error: "no_session" };
    const res = await fetch("/api/attachments/translate", { method: "POST", headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.ok ? data : { ok: false, error: data.error || "request_failed" };
  }

  /**
   * 실패했다고 «이미 읽고 있던 번역»을 지우지 않는다.
   * 왜: 코디가 러시아어 견적서를 펼쳐 놓고 읽는 중에 다른 탭에서 로그아웃되면(또는 토큰 갱신 실패)
   *     「재변환」 한 번에 표·소견이 통째로 사라지고 오류 한 줄만 남는다. 옛 인라인 코드는
   *     세션이 없으면 아무것도 안 건드리고 빠져나갔다 — 그 안전함을 지키되, 모든 실패로 넓혔다.
   *     처음 번역이면(=보여줄 게 없으면) 그때는 오류를 띄워야 한다.
   */
  function failEntry(key, error) {
    setEntries((prev) => (prev[key]?.doc ? prev : { ...prev, [key]: { error } }));
  }

  /**
   * 원문 1:1 번역(요약 아님). force=true 면 캐시 무시하고 다시 돌린다.
   * mime: 업로드 때 서버가 검증해 저장해 둔 형식. 파일명에 확장자가 없어도 이걸로 읽어낸다.
   */
  async function translate(path, name, lg, force = false, mime = null) {
    if (!path) return;
    const key = tKey(path, lg);
    setLoadingKey(key);
    try {
      const d = await post({ path: cleanOf(path), name, lang: lg, force, mimeType: mime || undefined });
      if (d.ok && d.doc) {
        setEntries((prev) => ({ ...prev, [key]: { doc: d.doc } }));
        setVerifyByKey((prev) => { const n = { ...prev }; delete n[key]; return n; }); // 새 번역 → 낡은 검증 제거
      } else {
        failEntry(key, d.error || "translate_failed");
      }
    } catch (e) {
      console.error("[docTranslate] translate:", e);
      failEntry(key, "translate_failed");
    }
    setLoadingKey(null);
  }

  /** 숫자 되돌림검증: 번역표 숫자를 원본 독립판독과 대조 → 확인 필요 숫자. */
  async function verify(path, name, lg, doc) {
    const key = tKey(path, lg);
    setVerifyByKey((p) => ({ ...p, [key]: { loading: true } }));
    try {
      const d = await post({ action: "verify", path: cleanOf(path), name, doc });
      setVerifyByKey((p) => ({
        ...p,
        [key]: d.ok ? { mismatches: d.mismatches || [] } : { error: d.error || "verify_failed" },
      }));
    } catch (e) {
      console.error("[docTranslate] verify:", e);
      setVerifyByKey((p) => ({ ...p, [key]: { error: "verify_failed" } }));
    }
  }

  /** 코디 수정본 저장 → 캐시(edited_doc)에 보존, 화면도 수정본으로 갱신. */
  async function save(path, lg, editedDoc) {
    try {
      const d = await post({ action: "save", path: cleanOf(path), lang: lg, doc: editedDoc });
      if (d.ok) setEntries((prev) => ({ ...prev, [tKey(path, lg)]: { doc: editedDoc } }));
    } catch (e) {
      console.error("[docTranslate] save:", e);
    }
  }

  /** 학습 용어사전 등록(원문→대상언어). 다음 번역부터 프롬프트에 반영. */
  async function glossary(lg, src, target) {
    try {
      await post({ action: "glossary", src, [lg]: target });
    } catch (e) {
      console.error("[docTranslate] glossary:", e);
    }
  }

  /** 한국 의료진에게 넘길 수 있게 평문으로 복사(표는 탭 구분). */
  async function copy(path, lg, doc) {
    const key = tKey(path, lg);
    const lines = [`[${doc.docType}]`, ""];
    for (const s of doc.sections || []) {
      lines.push(`■ ${s.title || ""}`);
      if (s.note) lines.push(s.note);
      if (Array.isArray(s.columns) && Array.isArray(s.rows)) {
        lines.push(s.columns.join("\t"));
        for (const r of s.rows) lines.push((r?.cells || []).join("\t"));
      }
      if (s.text) lines.push(s.text);
      lines.push("");
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch { /* clipboard 미지원 무시 */ }
  }

  return { tKey, langOf, setLang, entryOf, verifyOf, loadingKey, copiedKey, translate, verify, save, glossary, copy };
}

/**
 * 번역 결과 패널 — 오류 문구까지 포함한 «결과 한 덩이». 두 칸이 같은 문구를 쓴다.
 * 결과가 아직 없으면(entry 없음) 아무것도 안 그린다.
 */
export function DocTranslateResult({ tr, path, name }) {
  const L = useCoordinatorL();
  const lg = tr.langOf(path);
  const entry = tr.entryOf(path, lg);
  if (!entry) return null;

  if (entry.error) {
    return (
      <p className="text-sm text-amber-700">
        {entry.error === "unsupported_type"
          ? L.atErrFormat
          : entry.error === "file_too_large"
          ? L.atErrTooBig
          : entry.error === "too_long"
          ? L.atErrTooLong
          : entry.error === "no_session"
          ? L.atErrSession
          : L.atErrTranslate}
      </p>
    );
  }

  return (
    <TranslatedDocView
      key={tr.tKey(path, lg)}
      doc={entry.doc}
      lang={lg}
      copied={tr.copiedKey === tr.tKey(path, lg)}
      onCopy={() => tr.copy(path, lg, entry.doc)}
      onPdf={() => printTranslation(entry.doc, name, lg, L.atErrPopup)}
      onVerify={() => tr.verify(path, name, lg, entry.doc)}
      verify={tr.verifyOf(path, lg)}
      onSave={(edited) => tr.save(path, lg, edited)}
      onGlossary={(src, target) => tr.glossary(lg, src, target)}
    />
  );
}

/**
 * 출력 언어 고르기(한/영/러) + 번역 단추 — 두 칸이 같은 모양을 쓴다.
 * 코디=한글, 병원의뢰=영문, 환자·에이전시=러시아어.
 */
export function DocTranslateControls({ tr, path, name, mime = null }) {
  const L = useCoordinatorL();
  const lg = tr.langOf(path);
  const key = tr.tKey(path, lg);
  const entry = tr.entryOf(path, lg);
  const busy = tr.loadingKey === key;

  return (
    <>
      <div className="shrink-0 inline-flex rounded-md border border-gray-200 overflow-hidden" role="group" aria-label={L.atLangGroup}>
        {OUT_LANGS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => tr.setLang(path, o.key)}
            aria-pressed={lg === o.key}
            className={`px-2 py-1.5 text-xs font-medium transition ${lg === o.key ? "bg-teal-700 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            title={`${o.label} 로 번역`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => tr.translate(path, name, lg, !!entry?.doc, mime)}
        disabled={!path || busy}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-teal-200 bg-teal-50 text-xs font-medium text-teal-700 hover:bg-teal-100 transition disabled:opacity-50"
        title={L.atConvertTitle}
      >
        {busy ? (
          <span className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Languages size={14} />
        )}
        <span className="hidden sm:inline">{entry?.doc ? L.atReconvert : L.atConvert}</span>
      </button>
    </>
  );
}
