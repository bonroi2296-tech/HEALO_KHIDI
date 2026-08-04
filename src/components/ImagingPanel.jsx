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
import { Loader2, AlertCircle, X, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// 방사선과에서 쓰는 표준 창(window) 값 그대로. 폭(WW)/중심(WL).
// ⚠️ 「연부조직」을 «복부»라고만 부르지 않는다 — 가슴·목에도 똑같이 쓰는 기본값이라,
//   흉부 CT 를 보면서 「복부」라고 적혀 있으면 잘못 온 줄 안다(PO 지적 2026-08-03).
// 화면을 열 때·묶음을 바꿀 때 항상 이 값으로 시작한다.
// ⚠️ 예전엔 묶음마다 DICOM 안에 적힌 값을 그대로 썼다 → 폐 재구성 묶음만 「폐」로 열려
//    같은 검사인데 묶음마다 다른 밝기로 보였다(PO 지적 2026-08-04). 기준이 흔들리면 비교가 안 된다.
const DEFAULT_WW = 350;
const DEFAULT_WC = 40;

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
  const [ww, setWw] = useState(DEFAULT_WW);
  const [wc, setWc] = useState(DEFAULT_WC);
  const [preparing, setPreparing] = useState(false); // 아직 안 만든 묶음을 지금 만드는 중
  // ⚠️ 준비 실패는 errText 로 넣어도 «안 보였다» — errText 는 처음 열기 실패에만 쓰인다.
  //    그래서 까만 화면만 남고 이유가 안 뜬다(PO 제보 2026-08-04). 따로 칸을 둔다.
  const [prepErr, setPrepErr] = useState("");
  const [playing, setPlaying] = useState(false);      // 자동 넘김(병원 판독기의 «시네»)
  const wantRef = useRef(0);                          // 서버에 «이 묶음을 만들어 달라»고 알릴 번호
  const dragRef = useRef(null);                       // 누른 채 끌어서 넘기기
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
        setWw(DEFAULT_WW); setWc(DEFAULT_WC);
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
    setPreparing(true); setPrepErr("");
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
      if (j.ok) { setSeries(j.series); setUrls(j.urls); setPrepErr(""); }
      else setPrepErr("이 촬영 묶음을 준비하지 못했습니다. 다시 눌러 보세요.");
    } catch {
      setPrepErr("이 촬영 묶음을 준비하지 못했습니다. 다시 눌러 보세요.");
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
  /**
   * 넘기는 방법 (PO 지적 2026-08-04: «하나씩 클릭하면 힘들고 스크롤은 너무 후루룩»).
   *
   * ⚠️ 마우스 바퀴(휠)로 넘기는 건 **뺐다**(PO 결정 2026-08-04). 그림 위에서 바퀴를 굴리면
   *   장도 넘어가지만 **화면도 같이 내려가서** 장이 넘어간 걸 못 본다. 요즘 브라우저는
   *   화면 굴리기를 막지 못하게 해 뒀으므로(수동 처리) 코드로 손쓸 수 없다.
   *   되살리지 마라 — 「되는 것처럼 보이는데 실은 못 쓰는 기능」이 선택지만 늘린다.
   */
  // 끌기 — 기본은 «좌우»다. 바로 아래 막대가 좌우라 눈에 보이는 것과 손 방향이 같고,
  //   화면 굴리기(위아래)와 방향이 안 겹친다. 다만 병원 판독기에 익숙한 분은 반사적으로
  //   위아래로 끄시므로 그것도 조용히 받는다 — 많이 움직인 쪽을 따른다. 6px 에 한 장.
  const onPointerDown = (e) => {
    if (!cur || curDoc) return;
    setPlaying(false);
    dragRef.current = { x: e.clientX, y: e.clientY, base: slice };
    // «이 손가락(마우스)을 내가 붙잡겠다»는 요청. 붙잡을 대상이 없으면 **오류를 던진다**
    // (누르자마자 떼는 순간이 겹칠 때·시험용 가짜 신호일 때). 못 붙잡아도 끌기는 그대로
    // 되므로 — 그림 밖으로 나가면 끊기는 정도 차이 — 조용히 넘어간다.
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || !cur) return;
    e.preventDefault();
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const moved = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    const to = d.base + Math.round(moved / 6);
    setSlice(Math.max(0, Math.min(cur.count - 1, to)));
  };
  const endDrag = () => { dragRef.current = null; };

  // ③ 자동 넘김 — 초당 12장. **마지막 장에서 멈춘다**(PO 지시 2026-08-04).
  //    판독기는 보통 처음으로 돌아가 계속 도는데, 그러면 «어디까지 봤는지»를 놓친다.
  useEffect(() => {
    if (!playing || !cur || curDoc) return;
    const t = setInterval(() => {
      setSlice((v) => {
        if (v + 1 >= cur.count) { setPlaying(false); return cur.count - 1; }
        return v + 1;
      });
    }, 1000 / 12);
    return () => clearInterval(t);
  }, [playing, cur, curDoc]);
  useEffect(() => { setPlaying(false); }, [sIdx, docKey]); // 묶음을 바꾸면 멈춘다

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
        // 고르는 줄은 «위에 가로로», 그림은 «아래 전체 폭으로» (PO 지시 2026-08-04).
        // 전에는 왼쪽에 목록을 세로로 세웠는데, 화면이 조금만 좁아도 그림 자리가 쪼그라들어
        // 정작 봐야 할 CT 가 손톱만 해졌다(실측: 화면 905px 일 때 그림 202px).
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 mr-0.5">촬영 묶음 ({series.length})</span>
            {series.map((s, i) => (
              <button
                key={s.uid}
                onClick={() => { setDocKey(null); setSIdx(i); setSlice(0); setWw(DEFAULT_WW); setWc(DEFAULT_WC); if (s.ready === false) prepareSeries(i); }}
                disabled={preparing}
                className={`px-2.5 py-1.5 rounded-lg border text-xs transition max-w-full truncate ${
                  !docKey && i === sIdx ? "border-teal-700 bg-teal-50 text-teal-800 font-semibold" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                {s.desc}
                <span className="text-[11px] text-gray-500 ml-1.5">{s.count}장{s.ready === false ? " · 누르면 준비" : ""}</span>
              </button>
            ))}

            {/* 그림이 아닌 «글» 기록도 같은 줄에서 고른다 — 내려받게 하지 않는다. */}
            {docs.length > 0 && (
              <>
                <span className="text-xs font-semibold text-gray-500 ml-1 mr-0.5">글 기록 ({docs.length})</span>
                {docs.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setDocKey(d.key)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs transition max-w-full truncate ${
                      docKey === d.key ? "border-teal-700 bg-teal-50 text-teal-800 font-semibold" : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    {d.desc}
                    <span className="text-[11px] text-gray-500 ml-1.5">{d.lines.length}줄</span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* min-w-0 이 없으면 이 칸이 «그림의 원래 크기»만큼 벌어져 카드 밖으로 삐져나간다
              (PO 제보 2026-08-04, 화면 폭 905px 에서 55px 넘침). */}
          <div className="min-w-0">
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
              <div
                className="bg-black rounded-lg overflow-hidden flex items-center justify-center cursor-ew-resize select-none touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                {/* CT 원본은 한 장이 512칸짜리라, 그냥 두면 넓은 화면에서도 512px 로 머문다.
                    폭에 맞춰 키운다(최대 820px). 늘릴 때 색을 섞지 않는다(pixelated) —
                    없는 그림을 만들어 내면 판독에 방해가 된다. */}
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto max-w-[820px] max-h-[72vh] object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
            )}
            <div className="mt-2.5 space-y-2">
              {curDoc ? (
                <p className="text-[11px] text-gray-500">
                  기기가 남긴 기록을 그대로 옮긴 것입니다(요약 아님). 판독은 의료진이 합니다.
                </p>
              ) : (
              <div className="flex items-center gap-2">
                {/* 한 장씩 옮기는 단추 «둘»은 딱 붙여 한 덩어리로 둔다 — 연타하는 단추라서다.
                    자동 넘김을 이 사이에 끼우면(⏮▶⏭ 모양) 빠르게 누르다 모드가 켜진다.
                    ⏮▶⏭ 는 셋이 «같은 계열»일 때 쓰는 배치이고, 여기선 계열이 다르다(이동 vs 모드). */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => setSlice((v) => Math.max(0, v - 1))}
                    disabled={slice <= 0}
                    className="p-1.5 rounded-l-md rounded-r-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    aria-label="이전 장"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => setSlice((v) => Math.min(cur.count - 1, v + 1))}
                    disabled={slice >= cur.count - 1}
                    className="p-1.5 rounded-r-md rounded-l-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    aria-label="다음 장"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
                {/* 자동 넘김 — 265장을 손으로 넘기는 건 무리다. 켜 두고 눈으로 훑는 게 판독 방식이다.
                    성격이 다르므로 선을 하나 그어 갈라 둔다. */}
                <span className="w-px h-5 bg-gray-200 shrink-0" aria-hidden />
                <button
                  // 마지막 장에서 다시 누르면 처음부터 — 아니면 눌러도 아무 일이 안 일어난다.
                  onClick={() => { if (!playing && slice >= cur.count - 1) setSlice(0); setPlaying((v) => !v); }}
                  className={`p-1.5 rounded-md border text-xs shrink-0 transition ${
                    playing ? "border-teal-700 bg-teal-700 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                  aria-label={playing ? "자동 넘김 멈춤" : "자동 넘김"}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <span className="text-xs text-gray-500 w-20 shrink-0 text-center tabular-nums">{slice + 1} / {cur.count}장</span>
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
              {prepErr && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                  {prepErr}
                </p>
              )}
              {extras.length > 0 && (
                <p className="text-[11px] text-gray-500">
                  CD 에 딸려 온 {extras.map((e) => `${e.kind} ${e.count}건`).join(", ")}은 의료 내용이 아니라 뺐습니다.
                </p>
              )}
              {!curDoc && (
                <p className="text-[11px] text-gray-500">
                  장 넘기는 법 — <b>그림을 누른 채 좌우로 끌기</b>(가장 편합니다) · <b>▶ 자동 넘김</b> ·
                  좌우 버튼 · 아래 막대. 이 화면은 «보기»용입니다 — 판독은 의료진이 합니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
