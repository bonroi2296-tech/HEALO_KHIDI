/**
 * healwith: 병원이 준 «원본 의뢰서 docx» 에 값만 채워 돌려준다 (staff 전용)
 *
 * POST /api/coordinator/inquiries/[id]/referral-docx
 *   body { hospital: "ewha" | "severance", values: { 칸이름: "값" } }
 *   → docx 파일 (첨부 다운로드)
 *
 * 왜 (2026-09-04 PO): 「docx 그대로 줘야 바로 약간 손보고 보내지」
 *   화면에 표로 보여 주는 것만으로는 부족하다. 병원 담당자는 «자기 양식»을 받아야 알아보고,
 *   코디는 받은 파일을 워드로 열어 몇 글자 고쳐 그대로 메일에 붙인다.
 *
 * 어떻게: docx 는 zip 안의 XML 이다. 원본 파일을 열어 «표 칸 번호»로 자리를 찾아 글자만 넣는다.
 *   양식을 새로 그리지 않으므로 글꼴·표 선·병원 로고·머리글이 원본 그대로 남는다.
 *
 * 🛑 칸 번호 세는 법 — 원본을 새로 받으면 반드시 다시 재라(번호가 밀리면 엉뚱한 칸에 들어간다):
 *     node -e "const fs=require('fs'),JSZip=require('jszip');(async()=>{const z=await
 *     JSZip.loadAsync(fs.readFileSync('src/assets/hospital-forms/ewha.docx'));const x=await
 *     z.file('word/document.xml').async('string');[...x.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)]
 *     .forEach((m,i)=>{const t=[...m[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(a=>a[1]).join('').trim();
 *     if(t)console.log(i,t.slice(0,50))})})()"
 *   라벨이 i 번이면 값 자리는 대개 i+1 번이다. 이미 글자가 인쇄된 칸(「없음」·「유/무」·「Mobile:」)은
 *   양식 정의에서 append 로 표시해 덮지 않고 뒤에 붙인다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { findForm } from "@/lib/inquiry/hospitalReferralForms";
import { contentDisposition } from "@/lib/documents/sharedDocMeta";

const MAX_LEN = 4000;

/** docx XML 에 넣을 수 있게 다듬는다. 줄바꿈은 워드의 줄바꿈 태그로. */
function xmlText(raw: string): string {
  const safe = String(raw)
    .slice(0, MAX_LEN)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // 워드는 한 run 안의 줄바꿈을 <w:br/> 로 그린다. 빈 줄도 살린다.
  return safe
    .split(/\r?\n/)
    .map((line) => `<w:t xml:space="preserve">${line}</w:t>`)
    .join("<w:br/>");
}

/**
 * 표 칸(<w:tc>) 하나에 글자를 넣는다.
 *  - replace: 칸 안의 기존 글자를 지우고 새로 쓴다
 *  - append : 인쇄된 문구는 두고 그 아래에 문단을 하나 더 붙인다
 * 문단(<w:p>)의 서식(<w:pPr>)은 원본 것을 그대로 물려받는다 — 글꼴·정렬이 안 튄다.
 */
function fillCell(cellXml: string, value: string, append: boolean): string {
  const runXml = `<w:r>${xmlText(value)}</w:r>`;

  if (append) {
    // 마지막 문단을 복제해 서식을 물려받고, 안의 run 만 새 것으로 바꾼다.
    const paras = [...cellXml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)];
    const last = paras.length ? paras[paras.length - 1][0] : "<w:p></w:p>";
    const pPr = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(last)?.[0] || "";
    const newPara = `<w:p>${pPr}${runXml}</w:p>`;
    return cellXml.replace(/<\/w:tc>$/, `${newPara}</w:tc>`);
  }

  // 첫 문단만 남기고 그 안의 run 을 새 것으로 갈아끼운다. 나머지 문단은 지운다.
  const paras = [...cellXml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)];
  if (!paras.length) return cellXml.replace(/<\/w:tc>$/, `<w:p>${runXml}</w:p></w:tc>`);
  const first = paras[0][0];
  const pPr = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(first)?.[0] || "";
  const rebuilt = `<w:p>${pPr}${runXml}</w:p>`;
  // 칸 안의 «모든» 문단을 이 하나로 바꾼다(<w:tcPr> 같은 칸 설정은 건드리지 않는다).
  const head = cellXml.slice(0, paras[0].index);
  return `${head}${rebuilt}</w:tc>`;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

  const form = findForm(String(body?.hospital || ""));
  if (!form) return Response.json({ ok: false, error: "unknown_hospital" }, { status: 400 });
  const values = body?.values && typeof body.values === "object" ? body.values : {};

  try {
    // 원본 양식은 저장소에 둔다 — 빈 양식이라 개인정보가 없다.
    const src = path.join(process.cwd(), "src", "assets", "hospital-forms", form.file);
    const zip = await JSZip.loadAsync(await readFile(src));
    const docFile = zip.file("word/document.xml");
    if (!docFile) return Response.json({ ok: false, error: "bad_template" }, { status: 500 });
    let xml = await docFile.async("string");

    // 칸을 «뒤에서부터» 채운다 — 앞에서부터 바꾸면 뒤쪽 칸의 위치가 밀린다.
    const cells = [...xml.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)];
    const jobs = form.rows
      .map((r: any) => ({ ...r, value: String(values[r.field] ?? "").trim() }))
      .filter((r: any) => r.value && Number.isInteger(r.cell) && cells[r.cell])
      .sort((a: any, b: any) => b.cell - a.cell);

    for (const job of jobs) {
      const m = cells[job.cell];
      const filled = fillCell(m[0], job.value, job.append === true);
      xml = xml.slice(0, m.index) + filled + xml.slice(m.index! + m[0].length);
    }

    zip.file("word/document.xml", xml);
    const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    // 파일 이름은 «환자 이름 + 병원». 한글이 들어가므로 RFC 5987 로 붙인다.
    const who = String(values.patientName || `문의${rawId}`).replace(/[^\w가-힣 .-]/g, "").slice(0, 40) || `문의${rawId}`;
    // 어느 말로 만든 것인지 이름에 붙인다 — 한 병원에 한글판·영문판을 같이 만들면
    // 파일 이름이 같아 나중에 어느 것인지 못 가린다(2026-09-04 PO: 두 벌 만들게 해달라).
    const langTag = body?.lang === "en" ? "영문" : body?.lang === "raw" ? "원문" : "한글";
    const fname = `${who}_${form.name.ko.replace(/[^\w가-힣]/g, "")}_의뢰서_${langTag}.docx`;
    console.info(`[referral-docx] #${rawId} ${form.id} by ${auth.email || auth.userId}`);

    return new Response(new Uint8Array(out), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": contentDisposition(fname),
        "cache-control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[referral-docx] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
