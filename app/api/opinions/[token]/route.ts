/**
 * healwith: 세컨드 오피니언 — 계정 없는 의사용 공개 토큰 API
 *
 * GET  /api/opinions/[token]  → 토큰이 유효하면 케이스 임상요약(검사지 포함) 반환. 의사가 소견 작성 전 열람.
 * POST /api/opinions/[token]  → 소견 제출. 명단에서 고른 본인(또는 '그 외 의료진') + 소견 텍스트.
 *
 * 보안:
 * - 계정 불필요, 오직 추측 불가 토큰으로만 접근(화상상담 게스트링크와 동형). 만료·폐기 검사.
 * - 환자 PII 중 연락처는 미노출(코디 중개). 이름·임상은 국내병원 파트너 열람과 동일 수준(3자제공 동의 근거).
 * - 공개 엔드포인트 → rate limit. 실패 코드는 internal_error 형만(원인 문자열 미노출).
 * - ⚠️ case_status_history 에 쓰지 않는다 — 그 타임라인은 에이전시도 보므로(소견은 코디·어드민만).
 */
export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";
import {
  checkRateLimitPersistent,
  getClientIp,
  getRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rateLimit";
import { rosterName, isValidOpinionDoctorKey } from "@/lib/opinions/roster";
import { notifyStaffOpinionArrived } from "@/lib/notifications/inApp";
import { logAdminAction, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit/adminAuditLog";
import { translateMedicalDoc } from "@/lib/documents/translateDoc";
import { translateOpinionText } from "@/lib/opinions/translateOpinion";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import { readFollowUps } from "@/lib/inquiry/followUps";
import { readBriefMap, briefSig, generateCaseBrief } from "@/lib/inquiry/caseBrief";
import { encryptStringNullable } from "@/lib/security/encryptionV2";
import { withDownloadName } from "@/lib/documents/sharedDocMeta";

// 코디가 문의상세에서 이미 만들어둔 AI 케이스 브리프(한국어 요약)를 그대로 재사용.
// 원문(러시아어 등)·미기재 필드보다 훨씬 낫다 — 새로 만들지 않고 캐시만 복호화해서 보여준다.
function decodeCachedBrief(encBrief: unknown): { overview: string; request: string; points: string[]; red_flags: string[]; imaging_note?: string } | null {
  if (typeof encBrief !== "string" || !encBrief) return null;
  try {
    const dec = decryptStringNullable(encBrief);
    if (!dec) return null;
    // ⚠️ 캐시는 2026-07-29 부터 **언어별 묶음**({ko:…, ru:…})이다. 예전처럼 parsed.overview 만
    //   보면 항상 «브리프 없음»이 되어 **의료진 화면에서 케이스 요약이 통째로 사라진다**
    //   (2026-08-03 PO 지적으로 발각 — 그동안 조용히 안 뜨고 있었다).
    //   readBriefMap 이 옛 형식·새 형식을 둘 다 흡수한다. 의료진 화면은 한국어로 읽는다.
    const map = readBriefMap(JSON.parse(dec));
    const parsed = map.ko || map.en || Object.values(map)[0];
    if (!parsed?.overview) return null;
    return {
      overview: String(parsed.overview || ""),
      request: String(parsed.request || ""),
      points: Array.isArray(parsed.points) ? parsed.points.map((s: any) => String(s)) : [],
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map((s: any) => String(s)) : [],
      imaging_note: parsed.imaging_note ? String(parsed.imaging_note) : undefined,
    };
  } catch {
    return null;
  }
}


/**
 * 의료진이 볼 요약이 «낡았으면» 여기서 다시 만든다.
 *
 * 왜 (2026-08-04): 예전엔 저장된 것을 읽기만 했다. 요약을 다시 만드는 건 «코디가 화면을 열 때»뿐이라,
 *   자료를 새로 올린 뒤 코디가 안 들어가면 **원장님은 낡은 요약을 본다**(실제로 그랬다 — CT 를 붙였는데
 *   요약엔 「첨부 1개를 읽지 못함」이 그대로 남아 있었다).
 *   요약은 판단의 출발점이라 낡은 채로 보여주는 게 안 보여주는 것보다 나쁘다.
 *
 * 비용: 낡았을 때 한 번만 모델을 부르고 결과를 저장한다(다음 열람부터는 공짜).
 *   실패하면 저장된 것을 그대로 쓴다 — 화면이 비지 않게.
 */
async function regenBrief(inqRaw: any, inq: any, want: string) {
  const r = await generateCaseBrief({
    inquiry: inq,
    attachments: Array.isArray(inqRaw?.attachments) ? inqRaw.attachments : [],
    lang: "ko",
  });
  if (!r.ok) return null;
  // 언어별 묶음을 지키면서 한국어 칸만 갈아끼운다(코디가 만든 다른 언어 요약을 안 지운다).
  let map: any = {};
  try {
    const dec = decryptStringNullable(inqRaw?.coordinator_brief || null);
    if (dec) map = readBriefMap(JSON.parse(dec));
  } catch { /* 못 읽으면 새로 시작 */ }
  map.ko = { ...r.brief, unreadable: r.unreadableCount };
  await (supabaseAdmin as any)
    .from("inquiries")
    .update({ coordinator_brief: encryptStringNullable(JSON.stringify(map)), coordinator_brief_sig: want })
    .eq("id", inqRaw.id);
  return {
    overview: r.brief.overview,
    request: r.brief.request,
    points: r.brief.points || [],
    red_flags: r.brief.red_flags || [],
    imaging_note: r.brief.imaging_note,
  };
}

/**
 * 의료진이 볼 요약. 낡았으면 다시 만들되 **화면을 세워두지 않는다.**
 *
 * 왜 이렇게 (2026-08-04 자체 점검에서 잡음): 어제는 낡았을 때 그 자리에서 만들고 «기다렸다».
 *   요약 만들기는 CT 장면까지 보느라 26~40초가 걸린다(실측) — 원장님이 링크를 열면
 *   40초 동안 빈 화면을 보게 된다. 요약 하나 새로 하자고 화면을 못 쓰게 만드는 건 손해다.
 *
 *   · 최신이면 → 그대로.
 *   · 낡았으면 → **있는 것을 즉시 보여주고**, 응답 뒤에 조용히 새로 만들어 저장한다(다음 열람은 최신).
 *   · 아예 없으면 → 그때만 만들어서 준다(안 그러면 요약이 통째로 안 보인다).
 */
async function briefForDoctor(inqRaw: any, inq: any) {
  const cached = decodeCachedBrief(inqRaw?.coordinator_brief);
  const want = briefSig(inqRaw?.attachments || [], inqRaw?.follow_ups);
  const have = inqRaw?.coordinator_brief_sig || "";
  if (cached && want === have) return cached;

  if (cached) {
    // after(): 응답을 보낸 «뒤»에도 함수를 살려 둔다(서버리스가 얼어붙지 않게).
    after(async () => {
      try { await regenBrief(inqRaw, inq, want); }
      catch (e: any) { console.error("[opinions/:token] 요약 갱신 실패:", e?.message); }
    });
    return cached;
  }

  try {
    return await regenBrief(inqRaw, inq, want);
  } catch (e: any) {
    console.error("[opinions/:token] 요약 생성 실패:", e?.message);
    return null;
  }
}

const VIEW_RATE = { windowMs: 60 * 1000, maxRequests: 30, apiName: "opinion_view" };

// 의사가 임상 판단에 쓸 안전 필드만(신·구 키). PII 키 제외. (파트너 리드 열람과 동일 화이트리스트.)
const DETAIL_LABELS: Record<string, string> = {
  sex: "성별", age: "나이", birthYear: "출생연도", birth_year: "출생연도",
  stage: "병기", diagnosis_date: "진단일", diagnosisDate: "진단일",
  diagnosed_hospital: "진단 병원", diagnosedHospital: "진단 병원",
  treatment_state: "현재 치료상태", treatmentState: "현재 치료상태",
  prior_treatment: "기존 치료", priorTreatment: "기존 치료",
};
function pickDetail(intake: any): { label: string; value: string }[] {
  const o = intake && typeof intake === "object" && !Array.isArray(intake) ? intake : {};
  const out: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const [k, label] of Object.entries(DETAIL_LABELS)) {
    const v = o[k];
    if (v == null || String(v).trim() === "") continue;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ label, value: String(v) });
  }
  return out;
}
function patientName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  return n || "익명 환자";
}
// 한국 의료진용 화면이므로 검사지도 한국어로 번역해서 같이 준다(원문 링크는 그대로 유지).
// translateMedicalDoc 은 캐시 우선 — 코디가 이미 번역해뒀으면 즉시, 아니면 그 자리에서 생성(최초 1회만 비용 발생).
// 첨부가 많은 케이스에서 비용 폭주 방지를 위해 앞 5개까지만 번역.
const MAX_TRANSLATE = 5;
/** 병원 CD 묶음(.rar/.zip/.dcm)인가 — 이건 번역이 아니라 «영상 보기»로 열어야 한다. */
function isImagingBundle(a: any): boolean {
  const n = String(a?.name || a?.path || "").toLowerCase();
  const t = String(a?.type || "").toLowerCase();
  return /\.(rar|zip|dcm)$/.test(n) || t.includes("rar") || t.includes("zip") || t.includes("dicom");
}

