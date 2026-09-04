"use client";

/**
 * 코디네이터 — 음성 정리 (문의와 무관하게, 받은 음성을 «듣지 않고» 읽는 자리)
 *
 * 왜 (2026-09-04 PO):
 *   「코디분이 왓츠앱으로 소통하는데 음성 파일로 오는 경우가 많고 매번 다 듣기 번거로운 것 같은데
 *    정식 접수 전에도 음성 파일 전체본, 요약본 할 수 있게 못함? 아이폰이라 통화녹음이나 요약이 없나봐」
 *
 *   문의 상세에 이미 「음성 정리」가 있지만 그건 «문의가 만들어진 뒤»에만 쓸 수 있다.
 *   아셀님이 실제로 받는 음성은 대부분 그 «전» 단계라 붙일 자리가 없었다.
 *
 * 🛑 결과를 저장하지 않는다. 여기는 «읽고 판단하는» 자리이고, 남길 값어치가 있으면
 *    코디가 복사해서 문의·케이스에 붙인다. 저장하면 「언제 적 요약인지」를 관리해야 하는데
 *    그럴 값어치가 아직 없다.
 *
 * 파일은 기존 문의 첨부 창구로 올린다(저장소 직행 — 서버를 거치면 4.5MB 에서 끊긴다).
 * 어떤 문의에도 연결하지 않으므로 저장소에만 남는다.
 */

import { useState } from "react";
import { Mic, Upload, Copy, Check, Sparkles, AlertTriangle } from "lucide-react";
import { uploadDirect } from "@/lib/uploadAttachment";

// 판독 창구가 아는 «대표 이름»으로 맞춰 보낸다(별칭을 그대로 보내면 안 받는다).
const VOICE_MIME = {
  mp3: "audio/mpeg", m4a: "audio/mp4", mp4a: "audio/mp4", "3gp": "audio/mp4",
  wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg",
  webm: "audio/webm", amr: "audio/amr",
};
const voiceMime = (name) => VOICE_MIME[String(name || "").split(".").pop()?.toLowerCase()] || null;
// 화면에 보여줄 형식 이름 — 목록을 두 벌로 두지 않으려고 위 표에서 뽑는다.
const VOICE_LABEL = "MP3 · M4A · WAV · OGG · WebM · AMR";

