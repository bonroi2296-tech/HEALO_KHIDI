/**
 * 청취 모드(수신측 자막) 브릿지 — LiveKitRoom 내부 전용, 렌더링 없음
 *
 * 상대가 통역을 안 켜도, 듣는 쪽이 원격 참가자의 음성 트랙을 이쪽에서 직접
 * 전사·번역해 자막으로 본다. PO 실사용 시나리오(2026-07-11): PO 는 마이크·스피커를
 * 끄고 입장(하울링 방지, 동석한 코디 기기가 대표 마이크), 코디↔외국인의 ru/kz 대화를
 * 자기 화면에서 한국어 자막으로 따라감. 스피커를 꺼도 원격 트랙 데이터는 수신된다.
 *
 * 화자 구분: 원격 참가자별로 독립 파이프라인(믹스 안 함) — 각 자막에 참가자
 * 이름이 트랙 단위로 정확히 붙는다.
 *
 * 중복 억제: 해당 참가자가 직접 통역을 켜서 DataChannel 자막을 보내는 중이면
 * (최근 60초, dcActivityRef) 그 참가자의 청취 모드 자막은 억제 — 화자 기기
 * 인식이 더 정확하므로 그쪽을 우선한다. (한계: 상대가 통역을 켠 뒤 '첫' 발화와
 * 60초 넘는 침묵 직후 발화는 양쪽이 한 번씩 겹칠 수 있음 — docs/KNOWN_ISSUES.md)
 *
 * 수명주기 설계(2026-07-11 독립 리뷰 반영):
 * - 파이프라인 정지는 「그 트랙이 사라졌을 때」와 「기능 꺼짐/언마운트」뿐 — 언어 변경·
 *   참가자 추가로 진행 중인 다른 파이프라인(녹음 중 문장)을 죽이지 않는다(증분 diff).
 *   언어·인증 헤더·문맥은 ref 로 읽어 파이프라인 재시작 없이 최신값 반영.
 * - AudioContext 는 브릿지당 1개 공유(Chrome 페이지당 ~6개 상한 방어) + resume 시도.
 * - VAD(analyser)를 못 만들면 그 트랙은 녹음 자체를 시작하지 않는다 — 무음 구간을
 *   4초마다 통째로 업로드하는 비용 폭주(시간당 수백 회 Gemini 호출)보다 기능 꺼짐이 낫다.
 *
 * 녹음 사이클(VAD·MediaRecorder)은 page.jsx 의 내 마이크 서버 STT 와 같은 패턴.
 * (마이크 경로는 라이브 검증 없이는 못 건드리는 코드라 공유 모듈화 대신 별도 구현
 *  — 통합은 후속 과제, docs/KNOWN_ISSUES.md)
 */

"use client";

import { useEffect, useRef } from "react";
import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

const DC_SUPPRESS_MS = 60000; // DataChannel 자막 수신 후 이 시간 동안 청취 모드 억제
const MIN_BLOB_BYTES = 4000;

// 통역 봇(agent-*)과 봇이 만든 통역 음성 트랙(tx:*)은 전사 대상이 아니다 —
// 봇 통역 음성을 여기서 또 STT 하면 같은 발화가 세 번 자막이 된다(2026-07-23 첫 라이브 사고).
const isHumanAudioTrack = (t) =>
  !t.participant?.identity?.startsWith("agent-") &&
  !t.publication?.trackName?.startsWith("tx:");

