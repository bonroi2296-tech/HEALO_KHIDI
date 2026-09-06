/**
 * healwith: 공개 케이스 링크(inquiries.public_token) — 한 주소가 두 가지를 한다.
 *
 * ① 진행상황 보기(가입·로그인 없이). 왓츠앱·메일·에이전시 경유처럼 **계정 없이 접수된** 문의가
 *    표준 동선이라, 「진행상황을 보려면 먼저 가입하세요」를 입구에 두지 않는다.
 * ② 계정 연결(claim). 그 사람이 가입하면 케이스를 본인 계정에 붙여 /patient 포털을 바로 쓰게 한다.
 *
 * GET  /api/inquiries/claim?token=...  → 진행상황 + 마스킹 미리보기(계정 없이)
 * POST /api/inquiries/claim            → 로그인 사용자 본인 계정에 연결. body: { token }
 *
 * 보안:
 * - inquiries 는 RLS상 service_role 전용 → 항상 서버 경유(supabaseAdmin).
 * - 직원(admin/coordinator)·에이전시·병원 계정은 claim 불가 — 그 계정이 환자 케이스를
 *   "가져가 버리는" 구멍 차단(구현 중 실클릭 검증으로 재현·발견해 막음).
 *   단 **진행상황 조회까지 막지는 않는다** — 에이전시가 자기가 접수한 건을 열면 막힘 화면만
 *   뜨고 아무것도 못 보던 문제(2026-08-03 PO 지적).
 * - 환자용 응답은 항상 명시적 필드 화이트리스트만(inquiries에 정산 등 민감 컬럼이 늘어도
 *   자동으로 새 나가지 않게). 이 주소는 메신저로 전달될 수 있으므로 연락처·생년월일·
 *   환자가 낸 서류·견적·소견 원문은 **의도적으로 안 내린다**.
 * - 단 하나의 예외: **코디가 「환자에게 보이기」를 켠 서류**(case_shared_documents). 우리가
 *   환자에게 «보내려고» 만든 것(소견서·사전상담 정리본)이라 안 내리면 전달할 길이 없다.
 *   올린다고 자동으로 나가지 않는다 — 코디가 한 건씩 켠 것만, 10분짜리 임시 주소로 나간다.
 *   (2026-08-05 문의 #60: 소견서를 만들어 놓고도 환자에게 줄 통로가 없어 막혀 있었다.)
 * - ⛔ 소견은 **이 화면에 글로 안 내린다**(2026-08-18 PO: *"제2 의료소견서라고 우리가 이렇게
 *   보여주고 있는거 빼자. 공식 문서로 보여주는게 좋을거 같다"*). 예전엔 확정본(released_text)을
 *   화면이 «소견서 모양»으로 그렸는데, 같은 소견이 공식 문서로도 올라오면서 한 케이스에 두 벌이
 *   됐다(실측 #60: 글 1건 + 문서 5건). 전달 통로는 위 case_shared_documents 하나로 모은다.
 *   ⚠️ 되살리기 전에 볼 것: 문서가 없는 옛 케이스(#37)는 그동안 이 글이 유일한 통로였다 —
 *   글을 되살릴 게 아니라 그 케이스의 공식 문서를 코디가 올리는 게 맞는 순서다.
 * - 공개 GET은 rate limit. 에러는 internal_error 형만(원인 문자열 미노출).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { checkAgencyAuth } from "@/lib/auth/checkAgencyAuth";
import { checkHospitalAuth } from "@/lib/auth/checkHospitalAuth";
import { resolveTier } from "@/lib/auth/accountTiers";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { decryptAuto, decryptMaybe } from "@/lib/security/encryptionV2";
import { CASE_STATUS_STEPS, caseStatusLabelL, caseStatusOrder } from "@/lib/khidi/caseStatus";
import { nextStepGuide } from "@/lib/khidi/nextStepGuide";
import { cancerTypeLabelL } from "@/lib/khidi/medicalLabels";
import { t } from "@/lib/i18n";
import { docDisplayTitle, withDownloadName } from "@/lib/documents/sharedDocMeta";
import { readFollowUps, BY_PATIENT_LINK } from "@/lib/inquiry/followUps";

const VIEW_RATE = { windowMs: 60 * 1000, maxRequests: 30, apiName: "inquiry_claim_view" };
const CLAIM_RATE = { windowMs: 60 * 1000, maxRequests: 10, apiName: "inquiry_claim" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function maskFirstName(name: string | null | undefined): string {
  const s = (name || "").trim();
  if (!s) return "";
  if (s.length <= 1) return s;
  return s[0] + "*".repeat(Math.min(s.length - 1, 6));
}

async function resolveInquiry(token: string) {
  const { data } = await (supabaseAdmin as any)
    .from("inquiries")
    .select(
      "id, first_name, cancer_type, user_id, agency_id, created_at, nationality, " +
        "case_status, case_status_note, case_status_updated_at, preferred_language, " +
        "message, attachments, follow_ups, preferred_date, preferred_date_flex, agencies(name)"
    )
    .eq("public_token", token)
    .maybeSingle();
  return data;
}

/**
 * 진행상황 묶음 — 단계·이력·다음 안내. 이 주소는 전달될 수 있으므로 여기서 내리는 값은
 * 「단계와 날짜」까지다. 이력의 note 는 코디가 환자·에이전시에게 보이라고 쓴 공개용 메모라 포함.
 * 조립 방식은 app/api/agency/inquiries/route.ts 의 historyMap 과 같다(같은 표를 1건만 읽음).
 */
