import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TREATMENT_I18N = {
  "wellness-detox-body-rebalance": {
    en: {
      name: "Wellness Detox & Body Rebalance",
      description: "A Korean Medicine wellness program combining constitutional diagnosis, herbal detox formulas, and therapeutic treatments to cleanse, rebalance, and revitalize your body.",
      tags: ["Korean Medicine", "Wellness", "Detox", "Acupuncture", "Anti-Aging"],
    },
    ko: {
      name: "웰니스 디톡스 & 체질 리밸런스",
      description: "사상체질 진단을 기반으로 한약 디톡스, 침술, 부항 등 한방 치료를 결합하여 체내 독소를 배출하고 체질 균형을 회복시키는 웰니스 프로그램입니다.",
      tags: ["한방", "웰니스", "디톡스", "침술", "항노화"],
    },
    zh: {
      name: "健康排毒与体质调理",
      description: "融合四象体质诊断、草药排毒配方和治疗手段的韩方健康项目，帮助清除体内毒素、恢复体质平衡、焕发身体活力。",
      tags: ["韩方医学", "健康", "排毒", "针灸", "抗衰老"],
    },
    ja: {
      name: "ウェルネスデトックス＆体質リバランス",
      description: "四象体質診断をベースに、漢方デトックス処方と治療法を組み合わせ、体内の毒素を排出し体質のバランスを回復させるウェルネスプログラムです。",
      tags: ["韓方医学", "ウェルネス", "デトックス", "鍼灸", "アンチエイジング"],
    },
  },
  "anti-aging-herbal-therapy": {
    en: {
      name: "Anti-Aging Herbal Therapy",
      description: "Premium Korean Medicine anti-aging program using traditional herbal formulas, facial acupuncture, and holistic rejuvenation techniques for natural, lasting results.",
      tags: ["Korean Medicine", "Anti-Aging", "Herbal Medicine", "Acupuncture", "Wellness"],
    },
    ko: {
      name: "항노화 한약 치료",
      description: "경옥고, 공진단 등 프리미엄 한약 처방과 미용침, 경락 마사지를 결합한 한방 항노화 프로그램으로, 자연스럽고 지속적인 효과를 제공합니다.",
      tags: ["한방", "항노화", "한약", "침술", "웰니스"],
    },
    zh: {
      name: "抗衰老草药疗法",
      description: "使用经玉膏、拱辰丹等高端传统草药配方，结合美容针灸和全面养生技术的韩方抗衰老项目，带来自然持久的效果。",
      tags: ["韩方医学", "抗衰老", "草药", "针灸", "健康"],
    },
    ja: {
      name: "アンチエイジング漢方療法",
      description: "瓊玉膏、拱辰丹などのプレミアム漢方処方と美容鍼、経絡マッサージを組み合わせた韓方アンチエイジングプログラム。自然で持続的な若返り効果を実現します。",
      tags: ["韓方医学", "アンチエイジング", "漢方薬", "鍼灸", "ウェルネス"],
    },
  },
  "pediatric-growth-immune-program": {
    en: {
      name: "Pediatric Growth & Immune Program",
      description: "Specialized Korean Medicine program for children focusing on natural growth stimulation, immune system strengthening, and overall developmental health.",
      tags: ["Korean Medicine", "Pediatric", "Growth Therapy", "Immune Therapy", "Children's Health"],
    },
    ko: {
      name: "소아 성장 & 면역 프로그램",
      description: "한방 소아과 전문 프로그램으로 자연적인 성장 촉진, 면역력 강화, 전반적인 발달 건강을 위한 맞춤형 한방 치료를 제공합니다.",
      tags: ["한방", "소아과", "성장치료", "면역치료", "어린이건강"],
    },
    zh: {
      name: "儿童成长与免疫计划",
      description: "专为儿童设计的韩方医学项目，专注于自然促进生长发育、增强免疫系统和全面发育健康。",
      tags: ["韩方医学", "儿科", "成长治疗", "免疫治疗", "儿童健康"],
    },
    ja: {
      name: "小児成長＆免疫プログラム",
      description: "自然な成長促進、免疫力強化、全般的な発達をサポートする小児専門韓方プログラムです。",
      tags: ["韓方医学", "小児科", "成長治療", "免疫治療", "子どもの健康"],
    },
  },
};

async function main() {
  console.log("=== Fixing Remaining Treatment i18n ===\n");

  for (const [slug, i18n] of Object.entries(TREATMENT_I18N)) {
    const { data: t } = await supabase
      .from("treatments")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!t) {
      console.log(`  Not found: ${slug}`);
      continue;
    }

    const { error } = await supabase
      .from("treatments")
      .update({ i18n })
      .eq("id", t.id);

    if (error) {
      console.error(`  Update failed for ${slug}:`, error.message);
    } else {
      console.log(`  Updated: ${slug}`);
    }
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
