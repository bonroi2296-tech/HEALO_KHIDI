"use client";

/**
 * CT 영상 뷰어 (코디·의사용) — 병원 CD 압축본을 브라우저에서 바로 연다.
 * 자바도, CD 뷰어 설치도 필요 없다. 서버는 묶음 파일 하나만 갖고 있고 푸는 건 여기서 한다.
 * 부품 설명은 src/lib/imaging/dicomStudy.js 머리말 참고.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { unpackStudy, buildSeries, drawSlice, WINDOW_PRESETS } from "@/lib/imaging/dicomStudy";

export default function ImagingViewerClient({ inquiryId, path, name }) {
  const [stage, setStage] = useState("loading"); // loading | unpacking | ready | error
  const [pct, setPct] = useState(0);
  const [series, setSeries] = useState([]);
  const [sIdx, setSIdx] = useState(0);
  const [slice, setSlice] = useState(0);
  const [ww, setWw] = useState(350);
  const [wc, setWc] = useState(40);
  const [errText, setErrText] = useState("");
  const canvasRef = useRef(null);

  // 1) 서명 주소 받아 묶음 내려받기 → 브라우저에서 풀기
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setErrText("로그인이 필요합니다."); setStage("error"); return; }

        const res = await fetch("/api/attachments/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ path }),
        });
        const j = await res.json();
        // 서명 발급 API 는 키 이름이 signedUrl 이다(url 아님) — 여기서 한 번 틀려 «파일을 찾지 못했습니다» 가 떴다.
        if (!j.ok || !j.signedUrl) { setErrText("영상 파일을 찾지 못했습니다."); setStage("error"); return; }

        const buf = await (await fetch(j.signedUrl)).arrayBuffer();
        if (dead) return;
        setStage("unpacking");

        const items = await unpackStudy(buf, name, (r) => !dead && setPct(r));
        if (dead) return;
        if (!items.length) {
          setErrText("이 묶음 안에서 CT 영상(DICOM)을 찾지 못했습니다. 다른 파일일 수 있어요.");
          setStage("error");
          return;
        }
        const built = await buildSeries(items);
        if (dead) return;
        setSeries(built);
        setWw(built[0]?.windowWidth || 350);
        setWc(built[0]?.windowCenter || 40);
        setStage("ready");
      } catch (e) {
        console.error("[imaging] load failed:", e);
        setErrText("영상을 여는 중 문제가 발생했습니다.");
        setStage("error");
      }
    })();
    return () => { dead = true; };
  }, [path, name]);

  // 2) 그리기
  const redraw = useCallback(() => {
    const s = series[sIdx];
    if (!s || !canvasRef.current) return;
    drawSlice(canvasRef.current, s.slices[Math.min(slice, s.slices.length - 1)], ww, wc);
  }, [series, sIdx, slice, ww, wc]);
  useEffect(() => { redraw(); }, [redraw]);

  // 마우스 휠로 장 넘기기 — 방사선과 뷰어의 기본 조작이라 그대로 맞춘다.
  const onWheel = (e) => {
    const s = series[sIdx];
    if (!s) return;
    e.preventDefault();
    setSlice((v) => Math.max(0, Math.min(s.slices.length - 1, v + (e.deltaY > 0 ? 1 : -1))));
  };

  const cur = series[sIdx];

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <Link href={`/coordinator/inbox/${inquiryId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-700">
        <ArrowLeft size={15} /> 문의 상세로
      </Link>

      <h1 className="mt-3 text-xl font-bold text-gray-900">CT 영상 보기</h1>
      <p className="text-xs text-gray-500 mt-0.5 break-all">{name}</p>

      {stage !== "ready" && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center">
          {stage === "error" ? (
            <>
              <AlertCircle size={30} className="text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-gray-700">{errText}</p>
            </>
          ) : (
            <>
              <Loader2 size={26} className="animate-spin text-teal-700 mx-auto mb-3" />
              <p className="text-sm text-gray-700">
                {stage === "loading" ? "영상 내려받는 중…" : `압축 푸는 중… ${Math.round(pct * 100)}%`}
              </p>
              <p className="text-xs text-gray-500 mt-1">CT 한 건은 보통 수백 장이라 조금 걸립니다.</p>
            </>
          )}
        </div>
      )}

      {stage === "ready" && cur && (
        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          {/* 시리즈 목록 */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500">촬영 묶음 ({series.length})</p>
            {series.map((s, i) => (
              <button
                key={s.uid}
                onClick={() => { setSIdx(i); setSlice(0); setWw(s.windowWidth); setWc(s.windowCenter); }}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition ${
                  i === sIdx ? "border-teal-700 bg-teal-50 text-teal-800 font-semibold" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="block truncate">{s.description}</span>
                <span className="text-[11px] text-gray-500">{s.modality} · {s.slices.length}장</span>
              </button>
            ))}
          </div>

          {/* 영상 */}
          <div>
            <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center" onWheel={onWheel}>
              <canvas ref={canvasRef} className="max-w-full max-h-[70vh]" style={{ imageRendering: "pixelated" }} />
            </div>

            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0">
                  {slice + 1} / {cur.slices.length}장
                </span>
                <input
                  type="range" min={0} max={cur.slices.length - 1} value={slice}
                  onChange={(e) => setSlice(Number(e.target.value))}
                  className="flex-1 accent-teal-700"
                  aria-label="장 넘기기"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500 mr-1">밝기 기준</span>
                {WINDOW_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => { setWw(p.ww); setWc(p.wc); }}
                    className={`px-2.5 py-1 rounded-md border text-xs transition ${
                      ww === p.ww && wc === p.wc
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-gray-500">
                마우스 휠로 장을 넘길 수 있습니다. 이 화면은 «보기»용입니다 — 판독은 의료진이 합니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