/**
 * 이력 메모 중 **시스템이 자동으로 남긴 것**만 화면 언어로 바꾼다.
 *
 * 화상상담을 「완료」로 바꾸면 서버가 한국어 고정 문구를 이력에 남긴다
 * (app/api/khidi/consultation/[id]/route.ts). 그게 러시아어 화면에도 한국어 그대로 떴다
 * — 2026-08-05 문의 #60 러시아어 화면에서 실제로 확인.
 *
 * ⚠️ 코디가 손으로 쓴 메모는 **건드리지 않는다.** 사람이 쓴 문장을 기계가 바꾸면 뜻이 상한다
 *    (그 위험은 이미 겪었다 — 케이스 브리프 「항공 금기 없음」 뒤집힘, 2026-08-04).
 */
const SYSTEM_NOTE_KEYS: Record<string, string> = {
  "🩺 사전상담 완료 (원격상담)": "claimPage.noteConsultDone",
  "🩺 사후관리 완료 (원격상담)": "claimPage.noteFollowUpDone",
};

function localizeSystemNote(note: string | null | undefined, lang: string): string | null {
  if (!note) return null;
  const key = SYSTEM_NOTE_KEYS[note.trim()];
  return key ? t(key, lang) : note;
}

/**
 * 코디가 남긴 «소식» — 「지나온 기록」에 단계 이력과 **시간순으로 섞어서** 넣는다.
 *
 * 왜 섞나 (2026-08-05 PO): 「이대서울병원에 문의했습니다」 같은 일은 **단계를 옮길 일이 아니다.**
 * 그런데 환자가 궁금해하는 건 단계보다 이런 소식이다. 따로 칸을 만들면 두 곳을 봐야 하니
 * 한 줄기로 합친다 — 환자에겐 「그동안 있었던 일」 하나면 된다.
 *
 * ⚠️ 표가 아직 없는 DB 에서도 진행상황이 통째로 죽지 않게, 실패하면 빈 목록으로 넘어간다.
 */
async function fetchCaseUpdates(inquiryId: number) {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("case_updates")
      .select("body, created_at")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (err: any) {
    console.error("[inquiries/claim] case updates:", err?.message);
    return [];
  }
}

