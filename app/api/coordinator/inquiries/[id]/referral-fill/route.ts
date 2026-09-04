/**
 * healwith: 서류에서 읽은 값으로 의뢰서의 «빈 칸»을 채워 저장한다 (staff 전용)
 *
 * PATCH /api/coordinator/inquiries/[id]/referral-fill
 *   body { fields: {칸이름: 값}, from: {칸이름: "출처 파일 이름"} }
 *   → { ok, filled: [채운 칸 이름], skipped: [이미 차 있어 건너뛴 칸] }
 *
 * 왜 (2026-09-04 PO): 「의뢰서에 한번 채우면 저장 안되니? 매번 불러와야해?」
 *   처음엔 «화면에만» 띄웠다. 그러면 코디가 새로고침할 때마다 다시 읽혀야 하고(그때마다 AI 비용),
 *   다른 사람이 그 케이스를 열면 아무것도 안 보인다.
 *
 * 🛑 세 가지 안전선
 *  ① «비어 있는 칸»만 채운다. 채움 여부는 화면 말고 **여기서 다시 판정**한다 —
 *     화면이 낡은 값을 들고 있으면 환자가 적은 값을 덮어쓸 수 있다.
 *  ② 건강정보·PII 는 암호화해서 넣는다. 평문으로 두는 건 그 자체로 사람을 특정할 수 없는
 *     값(성별·병기·진단코드)뿐 — 접수 창구(app/api/inquiries/referral)와 «같은 규칙»이다.
 *     한쪽만 바꾸면 코디 화면이 복호화에 실패해 글자가 깨진다.
 *  ③ 어느 칸을 무엇으로 채웠는지 intake_data._filledFromDocs 에 남긴다. 나중에 「이 값 어디서
 *     나왔냐」를 되짚을 수 있어야 한다 — 기계가 읽은 값과 환자가 적은 값은 무게가 다르다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { encryptStringNullable } from "@/lib/security/encryptionV2";

// 접수 창구와 같은 규칙 — 건강정보·PII 는 암호문, 나머지는 평문.
const ENCRYPTED = new Set([
  "passportNo", "birthDate", "diagnosisNameRaw", "diagnosisDate", "onsetDate",
  "chiefComplaint", "testsAndTreatments", "localDoctorOpinion",
  "pastHistoryNote", "medications", "familyHistory",
  // 코디가 손으로 적는 칸 — 서류에서는 안 나온다(의뢰 목적은 우리가 정하는 것이다).
  "referralPurpose",
]);
const PLAIN = new Set(["sex", "icdCode", "stage", "nationality"]);
// 판독기가 줄 수 있는 칸만 받는다. 여기 없는 이름은 조용히 버린다.
// ⚠️ 여기 빠뜨리면 «판독은 됐는데 화면은 계속 비어 있는» 상태가 된다. 2026-09-04 PO 지적:
//    「이 케이스 왜 국적이 비어 있냐 카자흐스탄이라면서」 — 판독기는 여권·진료기록에서 KZ 를
//    뽑고 있었는데 이 목록에 nationality 가 없어 조용히 버려지고 있었다.
const ALLOWED = new Set([...ENCRYPTED, ...PLAIN]);

// 문의 본표에도 같이 써야 하는 칸 — 코디 목록·KHIDI 집계가 intake_data 가 아니라 이 컬럼을 본다.
const ALSO_ON_INQUIRY: Record<string, string> = { nationality: "nationality" };

const MAX_LEN = 4000;
const isBlank = (v: unknown) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  if (!rawId || !/^\d+$/.test(rawId)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  let body: any;
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const incoming = body?.fields && typeof body.fields === "object" ? body.fields : null;
  const from = body?.from && typeof body.from === "object" ? body.from : {};
  if (!incoming) return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });

  const id = Number(rawId);
  try {
    const { data: row, error: readErr } = await supabaseAdmin
      .from("inquiries")
      .select("id, intake_data, cancer_type, nationality")
      .eq("id", id)
      .single();
    if (readErr || !row) {
      return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const current: any = row.intake_data && typeof row.intake_data === "object" ? { ...row.intake_data } : {};
    const filled: string[] = [];
    const skipped: string[] = [];
    const marks: Record<string, string> = { ...(current._filledFromDocs || {}) };

    for (const [key, raw] of Object.entries(incoming)) {
      if (!ALLOWED.has(key)) continue;
      if (isBlank(raw)) continue;
      // ① 이미 차 있으면 건드리지 않는다 — 화면이 아니라 여기서 판정한다.
      if (!isBlank(current[key])) { skipped.push(key); continue; }
      const text = String(raw).trim().slice(0, MAX_LEN);
      if (!text) continue;
      current[key] = ENCRYPTED.has(key) ? encryptStringNullable(text) : text;
      const src = typeof from[key] === "string" ? from[key].slice(0, 200) : null;
      marks[key] = src || "서류";
      filled.push(key);
    }

    if (!filled.length) {
      return Response.json({ ok: true, filled: [], skipped });
    }

    // 의뢰서로 안 들어온 옛 문의도 카드가 그려지게 판 표시를 세워 둔다.
    if (!current.version) current.version = "referral_v1";
    current._filledFromDocs = marks;

    // 몇몇 값은 문의 본표 컬럼에도 같이 넣는다 — 코디 목록·KHIDI 집계가 그 컬럼을 본다.
    // 🛑 본표에 이미 값이 있으면 덮지 않는다(여기서도 «빈 칸만» 규칙을 지킨다).
    const patchInquiry: Record<string, unknown> = { intake_data: current };
    for (const [k, col] of Object.entries(ALSO_ON_INQUIRY)) {
      if (filled.includes(k) && isBlank((row as any)[col])) patchInquiry[col] = current[k];
    }

    const { error: upErr } = await supabaseAdmin
      .from("inquiries")
      .update(patchInquiry as any)
      .eq("id", id);
    if (upErr) {
      console.error("[referral-fill] update error:", upErr.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // 병기·진단시기는 코디 화면과 KHIDI 집계가 «이 표»를 읽는다. intake_data 에만 넣으면
    // 기존 화면에서 안 보인다(접수 창구도 같은 이유로 이 표를 같이 쓴다).
    if (filled.includes("stage") || filled.includes("diagnosisDate")) {
      // ⚠️ cancer_type 은 not-null 이다. 안 넣으면 upsert 가 통째로 실패하고, 우리는 그 실패를
      //    조용히 넘기므로(본체는 이미 저장됨) 「저장은 됐는데 이 표만 안 채워진」 상태가 된다.
      //    2026-09-04 실측으로 잡았다 — 화면은 멀쩡했고 서버 로그에만 남았다.
      const patch: Record<string, unknown> = { inquiry_id: id, cancer_type: row.cancer_type || "other" };
      if (filled.includes("stage")) patch.cancer_stage = current.stage;
      // 🛑 읽는 쪽은 *_encrypted 컬럼을 본다. 평문 diagnosis_date 는 옛 컬럼이라 쓰지 않는다.
      if (filled.includes("diagnosisDate")) patch.diagnosis_date_encrypted = current.diagnosisDate;
      const { error: intakeErr } = await supabaseAdmin
        .from("cancer_patient_intakes")
        .upsert(patch as any, { onConflict: "inquiry_id" });
      // 실패해도 본체는 이미 저장됐다 — 여기서 되돌리지 않는다.
      if (intakeErr) console.error("[referral-fill] intake upsert:", intakeErr.message);
    }

    console.info(`[referral-fill] #${id} filled ${filled.length} by ${auth.email || auth.userId}`);
    return Response.json({ ok: true, filled, skipped });
  } catch (err: any) {
    console.error("[referral-fill] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