async function signAttachments(atts: any): Promise<
  { name: string; url: string | null; downloadUrl?: string | null; translated: unknown | null; path?: string; imaging?: boolean }[]
> {
  if (!Array.isArray(atts) || atts.length === 0) return [];
  return Promise.all(
    atts.slice(0, 20).map(async (a: any, i: number) => {
      let url: string | null = null;
      let downloadUrl: string | null = null;
      if (a?.path) {
        const store = supabaseAdmin.storage.from("attachments");
        const { data } = await store.createSignedUrl(a.path, 3600);
        url = data?.signedUrl || null;
        // 내려받기용 주소를 따로 만드는 이유 (PO 제보 2026-08-04 «얘만 다운받기 누르면 왜 이렇게 되냐»):
        //   화면의 «내려받기» 표시(HTML download)는 **다른 서버의 파일에는 안 먹힌다.**
        //   그래서 그림은 저장 창이 안 뜨고 그냥 탭에 열려 버렸다(.rar 처럼 못 여는 것만 우연히 잘 됐다).
        //   저장소에 «이건 내려받는 파일»이라고 표시해 달라고 부탁하는 주소를 따로 받는다.
        //   ⚠️ supabase-js 의 `{ download: 이름 }` 옵션은 쓰지 않는다 — 주소를 두 번 인코딩해
        //   러시아어·한글 이름이 `%D0%98…` 라는 글자 그대로 저장된다(2026-09-02 PO 제보, 실측 확인).
        //   같은 서명에 이름만 붙이면 되므로 서명 호출도 한 번으로 줄었다.
        downloadUrl = withDownloadName(url, String(a?.name || "첨부파일")) || url;
      }
      // CT 묶음은 번역 대상이 아니다 — 번역을 걸면 «번역 실패»만 뜨고 정작 영상은 못 본다.
      const imaging = isImagingBundle(a);
      let translated: unknown | null = null;
      if (a?.path && !imaging && i < MAX_TRANSLATE) {
        const result = await translateMedicalDoc({ path: a.path, name: a?.name, lang: "ko" }).catch(() => null);
        if (result?.ok) translated = result.doc;
      }
      // path 를 같이 주는 이유: 영상 보기 창구가 «어느 파일인지»를 알아야 한다.
      // 남의 파일을 넣어도 창구에서 이 링크의 문의 것인지 다시 확인한다.
      return { name: a?.name || "첨부파일", url, downloadUrl, translated, path: a?.path || undefined, imaging };
    })
  );
}

