"use client";

/**
 * 코디네이터 — 음성 메모 보관함
 *
 * 왜 (2026-09-04 PO):
 *   ① 「왓츠앱으로 음성이 많이 오는데 매번 다 듣기 번거롭다 — 정식 접수 전에도 전체본·요약을」
 *   ② 「한 번만 쓰는 게 아니고 계속 여러 번 올린다. 여러 음성파일을 관리할 수 있어야 하고,
 *      어느 에이전시·어느 환자가 보내준 것인지 기록도 남으면 좋겠다」
 *   ③ 「우리는 전문 의료인이 아니니깐 의료 용어 해설도」
 *
 *   ②가 오기 전에는 «화면에만 띄우고 안 남기는» 도구로 만들었었다. 실무는 쌓아 두고 되짚는 일이었다.
 *
 * 🔒 전사본·요약·출처에는 병력·이름이 들어간다 → 서버에서 암호화해 저장하고, 표는 service_role 전용이다.
 *    이 화면은 반드시 /api/coordinator/voice-notes 를 거친다(브라우저가 표를 직접 못 읽는다).
 */

import { useState, useEffect, useCallback } from "react";
import {
  Mic, Upload, Copy, Check, Sparkles, AlertTriangle, Trash2, BookOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { uploadDirect } from "@/lib/uploadAttachment";
import { DOC_FIELD_LABELS } from "@/lib/inquiry/docKinds";

// 판독 창구가 아는 «대표 이름»으로 맞춰 보낸다(별칭을 그대로 보내면 안 받는다).
const VOICE_MIME = {
  mp3: "audio/mpeg", m4a: "audio/mp4", mp4a: "audio/mp4", "3gp": "audio/mp4",
  wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg",
  webm: "audio/webm", amr: "audio/amr",
};
const voiceMime = (name) => VOICE_MIME[String(name || "").split(".").pop()?.toLowerCase()] || null;
const VOICE_LABEL = "MP3 · M4A · WAV · OGG · WebM · AMR";


export default function CoordinatorVoicePage() {
  const [phase, setPhase] = useState("idle");   // idle | uploading | reading | saving | error
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [copied, setCopied] = useState("");

  const authFetch = useCallback(async (url, init = {}) => {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${session?.access_token || ""}` },
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/coordinator/voice-notes");
      const j = await res.json();
      if (j?.ok) setItems(j.items || []);
    } catch (e) {
      console.error("[voice] list error:", e);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  async function handleFile(file) {
    if (!file) return;
    const type = voiceMime(file.name);
    if (!type) { setPhase("error"); setErrorCode("not_audio"); return; }

    setFileName(file.name);
    setErrorCode("");
    setProgress(0);
    setPhase("uploading");

    const up = await uploadDirect("/api/attachments/upload", file, {}, {
      onProgress: (p) => setProgress(p),
    });
    if (!up.ok) { setPhase("error"); setErrorCode(up.error || "upload_failed"); return; }

    setPhase("reading");
    let read;
    try {
      const res = await fetch("/api/inquiry/classify-doc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: up.path, type: up.type || type }),
      });
      read = await res.json();
      if (!read?.ok || read.skipped) throw new Error(read?.skipped || read?.error || "failed");
    } catch (e) {
      console.error("[voice] read error:", e);
      setPhase("error");
      setErrorCode(String(e?.message || "read_failed"));
      return;
    }

    setPhase("saving");
    try {
      const res = await authFetch("/api/coordinator/voice-notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storagePath: up.path,
          fileName: file.name,
          byteSize: file.size,
          sourceLabel: sourceLabel.trim() || null,
          language: read.language,
          transcript: read.transcript,
          summaryKo: read.summaryKo,
          uncertain: read.uncertain,
          askNext: read.askNext,
          fields: read.fields,
          glossary: read.glossary,
        }),
      });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "save_failed");
      setSourceLabel("");
      setPhase("idle");
      setOpenId(j.id);       // 방금 올린 것을 펼쳐 둔다
      await load();
    } catch (e) {
      console.error("[voice] save error:", e);
      setPhase("error");
      setErrorCode("save_failed");
    }
  }

  async function remove(id, label) {
    if (!window.confirm(`「${label}」 를 지웁니다.\n\n소리 파일과 정리된 글이 함께 지워지고 되돌릴 수 없습니다.`)) return;
    try {
      const res = await authFetch(`/api/coordinator/voice-notes?id=${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "failed");
      await load();
    } catch (e) {
      console.error("[voice] delete error:", e);
      window.alert("지우지 못했습니다. 잠시 뒤 다시 눌러주세요.");
    }
  }

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch { /* 클립보드 막힌 브라우저 — 직접 긁어 복사한다 */ }
  };

  const busy = phase === "uploading" || phase === "reading" || phase === "saving";
  const errText = {
    not_audio: "음성 파일이 아닙니다. MP3·M4A·WAV·OGG·WebM·AMR 을 올려주세요.",
    file_too_large: "파일이 너무 큽니다(200MB 넘음).",
    invalid_file_type: "이 형식은 받지 않습니다.",
    invalid_file_content: "파일 속이 형식과 달라 막혔습니다.",
    too_large: "음성이 너무 깁니다(12MB 넘음). 나눠서 올려주세요.",
    rate_limited: "잠시 뒤 다시 시도해 주세요.",
    save_failed: "정리는 됐는데 보관에 실패했습니다. 다시 올려주세요.",
  }[errorCode] || "읽지 못했습니다. 잠시 뒤 다시 올려주세요.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mic size={24} className="text-teal-700" /> 음성 정리
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          왓츠앱·텔레그램으로 받은 음성을 올리면 <b>듣지 않고</b> 글과 요약으로 봅니다. 올린 것은 아래에 쌓입니다.
        </p>
      </div>

      {/* 올리기 */}
      <div className="space-y-3">
        <div>
          <label htmlFor="voice-source" className="block text-sm font-semibold text-gray-700 mb-1.5">
            누가 보낸 음성인가요? <span className="font-normal text-gray-500">(선택: 나중에 찾을 때 씁니다)</span>
          </label>
          <input
            id="voice-source"
            type="text"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            disabled={busy}
            placeholder="예: 나탈리아(에이전시) / АМИРОВА 환자 본인"
            className="w-full max-w-xl p-2.5 rounded-lg border border-gray-200 focus:border-teal-700 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-white transition disabled:bg-gray-50"
          />
        </div>

        <label
          className={`block w-full rounded-xl border-2 border-dashed px-4 py-8 text-center transition cursor-pointer ${
            busy ? "border-gray-200 bg-gray-50 cursor-wait" : "border-gray-300 hover:border-teal-700 hover:bg-teal-50/40"
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); }}
        >
          <input
            type="file"
            className="hidden"
            accept=".mp3,.m4a,.wav,.ogg,.oga,.opus,.webm,.amr,audio/*"
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handleFile(f); }}
          />
          {busy ? (
            <div className="space-y-2">
              <div className="mx-auto w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">
                {phase === "uploading" ? `올리는 중… ${Math.round(progress * 100)}%`
                  : phase === "reading" ? "듣고 정리하는 중… (1분 음성에 약 10초)"
                  : "보관하는 중…"}
              </p>
              <p className="text-xs text-gray-500">{fileName}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Upload size={22} className="mx-auto text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">여기에 음성을 끌어다 놓거나 눌러서 고르세요</p>
              <p className="text-xs text-gray-500">{VOICE_LABEL} · 최대 200MB</p>
            </div>
          )}
        </label>

        {phase === "error" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">{errText}</p>
          </div>
        )}
      </div>

      {/* 보관함 */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-2">
          보관된 음성 {items.length > 0 && <span className="text-gray-500 font-normal">({items.length})</span>}
        </h2>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl">
            <Mic size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">아직 올린 음성이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => {
              const open = openId === it.id;
              return (
                <div key={it.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button
                      onClick={() => setOpenId(open ? null : it.id)}
                      className="flex-1 min-w-0 flex items-center gap-2 text-left"
                    >
                      {open ? <ChevronDown size={16} className="text-gray-500 shrink-0" />
                            : <ChevronRight size={16} className="text-gray-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {it.sourceLabel || it.fileName}
                          {it.language && <span className="ml-2 text-[11px] font-normal text-gray-500">{it.language}</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {new Date(it.createdAt).toLocaleString("ko-KR")}
                          {it.sourceLabel && ` · ${it.fileName}`}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => remove(it.id, it.sourceLabel || it.fileName)}
                      title="지우기"
                      className="shrink-0 p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {open && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4 space-y-4">
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <Sparkles size={12} className="text-teal-700" />
                        기계가 듣고 옮긴 것입니다 — 중요한 값은 원본을 확인해 주세요
                      </div>

                      {it.summaryKo && (
                        <section>
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <h3 className="text-sm font-bold text-gray-800">요약</h3>
                            <button
                              onClick={() => copy(it.summaryKo, `s${it.id}`)}
                              className="shrink-0 inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
                            >
                              {copied === `s${it.id}` ? <Check size={13} /> : <Copy size={13} />}
                              {copied === `s${it.id}` ? "복사됨" : "복사"}
                            </button>
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{it.summaryKo}</p>
                        </section>
                      )}

                      {/* 🛑 요약보다 먼저 눈에 들어와야 한다 — 흐리게 말한 값을 확정으로 처리하면 그게 그대로 나간다. */}
                      {it.uncertain?.length > 0 && (
                        <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                          <h3 className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                            <AlertTriangle size={13} /> 확실하지 않은 것 — 그대로 쓰지 마세요
                          </h3>
                          <ul className="space-y-0.5">
                            {it.uncertain.map((u, i) => <li key={i} className="text-xs text-amber-900">· {u}</li>)}
                          </ul>
                        </section>
                      )}

                      {/* 코디는 의료인이 아니다 — 나온 용어가 «무엇인지»만 풀어 준다(2026-09-04 PO). */}
                      {it.glossary?.length > 0 && (
                        <section className="rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2.5">
                          <h3 className="text-xs font-bold text-teal-800 mb-1.5 flex items-center gap-1.5">
                            <BookOpen size={13} /> 이 말이 무슨 뜻이냐면
                          </h3>
                          <dl className="space-y-1">
                            {it.glossary.map((g, i) => (
                              <div key={i} className="text-xs">
                                <dt className="inline font-semibold text-teal-900">{g.term}</dt>
                                <dd className="inline text-gray-700"> — {g.plain}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      )}

                      {it.askNext?.length > 0 && (
                        <section>
                          <h3 className="text-xs font-bold text-gray-600 mb-1">다음에 확인할 것</h3>
                          <ul className="space-y-0.5">
                            {it.askNext.map((a, i) => <li key={i} className="text-xs text-gray-700">· {a}</li>)}
                          </ul>
                        </section>
                      )}

                      {it.fields && Object.values(it.fields).some(Boolean) && (
                        <section>
                          <h3 className="text-xs font-bold text-gray-600 mb-1.5">뽑아낸 값</h3>
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            {Object.entries(it.fields).filter(([, v]) => v).map(([k, v]) => (
                              <div key={k} className="flex gap-2 text-xs">
                                <dt className="shrink-0 text-gray-500 w-24">{DOC_FIELD_LABELS[k] || k}</dt>
                                <dd className="text-gray-800 break-words">{String(v)}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      )}

                      {it.transcript && (
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-teal-700 hover:underline select-none">
                            들린 그대로 보기 ({it.transcript.length}자)
                          </summary>
                          <div className="mt-2 flex items-start justify-between gap-3">
                            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed border-l-2 border-gray-200 pl-3 flex-1">
                              {it.transcript}
                            </p>
                            <button
                              onClick={() => copy(it.transcript, `t${it.id}`)}
                              className="shrink-0 inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
                            >
                              {copied === `t${it.id}` ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
