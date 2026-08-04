"use client";

/**
 * CT 영상 보기 — 문의 상세 «그 화면 안»에서 펼쳐진다 (다른 쪽으로 안 넘어간다, PO 요청 2026-08-03).
 *
 * 서버가 미리 시리즈별로 픽셀만 이어붙여 놨고(app/api/coordinator/inquiries/[id]/imaging),
 * 여기서는 보는 장의 «구간만» 잘라 받아 그린다. 한 장 512×512×2 = 512KB —
 * 134MB 짜리 묶음을 통째로 기다리지 않는다.
 *
 * CT 는 값 범위가 넓어(-1024~3000 HU) 그대로는 안 보인다. 「밝기 기준(window)」으로
 * 볼 구간을 잘라 0~255 로 펴는데, 그게 방사선과에서 쓰는 그 창이다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// 방사선과에서 쓰는 표준 창(window) 값 그대로. 폭(WW)/중심(WL).
// ⚠️ 「연부조직」을 «복부»라고만 부르지 않는다 — 가슴·목에도 똑같이 쓰는 기본값이라,
//   흉부 CT 를 보면서 「복부」라고 적혀 있으면 잘못 온 줄 안다(PO 지적 2026-08-03).
const WINDOWS = [
  { key: "soft", label: "연부조직(기본)", ww: 350, wc: 40 },
  { key: "liver", label: "간", ww: 150, wc: 60 },
  { key: "lung", label: "폐", ww: 1500, wc: -600 },
  { key: "bone", label: "뼈", ww: 2000, wc: 400 },
  { key: "brain", label: "뇌", ww: 80, wc: 40 },
];

/**
 * @param endpoint  준비 창구 주소. 코디는 문의 번호로, 의료진(소견 링크)은 토큰으로 —
 *                  화면은 하나, 문 앞에서만 갈린다.
 * @param withAuth  로그인 토큰을 붙일지(코디 화면만 true). 소견 링크는 계정이 없다.
 */
