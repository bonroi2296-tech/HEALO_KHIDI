"use client";

/**
 * 코디네이터 인박스 — 문의 상세
 * 목록(/coordinator/inbox)에서 행 클릭 시 진입. inquiries 단건 상세를
 * /api/portal/inbox/[id] (staff 전용·서버 복호화)로 불러와 표시.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, User, Globe, Mail, Phone, MessageCircle, Calendar,
  AlertCircle, FileText, Stethoscope, Video,
  Send, Copy, Check, ExternalLink, Download, Languages, X, ShieldCheck, Sparkles, Pencil,
  ChevronLeft, ChevronRight, Mic,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { uploadDirect, MAX_ATTACHMENT_BYTES } from "@/lib/uploadAttachment";
import { describeUpload, UPLOAD_POLICY } from "@/lib/uploadPolicy";
import { CASE_STATUS_STEPS, caseStatusLabelL } from "@/lib/khidi/caseStatus";
import { cancerTypeLabelL, icd10SuggestionFor } from "@/lib/khidi/medicalLabels";
import { nationalityLabelL } from "@/lib/khidi/nationality";
import { fullPatientName } from "@/lib/inquiry/patientName";
import { DOC_FIELD_LABELS } from "@/lib/inquiry/docKinds";
import { useBackofficeLang, useCoordinatorL, useDateLocale, coordinatorL } from "@/lib/i18n/coordinator";
// 인테이크 선택지 라벨(6개국어)·값 = 폼과 공용 단일 SoR. 코디 화면에서 raw 코드 대신 번역 표시.
import { TREATMENT_STATES, TRAVEL_TIMING, PRIORITIES, PRIORITIES_LEGACY, CONSENT_ITEMS, INTAKE_UI, labelOf, pick, optLabel, stageLabel } from "@/lib/inquiry/intakeLabels";
import { trackingUrl, trackingMessageLine, toTrackingLang } from "@/lib/inquiry/trackingLink";
import OpinionsSection from "./OpinionsSection";
import SharedDocumentsSection from "./SharedDocumentsSection";
import CaseUpdatesSection from "./CaseUpdatesSection";
import FollowUpsSection from "./FollowUpsSection";
import ProgressSection from "./ProgressSection";
import HospitalMatchSection from "./HospitalMatchSection";
import ReferralSection from "./ReferralSection";
import HospitalReferralSection from "./HospitalReferralSection";
import { ACCUMULATE_FIELDS } from "@/lib/inquiry/referralSchema";
import ImagingPanel from "@/components/ImagingPanel";
import { scrollBehavior } from "@/lib/a11y/prefersReducedMotion";

// 병원 CD(CT) 묶음인가 — 확장자·형식으로 가른다. 맞으면 「영상 보기」로 브라우저 뷰어를 연다.
function isImagingBundle(a) {
  const n = String(a?.name || a?.path || "").toLowerCase();
  const t = String(a?.type || "").toLowerCase();
  return /\.(zip|rar|dcm)$/.test(n) || t.includes("zip") || t.includes("rar") || t.includes("dicom");
}

// 음성 메모인가 — 왓츠앱은 ogg, 아이폰 음성 메모는 m4a, 구형 안드로이드는 amr 로 온다.
// 판독 창구가 아는 «대표 이름»으로 맞춰 보낸다(별칭을 그대로 보내면 창구가 안 받는다).
const VOICE_MIME = {
  mp3: "audio/mpeg", m4a: "audio/mp4", mp4a: "audio/mp4", "3gp": "audio/mp4",
  wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg",
  webm: "audio/webm", amr: "audio/amr",
};
const voiceMime = (name) => VOICE_MIME[String(name || "").split(".").pop()?.toLowerCase()] || null;
const isVoiceFile = (name) => !!voiceMime(name);

const STATUS_COLORS = {
  received: "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  matched: "bg-teal-100 text-teal-700",
  completed: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
};

// 암 인테이크(Step2) 코드값 → L 라벨키. 폼(IntakeClient)의 value 와 1:1.
// label/값 모두 L.<키> 로 해석(컴포넌트 안에서 현재 언어로 매핑).
const CI_DEF = {
  diagnosis_timing: { label: "ibFieldDiagnosisTiming", map: { lt1m: "ibDiagLt1m", "1to6m": "ibDiag1to6m", "6mto1y": "ibDiag6mto1y", gt1y: "ibDiagGt1y", unknown: "ibUnknown" } },
  stage: { label: "fieldStage", map: { "1": "ibStage1", "2": "ibStage2", "3": "ibStage3", "4": "ibStage4", unknown: "ibUnknown" } },
  current_status: { label: "ibFieldCurrentStatus", map: { diagnosed: "ibStatDiagnosed", surgery_done: "ibStatSurgeryDone", chemo: "ibStatChemo", radiation: "ibStatRadiation", completed: "ibStatCompleted", recurrence: "ibStatRecurrence" } },
  entry_timing: { label: "ibFieldEntryTiming", map: { lt1m: "ibEntryLt1m", "1to3m": "ibEntry1to3m", gt3m: "ibEntryGt3m", undecided: "ibEntryUndecided" } },
};
const CI_MULTI_DEF = {
  treatments_received: { label: "ibFieldTreatmentsReceived", map: { surgery: "ibTxSurgery", chemo: "ibTxChemo", radiation: "ibTxRadiation", immuno: "ibTxImmuno", oriental: "ibTxOriental", none: "ibTxNone" } },
  documents: { label: "ibFieldDocuments", map: { pathology: "ibDocPathology", imaging: "ibDocImaging", records: "ibDocRecords" } },
};

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="w-6 shrink-0 text-gray-500 pt-0.5">
        <Icon size={16} />
      </div>
      <div className="w-28 shrink-0 text-sm text-gray-500">{label}</div>
      <div className="flex-1 text-sm text-gray-900 break-words">{value || "—"}</div>
    </div>
  );
}

/**
 * 진단코드 줄 — 코디가 직접 넣고 고친다(Row 와 같은 모양이되 값이 입력칸이다).
 *
 * 환자가 의뢰서에 적은 코드와는 «다른 칸»이다(inquiries.icd_code). 환자 자가 신고를 코디 확정으로
 * 덮어쓰지 않으려고 갈라 뒀다. 암종을 고른 케이스면 그 부위 코드를 권하되 자동으로 넣지는 않는다.
 */
