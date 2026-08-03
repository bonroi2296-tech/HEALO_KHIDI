/**
 * 첨부 업로드 전 구간 자가검사 — sign → Storage 직행 PUT → confirm(위장 검사).
 *
 * 왜 있나: 이 흐름은 Vercel 함수 본문 4.5MB 벽을 «피해가는» 게 목적이라
 * 빌드·타입검사로는 깨진 걸 못 잡는다. 실제로 큰 파일이 올라가는지 재야 한다.
 *
 *   node scripts/check-attachment-upload.mjs [baseUrl]     (기본 http://localhost:3000)
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] || "http://localhost:3000";
const API = `${BASE}/api/attachments/upload`;

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function pdf(mb) {
  const buf = Buffer.alloc(mb * 1024 * 1024, 0x20);
  Buffer.from("%PDF-1.7\n").copy(buf); // magic bytes 진짜 PDF
  return buf;
}

const post = (body) =>
  fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

async function upload(buf, name, type) {
  const sign = await post({ phase: "sign", name, type, size: buf.length });
  if (!sign.json.ok) return { ok: false, error: sign.json.error, path: null };
  const put = await fetch(sign.json.signedUrl, { method: "PUT", headers: { "content-type": type }, body: buf });
  if (!put.ok) return { ok: false, error: `put_${put.status}`, path: sign.json.path };
  const confirm = await post({ phase: "commit", path: sign.json.path, type });
  return { ok: !!confirm.json.ok, error: confirm.json.error, path: sign.json.path };
}

const exists = async (path) =>
  !(await admin.storage.from("attachments").createSignedUrl(path, 30)).error;

let failed = 0;
const check = (label, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
};

// 1) 131MB PDF — 문의 #60 에서 환자가 못 올렸던 바로 그 크기(예전엔 4.5MB 에서 413)
const big = await upload(pdf(131), "131mb.pdf", "application/pdf");
check("131MB PDF 업로드 (문의 #60 실제 크기)", big.ok, big.error || "");
if (big.path) await admin.storage.from("attachments").remove([big.path]);

// 2) 위장 파일(선언은 PDF, 내용은 아님) — 거부 + 저장소에서 삭제되어야 한다
const fakeBuf = Buffer.alloc(1024 * 1024, 0x41);
const fake = await upload(fakeBuf, "fake.pdf", "application/pdf");
check("위장 파일 거부", !fake.ok && fake.error === "invalid_file_content", fake.error || "통과돼버림");
if (fake.path) check("위장 파일 저장소에서 삭제됨", !(await exists(fake.path)));

// 3) 상한 초과 — 서명 단계에서 막혀야 한다
const over = await post({ phase: "sign", name: "huge.pdf", type: "application/pdf", size: 250 * 1024 * 1024 });
check("200MB 초과 거부", over.json.error === "file_too_large", over.json.error || "");

// 4) 허용 안 된 타입
const badType = await post({ phase: "sign", name: "x.exe", type: "application/x-msdownload", size: 1000 });
check("허용 외 타입 거부", badType.json.error === "invalid_file_type", badType.json.error || "");

// 5) 남의 경로 confirm 시도 — 임의 객체 삭제 통로가 되면 안 된다
const evil = await post({ phase: "commit", path: "inquiry/../../documents/anything.pdf", type: "application/pdf" });
check("경로 위조 거부", evil.json.error === "invalid_path", evil.json.error || "");

// 6) 코디가 «환자 대신» 올리는 통로 (메일·왓츠앱으로 따로 받은 자료용)
const COORD_EMAIL = "coordinator@test.com";
const COORD_PW = process.env.TEST_ACCOUNT_PASSWORD || "Healwith2026!";
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data: sess } = await anon.auth.signInWithPassword({ email: COORD_EMAIL, password: COORD_PW });
const token = sess?.session?.access_token;
if (!token) {
  check("코디 대리 업로드", false, `${COORD_EMAIL} 로그인 실패 — 비밀번호가 바뀌었는지 확인`);
} else {
  // 대상 문의는 «가장 최근 것» — 특정 번호에 묶으면 그 문의가 사라졌을 때 검사기가 거짓 실패한다.
  const { data: inq } = await admin.from("inquiries").select("id, attachments").order("id", { ascending: false }).limit(1).single();
  const endpoint = `${BASE}/api/coordinator/inquiries/${inq.id}/attachments`;
  const cpost = (body) =>
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

  const buf = pdf(12);
  const sign = await cpost({ phase: "sign", name: "staff_12mb.pdf", type: "application/pdf", size: buf.length });
  let ok = false;
  if (sign.json.ok) {
    const put = await fetch(sign.json.signedUrl, {
      method: "PUT",
      headers: { "content-type": "application/pdf" },
      body: buf,
    });
    if (put.ok) {
      const commit = await cpost({ phase: "commit", path: sign.json.path, name: "staff_12mb.pdf", type: "application/pdf" });
      ok = !!commit.json.ok && commit.json.attachment?.uploaded_by_staff === true;
    }
  }
  check("코디 대리 업로드 (12MB, staff 표시 포함)", ok, sign.json.error || "");

  // 흔적 정리 — 검사기가 실데이터를 늘리면 안 된다.
  if (sign.json.path) {
    await admin.storage.from("attachments").remove([sign.json.path]);
    await admin.from("inquiries").update({ attachments: inq.attachments || [] }).eq("id", inq.id);
  }

  // 로그인 안 한 사람은 못 써야 한다
  const anonTry = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phase: "sign", name: "x.pdf", type: "application/pdf", size: 100 }),
  });
  check("비로그인 대리 업로드 차단", anonTry.status === 401 || anonTry.status === 403, `HTTP ${anonTry.status}`);
}

// 7) 나머지 업로드 화면 4곳 — 환자 서류함 · 화상상담 서류 · 비자 서류 · 사후관리 경과
//    화면을 눌러보는 대신 «그 화면이 부르는 주소»를 같은 방식으로 두드린다.
//    필요한 표본(상담·비자신청·문의)은 여기서 만들고 끝나면 지운다 — 실데이터를 늘리면 안 된다.
async function loginAs(email) {
  const { data } = await anon.auth.signInWithPassword({
    email,
    password: process.env.TEST_ACCOUNT_PASSWORD || "Healwith2026!",
  });
  return data?.session?.access_token || null;
}

/** sign → PUT → commit 한 바퀴. 성공하면 { ok:true, path }. */
async function uploadTo(endpoint, tok, fields, buf, name, type) {
  const call = (body) =>
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

  const sign = await call({ phase: "sign", name, type, size: buf.length, ...fields });
  if (!sign.json.ok) return { ok: false, error: sign.json.error || `HTTP ${sign.status}` };
  const put = await fetch(sign.json.signedUrl, { method: "PUT", headers: { "content-type": type }, body: buf });
  if (!put.ok) return { ok: false, error: `put_${put.status}`, path: sign.json.path };
  const commit = await call({ phase: "commit", path: sign.json.path, name, type, ...fields });
  return { ok: !!commit.json.ok, error: commit.json.error, path: sign.json.path, data: commit.json };
}

