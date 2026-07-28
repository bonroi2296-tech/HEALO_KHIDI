/**
 * 상담 녹화 시작/중지 (LiveKit Egress)
 *
 * POST /api/khidi/consultation/:id/recording
 * Body: { action: "start" | "stop" }
 * 응답: { ok, recordingId?, egressId? }
 *
 * ⚠️ **기본 꺼짐.** `CONSULT_RECORDING_ENABLED=true` 가 아니면 무조건 503.
 *    PO 지시(2026-07-28): "녹화는 바로 오픈하지 말고 준비만" → 스위치 뒤에 둔다.
 *    켜는 절차·정책 체크리스트: docs/CONSULT_RECORDING_SETUP.md
 *
 * 권한: 운영자만(admin·coordinator). 환자·게스트 의사는 못 누른다.
 *       녹화는 «누가 시작했는지»가 남아야 하는 행위라 시작자 id 를 기록한다.
 *
 * 고지: LiveKit 은 녹화가 시작되면 방의 모든 참가자에게 recording 상태를 알린다
 *       (`room.isRecording`). 상담방은 그걸 받아 전원에게 「녹화 중」 배지를 띄운다
 *       = 몰래 녹화가 구조적으로 불가능하다. 이 성질에 기대고 있으니 UI 를 지우지 마라.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptions,
  S3Upload,
} from "livekit-server-sdk";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import {
  isRecordingEnabledServer,
  recordingFilepath,
  RECORDING_AUDIO_BITRATE_KBPS,
  RECORDING_AUDIO_ONLY,
  RECORDING_BUCKET,
  RECORDING_RETENTION_DAYS,
} from "@/lib/consultation/recording";

/** 저장소(S3 호환) 설정 — 하나라도 비면 녹화를 시작하지 않는다(파일 유실 방지). */
function s3Config() {
  const {
    RECORDING_S3_ENDPOINT,
    RECORDING_S3_REGION,
    RECORDING_S3_ACCESS_KEY,
    RECORDING_S3_SECRET,
  } = process.env;
  if (
    !RECORDING_S3_ENDPOINT ||
    !RECORDING_S3_REGION ||
    !RECORDING_S3_ACCESS_KEY ||
    !RECORDING_S3_SECRET
  ) {
    return null;
  }
  return new S3Upload({
    endpoint: RECORDING_S3_ENDPOINT,
    region: RECORDING_S3_REGION,
    accessKey: RECORDING_S3_ACCESS_KEY,
    secret: RECORDING_S3_SECRET,
    bucket: RECORDING_BUCKET,
    // Supabase Storage 등 S3 «호환» 저장소는 버킷을 호스트명이 아니라 경로로 받는다.
    forcePathStyle: true,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRecordingEnabledServer()) {
      return Response.json({ ok: false, error: "recording_disabled" }, { status: 503 });
    }

    const { id: consultationId } = await params;

    // 운영자만 — 게스트 토큰 경로에서도 role 은 검사된다.
    const actor = await resolveConsultationActor(request, consultationId, {
      requireRole: ["admin", "coordinator"],
    });
    if (!actor.success) return actor.response;

    const body = await request.json().catch(() => ({}));
    const action = (body as any)?.action;
    if (action !== "start" && action !== "stop") {
      return Response.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!apiKey || !apiSecret || !livekitUrl) {
      return Response.json({ ok: false, error: "livekit_not_configured" }, { status: 503 });
    }
    const egress = new EgressClient(livekitUrl, apiKey, apiSecret);

    // ── 중지 ────────────────────────────────────────────────────────────
    if (action === "stop") {
      const { data: rows, error: findError } = await supabaseAdmin
        .from("consultation_recordings")
        .select("id, egress_id")
        .eq("consultation_id", consultationId)
        .eq("status", "recording")
        .order("started_at", { ascending: false })
        .limit(1);

      if (findError) {
        console.error("[recording] lookup failed:", findError.message);
        return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
      }
      const row = rows?.[0];
      if (!row) {
        return Response.json({ ok: false, error: "not_recording" }, { status: 409 });
      }

      await egress.stopEgress(row.egress_id);
      await supabaseAdmin
        .from("consultation_recordings")
        .update({ status: "stopped", ended_at: new Date().toISOString() })
        .eq("id", row.id);

      return Response.json({ ok: true, recordingId: row.id });
    }

    // ── 시작 ────────────────────────────────────────────────────────────
    const { data: session } = await supabaseAdmin
      .from("consultation_sessions")
      .select("livekit_room_name, status")
      .eq("id", consultationId)
      .maybeSingle();

    if (!session?.livekit_room_name) {
      return Response.json({ ok: false, error: "consultation_has_no_room" }, { status: 409 });
    }

    // 이미 돌고 있으면 두 벌 찍지 않는다(중복 과금·중복 파일 방지).
    // ⚠️ maybeSingle() 금지 — 행이 2개가 되는 순간 "없음"이 아니라 에러가 나고, 그걸 안 보면
    //    «녹화가 없다»로 둔갑해 계속 새로 시작한다(POSTMORTEMS #105). limit(1) + error 명시 검사.
    const { data: running, error: runningError } = await supabaseAdmin
      .from("consultation_recordings")
      .select("id")
      .eq("consultation_id", consultationId)
      .eq("status", "recording")
      .limit(1);
    if (runningError) {
      console.error("[recording] running check failed:", runningError.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    if (running && running.length > 0) {
      return Response.json({ ok: false, error: "already_recording" }, { status: 409 });
    }

    const s3 = s3Config();
    if (!s3) {
      // 저장소가 없으면 시작하지 않는다 — LiveKit 이 찍어도 올릴 데가 없어 파일이 사라진다.
      return Response.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
    }

    const startedAt = new Date();
    const filepath = recordingFilepath(consultationId, startedAt.toISOString());

    const info = await egress.startRoomCompositeEgress(
      session.livekit_room_name,
      new EncodedFileOutput({
        fileType: RECORDING_AUDIO_ONLY ? EncodedFileType.OGG : EncodedFileType.MP4,
        filepath,
        output: { case: "s3", value: s3 },
      }),
      {
        audioOnly: RECORDING_AUDIO_ONLY,
        // 기본 128kbps 로 두면 1시간짜리가 57MB 라 저장소 상한(50MB)에 걸려 업로드가 통째로
        // 실패한다. 64kbps = 분당 약 0.48MB → 약 100분까지 안전. (recording.js 주석 참조)
        encodingOptions: new EncodingOptions({
          audioBitrate: RECORDING_AUDIO_BITRATE_KBPS,
        }),
      }
    );

    const expiresAt = new Date(
      startedAt.getTime() + RECORDING_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("consultation_recordings")
      .insert({
        consultation_id: consultationId,
        egress_id: info.egressId,
        status: "recording",
        audio_only: RECORDING_AUDIO_ONLY,
        file_path: filepath,
        started_by: actor.userId,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      // 기록을 못 남기면 «누가 언제 찍었는지» 가 사라진다 → 녹화도 되돌린다.
      await egress.stopEgress(info.egressId).catch(() => {});
      console.error("[recording] insert failed:", insertError.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    return Response.json({ ok: true, recordingId: inserted.id, egressId: info.egressId });
  } catch (error: any) {
    console.error("[api/consultation/recording] Error:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