function IcdCodeRow({ inquiryId, initial, cancerType, L, lang }) {
  const [code, setCode] = useState(initial || "");
  // 저장에 성공한 «마지막 값». 처음 값(initial)을 계속 기준으로 삼으면 저장한 뒤에도 저장 단추가
  // 남아 있어 「저장이 된 건지」를 알 수 없다(2026-08-26 화면 확인에서 실제로 그랬다).
  const [saved, setSaved] = useState(initial || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const sugg = icd10SuggestionFor(cancerType);
  const dirty = (code || "").trim().toUpperCase() !== saved;

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/coordinator/inquiries/${inquiryId}/icd-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ code }),
      });
      const r = await res.json();
      if (!res.ok || !r.ok) throw new Error(r.error || "save_failed");
      setCode(r.code || "");
      setSaved(r.code || "");
      setMsg({ ok: true, text: L.coSaveDone });
    } catch {
      setMsg({ ok: false, text: L.coSaveFail });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="w-6 shrink-0 text-gray-500 pt-0.5"><FileText size={16} /></div>
      <div className="w-28 shrink-0 text-sm text-gray-500">{L.ibIcdCode}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value); setMsg(null); }}
            placeholder={sugg ? sugg.code : "C18.2"}
            className="w-32 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm uppercase outline-none focus:border-teal-700"
          />
          {dirty && (
            <button type="button" onClick={save} disabled={saving}
                    className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50">
              {saving ? L.coSaving : L.ibIcdSave}
            </button>
          )}
          {sugg && code.trim().toUpperCase() !== sugg.code && (
            <button type="button" onClick={() => { setCode(sugg.code); setMsg(null); }}
                    className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100">
              {L.ibIcdSuggest}: {sugg.code} · {cancerTypeLabelL(cancerType, lang)}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">{L.ibIcdNote}</p>
        {msg && (
          <p className={`mt-1 text-xs font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
      {children}
    </div>
  );
}

// HTML 이스케이프(모델 출력을 새 창에 안전 렌더).
function escHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 첨부 번역 출력 언어(코디=한글 / 병원의뢰=영문 / 환자·에이전시=러시아어). 고지문은 출력 언어에 맞춘다.
const OUT_LANGS = [{ key: "ko", label: "한" }, { key: "en", label: "EN" }, { key: "ru", label: "RU" }];
const DISCLAIMER = {
  ko: "원문을 그대로 옮긴 번역입니다(요약 아님). 숫자·정상범위는 원본과 대조하세요.",
  en: "Faithful full translation (not a summary). Verify numbers and reference ranges against the original.",
  ru: "Дословный полный перевод (не резюме). Сверяйте цифры и референсные значения с оригиналом.",
};
const TR_LABEL = { ko: "한글 번역", en: "Translation", ru: "Перевод" };

// 번역 결과를 깨끗한 새 창으로 열어 인쇄 → 'PDF로 저장'. 한글+키릴이 한 줄에 섞여 있어
// @react-pdf(단일 폰트) 로는 깨진다 → 브라우저 인쇄(시스템 폰트)가 유일하게 안전. 새 의존성 0.
function printTranslation(doc, name, lang = "ko", msgPopupBlocked = "") {
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
function TranslatedDocView({ doc, onCopy, copied, onPdf, lang = "ko", onVerify, verify, onSave, onGlossary }) {
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

// 「어디서 왔나」 줄의 언어 표기 — 원어로 적어 어느 언어 코디가 봐도 통한다.
// 사전 모듈을 가져오지 않는다: 이 여섯 줄 때문에 화면에 사전 뭉치를 딸려 보낼 이유가 없다.
const ARRIVAL_LANG = { ko: "한국어", en: "English", ru: "Русский", kz: "Қазақша", kk: "Қазақша", zh: "中文", ja: "日本語" };

export default function CoordinatorInboxDetailClient({ inquiryId }) {
  const L = useCoordinatorL();
  const lang = useBackofficeLang();
  const dateLoc = useDateLocale();

  // inquiries.status enum → 언어별 라벨. (목록 페이지와 동일. pending 은 접수됨과 같은 대기.)
  const STATUS_LABELS = {
    received: L.invStatusReceived, reviewing: L.invStatusReviewing,
    matched: L.invStatusMatched, completed: L.invStatusCompleted,
    pending: L.invStatusReceived,
  };

  // 날짜/시간 — 앱 언어 로케일로(ko-KR 하드코딩 방지).
  const fmtDate = (v) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleString(dateLoc);
    } catch {
      return String(v);
    }
  };

  // 동의 시각 등은 KST 고정 표기(UTC 저장값이 코디에게 명확하게). 예약시각 UTC노출(#70) 부류 방지.
  const fmtKST = (v) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleString(dateLoc, { timeZone: "Asia/Seoul" }) + " KST";
    } catch {
      return String(v);
    }
  };

  // 인테이크 코드값 정의 → 현재 언어 라벨로 해석.
  const CI = Object.fromEntries(
    Object.entries(CI_DEF).map(([field, def]) => [
      field,
      { label: L[def.label], map: Object.fromEntries(Object.entries(def.map).map(([k, v]) => [k, L[v]])) },
    ])
  );
  const CI_MULTI = Object.fromEntries(
    Object.entries(CI_MULTI_DEF).map(([field, def]) => [
      field,
      { label: L[def.label], map: Object.fromEntries(Object.entries(def.map).map(([k, v]) => [k, L[v]])) },
    ])
  );

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqResult, setReqResult] = useState(null); // { link, emailSent, email, lang }
  const [reqError, setReqError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [claimCopied, setClaimCopied] = useState(false); // "링크 복사" 버튼 피드백
  // 환자에게 줄 진행상황 주소. 조립은 trackingLink.ts 한 곳에서만 한다 —
  // 접수 확인 메일·봇 답장도 같은 함수를 쓰므로 여기서 손으로 이어붙이면 주소가 갈라진다.
  const shareUrl =
    typeof window !== "undefined" && inquiry?.public_token
      ? trackingUrl(window.location.origin, inquiry.public_token)
      : null;

  // 케이스 진행 단계(코디가 설정 → 환자·에이전시가 같은 상태를 봄). 인라인 편집.
  const [caseStatus, setCaseStatus] = useState("");
  const [caseNote, setCaseNote] = useState("");
  const [caseStatusForce, setCaseStatusForce] = useState(false); // 되돌리기 확인을 거쳤는지(뒤로가기 방지 가드 우회용)
  const [caseSaving, setCaseSaving] = useState(false);
  const [caseSaved, setCaseSaved] = useState(false);

  // 코디 → 환자 '추가 정보 요청': Step2 폼 링크 발송(이메일) + 코디용 복사/왓츠앱 링크 반환.
  async function requestInfo() {
    setReqLoading(true);
    setReqError(null);
    setReqResult(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setReqError(L.ibLoginRequired); setReqLoading(false); return; }

      const res = await fetch(`/api/coordinator/inquiries/${inquiryId}/request-info`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.ok) throw new Error(result.error || "request_failed");
      setReqResult(result);
    } catch (e) {
      console.error("[request-info] error:", e);
      setReqError(L.ibReqSendError);
    }
    setReqLoading(false);
  }

  async function copyLink() {
    if (!reqResult?.link) return;
    try {
      await navigator.clipboard.writeText(reqResult.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard 미지원 시 무시 */ }
  }

  // 코디가 환자 대신 서류 올리기 — 메일·왓츠앱으로 따로 받은 자료용(문의 #60 에서 필요해짐).
  const [staffUploading, setStaffUploading] = useState(false);
  const [staffProgress, setStaffProgress] = useState(0);
  const [openImaging, setOpenImaging] = useState(null); // 펼쳐 놓은 CT 묶음의 경로
  // 음성 정리 결과 — 경로별 {loading} | {data} | {error}. 화면에만 두고 저장하지 않는다.
  const [voiceNotes, setVoiceNotes] = useState({});
  const [staffMsg, setStaffMsg] = useState(null);
  async function staffUpload(file) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setStaffMsg({ type: "err", text: L.ibStaffUploadTooLarge });
      return;
    }
    setStaffUploading(true);
    setStaffProgress(0);
    setStaffMsg(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStaffMsg({ type: "err", text: L.ibLoginRequired }); return; }
      const authFetch = (url, init) =>
        fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session.access_token}` } });

      const res = await uploadDirect(
        `/api/coordinator/inquiries/${inquiryId}/attachments`,
        file,
        {},
        { fetch: authFetch, onProgress: setStaffProgress }
      );
      if (res.ok) {
        setStaffMsg({ type: "ok", text: L.ibStaffUploadOk });
        await load();
      } else {
        setStaffMsg({ type: "err", text: res.error === "file_too_large" ? L.ibStaffUploadTooLarge : L.ibStaffUploadFail });
      }
    } catch {
      setStaffMsg({ type: "err", text: L.ibStaffUploadFail });
    } finally {
      setStaffUploading(false);
      setStaffProgress(0);
    }
  }

  /**
   * 붙어 있는 자료를 판독기에 넣어 «읽어»준다 — 음성이면 글+요약, 서류면 안에 적힌 값.
   *
   * 계기 ① 2026-09-02 PO — 「아셀님이 음성파일로 받으니 듣고 분석하는 데 시간이 너무 오래 걸림」.
   *      ② 2026-09-04 PO — 「문서도 올렸는데 아무런 값도 추출을 못한거야?」
   *
   * ②의 진짜 원인: 서류를 읽는 코드가 «의뢰서 접수 폼»에만 붙어 있었다. 환자 본인 링크(claim)나
   * 코디 대리 업로드로 들어온 서류는 판독을 아예 안 탔고(category 가 "other" 로 고정 저장),
   * 게다가 판독 창구의 경로 규칙이 접수 폼 모양 하나만 알아서 «불러도 거부»했다.
   * 실제 피해: 문의 #302 는 PDF 3건이 붙어 있는데 코디 화면의 값 칸이 전부 「비어 있음」이었다.
   * (그 3건을 지금 규칙으로 다시 읽히니 생년월일·진단명·주호소·검사·소견이 전부 나왔다.)
   *
   * 결과는 화면에만 둔다(저장하지 않는다). 다시 보려면 다시 누른다 — 한 번에 몇백 원 수준이고,
   * 저장하면 «언제 적 요약인지» 관리해야 하는데 그럴 값어치가 아직 없다.
   * 🛑 뽑아낸 값을 환자가 적은 칸에 «자동으로» 덮어쓰지 않는다 — 기계가 읽은 것이라 코디가 본 뒤에 쓴다.
   */
  async function analyzeVoice(path, name, mime) {
    if (!path) return;
    setVoiceNotes((p) => ({ ...p, [path]: { loading: true } }));
    try {
      const res = await fetch("/api/inquiry/classify-doc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path, type: voiceMime(name) || mime || "application/pdf" }),
      });
      const j = await res.json();
      if (!j?.ok || j.skipped) throw new Error(j?.skipped || j?.error || "failed");
      setVoiceNotes((p) => ({ ...p, [path]: { data: j } }));
    } catch (e) {
      console.error("[voice] analyze error:", e);
      setVoiceNotes((p) => ({ ...p, [path]: { error: String(e?.message || e) } }));
    }
  }

  /**
   * 붙어 있는 «서류 전부»를 한 번에 읽어 의뢰서의 빈 칸을 메운다.
   *
   * 계기 2026-09-04 PO: 「읽기 버튼을 문서별로 하지 말고 의뢰서에 넣는게 좋지 않겠니? 한번에 다 읽게」
   *                     「아니면 빠진거만 다시 읽게 하거나」
   * 파일마다 눌러야 하면 서류가 대여섯 개일 때 그만큼 눌러야 하고, 값이 어느 파일에서 나왔는지
   * 코디가 머릿속에서 합쳐야 한다. 그 합치는 일을 여기서 한다.
   *
   * 합치는 규칙 — 값이 겹치면 «최신 서류»가 이긴다.
   *   이 묶음에는 병원도 날짜도 다른 서류가 섞여 들어오고 서로 어긋난다(2026-08-14 실측:
   *   같은 파일이 15일자엔 cT4N1M1, 28일자엔 cT3NxM1). 평균을 내거나 먼저 나온 값을 쓰면 틀린다.
   *   판독기가 준 doc_date 로 오름차순 정렬해 덮어쓰면 마지막(=최신) 값이 남는다.
   *
   * 🛑 여기서는 «화면에 보여주기»만 한다. 환자가 이미 적은 칸은 ReferralSection 이 건드리지 않고,
   *    저장도 하지 않는다 — 기계가 읽은 값이라 코디가 원본과 대조한 뒤에 쓴다.
   */
  const [docScan, setDocScan] = useState(null);   // null | {loading} | {data} | {error}
  async function scanAllDocs() {
    const list = (inquiry?.attachments || []).filter(
      (a) => a?.path && !isVoiceFile(a.name || a.path) && !isImagingBundle(a),
    );
    if (!list.length) { setDocScan({ error: "no_docs" }); return; }

    setDocScan({ loading: true, done: 0, total: list.length });
    const results = [];
    for (const a of list) {
      try {
        const res = await fetch("/api/inquiry/classify-doc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: a.path, type: a.type || "application/pdf" }),
        });
        const j = await res.json();
        if (j?.ok) results.push({ ...j, _name: a.name || a.path });
      } catch (e) {
        console.error("[docScan] read error:", e);
      }
      setDocScan((p) => ({ ...p, done: (p?.done || 0) + 1 }));
    }
    if (!results.length) { setDocScan({ error: "all_failed" }); return; }

    // 오래된 것부터 덮어써서 «최신 값»이 남게 한다. 날짜가 없는 건 가장 오래된 것으로 친다.
    results.sort((x, y) => String(x.docDate || "").localeCompare(String(y.docDate || "")));
    const fields = {};
    const from = {};                       // 칸마다 «어느 파일에서 나왔나» — 코디가 원본을 찾아갈 수 있게
    const glossary = [];
    const seenTerm = new Set();
    for (const r of results) {
      for (const [k, v] of Object.entries(r.fields || {})) {
        if (v == null || v === "") continue;
        if (ACCUMULATE_FIELDS.has(k)) {
          // 🛑 덮어쓰지 마라 — 파일마다 «다른 검사»가 들어 있다. CT 판독지 한 장, 혈액검사 한 장,
          //    내시경 한 장이면 셋 다 병원에 나가야 한다. 2026-09-04 실측: 세 파일에서 각각
          //    982·1,786·1,434자가 나왔는데 마지막 것 하나만 남고 나머지는 버려지고 있었다.
          const line = `[${r._name}]\n${String(v).trim()}`;
          fields[k] = fields[k] ? `${fields[k]}\n\n${line}` : line;
          from[k] = from[k] ? `${from[k]}, ${r._name}` : r._name;
          continue;
        }
        fields[k] = v;
        from[k] = r._name;
      }
      for (const g of r.glossary || []) {
        const key = String(g.term || "").toLowerCase();
        if (!key || seenTerm.has(key)) continue;
        seenTerm.add(key);
        glossary.push(g);
      }
    }
    setDocScan({ data: { fields, from, glossary: glossary.slice(0, 20), readCount: results.length } });
  }

  /**
   * 찾은 값을 의뢰서에 «저장»한다 — 2026-09-04 PO: 「한번 채우면 저장 안되니? 매번 불러와야해?」
   * 화면에만 두면 새로고침할 때마다 다시 읽혀야 하고(그때마다 AI 비용), 다른 사람이 그 케이스를
   * 열면 아무것도 안 보인다.
   * 🛑 «비어 있는 칸인가»는 창구가 다시 판정한다 — 화면이 낡은 값을 들고 있을 수 있다.
   */
  const [fillSaving, setFillSaving] = useState(false);
  async function saveScanned() {
    if (!docScan?.data) return;
    setFillSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/coordinator/inquiries/${inquiryId}/referral-fill`, {
        method: "PATCH",
        headers: { "content-type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        // 모으는 칸은 이미 값이 있어도 갈아 끼운다 — 서류를 새로 받으면 검사 목록을 처음부터
        // 다시 만들어야 한다. 덧붙이기가 아니라 통째 교체라 두 번 읽어도 겹치지 않는다.
        body: JSON.stringify({
          fields: docScan.data.fields,
          from: docScan.data.from,
          overwrite: [...ACCUMULATE_FIELDS].filter((k) => docScan.data.fields[k]),
        }),
      });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "failed");
      setDocScan(null);        // 저장했으면 «찾은 값» 칸은 접는다 — 이제 의뢰서 본문에 있다
      await load();
    } catch (e) {
      console.error("[referral-fill] save error:", e);
      window.alert("저장하지 못했습니다. 잠시 뒤 다시 눌러주세요.");
    }
    setFillSaving(false);
  }

  // 첨부 열람: storage 경로 → 서명URL(5분) 발급 후 새 탭. staff 권한으로 /api/attachments/sign.
  const [attLoadingPath, setAttLoadingPath] = useState(null);
  async function viewAttachment(path) {
    if (!path) return;
    setAttLoadingPath(path);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      const res = await fetch("/api/attachments/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ path: cleanPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    } catch (e) {
      console.error("[attachment] sign error:", e);
    }
    setAttLoadingPath(null);
  }

  // 첨부 다운로드: download=원본파일명 으로 서명URL 발급 → Content-Disposition 으로 한 번에 원본 이름 저장.
  // (미리보기와 달리 새 탭이 아니라 즉시 다운로드. 스토리지 난수 대신 원래 문서명이 붙는다.)
  const [attDownloadPath, setAttDownloadPath] = useState(null);
  async function downloadAttachment(path, name) {
    if (!path) return;
    setAttDownloadPath(path);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      const res = await fetch("/api/attachments/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ path: cleanPath, download: name || cleanPath.split("/").pop() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.signedUrl) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("[attachment] download error:", e);
    }
    setAttDownloadPath(null);
  }

  // 병원에 넘길 자료를 «한 번에» 확보 — 파일을 낱개로 순서대로 받는다.
  //   왜 하나로 압축하지 «않나»: ①병원 메일이 압축파일을 막는 경우가 있고
  //   (세브란스 2026-08 회신: 실행파일 자동 차단) ②받은 뒤 클라우드에 올릴 때 낱개가
  //   그대로 폴더에 들어가 병원이 풀 필요가 없다. 서버에서 수백 MB 를 묶을 일도 없어진다.
  const [bulkDown, setBulkDown] = useState(null); // { done, total } | null
  async function downloadAllAttachments(atts) {
    const list = (Array.isArray(atts) ? atts : [])
      .map((a) => ({
        path: typeof a === "string" ? a : a?.path,
        name: (typeof a === "object" && a?.name) || null,
      }))
      .filter((x) => x.path);
    if (!list.length || bulkDown) return;
    setBulkDown({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      await downloadAttachment(list[i].path, list[i].name || list[i].path.split("/").pop());
      setBulkDown({ done: i + 1, total: list.length });
      // 연달아 내려받으면 브라우저가 «자동 다운로드»로 보고 막는다(크롬은 한 번 «허용»을 묻는다).
      // 사이를 조금 띄우면 그 물음이 한 번으로 끝난다.
      if (i < list.length - 1) await new Promise((r) => setTimeout(r, 600));
    }
    setTimeout(() => setBulkDown(null), 1500);
  }

  // 첨부 번역: 외국 검사지를 병원·환자 전달용으로 원문 1:1 번역(요약 아님, 숫자 보존). 출력 언어=ko/en/ru.
  const [transLoadingKey, setTransLoadingKey] = useState(null); // `${path}::${lang}` 로딩중
  const [translations, setTranslations] = useState({}); // `${path}::${lang}` -> { doc } | { error }
  const [attLang, setAttLang] = useState({}); // path -> 선택 출력 언어(기본 ko)
  const [copiedTransPath, setCopiedTransPath] = useState(null);
  const [verifyResults, setVerifyResults] = useState({}); // key -> { loading } | { suspicious,... } | { error }
  const tKey = (path, lg) => `${path}::${lg}`;
  async function translateAttachment(path, name, lg, force = false) {
    if (!path) return;
    const key = tKey(path, lg);
    setTransLoadingKey(key);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      const res = await fetch("/api/attachments/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ path: cleanPath, name, lang: lg, force }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.doc) {
        setTranslations((prev) => ({ ...prev, [key]: { doc: data.doc } }));
        setVerifyResults((prev) => { const n = { ...prev }; delete n[key]; return n; }); // 새 번역 → 낡은 검증 제거
      } else {
        setTranslations((prev) => ({ ...prev, [key]: { error: data.error || "translate_failed" } }));
      }
    } catch (e) {
      console.error("[attachment] translate error:", e);
      setTranslations((prev) => ({ ...prev, [key]: { error: "translate_failed" } }));
    }
    setTransLoadingKey(null);
  }

  // 숫자 되돌림검증: 번역표 숫자를 원본 독립판독과 대조 → 확인 필요 숫자.
  async function verifyNumbers(path, name, key, doc) {
    setVerifyResults((p) => ({ ...p, [key]: { loading: true } }));
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setVerifyResults((p) => ({ ...p, [key]: { error: "no_session" } })); return; }
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      const res = await fetch("/api/attachments/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "verify", path: cleanPath, name, doc }),
      });
      const d = await res.json().catch(() => ({}));
      setVerifyResults((p) => ({
        ...p,
        [key]: res.ok && d.ok ? { mismatches: d.mismatches || [] } : { error: d.error || "verify_failed" },
      }));
    } catch (e) {
      console.error("[attachment] verify error:", e);
      setVerifyResults((p) => ({ ...p, [key]: { error: "verify_failed" } }));
    }
  }

  // 코디 수정본 저장 → 캐시(edited_doc)에 보존, 화면도 수정본으로 갱신.
  async function saveEdit(path, lg, key, editedDoc) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      const res = await fetch("/api/attachments/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "save", path: cleanPath, lang: lg, doc: editedDoc }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) setTranslations((prev) => ({ ...prev, [key]: { doc: editedDoc } }));
    } catch (e) {
      console.error("[attachment] save error:", e);
    }
  }

  // 학습 용어사전 등록(원문→대상언어). 다음 번역부터 프롬프트에 반영.
  async function addGlossary(lg, src, target) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch("/api/attachments/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "glossary", src, [lg]: target }),
      });
    } catch (e) {
      console.error("[attachment] glossary error:", e);
    }
  }

  // 케이스 브리프(AI 초안) — 접수내용+문서를 AI가 정리. 저장 안 함(on-demand), 클릭 시 생성해 화면에만.
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState(false);
  async function generateBrief() {
    setBriefLoading(true);
    setBriefError(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setBriefError(true); setBriefLoading(false); return; }
      // 브리프는 «내 화면 언어»로 만든다 — 틀만 러시아어이고 알맹이가 한국어면 코디가 못 읽는다.
      const res = await fetch(`/api/coordinator/inquiries/${inquiryId}/brief`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.brief) setBrief(data.brief);
      else setBriefError(true);
    } catch (e) {
      console.error("[case-brief] error:", e);
      setBriefError(true);
    }
    setBriefLoading(false);
  }

  // 번역 결과를 한국 의료진에게 넘길 수 있게 평문으로 클립보드 복사(표는 탭 구분).
  async function copyTranslation(key, doc) {
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
      setCopiedTransPath(key);
      setTimeout(() => setCopiedTransPath(null), 2000);
    } catch { /* clipboard 미지원 무시 */ }
  }

  // 케이스 진행 단계 저장 (코디·어드민 공용 API 재사용). 환자/에이전시 포털에 같은 상태가 노출됨.
  async function saveCase() {
    setCaseSaving(true);
    setCaseSaved(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCaseSaving(false); return; }
      const res = await fetch("/api/admin/khidi/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          inquiry_id: Number(inquiryId),
          case_status: caseStatus || null,
          case_status_note: caseNote || null,
          force_backward: caseStatusForce,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.ok) {
        setCaseSaved(true);
        setCaseStatusForce(false);
        setInquiry((prev) => prev ? { ...prev, case_status: caseStatus, case_status_note: caseNote } : prev);
        setTimeout(() => setCaseSaved(false), 2000);
      } else if (result?.error === "status_would_go_backward") {
        // 확인창을 거치지 않고(예: 저장 버튼 재시도) 서버 가드에 막힌 경우 — 화면 상태를 서버 기준으로 되돌림
        alert(L.atErrStageBack);
        setCaseStatus(result.current || "");
      }
    } catch (e) {
      console.error("[case] save error:", e);
    }
    setCaseSaving(false);
  }

  // lang 도 의존한다: 화면 언어를 바꾸면 브리프도 그 언어 것으로 다시 가져온다
  // (안 그러면 화면은 러시아어인데 브리프만 한국어로 남는다 — 이번에 고친 바로 그 증상).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId, lang]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError(L.ibLoginRequired); setLoading(false); return; }

      // lang: 캐시된 브리프를 «내 언어» 것으로 골라 받는다(없으면 화면이 그 언어로 새로 만든다)
      const res = await fetch(`/api/portal/inbox/${inquiryId}?lang=${encodeURIComponent(lang)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (res.status === 404) { setError("not_found"); setLoading(false); return; }
      if (!res.ok || !result.ok) throw new Error(result.error || "fetch_failed");
      setInquiry(result.inquiry);
      setCaseStatus(result.inquiry?.case_status || "");
      setCaseNote(result.inquiry?.case_status_note || "");
      setCaseStatusForce(false);
      // 케이스 브리프: 캐시가 최신이면 즉시 표시, 없거나 낡았으면(첨부 변경) 자동 생성 — 수동 버튼 없음.
      if (result.inquiry?.brief && !result.inquiry?.briefStale) {
        setBrief(result.inquiry.brief);
      } else {
        generateBrief();
      }
    } catch (e) {
      console.error("[inbox/detail] fetch error:", e);
      setError(L.ibLoadError);
    }
    setLoading(false);
  }

  const backLink = (
    <Link
      href="/coordinator/inbox"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-700 transition"
    >
      <ArrowLeft size={16} /> {L.ibBackToInbox}
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">{L.ibNotFoundTitle}</p>
          <p className="text-gray-500 text-sm mt-1">{L.ibNotFoundDesc}</p>
        </div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="text-center py-16 bg-red-50 rounded-xl">
          <AlertCircle size={40} className="mx-auto text-red-300 mb-3" />
          <p className="text-red-600">{error || L.ibLoadFailed}</p>
          <button
            onClick={load}
            className="mt-3 px-4 py-2 text-sm bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50"
          >
            {L.ibRetry}
          </button>
        </div>
      </div>
    );
  }

  const fullName =
    fullPatientName(inquiry.first_name, inquiry.last_name) || L.ibNameUnknown;
  const step2Done = !!inquiry.step2_completed_at;
  const cancer =
    (inquiry.cancer_type ? cancerTypeLabelL(inquiry.cancer_type, lang) : "") ||
    inquiry.treatment_type || "—";
  const nationality =
    inquiry.nationality ? nationalityLabelL(inquiry.nationality, lang) : "—";

  // 「어디서 왔나」 한 줄 — 있는 조각만 이어 붙인다. 하나도 없으면 줄 자체를 안 그린다.
  // 언어는 «원어 표기»(Русский 등)로 — 이 화면은 6개 언어라 «러시아어 화면» 같은 한국어를
  // 박으면 다른 언어 코디에게 한국어가 새어 나간다.
  const arrival = [
    inquiry.source_locale
      ? (ARRIVAL_LANG[inquiry.source_locale] || inquiry.source_locale)
      : null,
    inquiry.referrer_host || null,
    inquiry.landing_path || null,
    inquiry.utm?.utm_campaign || inquiry.utm?.utm_source || null,
  ].filter(Boolean).join(" · ") || null;

  // intake JSONB 의 추가 정보(있으면 key/value 로 표시).
  // 혹시 복호화 안 된 암호문 문자열({"v":"v1",...})은 화면에 안 띄움.
  const looksEncrypted = (s) =>
    typeof s === "string" && /^\{"(v|iv|tag|data)"\s*:/.test(s.trim());
  // 방어선: 복호화 실패로 암호문이 흘러와도 코디 화면엔 raw JSON 대신 "—".
  const safe = (v) => (looksEncrypted(v) ? "—" : v);
  const intakeEntries =
    inquiry.intake && typeof inquiry.intake === "object" && !Array.isArray(inquiry.intake)
      ? Object.entries(inquiry.intake).filter(
          ([, v]) =>
            v !== null && v !== undefined && v !== "" &&
            typeof v !== "object" && !looksEncrypted(v)
        )
      : [];

  return (
    <div className="space-y-6">
      {backLink}

      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-teal-50 rounded-full flex items-center justify-center shrink-0">
            <User size={20} className="text-teal-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
              {/* 접수 주체 배지: 에이전시 의뢰 + 회원(계정 이메일·role)/비회원(게스트) — 코디가 한눈에.
                  @test.com 계정이면 ⚠️ 테스트로 강조(실적 오집계 방지 시각단서). submitter 는 API가 user_id로 조회. */}
              {inquiry.agency_id && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-violet-700">
                  🏢 {L.agencyReferral}{inquiry.agency_name ? ` · ${inquiry.agency_name}` : ""}
                </span>
              )}
              {inquiry.submitter?.email ? (
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${inquiry.submitter.isTest ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-700"}`}>
                  👤 {pick(INTAKE_UI.submitterMember, lang)} · {inquiry.submitter.email}
                  {inquiry.submitter.role ? ` · ${inquiry.submitter.role}` : ""}
                  {inquiry.submitter.isTest ? ` · ⚠️ ${pick(INTAKE_UI.submitterTest, lang)}` : ""}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-700">
                  🙋 {pick(INTAKE_UI.submitterGuest, lang)}
                </span>
              )}
              {/* 2026-08-25: 예전엔 «계정 없는 케이스»에만 떴다(!inquiry.has_account).
                  그런데 왓츠앱·메일로 받은 건을 우리가 손으로 넣으면 계정이 붙어 있는 경우가 많고,
                  그때 코디는 «상대에게 줄 주소»를 화면 어디서도 못 꺼냈다(PO 지적 2026-08-25).
                  주소 자체는 새로 만들지 않는다 — inquiries.public_token 이 모든 문의에 이미 붙어 있고
                  접수 확인 메일·봇 답장도 같은 주소를 보낸다(src/lib/inquiry/trackingLink.ts).
                  ⚠️ 그래서 이건 «새로 여는 문»이 아니라 이미 나가 있는 주소를 꺼내 보여주는 것뿐이다. */}
              {inquiry.public_token && (
                <span className="inline-flex items-center gap-1" title={shareUrl || undefined}>
                  <button
                    onClick={() => {
                      if (!shareUrl) return;
                      navigator.clipboard.writeText(shareUrl).then(() => {
                        setClaimCopied(true);
                        setTimeout(() => setClaimCopied(false), 2000);
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 transition"
                  >
                    {claimCopied ? <Check size={12} /> : <Copy size={12} />} {claimCopied ? L.ibClaimCopied : L.ibClaimCopy}
                  </button>
                  {/* 왓츠앱: 받는 사람은 코디가 대화창에서 고른다 — 환자 전화번호는 암호화돼 있어
                      화면이 들고 있지 않다. 문구는 환자 언어로 이미 만들어 둔 한 줄을 그대로 쓴다. */}
                  <a
                    href={shareUrl ? `https://wa.me/?text=${encodeURIComponent(trackingMessageLine(shareUrl, toTrackingLang(inquiry.preferred_language)))}` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-50 text-green-800 hover:bg-green-100 transition"
                  >
                    <Send size={12} /> {L.ibShareWhatsapp}
                  </a>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{L.ibInquiryNo} #{inquiry.id} · {L.ibReceivedLabel} {fmtDate(inquiry.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            // 상세가 «다 그려졌는지»를 자동 검사가 이걸로 판정한다 — 이 딱지가 뜨기 전에 재면
            // 아직 안 그려진 화면을 「없다」로 읽는다(2026-08-25 실제로 그랬다).
            data-testid="inquiry-step-badge"
            data-step2-done={step2Done ? "1" : "0"}
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              step2Done ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
            }`}
          >
            {step2Done ? L.ibStepBothDone : L.ibStepOneNeedInfo}
          </span>
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              STATUS_COLORS[inquiry.status] || "bg-gray-100 text-gray-600"
            }`}
          >
            {STATUS_LABELS[inquiry.status] || L.invStatusReceived}
          </span>
        </div>
      </div>

      {/* 케이스 브리프 (AI 초안) — 접수내용+문서를 AI가 정리해 코디가 빠르게 판단. 저장 안 함(on-demand). */}
      <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-5">
        <div className="flex items-center gap-1.5 mb-2">
          <h2 className="text-sm font-semibold text-teal-800 inline-flex items-center gap-1.5 flex-wrap">
            <Sparkles size={15} /> {pick(INTAKE_UI.briefTitle, lang)}
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700">{pick(INTAKE_UI.briefAiDraft, lang)}</span>
          </h2>
        </div>

        {/* 케이스 열면 자동 생성/표시 — 최초 생성 중이거나 로딩이면 스피너(수동 버튼 없음). */}
        {(briefLoading || (!brief && !briefError)) && (
          <div className="flex items-center gap-2 text-sm text-teal-700 py-2">
            <span className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            {pick(INTAKE_UI.briefGenerating, lang)}
          </div>
        )}

        {briefError && !briefLoading && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-amber-700">{pick(INTAKE_UI.briefFailed, lang)}</p>
            <button onClick={generateBrief} className="text-sm text-teal-700 underline">{pick(INTAKE_UI.briefRegenerate, lang)}</button>
          </div>
        )}

        {brief && !briefLoading && (
          <div className="space-y-2.5 text-sm">
            <p className="text-gray-900 font-medium leading-relaxed">{brief.overview}</p>
            {brief.request && (
              <div>
                <span className="text-xs text-gray-500">{pick(INTAKE_UI.briefRequest, lang)}</span>
                <p className="text-gray-800">{brief.request}</p>
              </div>
            )}
            {Array.isArray(brief.points) && brief.points.length > 0 && (
              <div>
                <span className="text-xs text-gray-500">{pick(INTAKE_UI.briefPoints, lang)}</span>
                <ul className="mt-1 space-y-1">
                  {brief.points.map((p, i) => (
                    <li key={i} className="flex gap-1.5 text-gray-800"><span className="text-teal-600 shrink-0">•</span><span>{p}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(brief.red_flags) && brief.red_flags.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <span className="text-xs font-semibold text-amber-700 inline-flex items-center gap-1"><AlertCircle size={12} />{pick(INTAKE_UI.briefFlags, lang)}</span>
                <ul className="mt-1 space-y-0.5">
                  {brief.red_flags.map((f, i) => (
                    <li key={i} className="text-amber-800 flex gap-1.5"><span className="shrink-0">•</span><span>{f}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {/* CT 초견 — 대표 장면 몇 장을 보고 적은 «참고용 초안». 코디가 판독으로 읽지 않게 갈라 놓는다. */}
            {brief.imaging_note && (
              <div className="rounded-lg bg-white border border-teal-100 px-3 py-2">
                <span className="text-xs font-semibold text-teal-700">{pick(INTAKE_UI.briefImaging, lang)}</span>
                <p className="mt-1 text-gray-800 whitespace-pre-wrap leading-relaxed">{brief.imaging_note}</p>
              </div>
            )}
            {/* 못 읽은 첨부가 있으면 «있다»고 말한다 — 조용히 빼면 코디가 다 반영된 줄 안다(문의 #60). */}
            {brief.unreadable > 0 && (
              <p className="text-[12px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                {pick(INTAKE_UI.briefUnreadable, lang).replace("{n}", String(brief.unreadable))}
              </p>
            )}
            <p className="text-[11px] text-gray-500 pt-1.5 border-t border-teal-100">{pick(INTAKE_UI.briefDisclaimer, lang)}</p>
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* 연락 정보 */}
        <Card title={L.ibContactCard}>
          <Row icon={MessageCircle} label={L.contactMethod} value={inquiry.contact_method} />
          <Row icon={Phone} label={L.ibContactId} value={safe(inquiry.contact_id)} />
          <Row icon={Mail} label={L.ibEmail} value={safe(inquiry.email)} />
          <Row icon={Phone} label={L.ibPhone} value={safe(inquiry.phone)} />
        </Card>

        {/* 의료 / 여정 정보 */}
        <Card title={L.ibMedicalCard}>
          <Row icon={Globe} label={L.nationality} value={nationality} />
          <Row icon={Stethoscope} label={L.cancerType} value={cancer} />
          <IcdCodeRow
            inquiryId={inquiryId}
            initial={inquiry.icd_code || ""}
            cancerType={inquiry.cancer_type || null}
            L={L}
            lang={lang}
          />
          <Row
            icon={Calendar}
            label={L.ibPreferredDate}
            value={
              inquiry.preferred_date
                ? `${new Date(inquiry.preferred_date).toLocaleDateString(dateLoc)}${inquiry.preferred_date_flex ? ` (${L.ibFlexible})` : ""}`
                : "—"
            }
          />
          <Row
            icon={Globe}
            label={L.fieldLanguage}
            value={inquiry.preferred_language || inquiry.spoken_language}
          />
          {/* 이 환자가 «어디서 왔는지» — 집계표(유치 전환 상세 › 유입별)만 있고 개별 건은 볼 수
              없었다. 첫 응대 때 «러시아어 화면을 보고 온 사람인지 · 광고로 온 사람인지»를 알면
              말투와 안내가 달라진다. 기록이 하나도 없는 건(옛 문의·메신저)엔 아예 안 뜬다. */}
          {arrival && <Row icon={Globe} label={L.ibArrival} value={arrival} />}
        </Card>
      </div>

      {/* 문의 메시지 */}
      <Card title={L.ibMessageCard}>
        {inquiry.message && !looksEncrypted(inquiry.message) ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{inquiry.message}</p>
        ) : (
          <p className="text-sm text-gray-500">{L.ibNoMessage}</p>
        )}
      </Card>

      {/* 추가 인테이크 정보 (Step2) — flat 구조를 라벨링·번역하고 우선순위/동의를 표시.
          (옛 nested intake.cancer 구조도 하위호환. 미분류 키는 '기타'로 노출해 정보 숨김 방지.) */}
      {(() => {
        const intake = inquiry.intake && typeof inquiry.intake === "object" ? inquiry.intake : {};
        const cancer = intake.cancer && typeof intake.cancer === "object" ? intake.cancer : null;
        const notes = !looksEncrypted(intake.notes) ? intake.notes : null;

        // 미입력값도 항목은 기재하고 '입력하지 않음'으로 표시(관리 가시성 — PO 요청).
        const NE = pick(INTAKE_UI.notEntered, lang);
        const rows = [];
        if (cancer) {
          // 옛 nested cancer 구조(하위호환) — 있는 것만.
          for (const k of Object.keys(CI)) {
            const v = cancer[k];
            if (v) rows.push([CI[k].label, CI[k].map[v] || String(v)]);
          }
          for (const k of Object.keys(CI_MULTI)) {
            const arr = Array.isArray(cancer[k]) ? cancer[k] : null;
            if (arr && arr.length) rows.push([CI_MULTI[k].label, arr.map((x) => CI_MULTI[k].map[x] || x).join(", ")]);
          }
        } else {
          // 현재 폼(flat) — 핵심 선택값을 항상 나열(미입력=입력하지 않음).
          const ts = safe(intake.treatment_state);
          rows.push([L.ibFieldCurrentStatus, (ts && ts !== "—") ? labelOf(TREATMENT_STATES, ts, lang) : NE]);
          rows.push([pick(INTAKE_UI.stage, lang), intake.stage ? stageLabel(intake.stage, lang) : NE]);
          const dd = safe(intake.diagnosis_date);
          rows.push([pick(INTAKE_UI.diagnosisDate, lang), (dd && dd !== "—") ? dd : NE]);
          rows.push([L.ibFieldEntryTiming, intake.travel_timing ? labelOf(TRAVEL_TIMING, intake.travel_timing, lang) : NE]);
        }

        const priorities = Array.isArray(intake.priorities) ? intake.priorities : [];
        const consents = intake.consents && typeof intake.consents === "object" ? intake.consents : null;

        // 처리한 키·메타키를 뺀 나머지 스칼라 → '기타'로 노출(정보 숨김 방지).
        const handled = new Set(["treatment_state", "travel_timing", "stage", "diagnosis_date", "priorities", "consents", "consentAt", "consentVersion", "notes", "cancer"]);
        const others = intakeEntries.filter(([k]) => !handled.has(k));

        if (rows.length === 0 && priorities.length === 0 && !consents && others.length === 0 && !notes) return null;
        return (
          <Card title={L.ibIntakeCard}>
            <div className="grid gap-x-6 sm:grid-cols-2">
              {rows.map(([k, v], i) => (
                <div key={`${k}-${i}`} className="flex gap-2 py-1.5 border-b border-gray-50 text-sm">
                  <span className="text-gray-500 shrink-0">{k}</span>
                  <span className="text-gray-900 break-words">{v}</span>
                </div>
              ))}
            </div>

            {/* 우선순위 → 선택지 전부 ✓/✗ (동의처럼 — 뭘 고르고 뭘 안 골랐나 한눈에).
                옛 데이터(구 선택지)면 구 옵션으로 자동 판별해 표시. */}
            {!cancer && (() => {
              const inNew = priorities.some((p) => PRIORITIES.some((o) => o.value === p));
              const inLegacy = priorities.some((p) => PRIORITIES_LEGACY.some((o) => o.value === p));
              const opts = inLegacy && !inNew ? PRIORITIES_LEGACY : PRIORITIES;
              return (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">{pick(INTAKE_UI.priorities, lang)}</span>
                  <div className="grid gap-x-6 sm:grid-cols-2 mt-1.5">
                    {opts.map((o) => {
                      const on = priorities.includes(o.value);
                      return (
                        <div key={o.value} className="flex items-center gap-2 py-1 text-sm">
                          {on ? <Check size={14} className="text-teal-600 shrink-0" /> : <X size={14} className="text-gray-300 shrink-0" />}
                          <span className={on ? "text-gray-800" : "text-gray-500"}>{optLabel(o, lang)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {priorities.length === 0 && <span className="text-xs text-gray-500">{NE}</span>}
                </div>
              );
            })()}

            {/* 동의 항목 → 목록(동의/미동의) */}
            {consents && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500 inline-flex items-center gap-1"><ShieldCheck size={13} />{pick(INTAKE_UI.consentsTitle, lang)}</span>
                <div className="grid gap-x-6 sm:grid-cols-2 mt-1.5">
                  {CONSENT_ITEMS.map((c) => {
                    const agreed = consents[c.key] === true;
                    return (
                      <div key={c.key} className="flex items-center gap-2 py-1 text-sm">
                        {agreed ? <Check size={14} className="text-teal-600 shrink-0" /> : <X size={14} className="text-gray-300 shrink-0" />}
                        <span className={agreed ? "text-gray-800" : "text-gray-500"}>{pick(c.label, lang)}</span>
                        <span className={`ml-auto text-[11px] ${agreed ? "text-teal-700" : "text-gray-500"}`}>
                          {agreed ? pick(INTAKE_UI.agreed, lang) : pick(INTAKE_UI.declined, lang)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {(intake.consentAt || intake.consentVersion) && (
                  <p className="mt-2 text-[11px] text-gray-500">
                    {intake.consentAt ? `${pick(INTAKE_UI.consentAt, lang)}: ${fmtKST(intake.consentAt)}` : ""}
                    {intake.consentAt && intake.consentVersion ? " · " : ""}
                    {intake.consentVersion ? `${pick(INTAKE_UI.consentVersion, lang)} ${intake.consentVersion}` : ""}
                  </p>
                )}
              </div>
            )}

            {/* 기타(미분류 원본 키) — 정보 숨김 방지 */}
            {others.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {others.map(([k, v]) => (
                  <div key={k} className="flex gap-2 py-1 text-sm">
                    <span className="text-gray-500 shrink-0 font-mono text-xs">{k}</span>
                    <span className="text-gray-600 break-words">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">{L.notes}</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap mt-1">{notes}</p>
              </div>
            )}
          </Card>
        );
      })()}

      {/* 병원 의뢰서 — 병원마다 다른 양식에 우리 값을 채워 준다(2026-09-04 PO).
          값은 «문의에 이미 있는 것»만 쓴다. 없는 칸은 빈칸으로 두고 몇 칸인지 세어 준다. */}
      <HospitalReferralSection
        inquiryId={inquiryId}
        onSaved={load}
        attachments={Array.isArray(inquiry.attachments) ? inquiry.attachments : []}
        values={{
          patientName: fullName,
          nationality: inquiry.nationality ? nationalityLabelL(inquiry.nationality, lang) : "",
          // 영문 병기 양식(이대)에는 영어 표기로 낸다 — 「카자흐스탄」·「남성」이 들어가면 안 어울린다.
          nationalityEn: inquiry.nationality ? nationalityLabelL(inquiry.nationality, "en") : "",
          email: inquiry.email || "",
          phone: inquiry.phone || inquiry.contact_id || "",
          // 나머지는 의뢰서 칸(intake_data) — 서류에서 채운 값도 여기 들어와 있다.
          ...(inquiry.referral && typeof inquiry.referral === "object"
            ? {
                birthDate: inquiry.referral.birthDate || "",
                sex: inquiry.referral.sex === "female" ? "여성" : inquiry.referral.sex === "male" ? "남성" : "",
                sexEn: inquiry.referral.sex === "female" ? "Female" : inquiry.referral.sex === "male" ? "Male" : "",
                diagnosisNameRaw: inquiry.referral.diagnosisNameRaw || "",
                chiefComplaint: inquiry.referral.chiefComplaint || "",
                onsetDate: inquiry.referral.onsetDate || "",
                diagnosisDate: inquiry.referral.diagnosisDate || "",
                testsAndTreatments: inquiry.referral.testsAndTreatments || "",
                pastHistoryNote: inquiry.referral.pastHistoryNote || "",
                familyHistory: inquiry.referral.familyHistory || "",
                medications: inquiry.referral.medications || "",
                localDoctorOpinion: inquiry.referral.localDoctorOpinion || "",
                referralPurpose: inquiry.referral.referralPurpose || "",
              }
            : {}),
        }}
      />

      {/* 의뢰서(/inquiry/referral)로 들어온 문의 — 환자가 채운 14칸 + 서류 판독 결과. 없으면 안 그린다. */}
      <ReferralSection
        referral={inquiry.referral}
        lang={lang}
        scan={docScan}
        onScan={scanAllDocs}
        onSaveScan={saveScanned}
        saving={fillSaving}
      />

      {/* 첨부 서류 — 에이전시/환자가 올린 의료서류(병리·영상·진료기록). staff 서명URL로 열람.
          첨부가 0건이어도 카드는 띄운다 — 코디가 «대신 올리는» 통로가 여기 있기 때문. */}
      {(() => {
        const atts = Array.isArray(inquiry.attachments) ? inquiry.attachments : [];
        return (
        <Card title={`${L.ibAttachmentsCard} (${atts.length})`}>
          <div className="space-y-2">
            {/* 병원 의뢰용 — 파일이 2개 이상일 때만. 1개면 아래 낱개 버튼으로 충분하다. */}
            {atts.length > 1 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => downloadAllAttachments(atts)}
                  disabled={!!bulkDown}
                  title={L.atDownloadAllTitle}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-teal-200 bg-teal-50 text-teal-700 text-xs font-medium hover:bg-teal-100 disabled:opacity-60"
                >
                  {bulkDown ? (
                    <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  {bulkDown
                    ? `${L.atDownloadAllBusy} ${bulkDown.done}/${bulkDown.total}`
                    : `${L.atDownloadAll} (${atts.length})`}
                </button>
              </div>
            )}
            {atts.map((a, i) => {
              const path = typeof a === "string" ? a : a?.path;
              const name = (typeof a === "object" && a?.name) || (path ? path.split("/").pop() : `${L.ibAttachment} ${i + 1}`);
              const cat = typeof a === "object" ? a?.category : null;
              const curLang = attLang[path] || "ko";        // 선택된 출력 언어
              const curKey = tKey(path, curLang);            // 현재 언어의 번역 캐시 키
              const entry = translations[curKey];            // { doc } | { error } | undefined
              return (
                <div
                  key={path || i}
                  data-attachment-card
                  className="rounded-lg border border-gray-200 overflow-hidden scroll-mt-24"
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    {/* 미리보기(새 탭) */}
                    <button
                      onClick={() => viewAttachment(path)}
                      disabled={!path || attLoadingPath === path}
                      className="flex-1 min-w-0 flex items-center gap-3 text-left disabled:opacity-50"
                      title={L.atPreviewTitle}
                    >
                      <FileText size={18} className="text-teal-600 shrink-0" />
                      <span className="flex-1 text-sm text-gray-800 truncate">{name}</span>
                      {cat && cat !== "other" && (
                        <span className="text-[11px] text-gray-500 shrink-0">{cat}</span>
                      )}
                      {typeof a === "object" && a?.uploaded_by_staff && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          {L.ibStaffUploadBadge}
                        </span>
                      )}
                      {/* 환자가 자기 화면에서 치운 자료 — **여기선 안 사라진다.** 냈다가 지우고
                          «안 냈다»고 하는 걸 막으려면 낸 사실이 남아야 한다(2026-08-06 PO).
                          파일도 저장소에 그대로라 그대로 열어볼 수 있다. */}
                      {typeof a === "object" && a?.removed_at && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          {L.ibPatientRemovedBadge} {new Date(a.removed_at).toLocaleDateString()}
                        </span>
                      )}
                      {attLoadingPath === path ? (
                        <span className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <ExternalLink size={14} className="text-gray-500 shrink-0" />
                      )}
                    </button>
                    {/* 병원 CD(CT) 묶음이면 번역 대신 영상 뷰어로 — 자바·CD뷰어 설치 없이 브라우저에서 본다. */}
                    {isImagingBundle(a) ? (
                      <button
                        type="button"
                        onClick={() => setOpenImaging((v) => (v === path ? null : path))}
                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
                          openImaging === path
                            ? "border-teal-700 bg-teal-700 text-white"
                            : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                        }`}
                      >
                        <Video size={14} /> {openImaging === path ? "닫기" : "영상 보기"}
                      </button>
                    ) : isVoiceFile(name) ? (
                      /* 소리는 번역 단추가 소용없다(원문이 글이 아니다) — 대신 «듣지 않고 읽게» 한다. */
                      <button
                        type="button"
                        onClick={() => analyzeVoice(path, name)}
                        disabled={!path || voiceNotes[path]?.loading}
                        title="음성을 글로 옮기고 요약합니다. 듣지 않아도 됩니다."
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-teal-200 bg-teal-50 text-xs font-medium text-teal-700 hover:bg-teal-100 transition disabled:opacity-50"
                      >
                        {voiceNotes[path]?.loading ? (
                          <span className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Mic size={14} />
                        )}
                        {voiceNotes[path]?.loading ? "읽는 중…" : voiceNotes[path]?.data ? "다시 정리" : "음성 정리"}
                      </button>
                    ) : (
                    <>
                    {/* 「읽기」 — 서류 안의 값(생년월일·진단명·검사·소견)을 뽑아 아래에 편다.
                        번역과 다른 일이다: 번역은 «문서 전체를 옮기는 것», 이건 «칸에 넣을 값을 골라내는 것». */}
                    <button
                      type="button"
                      onClick={() => analyzeVoice(path, name, a?.type)}
                      disabled={!path || voiceNotes[path]?.loading}
                      title="서류 안의 값(생년월일·진단명·검사·소견 등)을 뽑아 봅니다. 환자가 적은 칸을 덮어쓰지는 않습니다."
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-teal-200 bg-teal-50 text-xs font-medium text-teal-700 hover:bg-teal-100 transition disabled:opacity-50"
                    >
                      {voiceNotes[path]?.loading ? (
                        <span className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {voiceNotes[path]?.loading ? "읽는 중…" : voiceNotes[path]?.data ? "다시 읽기" : "읽기"}
                    </button>
                    {/* 출력 언어 선택(한/영/러) — 코디=한글, 병원의뢰=영문, 환자·에이전시=러시아어 */}
                    <div className="shrink-0 inline-flex rounded-md border border-gray-200 overflow-hidden" role="group" aria-label={L.atLangGroup}>
                      {OUT_LANGS.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => setAttLang((prev) => ({ ...prev, [path]: o.key }))}
                          className={`px-2 py-1.5 text-xs font-medium transition ${curLang === o.key ? "bg-teal-700 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                          title={`${o.label} 로 번역`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {/* 변환(병원·환자 전달용 원문 1:1 번역, 선택 언어로) */}
                    <button
                      onClick={() => translateAttachment(path, name, curLang, !!entry?.doc)}
                      disabled={!path || transLoadingKey === curKey}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-teal-200 bg-teal-50 text-xs font-medium text-teal-700 hover:bg-teal-100 transition disabled:opacity-50"
                      title={L.atConvertTitle}
                    >
                      {transLoadingKey === curKey ? (
                        <span className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Languages size={14} />
                      )}
                      <span className="hidden sm:inline">
                        {entry?.doc ? L.atReconvert : L.atConvert}
                      </span>
                    </button>
                    {/* 다운로드(원본 파일명으로 바로 저장) */}
                    <button
                      onClick={() => downloadAttachment(path, name)}
                      disabled={!path || attDownloadPath === path}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition disabled:opacity-50"
                      title={`다운로드 (${name})`}
                    >
                      {attDownloadPath === path ? (
                        <span className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      <span className="hidden sm:inline">{L.atDownload}</span>
                    </button>
                    </>
                    )}
                  </div>
                  {/* CT 영상 — 같은 화면에서 펼친다(다른 쪽으로 안 넘어간다, PO 요청) */}
                  {openImaging === path && (
                    <div className="border-t border-gray-100 px-3 pb-3">
                      <ImagingPanel
                        inquiryId={inquiryId}
                        path={path}
                        name={name}
                        onClose={() => setOpenImaging(null)}
                      />
                    </div>
                  )}
                  {/* 음성 정리 결과 — 듣지 않고 읽는 칸. 저장하지 않고 화면에만 둔다. */}
                  {voiceNotes[path]?.error && (
                    <div className="border-t border-gray-100 bg-amber-50/60 px-3 py-3">
                      <p className="text-sm text-amber-800">
                        {voiceNotes[path].error === "too_large"
                          ? "음성이 너무 깁니다(12MB 넘음). 나눠서 올려주세요."
                          : voiceNotes[path].error === "unsupported_type"
                          ? "이 형식은 아직 못 읽습니다."
                          : "음성을 읽지 못했습니다. 잠시 뒤 다시 눌러주세요."}
                      </p>
                    </div>
                  )}
                  {voiceNotes[path]?.data && (() => {
                    const v = voiceNotes[path].data;
                    return (
                      <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-3 space-y-3">
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          {/* teal-600 은 3.74:1 로 대비 기준(4.5:1) 미달이라 안 쓴다 — DESIGN.md */}
                          <Sparkles size={12} className="text-teal-700" />
                          {isVoiceFile(name)
                            ? "기계가 듣고 옮긴 것입니다 — 중요한 값은 원본을 확인해 주세요"
                            : "기계가 서류를 읽은 것입니다 — 환자 칸에 옮기기 전에 원본과 대조해 주세요"}
                          {v.language && <span className="ml-auto">말: {v.language}</span>}
                        </div>

                        {/* 서류에서 뽑아낸 값 — 이게 「문서 올렸는데 값이 안 채워진다」의 답이다(2026-09-04 PO).
                            🛑 보여주기만 한다. 환자가 적은 칸을 자동으로 덮지 않는다. */}
                        {v.fields && Object.keys(v.fields).length > 0 && (
                          <div>
                            {/* 서류 종류(v.kind)는 여기 안 적는다 — 이 화면은 브라우저에서 그려지는데
                                kindLabel 이 쓰는 사전이 클라이언트에 안 실려 한국어 화면에도 영어로 떨어진다
                                (2026-09-04 실측: 「Other document」). 종류는 위 첨부 줄에 이미 붙어 있다. */}
                            <p className="text-[11px] font-semibold text-gray-600 mb-1.5">서류에서 읽은 값</p>
                            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                              {Object.entries(v.fields).map(([k, val]) => (
                                <div key={k} className="flex gap-2 text-xs">
                                  <dt className="shrink-0 w-20 text-gray-500">{DOC_FIELD_LABELS[k] || k}</dt>
                                  <dd className="min-w-0 flex-1 text-gray-800 break-words">{String(val)}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}

                        {v.summaryKo && (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {v.summaryKo}
                          </p>
                        )}

                        {/* 🛑 이 칸이 요약보다 중요하다 — 흐리게 말한 병기·날짜를 확정으로 처리하면
                            그게 그대로 병원에 나간다. 눈에 띄게 둔다. */}
                        {v.uncertain?.length > 0 && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-[11px] font-semibold text-amber-800 mb-1">
                              확실하지 않은 것 — 그대로 쓰지 마세요
                            </p>
                            <ul className="space-y-0.5">
                              {v.uncertain.map((u, k) => (
                                <li key={k} className="text-xs text-amber-900">· {u}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 코디는 의료인이 아니다 — 서류에 나온 용어가 «무엇인지»만 풀어 준다
                            (2026-09-04 PO: 「여기도 의료용어는 쉽게 풀이해줘」). 음성 보관함과 같은 칸.
                            🛑 «이 환자에게 무슨 뜻인지»는 담지 않는다 — 그건 의료 조언이다. */}
                        {v.glossary?.length > 0 && (
                          <section className="rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2.5">
                            <p className="text-xs font-bold text-teal-800 mb-1.5">이 말이 무슨 뜻이냐면</p>
                            <dl className="space-y-1">
                              {v.glossary.map((g, k) => (
                                <div key={k} className="text-xs">
                                  <dt className="inline font-semibold text-teal-900">{g.term}</dt>
                                  <dd className="inline text-gray-700"> — {g.plain}</dd>
                                </div>
                              ))}
                            </dl>
                          </section>
                        )}

                        {v.askNext?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-gray-600 mb-1">다음에 확인할 것</p>
                            <ul className="space-y-0.5">
                              {v.askNext.map((a, k) => (
                                <li key={k} className="text-xs text-gray-700">· {a}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {v.transcript && (
                          <details className="group">
                            <summary className="cursor-pointer text-xs text-teal-700 hover:underline select-none">
                              들린 그대로 보기 ({v.transcript.length}자)
                            </summary>
                            <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed border-l-2 border-gray-200 pl-3">
                              {v.transcript}
                            </p>
                          </details>
                        )}
                      </div>
                    );
                  })()}
                  {/* 번역 결과 패널(선택 언어) */}
                  {entry && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-3">
                      {entry.error ? (
                        <p className="text-sm text-amber-700">
                          {entry.error === "unsupported_type"
                            ? L.atErrFormat
                            : entry.error === "file_too_large"
                            ? L.atErrTooBig
                            : entry.error === "too_long"
                            ? L.atErrTooLong
                            : L.atErrTranslate}
                        </p>
                      ) : (
                        <TranslatedDocView
                          key={curKey}
                          doc={entry.doc}
                          lang={curLang}
                          copied={copiedTransPath === curKey}
                          onCopy={() => copyTranslation(curKey, entry.doc)}
                          onPdf={() => printTranslation(entry.doc, name, curLang, L.atErrPopup)}
                          onVerify={() => verifyNumbers(path, name, curKey, entry.doc)}
                          verify={verifyResults[curKey]}
                          onSave={(edited) => saveEdit(path, curLang, curKey, edited)}
                          onGlossary={(src, target) => addGlossary(curLang, src, target)}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 환자 대신 올리기 — 메일·왓츠앱으로 따로 받은 자료를 문의에 붙인다(문의 #60). */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-800">{L.ibStaffUploadTitle}</p>
            <p className="text-xs text-gray-500 mt-0.5">{L.ibStaffUploadHint}</p>
            <p className="text-xs text-gray-500 mt-0.5">{describeUpload("medicalDoc", lang)}</p>
            {/* 병원 CD 도 여기로 올린다 — 안내에 없으면 «못 올리는 줄» 안다(파일 고르기는 이미 받고 있었다). */}
            <p className="text-xs text-gray-500 mt-0.5">{describeUpload("imaging", lang)}</p>
            <div className="mt-2 flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition cursor-pointer">
                <FileText size={14} />
                {L.ibStaffUploadBtn}
                <input
                  type="file"
                  className="hidden"
                  disabled={staffUploading}
                  /* 🛑 목록을 손으로 베끼지 마라 — 바로 위 안내 문구는 uploadPolicy 를 읽는데
                     이 칸만 베껴 둬서, 형식을 하나 더해도 «안내엔 뜨는데 고를 수는 없는» 상태가 됐다
                     (2026-09-03: 음성을 더하다 발견). 규칙은 한 곳(uploadPolicy)에만 둔다. */
                  accept={`${UPLOAD_POLICY.medicalDoc.accept},${UPLOAD_POLICY.imaging.accept}`}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) staffUpload(f); }}
                />
              </label>
              {staffUploading && (
                <span className="text-xs text-teal-700">{Math.round(staffProgress * 100)}%</span>
              )}
              {staffMsg && (
                <span className={`text-xs ${staffMsg.type === "ok" ? "text-green-700" : "text-red-700"}`}>
                  {staffMsg.text}
                </span>
              )}
            </div>
          </div>
        </Card>
        );
      })()}

      {/* 접수 후 추가 정보(글) — 메신저로 뒤늦게 들어온 환자 상태. 소견 화면·케이스 브리프에도 흐른다. */}
      <FollowUpsSection inquiryId={inquiryId} />

      {/* 전문의 세컨드 오피니언 — 협력병원/외부 전문의 소견 요청·수집 (코디·어드민 전용, 자체완결 컴포넌트) */}
      <OpinionsSection inquiryId={inquiryId} />

      {/* 우리 → 환자 방향 서류함. 소견 바로 아래 둔다 — 소견을 정리해 내보내는 게 다음 동작이라서. */}
      <SharedDocumentsSection inquiryId={inquiryId} />

      {/* 환자에게 알릴 «중간 소식»(병원 문의·회신 등). 단계를 옮길 일이 아닌 것들이 여기 쌓인다.
          아래 「진행 단계」의 메모는 한 칸이라 덮어쓰이지만, 이건 한 건씩 남는다. */}
      <CaseUpdatesSection
        inquiryId={inquiryId}
        patientLang={inquiry?.preferred_language || inquiry?.spoken_language || null}
      />

      {/* 이 암종을 진료하는 병원 — 병원 등록 정보 기준(공고 ICT ① 매칭). 순위는 안 매긴다. */}
      <HospitalMatchSection cancerType={inquiry?.cancer_type || null} />

      {/* 사후관리 경과 — 해외 의료기관·환자가 올린 검사결과·영상·소견(읽기 전용, 공고 ICT ④). */}
      <ProgressSection inquiryId={inquiryId} />

      {/* 진행 단계 — 코디가 설정. 환자·에이전시 포털에 같은 상태가 노출된다(흐름: 접수→사전상담→병원검토→일정조율→비자준비→입국치료→사후관리→완료). */}
      <Card title={L.ibCaseCard}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {CASE_STATUS_STEPS.filter((s) => s.order < 90).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  if (s.key === caseStatus) return;
                  const curOrder = CASE_STATUS_STEPS.find((x) => x.key === caseStatus)?.order || 0;
                  // on_hold(보류)는 순서상 99지만 실제 단계가 아니라 일시정지 — 재개/재보류는
                  // "되돌리기"로 취급하지 않는다(그래야 확인창 문구가 실제 방향과 맞음, POSTMORTEM #80).
                  if (s.key !== "on_hold" && caseStatus !== "on_hold" && s.order < curOrder) {
                    const ok = window.confirm(
                      L.atStageBackConfirm.replace("{from}", caseStatusLabelL(caseStatus, lang)).replace("{to}", caseStatusLabelL(s.key, lang))
                    );
                    if (!ok) return;
                    setCaseStatusForce(true);
                  } else {
                    setCaseStatusForce(false);
                  }
                  setCaseNote(""); // 이전 단계 메모가 다음 단계로 그대로 복사되지 않게 초기화
                  setCaseStatus(s.key);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  caseStatus === s.key
                    ? "bg-teal-700 text-white border-teal-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-teal-400"
                }`}
              >
                {s.order}. {caseStatusLabelL(s.key, lang)}
              </button>
            ))}
          </div>
          <textarea
            value={caseNote}
            onChange={(e) => setCaseNote(e.target.value)}
            rows={2}
            placeholder={L.ibCaseNotePlaceholder}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={saveCase}
              disabled={caseSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition disabled:opacity-50"
            >
              {caseSaving ? L.ibCaseSaving : L.ibCaseSave}
            </button>
            {caseSaved && <span className="text-sm text-teal-700 inline-flex items-center gap-1"><Check size={15} /> {L.ibCaseSaved}</span>}
          </div>
        </div>
      </Card>

      {/* 접수 정보 (타임라인) */}
      <Card title={L.ibIntakeInfoCard}>
        <Row icon={FileText} label={L.ibIntakeChannel} value={inquiry.agency_id ? `${L.agencyReferral}${inquiry.agency_name ? ` (${inquiry.agency_name})` : ""}` : (inquiry.source || L.ibPatientDirectIntake)} />
        <Row icon={Calendar} label={L.receivedDate} value={fmtDate(inquiry.created_at)} />
        <Row icon={Calendar} label={L.ibStep1Done} value={fmtDate(inquiry.step1_completed_at)} />
        <Row icon={Calendar} label={L.ibStep2Done} value={fmtDate(inquiry.step2_completed_at)} />
      </Card>

      {/* 추가 정보 요청 — 환자에게 Step2 상세폼 링크 발송(이메일) + 코디용 복사/왓츠앱 */}
      {/* 자동 검사가 «글자» 대신 이 표식으로 고른다 — 코디 화면 언어가 한국어가 아니면
          「추가 정보 요청」으로 못 찾아 검사가 조용히 지나친다(2026-08-25). */}
      {!step2Done && (
        <div data-testid="request-info-card">
        <Card title={L.ibReqCard}>
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {L.ibReqDesc1}
            {" "}<b>{L.ibReqDescBold}</b>{L.ibReqDesc2}
          </p>

          {!reqResult ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                data-testid="request-info-button"
                onClick={requestInfo}
                disabled={reqLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
              >
                <Send size={16} /> {reqLoading ? L.ibReqSending : L.ibReqButton}
              </button>
              {inquiry.info_requested_at && (
                <span className="text-xs text-gray-500">
                  {L.ibReqLast}: {fmtDate(inquiry.info_requested_at)}
                </span>
              )}
              {reqError && <span className="text-sm text-red-600">{reqError}</span>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className={`text-sm font-medium flex items-center gap-1.5 ${reqResult.emailSent ? "text-teal-700" : "text-amber-700"}`}>
                <Check size={16} />
                {reqResult.emailSent
                  ? `${L.ibReqEmailSent} (${reqResult.email})`
                  : reqResult.email
                    ? `${L.ibReqEmailFailed.replace("{email}", reqResult.email)}`
                    : L.ibReqNoEmail}
              </p>

              {/* 코디가 어떤 채널로든 보낼 수 있는 링크 */}
              <div className="flex items-stretch gap-2">
                <input
                  readOnly
                  value={reqResult.link}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                />
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition shrink-0"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? L.ibCopied : L.ibCopy}
                </button>
              </div>

              {/* 환자가 쓴 채널(왓츠앱 등)로 바로 보내기 */}
              {(() => {
                // 환자에게 가는 문구는 코디 화면 언어가 아니라 '환자 언어'로 — 못 알아보면 무의미하므로.
                const patientLang = inquiry.preferred_language || inquiry.spoken_language || "en";
                const msg = `${coordinatorL(patientLang).ibWaMessage}: ${reqResult.link}`;
                const digits = String(inquiry.contact_id || "").replace(/[^\d]/g, "");
                const isWa = String(inquiry.contact_method || "").toLowerCase().includes("whats");
                const waUrl = `https://wa.me/${isWa && digits.length >= 6 ? digits : ""}?text=${encodeURIComponent(msg)}`;
                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#25D366] text-white rounded-lg hover:opacity-90 transition"
                  >
                    <ExternalLink size={15} /> {L.ibWaSend}
                  </a>
                );
              })()}
            </div>
          )}
        </Card>
        </div>
      )}

      {/* 다음 단계 — 병원 검토 후 화상 상담 (흐름상 진행 단계·추가정보 다음). */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500 mb-2">{L.ibNextStepDesc}</p>
        <Link
          href="/coordinator/consultations"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-teal-700 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <Video size={16} /> {L.ibScheduleConsult}
        </Link>
      </div>
    </div>
  );
}
