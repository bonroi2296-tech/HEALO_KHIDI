/**
 * healwith: 세컨드 오피니언 — 코디/어드민용 소견 요청 생성 + 조회 (staff 전용)
 *
 * POST /api/coordinator/opinions        → 케이스에 소견 요청(매직링크) 생성. 링크 + 카톡 붙여넣기용 요약 반환.
 *   body.direct === true 이면 링크 없이, 이미 카톡·메일 등으로 받은 소견을 코디가 직접 입력(doctorName/opinionText).
 *   filePath/fileName 을 같이 주면(원장님이 문서·이미지로 준 경우) translateMedicalDoc(ko)으로
 *   자동 번역해 opinion_text 초안을 채운다 — 의료용어 비전문가인 코디의 손번역보다 이쪽이 낫다는
 *   PO 판단(2026-07-08). 코디가 검수 후 "에이전시에 공개"하는 기존 흐름은 그대로(AI 번역=초안일 뿐).
 * GET  /api/coordinator/opinions?inquiryId=  → 그 케이스의 활성 요청 + 도착한 소견 목록.
 *
 * inquiries·opinion_* 는 RLS상 service_role 전용 → 서버 경유 필수.
 * 소견은 hospital_leads(치료 유치 집계)와 분리된 case_opinions 에 저장(유치 KPI 오염 방지).
 */
export const runtime = "nodejs";

import crypto from "crypto";
import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { notifyStaffOpinionArrived } from "@/lib/notifications/inApp";
import { translateMedicalDoc } from "@/lib/documents/translateDoc";
import { translateOpinionText } from "@/lib/opinions/translateOpinion";

// 파일 여러 개 — 각각 번역 후 파일명 헤더로 구분해 하나의 opinion_text 로 이어붙임.
async function translateMultiple(files: { path: string; name?: string | null }[]): Promise<string> {
  const parts = await Promise.all(files.map(async (f) => {
    const result = await translateMedicalDoc({ path: f.path, name: f.name, lang: "ko" }).catch(() => null);
    const body = result?.ok ? flattenTranslatedDoc(result.doc) : "(자동 번역 실패 — 첨부 원본을 직접 확인해 주세요)";
    return `[${f.name || "첨부파일"}]\n${body}`;
  }));
  return parts.join("\n\n");
}