const patientTok = await loginAs("patient@test.com");
const clinicTok = await loginAs("clinic@test.com");
const buf8 = pdf(8); // 8MB — 예전 4.5MB 벽이면 반드시 죽는 크기
const cleanup = [];

if (!patientTok) {
  check("환자 계정 로그인", false, "patient@test.com 로그인 실패");
} else {
  const { data: me } = await anon.auth.getUser(patientTok);
  const patientId = me?.user?.id;

  // 이 환자가 참가자인 상담 1건 — 환자 서류함·화상상담 서류가 둘 다 이걸 쓴다.
  const { data: cs } = await admin
    .from("consultation_sessions")
    .select("id")
    .eq("patient_user_id", patientId)
    .limit(1)
    .maybeSingle();

  if (!cs) {
    check("환자 서류함 / 화상상담 서류", false, "표본 상담이 없어 못 쟀음");
  } else {
    const r1 = await uploadTo(`${BASE}/api/patient/documents`, patientTok, { consultationId: cs.id, documentType: "other" }, buf8, "patient_8mb.pdf", "application/pdf");
    check("환자 서류함 업로드 (8MB)", r1.ok, r1.error || "");
    if (r1.data?.data?.id) cleanup.push(() => admin.from("consultation_documents").delete().eq("id", r1.data.data.id));
    if (r1.path) cleanup.push(() => admin.storage.from("documents").remove([r1.path]));

    const r2 = await uploadTo(`${BASE}/api/khidi/consultation/${cs.id}/documents`, patientTok, { documentType: "other" }, buf8, "consult_8mb.pdf", "application/pdf");
    check("화상상담 서류 공유 업로드 (8MB)", r2.ok, r2.error || "");
    if (r2.data?.data?.id) cleanup.push(() => admin.from("consultation_documents").delete().eq("id", r2.data.data.id));
    if (r2.path) cleanup.push(() => admin.storage.from("documents").remove([r2.path]));
  }

  // 비자 서류 — 표본 신청서를 만들고 끝나면 지운다.
  const { data: va } = await admin
    .from("visa_applications")
    .insert({ patient_user_id: patientId, visa_type: "C-3-3", nationality: "KZ", status: "draft" })
    .select("id")
    .single();
  if (!va) {
    check("비자 서류 업로드", false, "표본 비자신청 생성 실패 — 못 쟀음");
  } else {
    const r3 = await uploadTo(`${BASE}/api/khidi/visa/applications/${va.id}/documents`, patientTok, { document_type: "passport" }, buf8, "visa_8mb.pdf", "application/pdf");
    check("비자 서류 업로드 (8MB)", r3.ok, r3.error || "");
    if (r3.path) cleanup.push(() => admin.storage.from("documents").remove([r3.path]));
    cleanup.push(() => admin.from("visa_documents").delete().eq("application_id", va.id));
    cleanup.push(() => admin.from("visa_status_history").delete().eq("application_id", va.id));
    cleanup.push(() => admin.from("visa_applications").delete().eq("id", va.id));
  }
}