export function ListenModeBridge({
  enabled,
  langHint, // 상대가 말할 가능성이 높은 언어 (kz 면 서버가 Pro 모델 선택)
  targetLang, // 내 언어 — 이 언어로 번역된 자막을 받는다
  consultationId,
  getAuthHeaders,
  contextRef, // 대화 문맥 링버퍼 (page.jsx convoContextRef)
  dcActivityRef, // Map<identity, ts> — DataChannel 자막 최근 수신 시각
  onSubtitle, // ({ transcript, translated, lang, name, identity }) => void
  onAudioHealth, // ({ remoteAudioCount, contextState }) => void — "조용한 사망" 워치독용 (선택)
}) {
  // 원격 참가자 마이크 트랙 (본인 제외)
  const trackRefs = useTracks([Track.Source.Microphone]);
  const pipelinesRef = useRef(new Map()); // key → stop()
  const audioCtxRef = useRef(null); // 브릿지당 1개 공유
  // 언어·콜백·헤더는 ref 로 — 값이 바뀌어도 진행 중인 녹음 파이프라인을 재시작하지 않고
  // 다음 전송 시점에 최신값을 읽는다 (재시작하면 녹음 중이던 문장이 통째로 유실됨)
  const liveRef = useRef({});
  liveRef.current = { langHint, targetLang, consultationId, getAuthHeaders, contextRef, dcActivityRef, onSubtitle };

  // mediaStreamTrack.id 까지 키에 포함 — LiveKit 이 재연결·재발행으로 내부 트랙을
  // 갈아끼우면(참가자·trackSid 동일) 죽은 트랙을 계속 듣는 파이프라인을 교체하기 위함
  const remoteKeys = trackRefs
    .filter((t) => !t.participant?.isLocal && t.publication?.track?.mediaStreamTrack && isHumanAudioTrack(t))
    .map(
      (t) =>
        `${t.participant.identity}::${t.publication.trackSid}::${t.publication.track.mediaStreamTrack.id}`
    )
    .sort()
    .join(",");

  // 트랙 증감에 따른 증분 시작/정지 — cleanup 은 반환하지 않는다(아래 언마운트 effect 가 담당).
  useEffect(() => {
    const pipelines = pipelinesRef.current;

    if (!enabled || typeof MediaRecorder === "undefined") {
      for (const stop of pipelines.values()) stop();
      pipelines.clear();
      return;
    }

    const active = trackRefs.filter(
      (t) => !t.participant?.isLocal && t.publication?.track?.mediaStreamTrack && isHumanAudioTrack(t)
    );
    const activeKeys = new Set(
      active.map(
        (t) =>
          `${t.participant.identity}::${t.publication.trackSid}::${t.publication.track.mediaStreamTrack.id}`
      )
    );

    // 사라진(교체된) 트랙 파이프라인만 정리
    for (const [key, stop] of pipelines) {
      if (!activeKeys.has(key)) {
        stop();
        pipelines.delete(key);
      }
    }

    // 새 트랙 파이프라인 시작
    for (const t of active) {
      const key = `${t.participant.identity}::${t.publication.trackSid}::${t.publication.track.mediaStreamTrack.id}`;
      if (pipelines.has(key)) continue;
      pipelines.set(
        key,
        startPipeline({
          mediaStreamTrack: t.publication.track.mediaStreamTrack,
          identity: t.participant.identity,
          name: t.participant.name || t.participant.identity,
          liveRef,
          audioCtxRef,
        })
      );
    }
    // remoteKeys 문자열이 트랙 증감(교체 포함)을 대표 — trackRefs 배열 자체는 매 렌더 새 참조
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, remoteKeys]);

  // 언마운트에만 전체 정리
  useEffect(() => {
    return () => {
      for (const stop of pipelinesRef.current.values()) stop();
      pipelinesRef.current.clear();
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  // ── 공유 AudioContext 를 사용자 제스처로 확실히 깨우기 (조용한 사망 근본 수리) ──
  // 배경(2026-07-24 실회의 진단): AudioContext 가 사용자 제스처 밖에서 생성되면 `suspended`
  //   로 시작한다 → VAD analyser 의 RMS 가 항상 0 → voicedFrames 가 3에 영영 못 미쳐 업로드
  //   자체가 안 일어남 → `/stt` 호출 0 = 자막이 조용히 안 나온다. 게다가 이 컨텍스트는
  //   자막 토글을 껐다 켜도 다시 안 살아난다(파이프라인만 재시작될 뿐 컨텍스트는 언마운트
  //   전까지 유지) → 사용자가 "껐다켰다 반복해도 안 나온다"고 겪는 정확한 패턴.
  //   startPipeline 의 1회성 resume() 는 제스처 밖이면 실패할 수 있으므로, 여기서 화면의 어떤
  //   탭/키 입력에도 resume 을 재시도한다(표준 Web Audio unlock 패턴). 이미 running 이면
  //   resume() 은 무해한 no-op → 잘 되던 경로(회의1)엔 영향 0.
  useEffect(() => {
    if (!enabled) return;
    const resume = () => {
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("touchstart", resume);
    window.addEventListener("keydown", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("touchstart", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [enabled]);

  // ── 건강상태 보고 — 상위(page.jsx)가 "켜졌는데 자막이 안 나온다"를 눈에 띄게 알리는 근거 ──
  // 상대 오디오 트랙 수 + AudioContext 상태를 주기적으로 올린다. contextState 가 'suspended'
  // 인데 상대 오디오가 있으면 = 우리가 상대 발화를 물리적으로 감지 못 하는 상태(위 수리 전).
  // (트랙 상태는 렌더 없이도 바뀔 수 있어 interval 로 재확인 — remoteKeys 로 트랙 증감도 반영.)
  useEffect(() => {
    if (typeof onAudioHealth !== "function") return;
    const report = () => {
      const remoteAudioCount = trackRefs.filter(
        (t) => !t.participant?.isLocal && t.publication?.track?.mediaStreamTrack
      ).length;
      onAudioHealth({
        remoteAudioCount,
        contextState: audioCtxRef.current?.state || "none",
      });
    };
    report();
    const id = setInterval(report, 2000);
    return () => clearInterval(id);
    // trackRefs 는 매 렌더 새 배열 → remoteKeys(트랙 증감 대표)로 재실행. enabled 로 온/오프 반영.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAudioHealth, enabled, remoteKeys]);

  return null;
}

// 원격 트랙 1개에 대한 발화 단위 녹음 → 서버 STT → 자막 콜백. stop 함수를 반환.
function startPipeline({ mediaStreamTrack, identity, name, liveRef, audioCtxRef }) {
  let stopped = false;
  let recorder = null;
  let vadTimer = null;
  let analyser = null;
  let source = null;
  // 침묵 환각 반복 필터 (파이프라인별 — 참가자 간 교차 억제 방지).
  // 억제 시 타임스탬프를 갱신하지 않는다(page.jsx isHallucinatedRepeat 와 동일 규칙 —
  // 갱신하면 창이 미끄러져 정당한 반복 발화가 영구 억제됨).
  let lastText = "";
  let lastAt = 0;

  const stream = new MediaStream([mediaStreamTrack]);

  const mime = MediaRecorder.isTypeSupported?.("audio/webm")
    ? "audio/webm"
    : MediaRecorder.isTypeSupported?.("audio/mp4")
    ? "audio/mp4"
    : "";

  // 공유 AudioContext 에 이 트랙 전용 analyser 연결. VAD 를 못 만들면 이 트랙은
  // 시작하지 않는다 — 무음 4초 청크를 무한 업로드하는 비용 폭주 방지(리뷰 반영).
  try {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    const ctx = audioCtxRef.current;
    // 사용자 제스처 밖에서 생성되면 suspended 로 시작해 RMS 가 항상 0 — resume 시도
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
  } catch (e) {
    console.warn("[ListenMode] VAD unavailable — skipping track:", identity, e?.message);
    return () => {};
  }

  const recordCycle = () => {
    if (stopped) return;
    const chunks = [];
    let voicedFrames = 0;
    let silentStreak = 0;
    const startedAt = Date.now();

    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      return; // 이 트랙은 녹음 불가 — 청취 모드 해당 참가자만 조용히 비활성
    }
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = async () => {
      clearInterval(vadTimer);
      const blob = new Blob(chunks, { type: mime || "audio/webm" });
      const hasSpeech = voicedFrames >= 3;
      if (!stopped) recordCycle();
      if (stopped || !hasSpeech || blob.size <= MIN_BLOB_BYTES) return;
      const live = liveRef.current;
      // 화자 기기가 직접 자막을 보내는 중이면 스킵 (이중 자막 방지)
      const dcAt = live.dcActivityRef?.current?.get?.(identity) || 0;
      if (Date.now() - dcAt < DC_SUPPRESS_MS) return;
      try {
        const headers = await live.getAuthHeaders();
        if (!headers) return;
        const fd = new FormData();
        fd.append("audio", blob, "chunk.webm");
        fd.append("lang", live.langHint);
        fd.append("targetLang", live.targetLang);
        fd.append("context", JSON.stringify((live.contextRef?.current || []).slice(-6)));
        const res = await fetch(`/api/khidi/consultation/${live.consultationId}/stt`, {
          method: "POST",
          headers,
          body: fd,
        });
        const result = await res.json();
        if (!result.ok || !result.transcript || !result.translated) return;
        // 같은 전사 30초 내 반복 = 침묵 환각 패턴 → 스킵 (억제 시 타임스탬프 미갱신)
        const now = Date.now();
        if (
          result.transcript.length >= 5 &&
          result.transcript === lastText &&
          now - lastAt < 30000
        ) {
          return;
        }
        lastText = result.transcript;
        lastAt = now;
        live.onSubtitle?.({
          transcript: result.transcript,
          translated: result.translated,
          lang: result.detectedLang || live.langHint,
          name,
          identity,
        });
      } catch {
        /* 조각 실패 무시 — 다음 사이클 */
      }
    };
    recorder.start();

    const buf = new Uint8Array(analyser.fftSize);
    vadTimer = setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      if (rms > 0.02) {
        voicedFrames += 1;
        silentStreak = 0;
      } else if (voicedFrames >= 3) {
        silentStreak += 1;
      }
      const dur = Date.now() - startedAt;
      const shouldCut =
        (voicedFrames >= 3 && silentStreak >= 12) || // 말 끝남(1.2초 무음)
        (voicedFrames >= 3 && dur >= 10000) || // 긴 발화 강제 컷
        (voicedFrames < 3 && dur >= 5000); // 무음만 — 버리고 새 사이클
      if (shouldCut) {
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {
          /* ignore */
        }
      }
    }, 100);
  };

  recordCycle();

  return () => {
    stopped = true;
    clearInterval(vadTimer);
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      /* ignore */
    }
    try {
      source?.disconnect();
    } catch {
      /* ignore */
    }
    // 공유 AudioContext 는 닫지 않는다 (다른 파이프라인이 사용 중 — 브릿지 언마운트 시에만 close)
  };
}
