/**
 * 백오피스 「의료진·지점」(/admin/doctors) 이 읽는 두 표를 채운다:
 *   partner_branches (지점 4곳) · partner_doctors (의료진 28명)
 *
 * 명단은 **단일 원본** src/lib/data/immuneDoctors.js 에서 가져온다 — 여기에 다시 베끼지 마라.
 * (2026-08-18 실측: 이 파일이 옛 명단 19명을 따로 들고 있었고, 그중 9명은 이미 병원에 없는
 *  사람이었다. 돌렸으면 백오피스가 통째로 옛 명단으로 채워졌을 것이다.)
 *
 * 여러 번 돌려도 안전하다(지점은 branch_code, 의료진은 지점+이름으로 덮어쓴다).
 *
 * 실행:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-partner-doctors.mjs
 */

import { createClient } from "@supabase/supabase-js";
import {
  IMMUNE_DOCTOR_ROSTER,
  IMMUNE_BRANCH_META,
  IMMUNE_BRANCH_CODES,
} from "../src/lib/data/immuneDoctors.js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_KEY 가 없다");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const pick = (obj, lang) => (obj && (obj[lang] || obj.ko || obj.en)) || null;

async function seed() {
  console.log("면력 지점·의료진 채우기 시작\n");

  // 1) 지점
  const branchIdMap = {};
  for (const code of IMMUNE_BRANCH_CODES) {
    const meta = IMMUNE_BRANCH_META[code];
    const row = {
      branch_code: meta.code,
      name_ko: meta.name.ko,
      name_en: meta.name.en,
      address_ko: meta.address.ko,
      address_en: meta.address.en,
      phone: meta.tel,
      status: "registered",
      display_order: meta.order,
    };
    const { data, error } = await supabase
      .from("partner_branches")
      .upsert(row, { onConflict: "branch_code" })
      .select("id, branch_code")
      .single();

    if (error) {
      console.error(`  지점 "${meta.name.ko}" 실패:`, error.message);
      continue;
    }
    branchIdMap[code] = data.id;
    console.log(`  지점 ${meta.name.ko} → ${data.id}`);
  }

  // 2) 의료진 — 지점 안에서 이름이 같으면 갱신, 없으면 추가
  let inserted = 0;
  let updated = 0;
  for (const [i, doc] of IMMUNE_DOCTOR_ROSTER.entries()) {
    const branchId = branchIdMap[doc.branch];
    if (!branchId) {
      console.error(`  ${doc.name.ko}: 지점 "${doc.branch}" 없음 — 건너뜀`);
      continue;
    }

    const record = {
      branch_id: branchId,
      name_ko: doc.name.ko,
      name_en: doc.name.en || null,
      position_ko: doc.position?.ko || null,
      position_en: doc.position?.en || null,
      photo_url: doc.photo || null,
      listing_photo_url: doc.thumb || doc.photo || null,
      subspecialty: doc.subspecialty?.ko || null,
      career: pick(doc["경력"], "ko") || [],
      education: pick(doc["학력"], "ko") || [],
      activities: pick(doc["활동"], "ko") || [],
      publications: pick(doc["논문"], "ko") || [],
      keywords: pick(doc.keywords, "ko") || [],
      i18n: {
        en: { name: doc.name.en || null, position: doc.position?.en || null, subspecialty: doc.subspecialty?.en || null },
      },
      display_order: i,
      is_active: true,
    };

    const { data: existing } = await supabase
      .from("partner_doctors")
      .select("id")
      .eq("branch_id", branchId)
      .eq("name_ko", doc.name.ko)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from("partner_doctors").update(record).eq("id", existing.id)
      : await supabase.from("partner_doctors").insert(record);

    if (error) {
      console.error(`  ${doc.name.ko} 실패:`, error.message);
    } else {
      existing ? updated++ : inserted++;
      console.log(`  ${doc.name.ko} (${doc.branch}) ${existing ? "갱신" : "추가"}`);
    }
  }

  console.log(`\n끝. 추가 ${inserted}명 · 갱신 ${updated}명 / 명단 ${IMMUNE_DOCTOR_ROSTER.length}명`);
  console.log("⚠️ 병원 사이트에서 사라진 사람은 여기서 자동으로 안 지워진다 — 백오피스에서 「비활성」으로 돌려라.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
