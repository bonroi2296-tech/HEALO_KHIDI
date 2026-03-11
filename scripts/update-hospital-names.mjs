/**
 * Update Myeonryeok hospital names to Immunehospital
 * and apply multilingual translations.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const UPDATES = [
  {
    old_slug: "myeonryeok-magok",
    new_slug: "immunehospital-magok",
    name: "Immunehospital Korean Medicine (Magok HQ)",
    description: "Immunehospital (면력한방병원) is a leading Korean traditional medicine institution specializing in immune system enhancement, women's health, and pediatric care. With a team of 6 licensed Korean Medicine doctors, Immunehospital combines centuries-old herbal medicine wisdom with modern diagnostics to deliver personalized treatment plans. The hospital is renowned for its proprietary immune-boosting protocols using premium herbal formulas, acupuncture, and pharmacopuncture.",
    i18n: {
      en: {
        name: "Immunehospital Korean Medicine (Magok HQ)",
        description: "Immunehospital is a leading Korean traditional medicine institution specializing in immune system enhancement, women's health, and pediatric care. With 6 licensed Korean Medicine doctors, it combines centuries-old herbal wisdom with modern diagnostics.",
        location: "93 Magok Jungang 6-ro, Gangseo-gu, Seoul",
        tags: ["Korean Medicine", "Immune Therapy", "Women's Health", "Pediatric", "Acupuncture", "Herbal Medicine", "Seoul"],
        specialties: ["Korean Medicine OB/GYN", "Korean Medicine Pediatrics", "Immune Enhancement", "Acupuncture", "Herbal Medicine"],
      },
      ko: {
        name: "면력한방병원 (마곡본점)",
        description: "면력한방병원은 면역력 강화, 여성건강, 소아청소년 진료를 전문으로 하는 한방의료기관입니다. 6명의 한의사가 전통 한방의학과 현대 진단 기술을 결합하여 맞춤형 치료 계획을 제공합니다. 프리미엄 한약, 침술, 약침을 활용한 독자적인 면역 강화 프로토콜로 잘 알려져 있습니다.",
        location: "서울특별시 강서구 마곡중앙6로 93, 열린프라자 6,7,10층",
        tags: ["한방", "면역치료", "여성건강", "소아과", "침술", "한약", "서울"],
        specialties: ["한방부인과", "한방소아과", "면역강화", "침술", "한약"],
      },
      zh: {
        name: "Immunehospital 韩方医院（麻谷总院）",
        description: "Immunehospital（面力韩方医院）是韩国领先的传统韩医疗机构，专注于免疫系统增强、女性健康和儿科护理。6位持证韩医师将千年草药智慧与现代诊断技术相结合，提供个性化治疗方案。",
        location: "首尔特别市江西区麻谷中央6路93号",
        tags: ["韩方医学", "免疫治疗", "女性健康", "儿科", "针灸", "草药", "首尔"],
        specialties: ["韩方妇科", "韩方儿科", "免疫增强", "针灸", "草药"],
      },
      ja: {
        name: "Immunehospital 韓方病院（麻谷本院）",
        description: "Immunehospital（ミョンリョク韓方病院）は免疫力強化、女性の健康、小児科を専門とする韓国の伝統韓方医療機関です。6名の韓方医師が伝統的な漢方の知恵と最新の診断技術を組み合わせ、オーダーメイドの治療プランを提供しています。",
        location: "ソウル特別市江西区麻谷中央6路93番地",
        tags: ["韓方医学", "免疫治療", "女性の健康", "小児科", "鍼灸", "漢方薬", "ソウル"],
        specialties: ["韓方婦人科", "韓方小児科", "免疫強化", "鍼灸", "漢方薬"],
      },
    },
  },
  {
    old_slug: "myeonryeok-sinchon",
    new_slug: "immunehospital-sinchon",
    name: "Immunehospital Sinchon Branch",
    description: "Immunehospital Sinchon Branch (신촌 면력한방병원) brings the same trusted immune-focused Korean Medicine care to the vibrant Sinchon area. Conveniently located near Sinchon Station, the clinic specializes in women's health programs including fertility support, postpartum recovery, and menstrual health management.",
    i18n: {
      en: {
        name: "Immunehospital Sinchon Branch",
        description: "Immunehospital Sinchon Branch brings trusted immune-focused Korean Medicine care to the vibrant Sinchon area. Conveniently located near Sinchon Station, it specializes in women's health, fertility support, and postpartum recovery.",
        location: "19 Sinchon Station-ro, Seodaemun-gu, Seoul",
        tags: ["Korean Medicine", "Immune Therapy", "Women's Health", "Fertility", "Postpartum Care", "Seoul"],
        specialties: ["Korean Medicine OB/GYN", "Fertility Support", "Postpartum Recovery"],
      },
      ko: {
        name: "신촌 면력한방병원",
        description: "신촌 면력한방병원은 면역 중심의 한방 진료를 신촌 지역에 제공합니다. 신촌역 인근에 위치하여 접근성이 뛰어나며, 난임 지원, 산후조리, 월경건강 관리 등 여성건강 프로그램을 전문으로 합니다.",
        location: "서울특별시 서대문구 신촌역로 19",
        tags: ["한방", "면역치료", "여성건강", "난임", "산후조리", "서울"],
        specialties: ["한방부인과", "난임지원", "산후조리"],
      },
      zh: {
        name: "Immunehospital 新村分院",
        description: "Immunehospital新村分院将值得信赖的免疫韩方医疗服务带到充满活力的新村地区。毗邻新村站，专注于女性健康项目，包括助孕、产后恢复和月经健康管理。",
        location: "首尔特别市西大门区新村站路19号",
        tags: ["韩方医学", "免疫治疗", "女性健康", "助孕", "产后护理", "首尔"],
        specialties: ["韩方妇科", "助孕支持", "产后恢复"],
      },
      ja: {
        name: "Immunehospital 新村院",
        description: "Immunehospital新村院は、信頼の免疫韓方医療を活気ある新村エリアで提供しています。新村駅近くに位置し、不妊支援、産後ケア、月経健康管理など女性の健康プログラムを専門としています。",
        location: "ソウル特別市西大門区新村駅路19番地",
        tags: ["韓方医学", "免疫治療", "女性の健康", "不妊治療", "産後ケア", "ソウル"],
        specialties: ["韓方婦人科", "不妊支援", "産後ケア"],
      },
    },
  },
  {
    old_slug: "myeonryeok-gwangmyeong",
    new_slug: "immunehospital-gwangmyeong",
    name: "Immunehospital Gwangmyeong Branch",
    description: "Immunehospital Gwangmyeong Branch (광명 면력한방병원) extends the Immunehospital group's expertise to the Gyeonggi-do region. Specializing in pediatric Korean Medicine and family wellness programs, the hospital offers a warm, family-friendly environment for comprehensive traditional Korean medical care.",
    i18n: {
      en: {
        name: "Immunehospital Gwangmyeong Branch",
        description: "Immunehospital Gwangmyeong Branch extends the group's expertise to the Gyeonggi-do region. Specializing in pediatric Korean Medicine and family wellness, it offers comprehensive traditional Korean medical care in a family-friendly environment.",
        location: "10 Cheolsan-ro, Gwangmyeong-si, Gyeonggi-do",
        tags: ["Korean Medicine", "Immune Therapy", "Pediatric", "Family Wellness", "Gyeonggi-do"],
        specialties: ["Korean Medicine Pediatrics", "Family Wellness", "Growth Therapy"],
      },
      ko: {
        name: "광명 면력한방병원",
        description: "광명 면력한방병원은 면력한방병원 그룹의 전문성을 경기도 지역으로 확대합니다. 소아한방과 가족 웰니스 프로그램을 전문으로 하며, 따뜻하고 가족 친화적인 환경에서 종합 한방의료를 제공합니다.",
        location: "경기도 광명시 철산로 10",
        tags: ["한방", "면역치료", "소아과", "가족건강", "경기도"],
        specialties: ["한방소아과", "가족건강", "성장치료"],
      },
      zh: {
        name: "Immunehospital 光明分院",
        description: "Immunehospital光明分院将集团专业技术扩展至京畿道地区。专注于儿童韩方医学和家庭健康项目，在温馨的家庭友好环境中提供全面的传统韩医服务。",
        location: "京畿道光明市铁山路10号",
        tags: ["韩方医学", "免疫治疗", "儿科", "家庭健康", "京畿道"],
        specialties: ["韩方儿科", "家庭健康", "成长治疗"],
      },
      ja: {
        name: "Immunehospital 光明院",
        description: "Immunehospital光明院はグループの専門知識を京畿道地域に拡大しています。小児韓方医学と家族ウェルネスプログラムを専門とし、家族に優しい環境で包括的な伝統韓方医療を提供しています。",
        location: "京畿道光明市鉄山路10番地",
        tags: ["韓方医学", "免疫治療", "小児科", "家族健康", "京畿道"],
        specialties: ["韓方小児科", "家族ウェルネス", "成長治療"],
      },
    },
  },
];

async function main() {
  console.log("=== Updating Hospital Names & i18n ===\n");

  // 1. Delete newly created duplicates (with new slugs but no treatments)
  for (const u of UPDATES) {
    const { data: dup } = await supabase
      .from("hospitals")
      .select("id")
      .eq("slug", u.new_slug)
      .maybeSingle();
    if (dup) {
      await supabase.from("hospitals").delete().eq("id", dup.id);
      console.log(`  Deleted duplicate: ${u.new_slug} (${dup.id})`);
    }
  }

  // 2. Update originals by old slug
  for (const u of UPDATES) {
    const { data: existing } = await supabase
      .from("hospitals")
      .select("id")
      .eq("slug", u.old_slug)
      .maybeSingle();

    if (!existing) {
      console.log(`  Not found: ${u.old_slug}, skipping`);
      continue;
    }

    const { error } = await supabase
      .from("hospitals")
      .update({
        name: u.name,
        slug: u.new_slug,
        description: u.description,
        i18n: u.i18n,
      })
      .eq("id", existing.id);

    if (error) {
      console.error(`  Update failed for ${u.old_slug}:`, error.message);
    } else {
      console.log(`  Updated: ${u.old_slug} -> ${u.new_slug} (${existing.id})`);
    }
  }

  // 3. Also update treatments i18n for linked treatments
  console.log("\n=== Updating Treatment i18n ===\n");
  const { data: treatments } = await supabase
    .from("treatments")
    .select("id,slug,name,description,tags")
    .ilike("name", "%Program%")
    .or("tags.cs.{\"Korean Medicine\"}");

  const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

  const SYS = `You are a medical translation assistant for HEALO, a medical tourism platform.
Translate hospital/treatment data to Korean (ko), Chinese Simplified (zh), and Japanese (ja).
The hospital brand "Immunehospital" should remain as "Immunehospital" in English, "면력한방병원" in Korean, "Immunehospital韩方医院" in Chinese, and "Immunehospital韓方病院" in Japanese.
Return ONLY valid JSON: { "ko": {...}, "zh": {...}, "ja": {...} }`;

  for (const t of treatments || []) {
    const input = {};
    if (t.name) input.name = t.name;
    if (t.description) input.description = t.description;
    if (t.tags?.length) input.tags = t.tags;

    console.log(`  Translating: ${t.name}`);
    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYS }] },
          contents: [{ parts: [{ text: `Translate to ko, zh, ja:\n${JSON.stringify(input)}` }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      });
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      let parsed;
      try { parsed = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error("JSON parse failed"); }

      const i18n = { en: input, ...parsed };
      const { error } = await supabase.from("treatments").update({ i18n }).eq("id", t.id);
      if (error) console.error(`    DB error: ${error.message}`);
      else console.log(`    OK`);
    } catch (e) {
      console.error(`    Translation failed: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
