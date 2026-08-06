"use client";

/**
 * 코디 인박스 상세 — «환자에게 보낼 서류» 블록 (코디·어드민 전용).
 *
 * 왜 있나 (2026-08-05, 문의 #60): 원장님 2차 소견서·사전상담 정리본을 만들어 놓고도 **환자에게
 *   줄 통로가 없었다.** 소견 「공개」는 에이전시 화면에만 뜨는데 그 환자는 에이전시도 계정도
 *   없었다. 여기 올려서 「보이기」를 켜면 환자가 받은 진행상황 링크(/claim/<토큰>)에 뜬다.
 *
 * 한 케이스에 **여러 언어**를 같이 보낸다(#60 은 러시아어+카자흐어). 그래서 줄마다
 *   ①환자에게 보일 이름 ②언어를 붙인다. 언어는 파일명에서 먼저 알아맞히고 코디가 고친다.
 *
 * ⚠️ 올린다고 바로 안 나간다 — «보이기»를 켠 것만 환자에게 보인다. 그 링크는 왓츠앱으로
 *    굴러다닐 수 있어서, 실수 한 번이 곧 유출이 되지 않게 두 단계로 나눴다.
 *
 * 자체 완결형(부모 CoordinatorInboxDetailClient 는 한 줄만 삽입).
 */

import { useState, useEffect, useCallback } from "react";
import { Send, FileText, Loader2, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { uploadDirect } from "@/lib/uploadAttachment";
import { DOC_LANGS, DOC_LANG_LABEL } from "@/lib/documents/sharedDocMeta";

// ponytail: 이 블록의 문구는 한국어 고정 — 옆 OpinionsSection 도 절반이 그렇다.
// 코디 화면을 러시아어로 쓰는 사람이 생기면 그때 coordinatorL 로 옮긴다.

async function authFetch(url, options = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}

const ERR = {
  file_too_large: "파일이 너무 큽니다 (최대 50MB)",
  invalid_file_type: "PDF·워드·사진만 올릴 수 있습니다",
  invalid_file_content: "파일 내용이 확장자와 다릅니다",
  too_many_files: "서류는 20개까지입니다",
};

export default function SharedDocumentsSection({ inquiryId }) {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/shared-documents`);
      const data = await res.json();
      if (data.ok) setDocs(data.documents || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => { load(); }, [load]);

  const patch = useCallback(async (docId, body) => {
    setBusyId(docId);
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/shared-documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, ...body }),
      });
      const data = await res.json();
      if (data.ok) await load();
    } catch { /* silent */ } finally {
      setBusyId("");
    }
  }, [inquiryId, load]);

  // 여러 개를 한 번에 고를 수 있다 — 러시아어·카자흐어 사본을 매번 하나씩 올리면 일이 배가 된다.
  const onPick = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;

    setError("");
    setUploading(true);
    let failed = "";
    for (let i = 0; i < files.length; i++) {
      setProgress(0);
      const res = await uploadDirect(
        `/api/coordinator/inquiries/${inquiryId}/shared-documents`,
        files[i],
        {},
        { fetch: authFetch, onProgress: (p) => setProgress((i + p) / files.length) }
      );
      if (!res.ok) failed = ERR[res.error] || "올리지 못했습니다";
    }
    setUploading(false);
    setError(failed);
    await load();
  };

  const remove = async (doc) => {
    if (!window.confirm(`「${doc.title || doc.name}」을 지웁니다. 환자 화면에서도 사라집니다.`)) return;
    setBusyId(doc.id);
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/shared-documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.id }),
      });
      const data = await res.json();
      if (data.ok) await load();
    } catch { /* silent */ } finally {
      setBusyId("");
    }
  };

  const shownCount = docs.filter((d) => d.visible).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
        <Send size={16} className="text-teal-700" /> 환자에게 보낼 서류
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        소견서·안내문처럼 <b>우리가 환자에게 주는</b> 서류. 올린 뒤 「보이기」를 켠 것만 환자가 받은
        진행상황 링크에 뜹니다. 언어를 정해두면 환자는 <b>자기 언어 것을 먼저</b> 봅니다.
        (환자가 우리에게 낸 자료는 위 「첨부」 칸입니다.)
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-3">
          <Loader2 size={15} className="animate-spin" /> 불러오는 중…
        </div>
      ) : (
        <>
          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition cursor-pointer">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? `올리는 중… ${Math.round(progress * 100)}%` : "서류 올리기 (여러 개 가능)"}
            <input
              type="file"
              multiple
              className="hidden"
              disabled={uploading}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={onPick}
            />
          </label>
          <p className="text-[11px] text-gray-500 mt-1.5">
            PDF·워드·사진, 한 개 50MB까지. <b>환자는 폰으로 열어봅니다 — 워드보다 PDF 가 안전합니다.</b>
          </p>
          {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}

          {docs.length > 0 && (
            <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200">
              {docs.map((d) => (
                <DocRow
                  key={d.id}
                  doc={d}
                  busy={busyId === d.id}
                  onPatch={patch}
                  onRemove={() => remove(d)}
                />
              ))}
            </ul>
          )}

          {docs.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-2">
              환자에게 보이는 서류 {shownCount}개 / 올린 것 {docs.length}개
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * 서류 한 줄 — 한 줄에 다 담는다(이름·언어·보이기·지우기).
 * 예전엔 한 건이 세로로 컸는데, 언어별 사본까지 올리면 화면이 끝없이 길어졌다(2026-08-05 PO).
 */
function DocRow({ doc, busy, onPatch, onRemove }) {
  const [title, setTitle] = useState(doc.title || "");
  const [dirty, setDirty] = useState(false);

  // 목록을 다시 불러오면(다른 줄을 고쳤을 때 등) 내가 «타이핑 중이 아닐 때만» 따라간다.
  useEffect(() => {
    if (!dirty) setTitle(doc.title || "");
  }, [doc.title, dirty]);

  const saveTitle = () => {
    if (!dirty) return;
    setDirty(false);
    onPatch(doc.id, { title });
  };

  return (
    <li className={`px-3 py-2 ${doc.visible ? "bg-teal-50/60" : "bg-white"}`}>
      <div className="flex items-center gap-2">
        <FileText size={14} className="shrink-0 text-teal-700" />
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder={doc.name}
          title={doc.name}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-900 hover:border-gray-200 focus:border-teal-500 focus:bg-white focus:outline-none"
        />
        <select
          value={doc.lang || ""}
          onChange={(e) => onPatch(doc.id, { lang: e.target.value })}
          className="shrink-0 rounded border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">언어 없음</option>
          {DOC_LANGS.map((l) => (
            <option key={l} value={l}>{DOC_LANG_LABEL[l]}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPatch(doc.id, { visible: !doc.visible })}
          disabled={busy}
          title={doc.visible ? "환자 화면에서 감춘다" : "환자 화면에 띄운다"}
          className={`shrink-0 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
            doc.visible ? "text-gray-600 hover:bg-gray-200" : "bg-teal-700 text-white hover:bg-teal-800"
          }`}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : doc.visible ? <EyeOff size={12} /> : <Eye size={12} />}
          {doc.visible ? "감추기" : "보이기"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="shrink-0 p-1 text-gray-500 hover:text-red-600 disabled:opacity-50"
          aria-label="서류 지우기"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 pl-6 text-[11px] text-gray-500">
        {doc.url ? (
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {doc.name}
          </a>
        ) : (
          <span>{doc.name}</span>
        )}
        <span aria-hidden="true">·</span>
        <span>{doc.visible ? "환자에게 보임" : "아직 안 보임"}</span>
      </div>
    </li>
  );
}