export default function CoordinatorVoicePage() {
  const [phase, setPhase] = useState("idle");   // idle | uploading | reading | done | error
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [errorCode, setErrorCode] = useState("");
  const [copied, setCopied] = useState("");

  async function handleFile(file) {
    if (!file) return;
    const type = voiceMime(file.name);
    if (!type) { setPhase("error"); setErrorCode("not_audio"); return; }

    setFileName(file.name);
    setResult(null);
    setErrorCode("");
    setProgress(0);
    setPhase("uploading");

    const up = await uploadDirect("/api/attachments/upload", file, {}, {
      onProgress: (p) => setProgress(p),
    });
    if (!up.ok) { setPhase("error"); setErrorCode(up.error || "upload_failed"); return; }

    setPhase("reading");
    try {
      const res = await fetch("/api/inquiry/classify-doc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: up.path, type: up.type || type }),
      });
      const j = await res.json();
      if (!j?.ok || j.skipped) throw new Error(j?.skipped || j?.error || "failed");
      setResult(j);
      setPhase("done");
    } catch (e) {
      console.error("[voice] read error:", e);
      setPhase("error");
      setErrorCode(String(e?.message || "read_failed"));
    }
  }

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch { /* 클립보드 막힌 브라우저 — 사용자가 직접 긁어 복사한다 */ }
  };

  const errText = {
    not_audio: "음성 파일이 아닙니다. MP3·M4A·WAV·OGG·WebM·AMR 을 올려주세요.",
    file_too_large: "파일이 너무 큽니다(200MB 넘음).",
    invalid_file_type: "이 형식은 받지 않습니다.",
    invalid_file_content: "파일 속이 형식과 달라 막혔습니다.",
    too_large: "음성이 너무 깁니다(12MB 넘음). 나눠서 올려주세요.",
    rate_limited: "잠시 뒤 다시 시도해 주세요.",
  }[errorCode] || "읽지 못했습니다. 잠시 뒤 다시 올려주세요.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mic size={24} className="text-teal-700" /> 음성 정리
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          왓츠앱·텔레그램으로 받은 음성을 올리면 <b>듣지 않고</b> 글과 요약으로 봅니다. 문의를 만들기 전에도 씁니다.
        </p>
      </div>

      {/* 올리는 자리 */}
      <label
        className={`block w-full rounded-xl border-2 border-dashed px-4 py-10 text-center transition cursor-pointer ${
          phase === "uploading" || phase === "reading"
            ? "border-gray-200 bg-gray-50 cursor-wait"
            : "border-gray-300 hover:border-teal-700 hover:bg-teal-50/40"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); }}
      >
        <input
          type="file"
          className="hidden"
          accept=".mp3,.m4a,.wav,.ogg,.oga,.opus,.webm,.amr,audio/*"
          disabled={phase === "uploading" || phase === "reading"}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handleFile(f); }}
        />
        {phase === "uploading" || phase === "reading" ? (
          <div className="space-y-2">
            <div className="mx-auto w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">
              {phase === "uploading" ? `올리는 중… ${Math.round(progress * 100)}%` : "듣고 정리하는 중… (1분 음성에 약 10초)"}
            </p>
            <p className="text-xs text-gray-400">{fileName}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Upload size={22} className="mx-auto text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">여기에 음성을 끌어다 놓거나 눌러서 고르세요</p>
            {/* 서류용 안내(PDF·Word…)를 그대로 쓰면 이 화면에선 «올릴 수 있다»고 오해한다 —
                여기는 소리만 받는다. 형식은 위 VOICE_MIME 한 곳에서 뽑는다. */}
            <p className="text-xs text-gray-500">{VOICE_LABEL} · 최대 200MB</p>
          </div>
        )}
      </label>

      {phase === "error" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">{errText}</p>
        </div>
      )}

      {/* 결과 */}
      {phase === "done" && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <Sparkles size={12} className="text-teal-700" />
            기계가 듣고 옮긴 것입니다 — 중요한 값은 원본을 확인해 주세요
            {result.language && <span className="ml-auto">말: {result.language}</span>}
          </div>

          {result.summaryKo && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-sm font-bold text-gray-800">요약</h2>
                <button
                  onClick={() => copy(result.summaryKo, "summary")}
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
                >
                  {copied === "summary" ? <Check size={13} /> : <Copy size={13} />}
                  {copied === "summary" ? "복사됨" : "복사"}
                </button>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{result.summaryKo}</p>
            </section>
          )}

          {/* 🛑 요약보다 먼저 눈에 들어와야 한다 — 흐리게 말한 값을 확정으로 처리하면 그게 그대로 나간다. */}
          {result.uncertain?.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-bold text-amber-800 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle size={14} /> 확실하지 않은 것 — 그대로 쓰지 마세요
              </h2>
              <ul className="space-y-1">
                {result.uncertain.map((u, i) => (
                  <li key={i} className="text-sm text-amber-900">· {u}</li>
                ))}
              </ul>
            </section>
          )}

          {result.askNext?.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-bold text-gray-800 mb-1.5">다음에 확인할 것</h2>
              <ul className="space-y-1">
                {result.askNext.map((a, i) => (
                  <li key={i} className="text-sm text-gray-700">· {a}</li>
                ))}
              </ul>
            </section>
          )}

          {result.fields && Object.values(result.fields).some(Boolean) && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-bold text-gray-800 mb-2">뽑아낸 값</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {Object.entries(result.fields).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <dt className="shrink-0 text-gray-500 w-32">{FIELD_LABELS[k] || k}</dt>
                    <dd className="text-gray-800 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {result.transcript && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-sm font-bold text-gray-800">들린 그대로 ({result.transcript.length}자)</h2>
                <button
                  onClick={() => copy(result.transcript, "transcript")}
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
                >
                  {copied === "transcript" ? <Check size={13} /> : <Copy size={13} />}
                  {copied === "transcript" ? "복사됨" : "복사"}
                </button>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed border-l-2 border-gray-200 pl-3">
                {result.transcript}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const FIELD_LABELS = {
  lastName: "성", firstName: "이름", birthDate: "생년월일", sex: "성별",
  email: "이메일", phone: "전화", diagnosisNameRaw: "진단명", icdCode: "진단코드",
  diagnosisDate: "진단시기", stage: "병기", chiefComplaint: "주호소",
  testsAndTreatments: "검사·치료", medications: "복용약",
  pastHistoryNote: "과거력", familyHistory: "가족력",
};