/** 토큰 → 유효한 요청 행(미폐기·미만료). 없으면 null. */
async function resolveRequest(token: string) {
  const { data } = await (supabaseAdmin as any)
    .from("opinion_requests")
    .select("id, inquiry_id, note, revoked, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.revoked) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, VIEW_RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const { token } = await context.params;
    if (!token || !/^[0-9a-f]{32,64}$/i.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const req = await resolveRequest(token);
    if (!req) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    const { data: inqRaw } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, first_name, last_name, nationality, spoken_language, preferred_date, preferred_date_flex, cancer_type, treatment_type, message, intake, attachments, follow_ups, coordinator_brief, coordinator_brief_sig")
      .eq("id", req.inquiry_id)
      .maybeSingle();
    if (!inqRaw) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const inq = await decryptInquiryForAdmin(inqRaw).catch(() => inqRaw);

    // 코디가 확정한 진단코드 — 위 목록에 섞지 말고 «따로» 읽는다(그 컬럼 없는 환경에서 조회 전체가
    // 죽으면 의료진이 케이스를 아예 못 연다). 요약을 다시 만들 때 이 값이 같이 들어간다.
    try {
      const { data: icdRow } = await (supabaseAdmin as any)
        .from("inquiries").select("icd_code").eq("id", req.inquiry_id).maybeSingle();
      if (icdRow?.icd_code) inq.icd_code = icdRow.icd_code;
    } catch { /* 못 읽으면 그 줄만 빠진다 */ }

    // 감사로그: 소견 링크로 케이스 PII(이름·임상·첨부)를 열람. 계정 없어 링크 지문으로 식별. 실패해도 진행.
    void logAdminAction({
      adminEmail: `opinion_link:${token.slice(0, 8)}`,
      adminUserId: null,
      // 외부 전문의가 소견 링크로 케이스를 열람 — 파트너 열람과 동종(감사 액션 재사용).
      action: "PARTNER_VIEW_CASES",
      inquiryIds: [Number(req.inquiry_id)],
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { via: "opinion_link", request_id: req.id },
    });

    return Response.json({
      ok: true,
      requestNote: req.note || null,
      case: {
        id: inq.id,
        patient: patientName(inq.first_name, inq.last_name),
        nationality: inq.nationality || null,
        language: inq.spoken_language || null,
        cancer_type: inq.cancer_type || null,
        // 코디가 확정한 진단코드. 요약(brief)에도 자료로 넘어가지만 모델이 본문에 안 쓸 수 있어서
        // «칸»으로도 내려준다 — 의료진이 찾는 값을 요약문 운에 맡기지 않는다.
        icd_code: inq.icd_code || null,
        treatment_type: inq.treatment_type && inq.treatment_type !== inq.cancer_type ? inq.treatment_type : null,
        preferred_date: inq.preferred_date || null,
        preferred_date_flex: !!inq.preferred_date_flex,
        message: typeof inq.message === "string" ? inq.message : null,
        clinical: pickDetail(inq.intake),
        attachments: await signAttachments(inqRaw.attachments),
        // 접수 후 추가로 들어온 환자 상태 — 서류엔 없지만 판단에 필요하다(PO 지시 2026-08-03).
        followUps: readFollowUps((inqRaw as any).follow_ups),
        // 코디가 만들어둔 AI 케이스 브리프(한국어 요약) — 없으면 null(코디가 아직 안 만든 케이스).
        brief: await briefForDoctor(inqRaw, inq),
      },
    });
  } catch (e: any) {
    console.error("[opinions/:token] GET error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const { token } = await context.params;
    if (!token || !/^[0-9a-f]{32,64}$/i.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const req = await resolveRequest(token);
    if (!req) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // 인코딩 깨진 본문(U+FFFD) 거부 — 깨진 한글이 DB·알림메일에 그대로 박힘 (POSTMORTEMS #92)
    if (hasMojibake(body)) {
      return Response.json(
        { ok: false, error: "broken_encoding", detail: "body contains U+FFFD — send UTF-8" },
        { status: 400 }
      );
    }

    const doctorKey = body?.doctorKey;
    const opinionText = typeof body?.opinionText === "string" ? body.opinionText.trim() : "";

    if (!isValidOpinionDoctorKey(doctorKey)) {
      return Response.json({ ok: false, error: "invalid_doctor" }, { status: 400 });
    }
    if (opinionText.length < 5) {
      return Response.json({ ok: false, error: "opinion_too_short" }, { status: 400 });
    }

    const doctorName = rosterName(doctorKey) || "그 외 의료진";

    // 소견과 «같이» 올린 서류(견적서 등). 업로드 창구가 이미 위장 검사까지 끝낸 것만 온다.
    // 경로는 여기서 한 번 더 본다 — 남의 문의 폴더를 적어 보내도 못 붙게.
    const files = (Array.isArray(body?.files) ? body.files : [])
      .filter((f: any) => f && typeof f.path === "string" && f.path.startsWith(`inquiry/${req.inquiry_id}/opinion/`))
      .slice(0, 5)
      .map((f: any) => ({
        path: String(f.path),
        name: String(f.name || "첨부").slice(0, 300),
        type: String(f.type || ""),
      }));

    const { data: row, error: insErr } = await (supabaseAdmin as any)
      .from("case_opinions")
      .insert({
        request_id: req.id,
        inquiry_id: req.inquiry_id,
        doctor_key: doctorKey,
        doctor_name: doctorName,
        opinion_text: opinionText.slice(0, 8000),
        files: files.length ? files : null,
        submitted_ip: ip,
      })
      .select("id")
      .single();
    if (insErr || !row) {
      console.error("[opinions/:token] insert error:", insErr?.message);
      return Response.json({ ok: false, error: "submit_failed" }, { status: 500 });
    }

    // 코디·어드민에게만 종(bell) 알림 — 소견은 내부 전용(에이전시·환자 미노출).
    await notifyStaffOpinionArrived({ inquiryId: Number(req.inquiry_id), doctorName }).catch(() => {});

    // 접수 즉시 환자 언어로 자동 번역해 코디 확정본 초안(auto_translated_text)에 미리 채워둔다.
    // PO 결정(2026-07-09): "버튼 누르게 하지 말고 데이터 넘어오는 시점부터."
    // 의사(제출자)는 번역을 기다릴 이유가 없으므로 fire-and-forget — 실패해도 소견 접수는 성공이고
    // 코디 화면은 원문(한글)으로 폴백한다(OpinionsSection 의 "다시 번역" 버튼으로 수동 재시도 가능).
    // after(): 응답 후에도 함수를 살려 번역이 잘리지 않게 (서버리스 freeze 방지).
    // 맨 `void` IIFE 는 keep-alive 계약이 없어 인스턴스가 얼면 Gemini 호출과 DB 쓰기가
    // 통째로 유실된다 — 에러도 안 남아 "번역이 가끔 안 됨"으로만 보인다(독립 리뷰 2026-07-21).
    after(async () => {
      try {
        const { data: inqRow } = await (supabaseAdmin as any)
          .from("inquiries")
          .select("spoken_language")
          .eq("id", req.inquiry_id)
          .maybeSingle();
        const translated = await translateOpinionText(opinionText, inqRow?.spoken_language || "");
        if (translated) {
          await (supabaseAdmin as any)
            .from("case_opinions")
            .update({ auto_translated_text: translated })
            .eq("id", row.id);
        }
      } catch (e: any) {
        console.error("[opinions/:token] auto-translate failed:", e?.message?.slice(0, 160));
      }
    });

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("[opinions/:token] POST error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