/**
 * **환자가 우리에게 준 것 전부** — 처음 문의글·처음 보낸 자료 + 그 뒤에 보낸 글·자료. 시간순 한 줄기.
 *
 * 왜 하나로 (2026-08-05 PO: *"이것저것 추가하다보니 최적화가 안된거 같아"*): 처음엔 「접수 내용」과
 * 「보내주신 것」 **두 칸**으로 나뉘어 있었다. 만든 쪽에선 «접수 때 낸 것»과 «나중에 보낸 것»이지만
 * **환자에겐 둘 다 「내가 보낸 것」**이다. 두 칸을 오가며 찾게 만들 이유가 없다.
 *
 * ⚠️ 「추가 정보」는 코디가 적은 것도 같이 내린다 — 이 칸에 쌓이는 건 정의상 **환자가 준 정보**다
 *    (왓츠앱·메신저로 온 「지금 상태」를 코디가 옮겨 적은 것). 예전엔 «환자 링크로 직접 보낸 것»만
 *    골랐는데, 그러면 **아셀 코디가 옮겨 적은 진짜 증상 기록이 환자 화면에서 사라진다**(2026-08-06
 *    PO 지적, 문의 #60). 자료 쪽은 이미 코디가 대신 올린 것까지 다 보여주고 있었다 — 앞뒤가 안 맞았다.
 *
 * ⚠️ 환자가 «지운» 것은 안 내린다(`removed_at` 이 붙은 것). 지운 기록 자체는 DB 에 그대로 남고
 *    코디 화면에는 「환자가 지움」으로 뜬다 — 냈다가 지우고 «안 냈다»고 하는 걸 막기 위해서다.
 *    파일 주소는 다른 서류와 같은 10분짜리 임시 주소, 저장 이름은 원본 파일명.
 */
async function buildPatientSent(inq: any) {
  const notes: { at: string; text: string; mine: boolean }[] = [];

  // ① 처음 문의글 — 접수 시각을 그 글의 시각으로 본다(단계 가르기가 날짜로 도니까).
  //    이건 못 지운다(mine=false) — 문의 그 자체라 지우면 케이스가 빈 껍데기가 된다.
  try {
    const first = (decryptMaybe(inq.message) || "").trim();
    if (first) notes.push({ at: inq.created_at, text: first, mine: false });
  } catch {
    /* 복호화 실패해도 화면 전체가 죽으면 안 된다 */
  }
  // ② 그 뒤에 들어온 추가 정보. 「이 화면에서 직접 보낸 것」만 본인이 지울 수 있다(mine).
  const storedFU: any[] = Array.isArray(inq.follow_ups) ? inq.follow_ups : [];
  readFollowUps(inq.follow_ups).forEach((f, i) => {
    if (storedFU[i]?.removed_at) return;
    notes.push({ at: f.at, text: f.text, mine: f.by === BY_PATIENT_LINK });
  });
  notes.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  // ③ 자료 — 접수 때 낸 것과 나중에 보낸 것을 가리지 않는다(환자에겐 둘 다 «내가 보낸 자료»).
  const raw = (Array.isArray(inq.attachments) ? inq.attachments : []).filter((a: any) => !a?.removed_at);
  let files: { name: string; url: string | null; path: string; mine: boolean }[] = [];
  if (raw.length) {
    const base = raw.map((a: any) => ({
      name: String(a?.name || a?.path || "file"),
      path: String(a?.path || ""),
      mine: a?.uploaded_by_patient === true,
    }));
    try {
      const { data: signed } = await supabaseAdmin.storage
        .from("attachments")
        .createSignedUrls(base.map((b) => b.path).filter(Boolean), 600);
      const urlByPath = new Map((signed ?? []).map((s: any) => [s.path, s.signedUrl]));
      files = base.map((b) => ({ ...b, url: withDownloadName(urlByPath.get(b.path), b.name) }));
    } catch (err: any) {
      // 주소를 못 만들어도 «무엇을 보냈는지»는 알려 준다.
      console.error("[inquiries/claim] sent files:", err?.message);
      files = base.map((b) => ({ ...b, url: null }));
    }
  }

  return notes.length || files.length ? { notes, files } : null;
}


/**
 * 「지나온 기록」에서 **연달아 같은 단계인 줄**을 하나로 접는다.
 *
 * 왜 (2026-08-05 PO: *"위엔 뭐 간략하게 설명해주는건 좋은데 겹치나..?"*): 문의 #60 화면에
 * 「2026. 8. 4. 상담·검토 진행」이 **두 줄** 떠 있었다. 단계가 바뀔 때마다 이력을 남기는데
 * 같은 단계로 다시 옮기거나 메모만 붙는 일이 있어서 그렇다. 환자에게 같은 말이 두 번 보이면
 * 「내가 뭘 놓쳤나」가 된다.
 *
 * 접을 때 **메모가 있는 줄을 남긴다** — 정보가 든 쪽이 이긴다. 둘 다 메모가 있으면 둘 다 남긴다
 * (서로 다른 소식이므로). 단계가 «다시 바뀐» 경우는 연속이 아니므로 그대로 둔다.
 */