// 번역된 문서(섹션 배열)를 사람이 읽을 평문으로 펼침 — case_opinions.opinion_text 는 plain text 컬럼이라.
function flattenTranslatedDoc(doc: { docType?: string; sections?: any[] } | null | undefined): string {
  if (!doc?.sections?.length) return "";
  const lines: string[] = [];
  if (doc.docType) lines.push(doc.docType, "");
  for (const s of doc.sections) {
    if (s.title) lines.push(s.title);
    if (s.note) lines.push(s.note);
    if (Array.isArray(s.columns) && Array.isArray(s.rows)) {
      for (const r of s.rows) lines.push((r?.cells || []).filter(Boolean).join(": "));
    }
    if (s.text) lines.push(s.text);
    lines.push("");
  }
  return lines.join("\n").trim();
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL || "https://healwith.co.kr";

// 링크 유효기간 — 30일(그 후 만료). 재요청은 새 링크 생성.
const EXPIRY_DAYS = 30;

function opinionUrl(token: string): string {
  return `${SITE_URL}/opinion/${token}`;
}

/** intake JSONB 에서 병기(stage)만 안전하게 뽑기(신·구 키). PII 아님. */
function stageOf(intake: any): string | null {
  const o = intake && typeof intake === "object" && !Array.isArray(intake) ? intake : {};
  const cancer = o.cancer && typeof o.cancer === "object" ? o.cancer : {};
  const v = o.stage ?? cancer.stage ?? null;
  return v != null && String(v).trim() ? String(v).trim() : null;
}

/** 카톡 붙여넣기용 요약 — PII(이름·연락처) 제외. 임상 맥락 + 링크만. */
function buildSummary(inq: any, url: string, note?: string | null): string {
  const lines = [
    "[healwith 전문의 소견 요청]",
    `케이스 #${inq.id}`,
  ];
  if (inq.nationality) lines.push(`· 국적: ${inq.nationality}`);
  const cancer = inq.cancer_type || inq.treatment_type;
  if (cancer) lines.push(`· 암종/치료: ${cancer}`);
  const stage = stageOf(inq.intake);
  if (stage) lines.push(`· 병기: ${stage}`);
  if (note && note.trim()) lines.push(`· 요청: ${note.trim()}`);
  lines.push("");
  lines.push("아래 링크에서 검사지·상세를 보시고 소견 부탁드립니다(로그인 불필요):");
  lines.push(url);
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const inquiryId = Number(body?.inquiryId);
    if (!Number.isInteger(inquiryId) || inquiryId <= 0) {
      return Response.json({ ok: false, error: "invalid_inquiry_id" }, { status: 400 });
    }
    const note = typeof body?.note === "string" ? body.note.slice(0, 500) : null;

    // 케이스 존재 확인 + 요약 재료(PII 아닌 임상 필드만)
    const { data: inq, error: inqErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, nationality, cancer_type, treatment_type, intake, spoken_language")
      .eq("id", inquiryId)
      .single();
    if (inqErr || !inq) {
      return Response.json({ ok: false, error: "inquiry_not_found" }, { status: 404 });
    }

    // 직접 입력 — 링크 없이 이미 받은(카톡·메일 등) 소견을 코디가 그대로 기록.
    // 문서·이미지로 받았으면 filePath/fileName 을 같이 보냄 → 서버가 자동 번역해 초안을 채운다.
    if (body?.direct === true) {
      const doctorName = typeof body?.doctorName === "string" ? body.doctorName.slice(0, 100).trim() : "";
      // 다중 첨부(files: [{path,name}]). 구버전 단일 filePath/fileName 도 계속 지원(하위호환).
      const files: { path: string; name?: string | null }[] = Array.isArray(body?.files)
        ? body.files.filter((f: any) => f && typeof f.path === "string").slice(0, 10)
        : (typeof body?.filePath === "string" ? [{ path: body.filePath, name: body?.fileName || null }] : []);
      let opinionText = typeof body?.opinionText === "string" ? body.opinionText.trim() : "";

      if (!doctorName) {
        return Response.json({ ok: false, error: "invalid_direct_entry" }, { status: 400 });
      }
      if (!opinionText && files.length === 0) {
        return Response.json({ ok: false, error: "invalid_direct_entry" }, { status: 400 });
      }

      if (files.length > 0 && !opinionText) {
        opinionText = await translateMultiple(files);
      }
      if (opinionText.length < 5) {
        return Response.json({ ok: false, error: "invalid_direct_entry" }, { status: 400 });
      }

      const { data: row, error: dErr } = await (supabaseAdmin as any)
        .from("case_opinions")
        .insert({
          inquiry_id: inquiryId,
          doctor_key: null,
          doctor_name: doctorName,
          opinion_text: opinionText.slice(0, 8000),
          file_path: files[0]?.path || null,
          file_name: files[0]?.name || null,
          files: files.length > 0 ? files : null,
        })
        .select("id, doctor_name, opinion_text, file_path, file_name, files, created_at")
        .single();
      if (dErr || !row) {
        console.error("[coordinator/opinions] direct insert error:", dErr?.message);
        return Response.json({ ok: false, error: "create_failed" }, { status: 500 });
      }
      await notifyStaffOpinionArrived({ inquiryId, doctorName }).catch(() => {});

      // 접수 즉시 환자 언어로 자동 번역해 확정본 초안에 미리 채워둠(PO 결정 2026-07-09).
      // 코디의 "추가" 클릭 응답을 기다리게 하지 않도록 fire-and-forget.
      void (async () => {
        const translated = await translateOpinionText(opinionText, inq.spoken_language || "").catch(() => null);
        if (translated) {
          await (supabaseAdmin as any)
            .from("case_opinions")
            .update({ auto_translated_text: translated })
            .eq("id", row.id)
            .then(() => {}, () => {});
        }
      })();

      return Response.json({ ok: true, opinion: row });
    }

    // 추측 불가 토큰(48 hex). 케이스당 여러 번 생성 가능(각각 유효 — 재요청은 새 링크).
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: reqRow, error: insErr } = await (supabaseAdmin as any)
      .from("opinion_requests")
      .insert({
        inquiry_id: inquiryId,
        token,
        created_by: auth.userId,
        note,
        expires_at: expiresAt,
      })
      .select("id, token, note, created_at, expires_at")
      .single();
    if (insErr || !reqRow) {
      console.error("[coordinator/opinions] insert error:", insErr?.message);
      return Response.json({ ok: false, error: "create_failed" }, { status: 500 });
    }

    const url = opinionUrl(reqRow.token);
    return Response.json({
      ok: true,
      request: {
        id: reqRow.id,
        token: reqRow.token,
        url,
        note: reqRow.note,
        created_at: reqRow.created_at,
        expires_at: reqRow.expires_at,
      },
      summaryText: buildSummary(inq, url, note),
    });
  } catch (e: any) {
    console.error("[coordinator/opinions] POST error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const inquiryId = Number(new URL(request.url).searchParams.get("inquiryId"));
  if (!Number.isInteger(inquiryId) || inquiryId <= 0) {
    return Response.json({ ok: false, error: "invalid_inquiry_id" }, { status: 400 });
  }

  try {
    const nowIso = new Date().toISOString();
    // 활성 요청(가장 최근, 미폐기·미만료) 1건 — 코디가 링크 재확인·재공유용.
    const { data: reqs } = await (supabaseAdmin as any)
      .from("opinion_requests")
      .select("id, token, note, created_at, expires_at, revoked")
      .eq("inquiry_id", inquiryId)
      .eq("revoked", false)
      .order("created_at", { ascending: false })
      .limit(10);
    // 가장 최근 것이 만료됐어도 그 아래 유효한 링크가 있으면 그걸 노출(만료분만 보고 '없음' 처리 방지).
    const active = (reqs || []).find((r: any) => !r.expires_at || r.expires_at > nowIso) || null;

    const { data: opinions } = await (supabaseAdmin as any)
      .from("case_opinions")
      .select("id, doctor_key, doctor_name, opinion_text, attribution_note, released_text, released_at, auto_translated_text, file_path, file_name, files, created_at")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false });

    // 첨부 원본(문서·이미지)이 있으면 서명 URL로("이미 받은 소견"이 파일로 온 경우 코디가 원본 대조).
    // files(다중)가 있으면 그걸 우선, 없으면 구버전 단일 file_path 폴백.
    const opinionsWithUrls = await Promise.all((opinions || []).map(async (o: any) => {
      const list: { path: string; name?: string | null }[] = Array.isArray(o.files) && o.files.length > 0
        ? o.files
        : (o.file_path ? [{ path: o.file_path, name: o.file_name }] : []);
      if (list.length === 0) return o;
      const withUrls = await Promise.all(list.map(async (f) => {
        const { data } = await supabaseAdmin.storage.from("attachments").createSignedUrl(f.path, 3600);
        return { name: f.name, url: data?.signedUrl || null };
      }));
      return { ...o, file_url: withUrls[0]?.url || null, attached_files: withUrls };
    }));

    // 환자 언어(접수 시 선택) — 에이전시 확정본 AI 번역 타겟 언어로 재사용.
    const { data: inq } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, nationality, cancer_type, treatment_type, intake, spoken_language")
      .eq("id", inquiryId)
      .single();

    // 활성 링크가 있으면 카톡 붙여넣기용 요약도 함께(코디가 재공유 시 다시 복사할 수 있게).
    let summaryText: string | null = null;
    if (active && inq) summaryText = buildSummary(inq, opinionUrl(active.token), active.note);

    return Response.json({
      ok: true,
      request: active
        ? { id: active.id, token: active.token, url: opinionUrl(active.token), note: active.note, created_at: active.created_at, expires_at: active.expires_at }
        : null,
      summaryText,
      opinions: opinionsWithUrls,
      patientLang: inq?.spoken_language || null,
    });
  } catch (e: any) {
    console.error("[coordinator/opinions] GET error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
