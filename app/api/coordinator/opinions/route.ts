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
// 직접입력은 응답 전에 소견 번역(Gemini)을 끝낸다 → 기본 타임아웃으로는 잘릴 수 있다.
// 잘리면 insert 는 이미 커밋된 뒤라 코디가 다시 누르며 소견이 중복 입력된다(2라운드 리뷰 지적).
export const maxDuration = 120;

import crypto from "crypto";
import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { notifyStaffOpinionArrived } from "@/lib/notifications/inApp";
import { translateMedicalDoc } from "@/lib/documents/translateDoc";
import { translateOpinionText } from "@/lib/opinions/translateOpinion";
import { withDownloadName } from "@/lib/documents/sharedDocMeta";

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
    const { data: inq, error: inqErr } = await supabaseAdmin
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
      const filePath = typeof body?.filePath === "string" ? body.filePath : null;
      const fileName = typeof body?.fileName === "string" ? body.fileName.slice(0, 200) : null;
      let opinionText = typeof body?.opinionText === "string" ? body.opinionText.trim() : "";

      if (!doctorName) {
        return Response.json({ ok: false, error: "invalid_direct_entry" }, { status: 400 });
      }
      if (!opinionText && !filePath) {
        return Response.json({ ok: false, error: "invalid_direct_entry" }, { status: 400 });
      }

      if (filePath && !opinionText) {
        const result = await translateMedicalDoc({ path: filePath, name: fileName, lang: "ko" }).catch(() => null);
        opinionText = result?.ok ? flattenTranslatedDoc(result.doc) : "";
        if (!opinionText) {
          opinionText = "(자동 번역 실패 — 첨부 원본을 직접 확인해 주세요)";
        }
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
          file_path: filePath,
          file_name: fileName,
        })
        .select("id, doctor_name, opinion_text, file_path, file_name, created_at")
        .single();
      if (dErr || !row) {
        console.error("[coordinator/opinions] direct insert error:", dErr?.message);
        return Response.json({ ok: false, error: "create_failed" }, { status: 500 });
      }
      await notifyStaffOpinionArrived({ inquiryId, doctorName }).catch(() => {});

      // 접수 즉시 환자 언어로 자동 번역해 확정본 초안을 채운다(PO 2026-07-09 "데이터 넘어오는
      // 시점부터"). 여기는 **응답 전에 끝낸다** — 의사 매직링크 경로와 달리 이 화면은 코디가
      // 보고 있고, 저장 직후 목록을 다시 불러온다. 뒤에서 처리하면 그 재조회가 번역보다 먼저
      // 도착해 코디 화면에 한글 원문이 남고, 라벨만 "AI가 번역해뒀습니다"로 뜨는 어긋남이
      // 생긴다(독립 리뷰 2026-07-21). 코디는 이미 파일 번역을 기다리는 화면이라 대기가 새롭지 않다.
      let autoTranslated: string | null = null;
      try {
        autoTranslated = await translateOpinionText(opinionText, (inq as any)?.spoken_language || "");
        if (autoTranslated) {
          await (supabaseAdmin as any)
            .from("case_opinions")
            .update({ auto_translated_text: autoTranslated })
            .eq("id", row.id);
        }
      } catch (e: any) {
        // 번역 실패가 접수를 되돌리지 않는다 — 화면은 원문 폴백 + "다시 번역"으로 복구 가능.
        console.error("[coordinator/opinions] auto-translate failed:", e?.message?.slice(0, 160));
      }

      return Response.json({ ok: true, opinion: { ...row, auto_translated_text: autoTranslated } });
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
      // files = 원장님이 소견과 «같이 낸» 서류(견적서 등). 이게 빠져 있어서 저장은 되는데
      //   코디 화면엔 안 떴다(PO 확인 요청 2026-08-04 로 발견 — 실제 제출본 1건이 안 보이고 있었다).
      .select("id, doctor_key, doctor_name, opinion_text, attribution_note, released_text, released_at, auto_translated_text, file_path, file_name, files, created_at")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false });

    // 첨부 원본(문서·이미지)이 있으면 서명 URL로("이미 받은 소견"이 파일로 온 경우 코디가 원본 대조).
    const opinionsWithUrls = await Promise.all((opinions || []).map(async (o: any) => {
      const out: any = { ...o };
      if (o.file_path) {
        const { data } = await supabaseAdmin.storage.from("attachments").createSignedUrl(o.file_path, 3600);
        out.file_url = data?.signedUrl || null;
      }
      if (Array.isArray(o.files) && o.files.length) {
        out.files = await Promise.all(o.files.slice(0, 5).map(async (f: any) => {
          // 「내려받기」로 내주는 주소 — 그냥 주소면 그림·PDF 가 탭에 열려 버린다.
          // ⚠️ supabase-js 의 `{ download: 이름 }` 옵션은 쓰지 않는다 — 주소를 두 번 인코딩해
          //   러시아어·한글 이름이 `%D0%98…` 라는 글자 그대로 저장된다(2026-09-02 PO 제보, 실측 확인).
          const { data } = await supabaseAdmin.storage
            .from("attachments")
            .createSignedUrl(String(f?.path || ""), 3600);
          return { name: f?.name || "첨부", url: withDownloadName(data?.signedUrl, String(f?.name || "첨부")) };
        }));
      }
      return out;
    }));

    // 환자 언어 — 코디 화면의 "다시 번역" 버튼이 어느 언어로 번역할지 정하는 데 필요하다.
    // (활성 링크 유무와 무관하게 항상 필요해서 summaryText 조회와 분리해 한 번만 읽는다.)
    const { data: inq } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, nationality, cancer_type, treatment_type, intake, spoken_language")
      .eq("id", inquiryId)
      .single();

    // 활성 링크가 있으면 카톡 붙여넣기용 요약도 함께(코디가 재공유 시 다시 복사할 수 있게).
    let summaryText: string | null = null;
    if (active && inq) {
      summaryText = buildSummary(inq, opinionUrl(active.token), active.note);
    }

    return Response.json({
      ok: true,
      request: active
        ? { id: active.id, token: active.token, url: opinionUrl(active.token), note: active.note, created_at: active.created_at, expires_at: active.expires_at }
        : null,
      summaryText,
      patientLang: (inq as any)?.spoken_language || null,
      opinions: opinionsWithUrls,
    });
  } catch (e: any) {
    console.error("[coordinator/opinions] GET error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