function dedupeStages(hist: any[]): any[] {
  const out: any[] = [];
  for (const h of hist) {
    const prev = out[out.length - 1];
    if (prev && prev.status === h.status) {
      const prevNote = String(prev.note || "").trim();
      const curNote = String(h.note || "").trim();
      if (!curNote) continue;              // 새 줄에 정보가 없다 → 버린다
      if (!prevNote) { out[out.length - 1] = h; continue; } // 앞줄이 빈 줄이었다 → 갈아끼운다
      // 둘 다 메모가 있으면 서로 다른 소식이다 → 둘 다 남긴다
    }
    out.push(h);
  }
  return out;
}

async function buildProgress(inq: any, lang: string) {
  const { data: hist } = await (supabaseAdmin as any)
    .from("case_status_history")
    .select("status, note, created_at")
    .eq("inquiry_id", inq.id)
    .order("created_at", { ascending: true });
  const updates = await fetchCaseUpdates(inq.id);

  // 접수 코드도 DB 기본값도 case_status 를 안 채운다 → 코디가 손으로 옮기기 전까지 빈값이다
  // (2026-08-04 실측: 최근 30일 문의 38건 중 34건, 89%). 빈값을 그대로 쓰면 환자 화면에
  // "미지정"이 뜨고 막대가 텅 비고 다음 안내도 안 나온다 — 링크를 받은 사람 10명 중 9명이
  // 그 화면을 본다는 뜻이었다. 이 주소가 열린다는 건 문의가 접수됐다는 뜻이므로 최소 사실인
  // 「문의·의뢰 접수」로 본다.
  // ⚠️ 화면에서만 그렇게 «본다» — DB 는 안 고친다. case_status 는 KHIDI 성과 집계
  // (conversion-funnel·kpiHealthcheck)가 읽는 값이라, 빈칸을 일괄로 채우면 평가 숫자가 움직인다.
  const status = inq.case_status || "intake";

  return {
    caseStatus: status,
    caseStatusLabel: caseStatusLabelL(status, lang),
    caseStatusNote: inq.case_status_note || null,
    caseStatusUpdatedAt: inq.case_status_updated_at || null,
    nextStep: nextStepGuide(status, lang),
    // 진행바를 그리려면 화면이 단계 목록·순서를 알아야 한다. on_hold(order 99)는 막대에서 제외 —
    // 보류는 앞뒤로 움직이는 단계가 아니라 옆에 붙는 상태다(caseStatus.ts 주석과 같은 취급).
    steps: CASE_STATUS_STEPS.filter((s) => s.key !== "on_hold").map((s) => ({
      key: s.key,
      label: caseStatusLabelL(s.key, lang),
      order: s.order,
    })),
    // 보류(on_hold)는 order 99 라 그대로 쓰면 막대가 전부 채워진 것처럼 보인다. 보류는 단계를
    // 전진/후퇴시키는 값이 아니므로 **보류 직전에 있던 단계**에 막대를 세운다(이력에서 역순으로 찾음).
    // 보류로 시작해 이력이 아직 없으면 되짚을 앞 단계가 없다 → 막대가 0칸(텅 빈 화면)이 된다.
    // 그때도 최소 사실인 「접수」에 세운다.
    currentOrder:
      status === "on_hold"
        ? caseStatusOrder(
            [...(hist || [])].reverse().find((h: any) => h.status !== "on_hold")?.status ||
              "intake"
          )
        : caseStatusOrder(status),
    // 단계 이력 + 코디 소식을 한 줄기로. 소식은 「단계 이름」이 없다(kind 로 화면이 구분한다).
    timeline: [
      ...dedupeStages(hist || []).map((h: any) => ({
        kind: "stage",
        status: h.status,
        label: caseStatusLabelL(h.status, lang),
        note: localizeSystemNote(h.note, lang),
        at: h.created_at,
      })),
      ...updates.map((u: any) => ({
        kind: "update",
        status: null,
        label: null,
        note: u.body,
        at: u.created_at,
      })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
  };
}

/**
 * 우리가 환자에게 보낸 서류 — **코디가 「환자에게 보이기」를 켠 것만.**
 *
 * 이 파일 머리말의 «서류는 의도적으로 안 내린다» 원칙을 여기 한 곳으로만 연다. 링크가 메신저로
 * 굴러다닐 수 있으므로 ①코디가 고른 것만 ②이름·날짜·메모만 ③파일 주소는 10분짜리 임시 주소다.
 *
 * ⚠️ 표가 아직 없는 DB(마이그레이션 적용 전)에서도 **진행상황 화면 전체가 죽으면 안 된다.**
 *    조회가 실패하면 빈 목록으로 넘긴다 — 서류 칸만 안 뜨고 나머지는 그대로 보인다.
 */
async function buildSharedDocuments(inquiryId: number) {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("case_shared_documents")
      .select("id, file_name, title, lang, note, shared_at, storage_path")
      .eq("inquiry_id", inquiryId)
      .eq("visible_to_patient", true)
      .order("shared_at", { ascending: false });
    if (error || !data?.length) return [];

    const paths = data.map((d: any) => d.storage_path).filter(Boolean);
    // 10분 = 화면을 열고 누르기엔 넉넉하고, 주소가 새어도 오래 살지 않는 길이.
    const { data: signed } = await supabaseAdmin.storage
      .from("attachments")
      .createSignedUrls(paths, 600, { download: true });
    const urlByPath = new Map((signed ?? []).map((s: any) => [s.path, s.signedUrl]));

    return data.map((d: any) => ({
      id: d.id,
      // 화면에 뜨는 이름 — 코디가 붙인 게 있으면 그것, 없으면 파일명(확장자만 뗀다).
      // 파일명이 `SECOND OPINION_RU_AMANOV_TULEGEN.docx` 인 채로 뜨면 환자가 뭘 눌러야 할지 모른다.
      name: docDisplayTitle(d.title, d.file_name),
      fileName: d.file_name,
      // 언어 — 화면이 «내 언어 것을 위로» 올리고 나머지는 접는 데 쓴다(숨기지는 않는다).
      lang: d.lang || null,
      note: d.note || null,
      at: d.shared_at,
      // ⚠️ 원본 파일 주소는 **PDF·사진일 때만** 내린다 (2026-08-05 PO: *"docx 로 올리더라도
      //    사용자는 pdf 로만 조회하고 다운받을 수 있게"*). 워드를 그대로 내주면 폰에서 못 열거나
      //    서식이 깨진다 — 워드는 화면에 글로 그려 주고, 저장은 그 화면을 PDF 로 뽑게 한다.
      //    사진 주소는 미리보기를 그리는 데 쓰이므로 남긴다(저장 단추는 화면 저장으로 간다).
      url: /\.(pdf|jpe?g|png|webp)$/i.test(String(d.file_name || ""))
        ? withDownloadName(urlByPath.get(d.storage_path), String(d.file_name || "document"))
        : null,
      // 화면이 「원본을 그대로 받게 할지」를 판단하는 근거. 파일명으로 판단하지 않게 서버가 준다.
      isPdf: /\.pdf$/i.test(String(d.file_name || "")),
    }));
  } catch (err: any) {
    console.error("[inquiries/claim] shared documents:", err?.message);
    return [];
  }
}

/**
 * 직원·에이전시·병원 계정은 환자 케이스를 claim 할 수 없다(순수 환자 계정만 허용).
 * "누가 어떤 계층인가" 판정은 src/lib/auth/accountTiers.ts 의 resolveTier() 가 단일 SoR —
 * 여기서 역할 목록을 따로 하드코딩하지 않는다(그 파일 헤더 주석의 명시적 요구사항).
 */
async function isNonPatientAccount(
  request: NextRequest,
  auth: { isAdmin: boolean; appRole?: string }
): Promise<boolean> {
  const [agency, hospital] = await Promise.all([checkAgencyAuth(request), checkHospitalAuth(request)]);
  const tier = resolveTier({
    isAdmin: auth.isAdmin,
    appRole: auth.appRole,
    isHospitalUser: hospital.isHospitalUser,
    isAgencyUser: agency.isAgencyUser,
    partnerType: agency.partnerType,
  });
  return tier !== "patient";
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, VIEW_RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    if (!UUID_RE.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const inq = await resolveInquiry(token);
    if (!inq) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    // 화면이 보고 있는 언어 우선, 없으면 접수 때 고른 환자 언어, 그래도 없으면 영어.
    const lang = url.searchParams.get("lang") || inq.preferred_language || "en";

    let firstName = "";
    try {
      firstName = inq.first_name ? (await decryptAuto(inq.first_name)) || "" : "";
    } catch {
      /* fail-safe — 마스킹만 실패, 링크 자체는 유효 */
    }

    // alreadyClaimed 여도 진행상황은 같이 내린다. 예전엔 그 한 줄만 내리고 끝나서
    // 이미 계정에 붙은 케이스는 이 화면이 백지였다(2026-08-03).
    return Response.json({
      ok: true,
      alreadyClaimed: Boolean(inq.user_id),
      preview: {
        firstNameMasked: maskFirstName(firstName),
        // 저장값은 영어 코드(stomach·liver·other…)라 그대로 내리면 러시아어 화면에도 "stomach"이
        // 그대로 찍힌다(2026-08-04 실측: 67건 중 29건). 자유입력(한글 "위암" 등)은 사전에 없어
        // 원문 그대로 통과된다 — cancerTypeLabelL 이 못 찾으면 키를 되돌려주는 성질을 그대로 씀.
        cancerType: cancerTypeLabelL(inq.cancer_type, lang) || null,
        // 교육 가이드 링크용 슬러그(표시용 아님) — 가이드가 있는 5종(stomach·breast·liver·lung·thyroid)만 화면이 쓴다.
        cancerSlug: inq.cancer_type || null,
        // nationality 는 화면이 안 쓴다(ClaimClient 는 환자·치료분야·의뢰경로·접수일 4칸만 그린다).
        // 이 주소는 메신저로 전달되므로 «안 쓰는 값은 안 내린다» — 옛 코드는 "KZ" 를 그냥 실어 보냈다.
        agencyName: (inq as any).agencies?.name || null,
        createdAt: inq.created_at || null,
        // 희망 시기는 «내가 보낸 것»이 아니라 케이스의 성질이라 맨 위 요약에 둔다.
        preferredDate: inq.preferred_date || null,
        preferredDateFlex: Boolean(inq.preferred_date_flex),
      },
      // 「이 사람 언어」 — 접수 때 받은 값이다(추측 아님). 화면이 처음 열릴 때 이걸로 맞춘다.
      patientLang: inq.preferred_language || null,
      sent: await buildPatientSent(inq),
      progress: await buildProgress(inq, lang),
      documents: await buildSharedDocuments(inq.id),
    });
  } catch (err: any) {
    console.error("[inquiries/claim] GET error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, CLAIM_RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    if (auth.isStaff || (await isNonPatientAccount(request, { isAdmin: auth.isAdmin, appRole: auth.appRole }))) {
      return Response.json({ ok: false, error: "staff_cannot_claim" }, { status: 403 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      /* empty body */
    }
    const token = typeof body?.token === "string" ? body.token : "";
    if (!UUID_RE.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 400 });
    }

    const inq = await resolveInquiry(token);
    if (!inq) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    if (inq.user_id) {
      if (inq.user_id === auth.userId) {
        return Response.json({ ok: true, claimed: true, alreadyOwned: true });
      }
      return Response.json({ ok: false, error: "already_claimed" }, { status: 409 });
    }

    // .is("user_id", null) 로 동시요청 경쟁 방지 — 그 사이 다른 계정이 먼저 연결했으면 미갱신.
    const { data: updated, error } = await (supabaseAdmin as any)
      .from("inquiries")
      .update({ user_id: auth.userId })
      .eq("id", inq.id)
      .is("user_id", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[inquiries/claim] update error:", error.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    if (!updated) {
      return Response.json({ ok: false, error: "already_claimed" }, { status: 409 });
    }

    return Response.json({ ok: true, claimed: true });
  } catch (err: any) {
    console.error("[inquiries/claim] POST error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
