"use client";

/**
 * 전문의 세컨드 오피니언 — 계정 없는 의사용 소견 작성 화면.
 * 링크(토큰)만으로 케이스 임상요약·검사지를 보고, 명단에서 본인을 골라 소견을 남긴다.
 * 명단 밖이면 "그 외 의료진" — 의사는 이름 안 적어도 되고, 코디가 나중에 라벨한다.
 */

import { useEffect, useState } from "react";
import { FileText, Stethoscope, CheckCircle2, Loader2, ChevronDown, Eye, Download, X, Paperclip } from "lucide-react";
import { OPINION_ROSTER, OPINION_OTHER_KEY, OPINION_OTHER_LABEL } from "@/lib/opinions/roster";
import ImagingPanel from "@/components/ImagingPanel";
import { uploadDirect } from "@/lib/uploadAttachment";
import { scrollBehavior } from "@/lib/a11y/prefersReducedMotion";
import { cancerTypeLabelL } from "@/lib/khidi/medicalLabels";
import { normalizeNationality } from "@/lib/khidi/nationality";

/** 화면에서 바로 띄울 수 있는 형식인가. 압축·문서파일은 내려받아야 열린다. */
const canPreview = (name) => /\.(pdf|jpe?g|png|gif|webp)$/i.test(String(name || ""));

// 이 화면은 한국 의료진 전용(제목·라벨이 한국어 고정)이라 저장된 코드값을 한국어로 풀어 보여준다.
// 안 풀면 「liver」·「KZ」·「ru」 가 그대로 떠서 의료진이 코드값을 해석해야 한다(2026-08-06).
const SPOKEN_LANGS = { ko: "한국어", en: "영어", ru: "러시아어", kz: "카자흐어", zh: "중국어", ja: "일본어" };
const langName = (v) => SPOKEN_LANGS[String(v || "").toLowerCase()] || v;