// 사후관리 경과 — 해외 의료기관이 자기 케이스에 올린다. 표본 문의를 is_test 로 만들고 지운다.
if (!clinicTok) {
  check("사후관리 경과 업로드", false, "clinic@test.com 로그인 실패");
} else {
  const { data: ag } = await admin.from("agencies").select("id").eq("partner_type", "medical_institution").limit(1).maybeSingle();
  const { data: inq2 } = await admin
    .from("inquiries")
    .insert({ agency_id: ag?.id, is_test: true, case_status: "follow_up" })
    .select("id")
    .single();
  if (!inq2) {
    check("사후관리 경과 업로드", false, "표본 문의 생성 실패 — 못 쟀음");
  } else {
    const r4 = await uploadTo(`${BASE}/api/khidi/progress`, clinicTok, { inquiryId: String(inq2.id), recordType: "test_result" }, buf8, "progress_8mb.pdf", "application/pdf");
    check("사후관리 경과 업로드 (8MB)", r4.ok, r4.error || "");
    if (r4.path) cleanup.push(() => admin.storage.from("documents").remove([r4.path]));
    cleanup.push(() => admin.from("progress_records").delete().eq("inquiry_id", inq2.id));
    cleanup.push(() => admin.from("case_status_history").delete().eq("inquiry_id", inq2.id));
    cleanup.push(() => admin.from("inquiries").delete().eq("id", inq2.id));
  }
}

for (const fn of cleanup) {
  try { await fn(); } catch (e) { console.log("  (정리 실패:", e.message, ")"); }
}

// 8) 되돌아오기 방지 — 파일을 서버로 통과시키는(formData) 업로드 라우트가 다시 생기면 잡는다.
//    4.5MB 벽에 걸리는 방식이라, 새로 짤 때 무심코 옛 패턴을 베끼는 걸 막는 게 목적.
//    예외는 «4.5MB 안쪽이 확실한» 것만: 어드민 이미지(4MB)·STT 오디오 조각(1.5MB).
const FORMDATA_OK = new Set([
  "app/api/admin/upload/route.ts",
  "app/api/admin/site-settings/upload/route.ts",
  "app/api/khidi/consultation/[id]/stt/route.ts",
]);
const grep = spawnSync("git", ["grep", "-l", "request.formData()", "--", "app/api"], { encoding: "utf8" });
const offenders = (grep.stdout || "")
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((f) => !FORMDATA_OK.has(f.replace(/\\/g, "/")));
check("서버 경유(formData) 업로드 라우트 없음", offenders.length === 0, offenders.join(", "));

console.log(failed ? `\n${failed}건 실패` : "\n전부 통과");
process.exit(failed ? 1 : 0);