export default function ImagingPanel({ inquiryId, endpoint, withAuth = true, path, name, onClose }) {
  const [stage, setStage] = useState("loading"); // loading | ready | error
  const [errText, setErrText] = useState("");
  const [series, setSeries] = useState([]);
  const [urls, setUrls] = useState({});
  const [skipped, setSkipped] = useState([]); // 그림도 글도 못 뽑은 항목
  const [docs, setDocs] = useState([]);       // 그림 대신 «글»로 든 기록(선량 기록 등)
  const [extras, setExtras] = useState([]);   // CD 자체 뷰어·목차 같은 비의료 파일
  const [docKey, setDocKey] = useState(null); // 글 기록을 보는 중이면 그 key
  const [sIdx, setSIdx] = useState(0);
  const [slice, setSlice] = useState(0);
  const [ww, setWw] = useState(350);
  const [wc, setWc] = useState(40);
  const [preparing, setPreparing] = useState(false); // 아직 안 만든 묶음을 지금 만드는 중
  const wantRef = useRef(0);                          // 서버에 «이 묶음을 만들어 달라»고 알릴 번호
  const canvasRef = useRef(null);
  const cacheRef = useRef(new Map()); // "시리즈-장" → Int16Array (같은 장을 두 번 안 받는다)

  // 1) 서버에 «정리해 달라» — 처음 한 번만 실제로 풀고, 다음부터는 만들어 둔 걸 준다.
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const headers = { "Content-Type": "application/json" };
        if (withAuth) {
          const supabase = createSupabaseBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { setErrText("로그인이 필요합니다."); setStage("error"); return; }
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch(endpoint || `/api/coordinator/inquiries/${inquiryId}/imaging`, {
          method: "POST",
          headers,
          body: JSON.stringify({ path, series: wantRef.current }),
        });
        const j = await res.json();
        if (dead) return;
        if (!j.ok) {
          setErrText(
            j.error === "no_dicom" ? "이 묶음 안에서 CT 영상을 찾지 못했습니다. 다른 파일일 수 있어요."
            : j.error === "too_many_slices" ? "장수가 너무 많아 아직 열지 못합니다."
            : "영상을 준비하는 중 문제가 발생했습니다."
          );
          setStage("error");
          return;
        }
        setSeries(j.series); setUrls(j.urls); setSkipped(j.skipped || []);
        setDocs(j.docs || []); setExtras(j.extras || []);
        setWw(j.series[0]?.ww || 350); setWc(j.series[0]?.wc || 40);
        setStage("ready");
      } catch (e) {
        console.error("[imaging] prepare failed:", e);
        if (!dead) { setErrText("영상을 준비하는 중 문제가 발생했습니다."); setStage("error"); }
      }
    })();
    return () => { dead = true; };
  }, [inquiryId, endpoint, withAuth, path]);

  /** 아직 안 만든 묶음을 지금 만든다 — 압축을 다시 풀어야 해서 몇 초 걸린다(한 번만). */
  const prepareSeries = useCallback(async (i) => {
    setPreparing(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (withAuth) {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      wantRef.current = i;
      const res = await fetch(endpoint || `/api/coordinator/inquiries/${inquiryId}/imaging`, {
        method: "POST",
        headers,
        body: JSON.stringify({ path, series: i }),
      });
      const j = await res.json();
      if (j.ok) { setSeries(j.series); setUrls(j.urls); }
      else setErrText("이 촬영 묶음을 준비하지 못했습니다.");
    } catch {
      setErrText("이 촬영 묶음을 준비하지 못했습니다.");
    } finally {
      setPreparing(false);
    }
  }, [endpoint, withAuth, inquiryId, path]);

  // 2) 보는 장만 구간으로 받아 그린다
  const draw = useCallback(async () => {
    const s = series[sIdx];
    const canvas = canvasRef.current;
    if (!s || !canvas || docKey) return; // 글 기록을 보는 중이면 그림판이 없다
    const i = Math.min(slice, s.count - 1);
    const key = `${sIdx}-${i}`;

    let raw = cacheRef.current.get(key);
    if (!raw) {
      const url = urls[s.file];
      if (!url) return;
      const start = i * s.sliceBytes;
      const r = await fetch(url, { headers: { Range: `bytes=${start}-${start + s.sliceBytes - 1}` } });
      if (!r.ok) return;
      const ab = await r.arrayBuffer();
      raw = s.signed ? new Int16Array(ab) : new Uint16Array(ab);
      // 너무 많이 들고 있으면 메모리가 샌다 — 최근 것만 남긴다.
      if (cacheRef.current.size > 60) cacheRef.current.clear();
      cacheRef.current.set(key, raw);
    }

    const { rows, cols, slope, intercept } = s;
    const lo = wc - ww / 2;
    const scale = 255 / (ww || 1);
    canvas.width = cols; canvas.height = rows;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(cols, rows);
    const d = img.data;
    for (let p = 0, n = rows * cols; p < n; p++) {
      let v = (raw[p] * slope + intercept - lo) * scale;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      const q = p << 2;
      d[q] = d[q + 1] = d[q + 2] = v;
      d[q + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [series, urls, sIdx, slice, ww, wc, docKey]);
  useEffect(() => { draw(); }, [draw]);

  const cur = series[sIdx];
  const curDoc = docKey ? docs.find((d) => d.key === docKey) : null;
  const onWheel = (e) => {
    if (!cur) return;
    e.preventDefault();
    setSlice((v) => Math.max(0, Math.min(cur.count - 1, v + (e.deltaY > 0 ? 1 : -1))));
  };

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        {/* 제목 모양을 번역본 카드와 맞춘다 — 같은 첨부인데 화면마다 달라 보이면 헷갈린다(PO 지적). */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-700 shrink-0">CT 영상</span>
          <span className="text-xs text-gray-500 truncate">{name}</span>
        </div>
        <button onClick={onClose} className="shrink-0 p-1 rounded hover:bg-gray-200 text-gray-500" aria-label="닫기">
          <X size={16} />
        </button>
      </div>

      {stage === "loading" && (
        <div className="py-10 text-center">
          <Loader2 size={22} className="animate-spin text-teal-700 mx-auto mb-2" />
          <p className="text-sm text-gray-700">영상 준비 중…</p>
          <p className="text-xs text-gray-500 mt-1">처음 한 번만 오래 걸립니다(수백 장을 정리합니다).</p>
        </div>
      )}

      {stage === "error" && (
        <div className="py-8 text-center">
          <AlertCircle size={24} className="text-amber-600 mx-auto mb-2" />
          <p className="text-sm text-gray-700">{errText}</p>
        </div>
      )}

      {stage === "ready" && cur && (
        <div className="grid gap-3 md:grid-cols-[190px_1fr]">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500">촬영 묶음 ({series.length})</p>
            {series.map((s, i) => (
              <button
                key={s.uid}
                onClick={() => { setDocKey(null); setSIdx(i); setSlice(0); setWw(s.ww); setWc(s.wc); if (s.ready === false) prepareSeries(i); }}
                disabled={preparing}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition ${
                  !docKey && i === sIdx ? "border-teal-700 bg-teal-50 text-teal-800 font-semibold" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <span className="block truncate">{s.desc}</span>
                <span className="text-[11px] text-gray-500">{s.modality} · {s.count}장{s.ready === false ? " · 누르면 준비" : ""}</span>
              </button>
            ))}

            {/* 그림이 아닌 «글» 기록도 같은 자리에서 고른다 — 내려받게 하지 않는다. */}
            {docs.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 pt-2">글 기록 ({docs.length})</p>
                {docs.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setDocKey(d.key)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition ${
                      docKey === d.key ? "border-teal-700 bg-teal-50 text-teal-800 font-semibold" : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <span className="block truncate">{d.desc}</span>
                    <span className="text-[11px] text-gray-500">{d.modality || "기록"} · {d.lines.length}줄</span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div>
            {preparing ? (
              <div className="bg-gray-100 rounded-lg py-16 text-center">
                <Loader2 size={20} className="animate-spin text-teal-700 mx-auto mb-2" />
                <p className="text-sm text-gray-700">이 촬영 묶음을 준비하는 중…</p>
                <p className="text-xs text-gray-500 mt-1">처음 고를 때 한 번만 걸립니다.</p>
              </div>
            ) : curDoc ? (
              // 글 기록은 원문 그대로 — 줄여 쓰거나 요약하지 않는다(로우 데이터).
              <div className="rounded-lg border border-gray-200 bg-white p-3 max-h-[60vh] overflow-auto">
                <pre className="text-[11.5px] leading-relaxed text-gray-800 whitespace-pre-wrap font-mono">
                  {curDoc.lines.join("\n")}
                </pre>
              </div>
            ) : (
              <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center" onWheel={onWheel}>
                <canvas ref={canvasRef} className="max-w-full max-h-[60vh]" style={{ imageRendering: "pixelated" }} />
              </div>
            )}
            <div className="mt-2.5 space-y-2">
              {curDoc ? (
                <p className="text-[11px] text-gray-500">
                  기기가 남긴 기록을 그대로 옮긴 것입니다(요약 아님). 판독은 의료진이 합니다.
                </p>
              ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0">{slice + 1} / {cur.count}장</span>
                <input
                  type="range" min={0} max={cur.count - 1} value={slice}
                  onChange={(e) => setSlice(Number(e.target.value))}
                  className="flex-1 accent-teal-700" aria-label="장 넘기기"
                />
              </div>
              )}
              {!curDoc && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500 mr-1">밝기 기준</span>
                {WINDOWS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => { setWw(p.ww); setWc(p.wc); }}
                    className={`px-2 py-1 rounded-md border text-xs transition ${
                      ww === p.ww && wc === p.wc
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              )}
              {/* 그림도 글도 못 뽑은 게 남았을 때만 경고 — 볼 수 있는 건 위에서 이미 보여준다. */}
              {skipped.length > 0 && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                  이 묶음엔 화면에 못 펴는 항목이 {skipped.reduce((a, b) => a + b.count, 0)}건 있습니다
                  ({skipped.map((s) => `${s.desc}${s.modality ? ` · ${s.modality}` : ""}`).join(", ")}) —
                  필요하면 원본 묶음을 내려받아 확인하세요.
                </p>
              )}
              {extras.length > 0 && (
                <p className="text-[11px] text-gray-500">
                  CD 에 딸려 온 {extras.map((e) => `${e.kind} ${e.count}건`).join(", ")}은 의료 내용이 아니라 뺐습니다.
                </p>
              )}
              {!curDoc && (
                <p className="text-[11px] text-gray-500">
                  마우스 휠로 장을 넘길 수 있습니다. 이 화면은 «보기»용입니다 — 판독은 의료진이 합니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