export default function OpinionClient({ token }) {
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [requestNote, setRequestNote] = useState(null);
  const [error, setError] = useState("");

  const [doctorKey, setDoctorKey] = useState("");
  const [opinion, setOpinion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // 첨부를 «내려받지 않고» 바로 띄워 보는 창(PO 요청 2026-08-04)
  const [preview, setPreview] = useState(null); // { url, name }
  // 소견과 «같이» 낼 서류(견적서 등) — PO 요청 2026-08-04
  const [files, setFiles] = useState([]);       // [{path,name,type}]
  const [uploading, setUploading] = useState(false);
  const [fileErr, setFileErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/opinions/${token}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok || !data.ok) {
          setError(data.error === "rate_limited" ? "rate_limited" : "invalid_link");
        } else {
          setCaseData(data.case);
          setRequestNote(data.requestNote || null);
        }
      } catch {
        if (alive) setError("network");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const addFile = async (file) => {
    if (!file) return;
    setUploading(true); setFileErr("");
    try {
      const r = await uploadDirect(`/api/opinions/${token}/upload`, file);
      if (!r.ok) {
        setFileErr(
          r.error === "file_too_large" ? "파일이 너무 큽니다(50MB까지)."
          : r.error === "invalid_file_type" ? "이 형식은 올릴 수 없습니다. PDF·이미지·워드·엑셀만 됩니다."
          : r.error === "invalid_file_content" ? "파일 내용이 확장자와 다릅니다."
          : "올리지 못했습니다. 다시 시도해 주세요."
        );
        return;
      }
      setFiles((prev) => [...prev, r.file].slice(0, 5));
    } catch {
      setFileErr("올리지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (blockReason || submitting) return; // 단추 잠금과 «같은 조건» — 아래 blockReason 참조
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/opinions/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorKey, opinionText: opinion.trim(), files }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitError(
          data.error === "opinion_too_short" ? "소견 내용을 입력해 주세요."
          : data.error === "rate_limited" ? "잠시 후 다시 시도해 주세요."
          : "제출에 실패했습니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }
      setSubmitted(true);
      // 화면 맨 위로 — 「제출되었습니다」가 위에 뜨는데 아래에 머물러 있으면 «눌린 건가?» 싶다.
      // 「움직임 줄이기」를 켠 분에겐 스르륵 없이 즉시 이동한다(어지럼·구역).
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
    } catch {
      setSubmitError("네트워크 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="text-center py-20">
          <p className="text-gray-900 font-semibold mb-1">
            {error === "rate_limited" ? "잠시 후 다시 시도해 주세요" : "링크가 유효하지 않습니다"}
          </p>
          <p className="text-sm text-gray-500">
            {error === "rate_limited"
              ? "요청이 많습니다. 잠시 뒤에 새로고침 해주세요."
              : "링크가 만료되었거나 잘못되었습니다. 담당 코디네이터에게 새 링크를 요청해 주세요."}
          </p>
        </div>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <div className="text-center py-20">
          <CheckCircle2 size={44} className="mx-auto mb-3 text-teal-600" />
          <p className="text-gray-900 font-semibold mb-1">소견이 제출되었습니다</p>
          <p className="text-sm text-gray-500">감사합니다. 담당 코디네이터가 확인합니다.</p>
        </div>
      </Shell>
    );
  }

  const c = caseData || {};
  // 제출을 막는 이유(없으면 null) — 단추를 잠그는 조건과 «같은 값»을 쓴다. 따로 적으면 어긋난다.
  const blockReason =
    uploading ? "서류를 올리는 중입니다. 잠시만요."
    : !doctorKey ? "소견 주시는 분을 골라 주세요."
    : opinion.trim().length < 5 ? `소견 내용을 조금 더 적어 주세요 (지금 ${opinion.trim().length}자 · 5자 이상).`
    : null;

  return (
    <Shell>
      {/* AI 케이스 브리프 — 코디가 만들어둔 한국어 요약(원문이 러시아어 등이라도 이걸로 빠르게 파악) */}
      {c.brief && (
        <section className="bg-amber-50 rounded-2xl border border-amber-200 p-5 mb-4">
          <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            케이스 요약 <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-200 text-amber-800">AI 초안 — 참고용</span>
          </h2>
          <p className="text-gray-900 font-medium leading-relaxed mb-2">{c.brief.overview}</p>
          {c.brief.request && (
            <p className="text-sm text-gray-700 mb-2"><span className="text-gray-400">환자가 원하는 것 </span>{c.brief.request}</p>
          )}
          {c.brief.points?.length > 0 && (
            <ul className="text-sm text-gray-700 list-disc pl-4 space-y-0.5 mb-2">
              {c.brief.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {c.brief.red_flags?.length > 0 && (
            <ul className="text-sm text-red-700 list-disc pl-4 space-y-0.5">
              {c.brief.red_flags.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {/* CT 초견 — 대표 장면 몇 장만 본 «참고용 초안». 판독은 원장님 몫이라 눈에 띄게 갈라 놓는다. */}
          {c.brief.imaging_note && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <p className="text-[11px] text-amber-700 font-semibold mb-0.5">CT 초견 (AI 초안 — 판독 아님)</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{c.brief.imaging_note}</p>
            </div>
          )}
        </section>
      )}

      {/* 케이스 임상 요약 */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">환자 / 임상 정보</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 mb-3">
          <span><span className="text-gray-400">환자</span> {c.patient}</span>
          {c.nationality && <span><span className="text-gray-400">국적</span> {normalizeNationality(c.nationality)}</span>}
          {c.language && <span><span className="text-gray-400">언어</span> {langName(c.language)}</span>}
        </div>
        {/* treatment_type 배지는 뺐다(2026-08-06): 실측상 암종을 그대로 복사한 낡은 칸이라
            의료진 화면엔 「신장암 / liver」처럼 같은 말이 두 번, 그것도 코드값으로 뜬다.
            전수 확인 — 두 칸이 같은 건 29건, 25건은 챗봇 라우팅 태그(general_inquiry).
            KHIDI 집계는 계속 이 칸을 폴백으로 읽으므로 «표시»만 빼고 저장값은 그대로 둔다. */}
        {/* 암종 이름은 사전(t)이 아니라 정적 표(medicalLabels)에서 가져온다.
            이 화면은 한국어 전용인데 페이지 자체는 영어로 열려서, 브라우저에 한국어 사전이
            안 실려 있다 → t(key,"ko") 를 불러도 영어가 나왔다("Colorectal cancer", 2026-08-26 실측).
            정적 표는 사전 로드와 무관하게 6개 언어를 늘 갖고 있다.
            폴백(treatment_type)을 두는 이유: 에이전시 의뢰는 암종을 «자유 입력»으로 받는데
            우리 목록과 정확히 안 맞으면 cancer_type 이 비고 원문만 treatment_type 에 남는다.
            폴백이 없으면 그 케이스는 원장님 화면에서 암종이 통째로 안 보인다(2026-08-26). */}
        {(c.cancer_type || c.treatment_type || c.icd_code) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {(c.cancer_type || c.treatment_type) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">{cancerTypeLabelL(c.cancer_type, "ko") || c.treatment_type}</span>
            )}
            {/* 코디가 확정한 진단코드. 요약 본문에 나올지는 모델이 정하므로 여기서 칸으로 못 박는다.
                「부위 분류」라는 걸 배지에 같이 적는다 — 원장님이 확정 진단코드로 읽으면 안 된다. */}
            {c.icd_code && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                ICD-10 {c.icd_code}
                <span className="text-[10px] font-normal text-gray-500">(부위 분류)</span>
              </span>
            )}
          </div>
        )}
        {c.clinical?.length > 0 && (
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2 mb-3">
            {c.clinical.map((d, i) => (
              <div key={i} className="min-w-0">
                <dt className="text-[11px] text-gray-400">{d.label}</dt>
                <dd className="text-sm text-gray-900">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {c.message && (
          <div className="mb-3">
            <p className="text-[11px] text-gray-400 mb-1">환자 메시지</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-lg p-3 leading-relaxed">{c.message}</p>
          </div>
        )}
        {/* 접수 «이후»에 들어온 환자 상태 — 서류엔 없는 정보다. 서류보다 최근일 수 있어 위에 둔다. */}
        {c.followUps?.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] text-gray-500 mb-1">접수 후 추가 정보 ({c.followUps.length})</p>
            <ul className="space-y-2">
              {c.followUps.map((f, i) => (
                <li key={i} className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{f.text}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{String(f.at || "").slice(0, 10)} 코디네이터 전달</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {c.attachments?.length > 0 && (
          <div>
            <p className="text-[11px] text-gray-400 mb-1.5">첨부 의료기록 ({c.attachments.length})</p>
            <div className="space-y-3">
              {c.attachments.map((a, i) => (
                <div key={i}>
                  {/* 무슨 자료인지부터 한국어로 — 파일 이름이 러시아어·카자흐어라 이름만 봐선 모른다.
                      코디 화면과 같은 딱지 모양을 쓴다(같은 자료가 화면마다 달라 보이면 안 된다). */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-700 shrink-0">
                      {a.imaging ? "CT 영상" : a.translated?.docTypeShort || "의료기록"}
                    </span>
                    {!a.imaging && a.translated?.docType && (
                      <span className="text-xs text-gray-500 truncate">{a.translated.docType}</span>
                    )}
                  </div>
                  {a.url ? (
                    // 예전엔 누르면 바로 내려받기만 됐다. 원장님이 «잠깐 보고 싶을 뿐»인 경우가 더 많다(PO 요청).
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <FileText size={15} className="text-teal-700 shrink-0" />
                      <span className="truncate text-gray-800">{a.name}</span>
                      {/* 압축파일(CT 묶음)은 화면에 띄울 수 없다 — 버튼을 달면 빈 창만 뜬다. */}
                      {canPreview(a.name) && (
                        <button
                          onClick={() => setPreview({ url: a.url, dl: a.downloadUrl, name: a.name, path: a.path })}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-teal-200 bg-teal-50 text-teal-700 text-xs hover:bg-teal-100 transition"
                        >
                          <Eye size={12} /> 미리보기
                        </button>
                      )}
                      {/* downloadUrl = 저장소가 «내려받기»로 내주는 주소. HTML 의 download 표시는
                          다른 서버 파일엔 안 먹혀서, 그림이면 그냥 탭에 열려 버린다. */}
                      <a href={a.downloadUrl || a.url} download={a.name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 bg-white text-gray-600 text-xs hover:bg-gray-50 transition">
                        <Download size={12} /> 내려받기
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 text-sm"><FileText size={15} /> <span className="truncate">{a.name} (열람 불가)</span></div>
                  )}
                  {a.imaging ? (
                    // CT 묶음은 번역이 아니라 «영상 보기» — 내려받지 않고 이 화면에서 본다.
                    <ImagingToggle token={token} path={a.path} name={a.name} />
                  ) : a.translated ? (
                    <TranslatedDocToggle doc={a.translated} />
                  ) : (
                    // 미리 번역하는 건 앞 5개까지다. 나머지는 «누를 때» 번역한다 —
                    // 조용히 원문만 내주면 «번역이 안 되는 서류»로 오해한다(PO 지적 2026-08-04).
                    a.url && a.path && <TranslateOnDemand token={token} path={a.path} name={a.name} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {requestNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-900 whitespace-pre-wrap">
          {requestNote}
        </div>
      )}

      {/* 소견 작성 */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">소견 작성</h2>

        <label className="block text-sm text-gray-600 mb-1.5">소견 주시는 분</label>
        <select
          value={doctorKey}
          onChange={(e) => setDoctorKey(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4"
        >
          <option value="" disabled>선택해 주세요</option>
          {OPINION_ROSTER.map((r) => (
            <option key={r.key} value={r.key}>{r.name}</option>
          ))}
          <option value={OPINION_OTHER_KEY}>{OPINION_OTHER_LABEL}</option>
        </select>

        <label className="block text-sm text-gray-600 mb-1.5">소견 내용</label>
        <textarea
          value={opinion}
          onChange={(e) => setOpinion(e.target.value)}
          rows={7}
          placeholder="검사지·상세를 보시고 소견을 남겨 주세요."
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none mb-3"
        />

        {/* 서류 같이 내기 — 견적서·검사 안내문 등. 없어도 제출된다. */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1.5">서류 같이 내기 <span className="text-gray-400">(선택 · 견적서 등)</span></label>
          {files.length > 0 && (
            <ul className="space-y-1 mb-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <Paperclip size={13} className="text-teal-700 shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <button onClick={() => setFiles((p) => p.filter((_, k) => k !== i))}
                    className="ml-auto p-0.5 rounded hover:bg-gray-200 text-gray-500" aria-label="빼기">
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition cursor-pointer">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
            {uploading ? "올리는 중…" : "파일 선택"}
            <input type="file" className="hidden" disabled={uploading || files.length >= 5}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; addFile(f); }} />
          </label>
          <p className="text-[11px] text-gray-500 mt-1">PDF · 이미지 · 워드 · 엑셀 · 각 50MB · 최대 5개</p>
          {fileErr && <p className="text-xs text-red-600 mt-1">{fileErr}</p>}
        </div>

        {submitError && <p className="text-sm text-red-600 mb-3">{submitError}</p>}

        {/* 왜 안 눌리는지 «먼저» 말한다 (PO 제보 2026-08-04 «제출하기 버튼이 안눌리는데?»):
            네 글자만 적어서 막혔는데 화면엔 아무 말도 없었다. 못 누르는 단추는 이유를 말해야 한다. */}
        {blockReason && !submitting && (
          <p className="text-sm text-amber-700 mb-2">{blockReason}</p>
        )}

        <button
          onClick={submit}
          disabled={!!blockReason || submitting}
          className="w-full bg-teal-700 text-white py-3 rounded-lg text-sm font-semibold hover:bg-teal-800 transition disabled:opacity-40"
        >
          {submitting ? "제출 중…" : "소견 제출"}
        </button>
      </section>

      {/* 미리보기 — 내려받지 않고 그 자리에서 본다. 사진은 그대로, PDF 는 서버가 그려서 사진으로. */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-800 truncate">{preview.name}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 내려받기는 항상 «원본» — 화면에 띄운 건 우리가 그린 사진이다(의료 원본은 그대로). */}
                <a href={preview.dl || preview.url} download={preview.name}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
                  <Download size={12} /> 내려받기
                </a>
                <button onClick={() => setPreview(null)} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="닫기">
                  <X size={16} />
                </button>
              </div>
            </div>
            {/\.(jpe?g|png|gif|webp)$/i.test(preview.name) ? (
              <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center">
                <img src={preview.url} alt={preview.name} className="max-w-full max-h-[80vh] object-contain" />
              </div>
            ) : (
              <PdfPages token={token} path={preview.path} name={preview.name} />
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

// 번역본이 길어서(검사지 여러 장) 기본은 접어두고 필요할 때 펼침.
function TranslatedDocToggle({ doc }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline"
      >
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        번역본 {open ? "접기" : "펼쳐 보기"}
      </button>
      {open && <TranslatedDocView doc={doc} />}
    </div>
  );
}

// 번역된 검사지(한국어) — 원문 항목명·수치는 그대로 두고 항목명만 번역한 표(요약 아님).
// 컬럼 순서는 항상 [항목(원문), 항목(한글), 결과, 정상범위, 단위](ko 고정 호출).
// 검사지 하나에 패널(CBC·소변·호르몬…)이 여러 개라 전부 펼치면 스크롤이 너무 길어짐 —
// 패널(섹션)별로 접어두고, 원장님은 이상치(▲▼) 있는 패널부터 골라 열어보면 됨.
function TranslatedDocView({ doc }) {
  // 쪽 고르기 — 원본 쪽 번호 그대로. 한 화면에 한 쪽씩 본다(20쪽을 한 줄로 늘어놓으면 못 본다).
  const [pageSel, setPageSel] = useState(1); // 0 = 전체
  const all = doc?.sections || [];
  const pageList = [...new Set(all.map((s) => s?.page).filter(Boolean))].sort((a, b) => a - b);
  const curPage = !pageList.length || pageSel === 0 ? 0 : (pageList.includes(pageSel) ? pageSel : pageList[0]);
  const shown = all.filter((s) => curPage === 0 || s?.page === curPage);
  if (!all.length) return null;
  return (
    <div className="mt-2 border border-gray-200 rounded-xl bg-white p-3 space-y-3">
      {/* 종류 딱지는 «첨부 목록 줄»에 이미 있다 — 여기 또 적으면 같은 말이 두 번 나온다. */}
      {shown.map((s, si) => (
        <div key={si} className={si > 0 ? "pt-3 border-t border-gray-100" : ""}>
          {s.title && <p className="text-sm font-semibold text-gray-700 mb-1">{s.title}</p>}
          {s.note && <p className="text-xs text-gray-400 mb-1">{s.note}</p>}
          {Array.isArray(s.columns) && Array.isArray(s.rows) && s.rows.length > 0 && (
            <SectionTable columns={s.columns} rows={s.rows} />
          )}
          {s.text && <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{s.text}</p>}
        </div>
      ))}
      {/* 쪽 버튼은 «아래»에 — 다 읽고 나면 손이 여기 있다(위에 두면 매번 올라가야 한다, PO 지시) */}
      {pageList.length > 1 && (
        <PagePicker list={pageList} cur={curPage} onPick={setPageSel} />
      )}
    </div>
  );
}


/** 미리 번역해 두지 않은 첨부 — 원장님이 누를 때 그 자리에서 번역한다(한 번만, 다음엔 저장된 것). */
function TranslateOnDemand({ token, path, name }) {
  const [doc, setDoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/opinions/${token}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, name }),
      });
      const d = await res.json();
      if (!d.ok) { setErr(d.error === "rate_limited" ? "잠시 후 다시 눌러 주세요." : "번역하지 못했습니다 — 원본을 확인해 주세요."); return; }
      setDoc(d.doc);
    } catch {
      setErr("번역하지 못했습니다 — 원본을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (doc) return <TranslatedDocView doc={doc} />;
  return (
    <div className="mt-1.5">
      <button onClick={run} disabled={busy} className="flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline disabled:opacity-50">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
        {busy ? "번역하는 중… (문서가 길면 1분쯤)" : "한국어로 번역해 보기"}
      </button>
      {err && <p className="text-xs text-amber-700 mt-1">{err}</p>}
    </div>
  );
}

/** 쪽 고르기 줄 — 코디 화면·의료진 화면이 같은 모양을 쓴다. */
function PagePicker({ list, cur, onPick }) {
  const at = list.indexOf(cur);
  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-gray-100">
      <button onClick={() => onPick(list[Math.max(0, at - 1)])} disabled={cur === 0 || at <= 0}
        className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 text-xs hover:bg-gray-50 disabled:opacity-30">이전</button>
      {list.map((p) => (
        <button key={p} onClick={() => onPick(p)}
          className={`min-w-[1.75rem] px-1.5 py-1 rounded-md border text-xs transition ${
            cur === p ? "border-teal-700 bg-teal-700 text-white font-semibold" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onPick(list[Math.min(list.length - 1, at + 1)])} disabled={cur === 0 || at === list.length - 1}
        className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 text-xs hover:bg-gray-50 disabled:opacity-30">다음</button>
      <button onClick={() => onPick(cur === 0 ? list[0] : 0)}
        className={`ml-1 px-2 py-1 rounded-md border text-xs transition ${
          cur === 0 ? "border-teal-700 bg-teal-700 text-white font-semibold" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
        전체
      </button>
      <span className="text-[11px] text-gray-400 ml-auto">원본 {list.length}쪽</span>
    </div>
  );
}

/**
 * PDF 미리보기 — 우리 서버가 한 쪽씩 그려서 «사진»으로 준다.
 *
 * 왜 이렇게 (2026-08-04 PO: «아직도 pdf 미리보기 안 되는데?», 로컬에서도 안 보임):
 *   처음엔 브라우저 내장 PDF 뷰어(<iframe>)에 맡겼는데 그건 환경을 너무 탄다 —
 *   플러그인이 꺼져 있거나 차단 프로그램이 끼면 하얀 화면이고, **폰에서는 아예 안 뜬다**.
 *   원장님이 폰으로 링크를 여는 일이 흔하다. 사진은 어디서든 뜬다.
 */
function PdfPages({ token, path, name }) {
  const [pages, setPages] = useState(0);
  const [p, setP] = useState(0);
  const [err, setErr] = useState("");
  // 쪽을 넘기면 새 사진이 다 올 때까지 «이전 쪽»이 그대로 떠 있다 — 그러면 안 넘어간 것처럼 보인다
  // (PO 지적 2026-08-04: «이게 안 넘어가는건지 로딩 중인건지 헷갈려»). 그래서 그동안 표시를 띄운다.
  const [drawing, setDrawing] = useState(true);
  const src = (n) => `/api/opinions/${token}/page?path=${encodeURIComponent(path)}&p=${n}`;

  useEffect(() => {
    setPages(0); setP(0); setErr("");
    if (!path) { setErr("이 파일은 미리보기를 만들 수 없다. 내려받아서 봐 주세요."); return; }
    let alive = true;
    fetch(`/api/opinions/${token}/page?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((d) => { if (!alive) return; d?.ok ? setPages(d.pages) : setErr("미리보기를 만들지 못했다. 내려받아서 봐 주세요."); })
      .catch(() => alive && setErr("미리보기를 만들지 못했다. 내려받아서 봐 주세요."));
    return () => { alive = false; };
  }, [token, path]);

  if (err) return <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-500">{err}</div>;
  if (!pages) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin mr-2" /> 여는 중…
      </div>
    );
  }

  return (
    <>
      <div className="relative flex-1 overflow-auto bg-gray-50 flex items-start justify-center p-3">
        {/* key 를 쪽마다 다르게 주는 이유: 같은 자리를 재활용하면 **이전 쪽의 «다 그렸다» 신호가
            새 쪽의 기다림 표시를 꺼버린다**(빨리 넘길 때 실제로 그랬다 — 표시가 안 떴다). */}
        <img
          key={p}
          src={src(p)}
          alt={`${name} ${p + 1}쪽`}
          onLoad={() => setDrawing(false)}
          onError={() => { setDrawing(false); setErr("이 쪽을 그리지 못했다. 내려받아서 봐 주세요."); }}
          className={`max-w-full shadow-sm bg-white transition-opacity ${drawing ? "opacity-0" : "opacity-100"}`}
        />
        {/* 다음 쪽을 미리 받아 둔다 — 미리 받아 둔 쪽은 눌러도 기다림이 없다. */}
        {p + 1 < pages && <img src={src(p + 1)} alt="" className="hidden" aria-hidden />}
        {drawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-gray-200 shadow-sm text-xs text-gray-600">
              <Loader2 size={13} className="animate-spin text-teal-700" /> {p + 1}쪽 여는 중…
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-gray-200 bg-white">
        <button onClick={() => { setDrawing(true); setP((v) => Math.max(0, v - 1)); }} disabled={p === 0}
          className="px-2.5 py-1 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30">◀ 이전</button>
        <span className="text-xs text-gray-600 tabular-nums">{p + 1} / {pages}쪽</span>
        <button onClick={() => { setDrawing(true); setP((v) => Math.min(pages - 1, v + 1)); }} disabled={p + 1 >= pages}
          className="px-2.5 py-1 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30">다음 ▶</button>
      </div>
    </>
  );
}

/** CT 묶음 — 눌러야 준비를 시작한다(처음 한 번 수십 초 걸리므로 자동으로 안 연다). */
function ImagingToggle({ token, path, name }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline"
      >
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        CT 영상 {open ? "접기" : "이 화면에서 보기"}
      </button>
      {open && (
        <ImagingPanel
          endpoint={`/api/opinions/${token}/imaging`}
          withAuth={false}
          path={path}
          name={name}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// 패널(검사 항목군) 하나 — 기본 접힘. 이상치(▲▼ 포함 행)가 있으면 빨간 배지로 몇 건인지 미리 보여줘서
// 원장님이 어느 패널부터 열어볼지 판단할 수 있게 함(전부 열어야 알 수 있으면 의미 없음).
function SectionTable({ columns, rows }) {
  const [open, setOpen] = useState(false);
  const abnormal = rows.filter((r) => (r?.cells || []).some((c) => typeof c === "string" && (c.includes("▲") || c.includes("▼")))).length;
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-teal-700 font-medium hover:underline mb-1"
      >
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        {rows.length}개 항목 {open ? "접기" : "보기"}
        {abnormal > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold">이상치 {abnormal}건</span>
        )}
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="text-[13px] sm:text-sm w-full border-collapse">
            <thead>
              <tr>
                <th className="hidden sm:table-cell text-left text-gray-400 font-medium border-b border-gray-200 py-1.5 pr-3">{columns[0]}</th>
                <th className="text-left text-gray-400 font-medium border-b border-gray-200 py-1.5 pr-3">{columns[1] || columns[0]}</th>
                <th className="text-left text-gray-400 font-medium border-b border-gray-200 py-1.5 pr-3">{columns[2]}</th>
                <th className="text-left text-gray-400 font-medium border-b border-gray-200 py-1.5 pr-3">정상범위·단위</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const [orig, ko, result, range, unit] = r?.cells || [];
                const isAbnormal = (r?.cells || []).some((c) => typeof c === "string" && (c.includes("▲") || c.includes("▼")));
                return (
                  <tr key={ri} className={isAbnormal ? "bg-red-50/60" : ri % 2 === 1 ? "bg-gray-50/60" : ""}>
                    <td className="hidden sm:table-cell text-gray-500 py-1.5 pr-3 border-b border-gray-100 align-top">{orig}</td>
                    <td className="text-gray-800 font-medium py-1.5 pr-3 border-b border-gray-100 align-top">{ko || orig}</td>
                    <td className={`py-1.5 pr-3 border-b border-gray-100 align-top font-semibold ${isAbnormal ? "text-red-700" : "text-gray-900"}`}>{result}</td>
                    <td className="text-gray-500 py-1.5 pr-3 border-b border-gray-100 align-top">{[range, unit].filter(Boolean).join(" ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg lg:max-w-[1400px] mx-auto px-5 lg:px-10 py-4 flex items-center gap-2">
          <Stethoscope size={18} className="text-teal-600" />
          <span className="font-semibold text-gray-900">전문의 소견 요청</span>
          <span className="ml-auto text-sm text-gray-400">healwith</span>
        </div>
      </header>
      <main className="max-w-lg lg:max-w-[1400px] mx-auto px-5 lg:px-10 py-5 lg:py-8">{children}</main>
    </div>
  );
}
