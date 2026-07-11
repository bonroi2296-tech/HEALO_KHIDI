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
 * (최근 10초, dcActivityRef) 그 참가자의 청취 모드 자막은 억제 — 화자 기기
 * 인식이 더 정확하므로 그쪽을 우선한다.
 *
 * 녹음 사이클(VAD·MediaRecorder)은 page.jsx 의 내 마이크 서버 STT 와 같은 패턴.
 * (마이크 경로는 라이브 검증 없이는 못 건드리는 코드라 공유 모듈화 대신 별도 구현
 *  — 통합은 후속 과제, docs/KNOWN_ISSUES.md)
 */

"use client";

import { useEffect, useRef } from "react";
import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

const DC_SUPPRESS_MS = 10000; // DataChannel 자막 수신 후 이 시간 동안 청취 모드 억제
const MIN_BLOB_BYTES = 4000;

export function ListenModeBridge({
  enabled,
  langHint, // 상대가 말할 가능성이 높은 언어 (kz 면 서버가 Pro 모델 선택)
  targetLang, // 내 언어 — 이 언어로 번역된 자막을 받는다
  consultationId,
  getAuthHeaders,
  contextRef, // 대화 문맥 링버퍼 (page.jsx convoContextRef)
  dcActivityRef, // Map<identity, ts> — DataChannel 자막 최근 수신 시각
  onSubtitle, // ({ transcript, translated, lang, name, identity }) => void
}) {
  // 원격 참가자 마이크 트랙 (본인 제외)
  const trackRefs = useTracks([Track.Source.Microphone]);
  const pipelinesRef = useRef(new Map()); // key → stop()
  const callbackRef = useRef(onSubtitle);
  useEffect(() => {
    callbackRef.current = onSubtitle;
  }, [onSubtitle]);

  const remoteKeys = trackRefs
    .filter((t) => !t.participant?.isLocal && t.publication?.track?.mediaStreamTrack)
    .map((t) => `${t.participant.identity}::${t.publication.trackSid}`)
    .sort()
    .join(",");

  useEffect(() => {
    const pipelines = pipelinesRef.current;

    const stopAll = () => {
      for (const stop of pipelines.values()) stop();
      pipelines.clear();
    };

    if (!enabled || typeof MediaRecorder === "undefined") {
      stopAll();
      return;
    }

    const active = trackRefs.filter(
      (t) => !t.participant?.isLocal && t.publication?.track?.mediaStreamTrack
    );
    const activeKeys = new Set(
      active.map((t) => `${t.participant.identity}::${t.publication.trackSid}`)
    );

    // 사라진 트랙 파이프라인 정리
    for (const [key, stop] of pipelines) {
      if (!activeKeys.has(key)) {
        stop();
        pipelines.delete(key);
      }
    }

    // 새 트랙 파이프라인 시작
    for (const t of active) {
      const key = `${t.participant.identity}::${t.publication.trackSid}`;
      if (pipelines.has(key)) continue;
      pipelines.set(
        key,
        startPipeline({
          mediaStreamTrack: t.publication.track.mediaStreamTrack,
          identity: t.participant.identity,
          name: t.participant.name || t.participant.identity,
          langHint,
          targetLang,
          consultationId,
          getAuthHeaders,
          contextRef,
          dcActivityRef,
          callbackRef,
        })
      );
    }

    return stopAll;
    // remoteKeys 문자열이 트랙 증감을 대표 — trackRefs 배열 자체는 매 렌더 새 참조라 deps 에 안 넣음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, remoteKeys, langHint, targetLang, consultationId, getAuthHeaders]);

  return null;
}

// 원격 트랙 1개에 대한 발화 단위 녹음 → 서버 STT → 자막 콜백. stop 함수를 반환.
function startPipeline({
  mediaStreamTrack,
  identity,
  name,
  langHint,
  targetLang,
  consultationId,
  getAuthHeaders,
  contextRef,
  dcActivityRef,
  callbackRef,
}) {
  let stopped = false;
  let recorder = null;
  let stopTimer = null;
  let vadTimer = null;
  let audioCtx = null;
  let analyser = null;
  // 침묵 환각 반복 필터 (파이프라인별 — 참가자 간 교차 억제 방지)
  let lastText = "";
  let lastAt = 0;

  const stream = new MediaStream([mediaStreamTrack]);

  const mime = MediaRecorder.isTypeSupported?.("audio/webm")
    ? "audio/webm"
    : MediaRecorder.isTypeSupported?.("audio/mp4")
    ? "audio/mp4"
    : "";

  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
  } catch {
    analyser = null;
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
      clearTimeout(stopTimer);
      const blob = new Blob(chunks, { type: mime || "audio/webm" });
      const hasSpeech = analyser ? voicedFrames >= 3 : true;
      if (!stopped) recordCycle();
      if (stopped || !hasSpeech || blob.size <= MIN_BLOB_BYTES) return;
      // 화자 기기가 직접 자막을 보내는 중이면 스킵 (이중 자막 방지)
      const dcAt = dcActivityRef?.current?.get?.(identity) || 0;
      if (Date.now() - dcAt < DC_SUPPRESS_MS) return;
      try {
        const headers = await getAuthHeaders();
        if (!headers) return;
        const fd = new FormData();
        fd.append("audio", blob, "chunk.webm");
        fd.append("lang", langHint);
        fd.append("targetLang", targetLang);
        fd.append("context", JSON.stringify((contextRef?.current || []).slice(-6)));
        const res = await fetch(`/api/khidi/consultation/${consultationId}/stt`, {
          method: "POST",
          headers,
          body: fd,
        });
        const result = await res.json();
        if (!result.ok || !result.transcript || !result.translated) return;
        // 같은 전사 30초 내 반복 = 침묵 환각 패턴 → 스킵
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
        callbackRef.current?.({
          transcript: result.transcript,
          translated: result.translated,
          lang: result.detectedLang || langHint,
          name,
          identity,
        });
      } catch {
        /* 조각 실패 무시 — 다음 사이클 */
      }
    };
    recorder.start();

    if (analyser) {
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
    } else {
      stopTimer = setTimeout(() => {
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {
          /* ignore */
        }
      }, 4000);
    }
  };

  recordCycle();

  return () => {
    stopped = true;
    clearTimeout(stopTimer);
    clearInterval(vadTimer);
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      /* ignore */
    }
    audioCtx?.close().catch(() => {});
  };
}
