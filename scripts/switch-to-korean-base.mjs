/**
 * Switch DB base language to Korean for all Immune Hospital data.
 * - name, description columns → Korean
 * - i18n JSONB → all 4 languages (ko, en, zh, ja) optimized
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HOSPITALS = [
  {
    slug: "immunehospital-magok",
    name: "면력한방병원 (마곡본점)",
    description: "면력한방병원은 면역력 강화, 여성건강, 소아청소년 진료를 전문으로 하는 한방의료기관입니다. 6명의 한의사가 전통 한방의학과 현대 진단 기술을 결합하여 맞춤형 치료 계획을 제공합니다. 프리미엄 한약, 침술, 약침을 활용한 독자적인 면역 강화 프로토콜로 잘 알려져 있습니다.",
    location_kr: "서울특별시 강서구 마곡중앙6로 93, 열린프라자 6,7,10층",
    tags: ["한방", "면역치료", "여성건강", "소아과", "침술", "한약", "서울"],
    specialties: ["한방부인과", "한방소아과", "면역강화", "침술", "한약"],
    i18n: {
      ko: {
        name: "면력한방병원 (마곡본점)",
        description: "면역력 강화, 여성건강, 소아청소년 진료 전문 한방의료기관. 6명의 한의사가 전통 한방의학과 현대 진단을 결합한 맞춤형 치료를 제공합니다.",
        location: "서울특별시 강서구 마곡중앙6로 93",
        tags: ["한방", "면역치료", "여성건강", "소아과", "침술", "한약", "서울"],
        specialties: ["한방부인과", "한방소아과", "면역강화", "침술", "한약"],
      },
      en: {
        name: "Immune Hospital Korean Medicine (Magok HQ)",
        description: "Immune Hospital is a leading Korean traditional medicine institution specializing in immune enhancement, women's health, and pediatric care. Our team of 6 licensed Korean Medicine doctors combines centuries-old herbal wisdom with modern diagnostics.",
        location: "93 Magok Jungang 6-ro, Gangseo-gu, Seoul",
        tags: ["Korean Medicine", "Immune Therapy", "Women's Health", "Pediatric", "Acupuncture", "Herbal Medicine", "Seoul"],
        specialties: ["Korean Medicine OB/GYN", "Korean Medicine Pediatrics", "Immune Enhancement", "Acupuncture", "Herbal Medicine"],
      },
      zh: {
        name: "Immune Hospital 韩方医院（麻谷总院）",
        description: "Immune Hospital是韩国领先的传统韩医疗机构，专注于免疫增强、女性健康和儿科诊疗。6位持证韩医师将千年草药智慧与现代诊断技术相结合，提供个性化治疗方案。",
        location: "首尔特别市江西区麻谷中央6路93号",
        tags: ["韩方医学", "免疫治疗", "女性健康", "儿科", "针灸", "草药", "首尔"],
        specialties: ["韩方妇科", "韩方儿科", "免疫增强", "针灸", "草药"],
      },
      ja: {
        name: "Immune Hospital 韓方病院（麻谷本院）",
        description: "Immune Hospitalは免疫力強化・女性の健康・小児科を専門とする韓国の伝統韓方医療機関です。6名の韓方医師が伝統漢方の知恵と最新の診断技術を融合し、オーダーメイド治療を提供しています。",
        location: "ソウル特別市江西区麻谷中央6路93番地",
        tags: ["韓方医学", "免疫治療", "女性の健康", "小児科", "鍼灸", "漢方薬", "ソウル"],
        specialties: ["韓方婦人科", "韓方小児科", "免疫強化", "鍼灸", "漢方薬"],
      },
    },
  },
  {
    slug: "immunehospital-sinchon",
    name: "면력한방병원 신촌점",
    description: "면력한방병원 신촌점은 면역 중심 한방 진료를 신촌 지역에 제공합니다. 신촌역 인근의 편리한 위치에서 난임 지원, 산후조리, 월경건강 관리 등 여성건강 프로그램을 전문으로 합니다.",
    location_kr: "서울특별시 서대문구 신촌역로 19",
    tags: ["한방", "면역치료", "여성건강", "난임", "산후조리", "서울"],
    specialties: ["한방부인과", "한방소아과", "난임지원", "산후조리"],
    i18n: {
      ko: {
        name: "면력한방병원 신촌점",
        description: "면역 중심 한방 진료를 신촌 지역에 제공. 난임 지원, 산후조리, 월경건강 관리 등 여성건강 프로그램 전문.",
        location: "서울특별시 서대문구 신촌역로 19",
        tags: ["한방", "면역치료", "여성건강", "난임", "산후조리", "서울"],
        specialties: ["한방부인과", "난임지원", "산후조리"],
      },
      en: {
        name: "Immune Hospital Sinchon",
        description: "Immune Hospital Sinchon brings trusted immune-focused Korean Medicine care to central Seoul. Located near Sinchon Station, we specialize in women's health including fertility support, postpartum recovery, and menstrual wellness.",
        location: "19 Sinchon Station-ro, Seodaemun-gu, Seoul",
        tags: ["Korean Medicine", "Immune Therapy", "Women's Health", "Fertility", "Postpartum Care", "Seoul"],
        specialties: ["Korean Medicine OB/GYN", "Fertility Support", "Postpartum Recovery"],
      },
      zh: {
        name: "Immune Hospital 新村店",
        description: "Immune Hospital新村店将免疫韩方医疗服务带到首尔中心区域。毗邻新村站，专注于助孕、产后恢复和月经健康管理等女性健康项目。",
        location: "首尔特别市西大门区新村站路19号",
        tags: ["韩方医学", "免疫治疗", "女性健康", "助孕", "产后护理", "首尔"],
        specialties: ["韩方妇科", "助孕支持", "产后恢复"],
      },
      ja: {
        name: "Immune Hospital 新村店",
        description: "Immune Hospital新村店は、ソウル中心部で信頼の免疫韓方医療を提供。新村駅近くに位置し、不妊支援・産後ケア・月経健康管理など女性の健康プログラムを専門としています。",
        location: "ソウル特別市西大門区新村駅路19番地",
        tags: ["韓方医学", "免疫治療", "女性の健康", "不妊治療", "産後ケア", "ソウル"],
        specialties: ["韓方婦人科", "不妊支援", "産後ケア"],
      },
    },
  },
  {
    slug: "immunehospital-gwangmyeong",
    name: "면력한방병원 광명점",
    description: "면력한방병원 광명점은 소아한방과 가족 웰니스 프로그램을 전문으로 하며, 따뜻하고 가족 친화적인 환경에서 종합 한방의료를 제공합니다.",
    location_kr: "경기도 광명시 철산로 10",
    tags: ["한방", "면역치료", "소아과", "가족건강", "경기도"],
    specialties: ["한방소아과", "한방부인과", "가족건강", "성장치료"],
    i18n: {
      ko: {
        name: "면력한방병원 광명점",
        description: "소아한방과 가족 웰니스 전문. 따뜻하고 가족 친화적인 환경에서 종합 한방의료를 제공합니다.",
        location: "경기도 광명시 철산로 10",
        tags: ["한방", "면역치료", "소아과", "가족건강", "경기도"],
        specialties: ["한방소아과", "가족건강", "성장치료"],
      },
      en: {
        name: "Immune Hospital Gwangmyeong",
        description: "Immune Hospital Gwangmyeong specializes in pediatric Korean Medicine and family wellness programs, offering comprehensive traditional care in a warm, family-friendly environment.",
        location: "10 Cheolsan-ro, Gwangmyeong-si, Gyeonggi-do",
        tags: ["Korean Medicine", "Immune Therapy", "Pediatric", "Family Wellness", "Gyeonggi-do"],
        specialties: ["Korean Medicine Pediatrics", "Family Wellness", "Growth Therapy"],
      },
      zh: {
        name: "Immune Hospital 光明店",
        description: "Immune Hospital光明店专注于儿童韩方医学和家庭健康项目，在温馨的家庭友好环境中提供全面传统韩医服务。",
        location: "京畿道光明市铁山路10号",
        tags: ["韩方医学", "免疫治疗", "儿科", "家庭健康", "京畿道"],
        specialties: ["韩方儿科", "家庭健康", "成长治疗"],
      },
      ja: {
        name: "Immune Hospital 光明店",
        description: "Immune Hospital光明店は小児韓方と家族ウェルネスを専門とし、家族に優しい環境で包括的な韓方医療を提供しています。",
        location: "京畿道光明市鉄山路10番地",
        tags: ["韓方医学", "免疫治療", "小児科", "家族健康", "京畿道"],
        specialties: ["韓方小児科", "家族ウェルネス", "成長治療"],
      },
    },
  },
];

const TREATMENTS = [
  {
    slug: "immune-boost-program",
    name: "면역강화 프로그램",
    description: "프리미엄 한약 처방, 침술, 약침을 결합한 종합 면역 강화 프로그램으로 신체의 자연 방어력을 강화합니다.",
    i18n: {
      ko: {
        name: "면역강화 프로그램",
        description: "프리미엄 한약, 침술, 약침을 결합한 종합 면역 강화 프로그램. 사상체질 진단을 통한 맞춤형 치료로 자연 면역력을 높입니다.",
        tags: ["한방", "면역치료", "한약", "침술", "웰니스"],
      },
      en: {
        name: "Immune Boost Program",
        description: "A comprehensive immune enhancement program combining premium herbal formulas, acupuncture, and pharmacopuncture to strengthen your body's natural defense system.",
        tags: ["Korean Medicine", "Immune Therapy", "Herbal Medicine", "Acupuncture", "Wellness"],
      },
      zh: {
        name: "免疫增强计划",
        description: "结合高端草药配方、针灸和药针的综合免疫增强项目，强化身体的自然防御系统。",
        tags: ["韩方医学", "免疫治疗", "草药", "针灸", "健康"],
      },
      ja: {
        name: "免疫強化プログラム",
        description: "プレミアム漢方処方・鍼灸・薬鍼を組み合わせた総合免疫強化プログラム。体の自然な防御力を高めます。",
        tags: ["韓方医学", "免疫治療", "漢方薬", "鍼灸", "ウェルネス"],
      },
    },
  },
  {
    slug: "postpartum-recovery-program",
    name: "산후조리 프로그램",
    description: "한약, 침술, 특화된 산후 회복 프로토콜을 결합한 전통 한방 산후조리로 출산 후 산모의 건강을 회복시킵니다.",
    i18n: {
      ko: {
        name: "산후조리 프로그램",
        description: "전통 한방 산후조리 프로그램. 산후한약, 침술, 좌훈 등을 통해 자궁 회복, 호르몬 균형, 체력 회복을 돕습니다.",
        tags: ["한방", "산후조리", "여성건강", "한약", "출산 후 회복"],
      },
      en: {
        name: "Postpartum Recovery Program",
        description: "Traditional Korean postpartum care combining herbal medicine, acupuncture, and specialized recovery protocols to restore maternal health after childbirth.",
        tags: ["Korean Medicine", "Postpartum Care", "Women's Health", "Herbal Medicine", "Recovery"],
      },
      zh: {
        name: "产后恢复计划",
        description: "传统韩方产后护理项目，结合草药、针灸和专业恢复方案，帮助产后妈妈恢复健康。",
        tags: ["韩方医学", "产后护理", "女性健康", "草药", "恢复"],
      },
      ja: {
        name: "産後回復プログラム",
        description: "漢方薬・鍼灸・専門的な回復プロトコルを組み合わせた伝統的な韓方産後ケアプログラム。出産後の母体の健康回復をサポートします。",
        tags: ["韓方医学", "産後ケア", "女性の健康", "漢方薬", "回復"],
      },
    },
  },
  {
    slug: "fertility-support-program",
    name: "난임지원 프로그램",
    description: "한약, 침술, 생활습관 최적화를 통해 자연적으로 생식건강을 개선하는 한방 난임 지원 프로그램입니다.",
    i18n: {
      ko: {
        name: "난임지원 프로그램",
        description: "한약, 침술, 생활습관 관리를 통해 자연적인 생식건강 개선. 시험관(IVF) 병행 치료도 가능합니다.",
        tags: ["한방", "난임", "여성건강", "한약", "침술"],
      },
      en: {
        name: "Fertility Support Program",
        description: "Korean Medicine fertility enhancement using herbal medicine, acupuncture, and lifestyle optimization to naturally improve reproductive health. Can complement IVF/IUI treatments.",
        tags: ["Korean Medicine", "Fertility", "Women's Health", "Herbal Medicine", "Acupuncture"],
      },
      zh: {
        name: "助孕支持计划",
        description: "通过草药、针灸和生活方式优化自然改善生殖健康的韩方助孕项目。可与试管婴儿（IVF）治疗配合使用。",
        tags: ["韩方医学", "助孕", "女性健康", "草药", "针灸"],
      },
      ja: {
        name: "不妊治療支援プログラム",
        description: "漢方薬・鍼灸・生活習慣の最適化により、自然に生殖機能を改善する韓方不妊支援プログラム。体外受精（IVF）との併用も可能です。",
        tags: ["韓方医学", "不妊治療", "女性の健康", "漢方薬", "鍼灸"],
      },
    },
  },
  {
    slug: "wellness-detox-body-rebalance",
    name: "웰니스 디톡스 & 체질 리밸런스",
    description: "사상체질 진단, 한약 디톡스, 침술을 결합한 한방 웰니스 프로그램으로 체내 독소를 배출하고 체질 균형을 회복합니다.",
    i18n: {
      ko: {
        name: "웰니스 디톡스 & 체질 리밸런스",
        description: "사상체질 진단 기반 한약 디톡스, 침술, 부항을 통한 체질 개선 프로그램. 만성피로, 소화불량, 체중관리에 효과적입니다.",
        tags: ["한방", "웰니스", "디톡스", "침술", "항노화"],
      },
      en: {
        name: "Wellness Detox & Body Rebalance",
        description: "A Korean Medicine wellness program combining Sasang constitutional diagnosis, herbal detox formulas, and therapeutic treatments to cleanse and revitalize your body.",
        tags: ["Korean Medicine", "Wellness", "Detox", "Acupuncture", "Anti-Aging"],
      },
      zh: {
        name: "健康排毒与体质调理",
        description: "融合四象体质诊断、草药排毒和治疗手段的韩方健康项目，帮助排除体内毒素、恢复体质平衡。",
        tags: ["韩方医学", "健康", "排毒", "针灸", "抗衰老"],
      },
      ja: {
        name: "ウェルネスデトックス＆体質リバランス",
        description: "四象体質診断に基づく漢方デトックスと治療法で、体内毒素の排出と体質バランスの回復をサポートするウェルネスプログラムです。",
        tags: ["韓方医学", "ウェルネス", "デトックス", "鍼灸", "アンチエイジング"],
      },
    },
  },
  {
    slug: "pediatric-growth-immune-program",
    name: "소아 성장 & 면역 프로그램",
    description: "자연적인 성장 촉진, 면역력 강화, 전반적인 발달 건강을 위한 소아 전문 한방 프로그램입니다.",
    i18n: {
      ko: {
        name: "소아 성장 & 면역 프로그램",
        description: "3~15세 어린이를 위한 한방 소아 전문 프로그램. 성장판 자극, 면역력 강화, 비염·아토피 관리 등 맞춤 치료를 제공합니다.",
        tags: ["한방", "소아과", "성장치료", "면역치료", "어린이건강"],
      },
      en: {
        name: "Pediatric Growth & Immune Program",
        description: "Specialized Korean Medicine program for children aged 3-15, focusing on natural growth stimulation, immune strengthening, and developmental health.",
        tags: ["Korean Medicine", "Pediatric", "Growth Therapy", "Immune Therapy", "Children's Health"],
      },
      zh: {
        name: "儿童成长与免疫计划",
        description: "面向3-15岁儿童的韩方专业项目，专注于自然促进生长、增强免疫力和全面发育健康。",
        tags: ["韩方医学", "儿科", "成长治疗", "免疫治疗", "儿童健康"],
      },
      ja: {
        name: "小児成長＆免疫プログラム",
        description: "3〜15歳のお子様向け韓方小児専門プログラム。自然な成長促進、免疫力強化、全般的な発達をサポートします。",
        tags: ["韓方医学", "小児科", "成長治療", "免疫治療", "子どもの健康"],
      },
    },
  },
  {
    slug: "anti-aging-herbal-therapy",
    name: "항노화 한약 치료",
    description: "경옥고, 공진단 등 프리미엄 한약과 미용침, 경락 마사지를 결합한 한방 항노화 프로그램입니다.",
    i18n: {
      ko: {
        name: "항노화 한약 치료",
        description: "경옥고, 공진단 등 프리미엄 한약 처방과 미용침, 경락 마사지를 결합. 자연스럽고 지속적인 항노화 효과를 제공합니다.",
        tags: ["한방", "항노화", "한약", "침술", "웰니스"],
      },
      en: {
        name: "Anti-Aging Herbal Therapy",
        description: "Premium Korean Medicine anti-aging program using traditional herbal formulas (Gyeongokgo, Gongjindan), facial acupuncture, and holistic rejuvenation for natural, lasting results.",
        tags: ["Korean Medicine", "Anti-Aging", "Herbal Medicine", "Acupuncture", "Wellness"],
      },
      zh: {
        name: "抗衰老草药疗法",
        description: "使用经玉膏、拱辰丹等高端传统草药配方，结合美容针灸的韩方抗衰老项目，带来自然持久的年轻效果。",
        tags: ["韩方医学", "抗衰老", "草药", "针灸", "健康"],
      },
      ja: {
        name: "アンチエイジング漢方療法",
        description: "瓊玉膏・拱辰丹などプレミアム漢方処方と美容鍼・経絡マッサージを組み合わせた韓方アンチエイジングプログラム。自然で持続的な若返りを実現します。",
        tags: ["韓方医学", "アンチエイジング", "漢方薬", "鍼灸", "ウェルネス"],
      },
    },
  },
];

async function main() {
  console.log("=== Switching to Korean Base ===\n");

  // Update hospitals
  console.log("--- Hospitals ---");
  for (const h of HOSPITALS) {
    const { data: existing } = await supabase
      .from("hospitals")
      .select("id")
      .eq("slug", h.slug)
      .maybeSingle();

    if (!existing) {
      console.log(`  Not found: ${h.slug}`);
      continue;
    }

    const { error } = await supabase
      .from("hospitals")
      .update({
        name: h.name,
        description: h.description,
        location_kr: h.location_kr,
        tags: h.tags,
        specialties: h.specialties,
        i18n: h.i18n,
      })
      .eq("id", existing.id);

    if (error) console.error(`  Error ${h.slug}:`, error.message);
    else console.log(`  OK: ${h.name}`);
  }

  // Update treatments
  console.log("\n--- Treatments ---");
  for (const t of TREATMENTS) {
    const { data: existing } = await supabase
      .from("treatments")
      .select("id")
      .eq("slug", t.slug)
      .maybeSingle();

    if (!existing) {
      console.log(`  Not found: ${t.slug}`);
      continue;
    }

    const { error } = await supabase
      .from("treatments")
      .update({
        name: t.name,
        description: t.description,
        i18n: t.i18n,
      })
      .eq("id", existing.id);

    if (error) console.error(`  Error ${t.slug}:`, error.message);
    else console.log(`  OK: ${t.name}`);
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
