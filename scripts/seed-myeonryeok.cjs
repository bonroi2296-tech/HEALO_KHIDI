/**
 * 면력한방병원 그룹 시드 스크립트
 * 
 * 3개 지점 병원 프로필 + 6개 한방 시술 패키지를 DB에 upsert.
 * 저장 후 자동 번역 트리거가 i18n JSONB를 채움.
 * 
 * Usage: node scripts/seed-myeonryeok.cjs
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const HOSPITALS = [
  {
    name: "Immunehospital Korean Medicine (Magok HQ)",
    slug: "immunehospital-magok",
    location_kr: "서울특별시 강서구 마곡중앙6로 93, 열린프라자 6,7,10층",
    location_en: "93 Magok Jungang 6-ro, Gangseo-gu, Seoul",
    description: "Immunehospital (면력한방병원) is a leading Korean traditional medicine institution specializing in immune system enhancement, women's health, and pediatric care. With a team of 6 licensed Korean Medicine doctors, Immunehospital combines centuries-old herbal medicine wisdom with modern diagnostics to deliver personalized treatment plans. The hospital is renowned for its proprietary immune-boosting protocols using premium herbal formulas, acupuncture, and pharmacopuncture.",
    latitude: 37.5601357,
    longitude: 126.8376979,
    tags: ["Korean Medicine", "Immune Therapy", "Women's Health", "Pediatric", "Acupuncture", "Herbal Medicine", "Seoul"],
    specialties: ["Korean Medicine OB/GYN", "Korean Medicine Pediatrics", "Immune Enhancement", "Acupuncture", "Herbal Medicine"],
    supported_languages: ["Korean", "English", "Chinese"],
    amenities: ["Free Wi-Fi", "International Patient Coordinator", "Translation Service", "Airport Pickup Available"],
    doctor_count: 6,
    certifications: ["Ministry of Health and Welfare Licensed", "Korean Medicine Hospital Certification"],
    operating_hours: {
      monday: "09:00-18:00",
      tuesday: "09:00-18:00",
      wednesday: "09:00-18:00",
      thursday: "09:00-18:00",
      friday: "09:00-18:00",
      saturday: "09:00-13:00",
      sunday: "Closed"
    },
    faq: [
      { question: "What is Korean Medicine (Hanbang)?", answer: "Korean Medicine (한방/韓方) is Korea's unique traditional medical system with over 1,000 years of history. It uses herbal medicine, acupuncture, moxibustion, and cupping to treat the root cause of illness by restoring balance in the body. Unlike Western medicine that targets symptoms, Korean Medicine takes a holistic approach to health." },
      { question: "Is Korean Medicine safe for international patients?", answer: "Yes. All Korean Medicine hospitals in Korea are licensed and regulated by the Ministry of Health and Welfare. Our practitioners hold doctoral-level degrees in Korean Medicine and follow strict safety protocols. All herbal medicines use certified, quality-controlled ingredients." },
      { question: "How is Korean Medicine different from Traditional Chinese Medicine?", answer: "While they share historical roots, Korean Medicine (韓方) has evolved independently for centuries. Key differences include Sasang constitutional medicine (체질의학), unique herbal formulations, and different diagnostic approaches. Korean Medicine is more regulated and standardized under Korea's national healthcare system." },
      { question: "Do I need to speak Korean?", answer: "No. Our hospital provides English and Chinese translation services. An international patient coordinator will assist you throughout your visit, from consultation to treatment and follow-up care." },
      { question: "How long should I stay in Korea for treatment?", answer: "Treatment duration varies by program. Immune Boost and Wellness programs typically require 5-7 days. Postpartum Recovery requires 2-4 weeks. We can customize programs to fit your travel schedule." }
    ],
    is_published: true,
    display_order: 1,
  },
  {
    name: "Immunehospital Sinchon Branch",
    slug: "immunehospital-sinchon",
    location_kr: "서울특별시 서대문구 신촌역로 19",
    location_en: "19 Sinchon Station-ro, Seodaemun-gu, Seoul",
    description: "Immunehospital Sinchon Branch (신촌 면력한방병원) brings the same trusted immune-focused Korean Medicine care to the vibrant Sinchon area. Conveniently located near Sinchon Station, the clinic specializes in women's health programs including fertility support, postpartum recovery, and menstrual health management using time-tested Korean herbal protocols.",
    latitude: 37.5551,
    longitude: 126.9368,
    tags: ["Korean Medicine", "Immune Therapy", "Women's Health", "Fertility", "Postpartum Care", "Seoul"],
    specialties: ["Korean Medicine OB/GYN", "Korean Medicine Pediatrics", "Fertility Support", "Postpartum Recovery"],
    supported_languages: ["Korean", "English"],
    amenities: ["Free Wi-Fi", "Near Sinchon Station", "Translation Service"],
    doctor_count: 4,
    certifications: ["Ministry of Health and Welfare Licensed"],
    operating_hours: {
      monday: "09:00-18:00",
      tuesday: "09:00-18:00",
      wednesday: "09:00-18:00",
      thursday: "09:00-18:00",
      friday: "09:00-18:00",
      saturday: "09:00-13:00",
      sunday: "Closed"
    },
    faq: [
      { question: "What is Korean Medicine (Hanbang)?", answer: "Korean Medicine (한방/韓方) is Korea's unique traditional medical system using herbal medicine, acupuncture, and holistic diagnostics to treat the root cause of illness." },
      { question: "Do you offer fertility support programs?", answer: "Yes. Our fertility support program combines herbal medicine, acupuncture, and lifestyle counseling to improve reproductive health naturally. It can be used alongside conventional fertility treatments." }
    ],
    is_published: true,
    display_order: 2,
  },
  {
    name: "Immunehospital Gwangmyeong Branch",
    slug: "immunehospital-gwangmyeong",
    location_kr: "경기도 광명시 철산로 10",
    location_en: "10 Cheolsan-ro, Gwangmyeong-si, Gyeonggi-do",
    description: "Immunehospital Gwangmyeong Branch (광명 면력한방병원) extends the Immunehospital group's expertise to the Gyeonggi-do region. Specializing in pediatric Korean Medicine and family wellness programs, the hospital offers a warm, family-friendly environment for comprehensive traditional Korean medical care.",
    latitude: 37.4784,
    longitude: 126.8647,
    tags: ["Korean Medicine", "Immune Therapy", "Pediatric", "Family Wellness", "Gyeonggi-do"],
    specialties: ["Korean Medicine Pediatrics", "Korean Medicine OB/GYN", "Family Wellness", "Growth Therapy"],
    supported_languages: ["Korean", "English"],
    amenities: ["Free Wi-Fi", "Family-Friendly Environment", "Parking Available"],
    doctor_count: 3,
    certifications: ["Ministry of Health and Welfare Licensed"],
    operating_hours: {
      monday: "09:00-18:00",
      tuesday: "09:00-18:00",
      wednesday: "09:00-18:00",
      thursday: "09:00-18:00",
      friday: "09:00-18:00",
      saturday: "09:00-13:00",
      sunday: "Closed"
    },
    faq: [
      { question: "What is Korean Medicine (Hanbang)?", answer: "Korean Medicine (한방/韓方) is Korea's unique traditional medical system using herbal medicine, acupuncture, and holistic diagnostics to treat the root cause of illness." },
      { question: "Is this location suitable for families with children?", answer: "Absolutely. We specialize in pediatric Korean Medicine and provide a child-friendly environment. Our growth therapy and immune-boosting programs are especially popular with international families." }
    ],
    is_published: true,
    display_order: 3,
  },
];

const TREATMENT_TEMPLATES = [
  {
    name: "Immune Boost Program",
    slug: "immune-boost-program",
    description: "A comprehensive Korean Medicine immune enhancement program combining premium herbal formulas, acupuncture, and pharmacopuncture to strengthen your body's natural defense system.",
    full_description: "The Immune Boost Program at Immunehospital is a signature treatment designed to strengthen and rebalance your immune system using time-tested Korean Medicine protocols.\n\nThe program begins with a thorough Sasang constitutional assessment (사상체질 진단) to determine your unique body type and identify imbalances. Based on this personalized diagnosis, our doctors create a customized treatment plan combining:\n\n• Premium herbal medicine (한약) - personalized formulas using 100% certified Korean medicinal herbs\n• Acupuncture (침술) - targeting meridian points to stimulate immune function\n• Pharmacopuncture (약침) - injection of purified herbal extracts at acupoints\n• Moxibustion (뜸) - heat therapy to improve circulation and boost vitality\n\nThis program is ideal for those experiencing chronic fatigue, frequent colds, post-illness recovery, or anyone seeking to proactively strengthen their health.",
    price_min: 1100,
    price_max: 2600,
    tags: ["Korean Medicine", "Immune Therapy", "Herbal Medicine", "Acupuncture", "Wellness"],
    benefits: [
      "Personalized Sasang constitutional diagnosis",
      "Custom herbal formula tailored to your body type",
      "Improved energy levels and reduced fatigue",
      "Strengthened natural immune response",
      "Holistic approach treating root causes, not just symptoms",
      "Follow-up herbal medicine kit to take home"
    ],
    recovery_time_min: 0,
    recovery_time_max: 1,
    surgery_duration_min: 60,
    surgery_duration_max: 90,
    anesthesia_type: "None required",
    price_includes: ["Initial constitutional assessment", "5-day treatment course", "Custom herbal medicine (2 weeks)", "International coordinator support"],
    precautions: ["Inform doctor of any current medications", "Avoid alcohol during treatment period", "Bring any recent medical records"],
    display_order: 1,
  },
  {
    name: "Postpartum Recovery Program",
    slug: "postpartum-recovery-program",
    description: "Traditional Korean postpartum care (산후조리) combining herbal medicine, acupuncture, and specialized recovery protocols to restore maternal health after childbirth.",
    full_description: "Korea's postpartum care tradition (산후조리/產後調理) is recognized worldwide for its effectiveness. Immunehospital's Postpartum Recovery Program brings this tradition into a modern medical setting.\n\nOur Korean Medicine OB/GYN specialists design personalized recovery plans that address:\n\n• Uterine recovery and hormonal rebalancing\n• Joint and bone health restoration\n• Breast milk production support\n• Postpartum fatigue and mood management\n• Weight management and body recovery\n\nThe program includes:\n• Personalized herbal medicine (산후한약) - formulas specifically for postpartum recovery\n• Acupuncture and warm needle therapy\n• Korean herbal steam baths (좌훈)\n• Dietary counseling based on Korean postpartum nutrition principles\n\nTreatment duration: 2-4 weeks, customizable to your schedule.",
    price_min: 2200,
    price_max: 5900,
    tags: ["Korean Medicine", "Postpartum Care", "Women's Health", "Herbal Medicine", "Recovery"],
    benefits: [
      "Faster uterine recovery with herbal medicine",
      "Natural hormonal rebalancing",
      "Improved breast milk production",
      "Joint and bone health restoration",
      "Emotional wellbeing support",
      "Personalized postpartum dietary plan"
    ],
    recovery_time_min: 14,
    recovery_time_max: 28,
    surgery_duration_min: 60,
    surgery_duration_max: 90,
    anesthesia_type: "None required",
    price_includes: ["Full postpartum assessment", "Daily treatment sessions", "Custom herbal medicine", "Dietary counseling", "Coordinator support"],
    precautions: ["Available from 2 weeks after delivery", "Inform doctor of delivery method (natural/C-section)", "Bring delivery medical records"],
    display_order: 2,
  },
  {
    name: "Fertility Support Program",
    slug: "fertility-support-program",
    description: "Korean Medicine fertility enhancement program using herbal medicine, acupuncture, and lifestyle optimization to naturally improve reproductive health.",
    full_description: "Immunehospital's Fertility Support Program takes a holistic Korean Medicine approach to improving reproductive health. Our Korean Medicine OB/GYN specialists have helped hundreds of patients on their journey to parenthood.\n\nThe program addresses both female and male fertility factors:\n\n• Hormonal balance optimization through herbal medicine\n• Uterine environment improvement\n• Egg/sperm quality enhancement\n• Stress reduction and emotional support\n• Cycle regulation and ovulation support\n\nThis program can be used as a standalone natural approach or as a complement to conventional IVF/IUI treatments. Studies show Korean Medicine can improve IVF success rates when used in combination.",
    price_min: 1500,
    price_max: 3700,
    tags: ["Korean Medicine", "Fertility", "Women's Health", "Reproductive Health", "Acupuncture"],
    benefits: [
      "Natural hormonal balance optimization",
      "Improved uterine environment",
      "Can complement IVF/IUI treatments",
      "Stress and anxiety reduction",
      "Personalized herbal formulas",
      "Both female and male fertility support"
    ],
    recovery_time_min: 0,
    recovery_time_max: 0,
    surgery_duration_min: 45,
    surgery_duration_max: 60,
    anesthesia_type: "None required",
    price_includes: ["Comprehensive fertility assessment", "12-session acupuncture course", "Custom herbal medicine (1 month)", "Lifestyle counseling"],
    precautions: ["Share any ongoing fertility treatments", "Bring hormonal test results if available", "Treatment works best over 3+ months"],
    display_order: 3,
  },
  {
    name: "Wellness Detox & Body Rebalance",
    slug: "wellness-detox-body-rebalance",
    description: "A Korean Medicine wellness program combining constitutional diagnosis, herbal detox formulas, and therapeutic treatments to cleanse, rebalance, and revitalize your body.",
    full_description: "The Wellness Detox & Body Rebalance program is designed for health-conscious travelers seeking a transformative wellness experience rooted in Korean Medicine tradition.\n\nThe journey begins with Sasang constitutional medicine (사상체질의학) — a unique Korean diagnostic system that classifies individuals into four body types, each with distinct metabolic patterns, dietary needs, and health tendencies.\n\nBased on your constitution, the program includes:\n\n• Herbal detox formulas to cleanse accumulated toxins\n• Acupuncture for metabolic activation and stress relief\n• Cupping therapy (부항) for circulation improvement\n• Personalized dietary recommendations based on your body type\n• Herbal tea therapy and meditation guidance\n\nIdeal for those experiencing chronic fatigue, digestive issues, weight management challenges, or simply wanting a science-backed traditional wellness retreat.",
    price_min: 900,
    price_max: 1800,
    tags: ["Korean Medicine", "Wellness", "Detox", "Weight Management", "Anti-Aging"],
    benefits: [
      "Personalized Sasang body type diagnosis",
      "Natural toxin elimination",
      "Improved digestion and metabolism",
      "Stress relief and mental clarity",
      "Customized dietary guidelines to take home",
      "Rejuvenated energy and vitality"
    ],
    recovery_time_min: 0,
    recovery_time_max: 0,
    surgery_duration_min: 90,
    surgery_duration_max: 120,
    anesthesia_type: "None required",
    price_includes: ["Constitutional assessment", "5-day treatment program", "Herbal detox medicine", "Dietary guide booklet"],
    precautions: ["Fast for 4 hours before initial assessment", "Avoid heavy meals during program", "Wear comfortable clothing"],
    display_order: 4,
  },
  {
    name: "Pediatric Growth & Immune Program",
    slug: "pediatric-growth-immune-program",
    description: "Specialized Korean Medicine program for children focusing on natural growth stimulation, immune system strengthening, and overall developmental health.",
    full_description: "Korean Medicine has a long tradition of pediatric care (소아한방), and Immunehospital's Pediatric Growth & Immune Program brings this expertise to international families.\n\nThe program is designed for children aged 3-15 and addresses:\n\n• Natural height growth stimulation through herbal medicine\n• Immune system strengthening for frequently ill children\n• Digestive health improvement (a key factor in child development)\n• Focus and concentration enhancement\n• Allergic condition management (rhinitis, atopic dermatitis)\n\nTreatment approach:\n• Child-friendly herbal medicine in easy-to-take forms (pills, syrups)\n• Gentle pediatric acupuncture (소아침)\n• Growth plate stimulation therapy\n• Nutritional counseling for optimal development\n\nSafe, natural, and effective — with no side effects from hormonal treatments.",
    price_min: 600,
    price_max: 1500,
    tags: ["Korean Medicine", "Pediatric", "Growth Therapy", "Immune Therapy", "Children's Health"],
    benefits: [
      "Natural growth stimulation without hormones",
      "Strengthened immune system",
      "Improved appetite and digestion",
      "Better focus and concentration",
      "Allergy and atopic condition relief",
      "Child-friendly treatment methods"
    ],
    recovery_time_min: 0,
    recovery_time_max: 0,
    surgery_duration_min: 30,
    surgery_duration_max: 45,
    anesthesia_type: "None required",
    price_includes: ["Pediatric constitutional assessment", "Growth potential evaluation", "10-session treatment course", "Herbal medicine (1 month)"],
    precautions: ["For children aged 3-15", "Bring growth records if available", "Parent/guardian must accompany child"],
    display_order: 5,
  },
  {
    name: "Anti-Aging Herbal Therapy",
    slug: "anti-aging-herbal-therapy",
    description: "Premium Korean Medicine anti-aging program using traditional herbal formulas, facial acupuncture, and holistic rejuvenation techniques for natural, lasting results.",
    full_description: "Immunehospital's Anti-Aging Herbal Therapy combines the best of Korean Medicine's rejuvenation traditions with modern wellness science.\n\nUnlike surgical anti-aging procedures, this program works from the inside out, addressing the root causes of aging:\n\n• Internal organ vitality restoration through premium herbal formulas\n• Facial acupuncture (미용침) for natural collagen stimulation\n• Blood circulation enhancement for skin radiance\n• Hormonal balance optimization\n• Stress-related aging reversal\n\nThe program includes:\n• Premium anti-aging herbal medicine (경옥고, 공진단 formulas)\n• Facial and body acupuncture sessions\n• Herbal facial mask treatments\n• Meridian massage therapy\n• Personalized anti-aging lifestyle guide\n\nResults are natural and lasting, with many patients reporting improved skin texture, increased energy, better sleep, and overall vitality within the first week.",
    price_min: 1500,
    price_max: 3700,
    tags: ["Korean Medicine", "Anti-Aging", "Herbal Medicine", "Facial Acupuncture", "Wellness", "Beauty"],
    benefits: [
      "Natural collagen stimulation through facial acupuncture",
      "Premium herbal formulas (경옥고, 공진단)",
      "Improved skin radiance and elasticity",
      "Increased energy and vitality",
      "No surgery, no downtime",
      "Lasting results from inside-out approach"
    ],
    recovery_time_min: 0,
    recovery_time_max: 0,
    surgery_duration_min: 60,
    surgery_duration_max: 90,
    anesthesia_type: "None required",
    price_includes: ["Anti-aging assessment", "7-day treatment course", "Premium herbal medicine", "Facial acupuncture sessions", "Home care guide"],
    precautions: ["Avoid excessive sun exposure during treatment", "Inform doctor of any skin conditions", "Results improve with continued herbal medicine"],
    display_order: 6,
  },
];

async function seedHospitals() {
  console.log("=== Seeding Myeonryeok Hospitals ===\n");
  const hospitalIds = {};

  for (const hospital of HOSPITALS) {
    const { data: existing } = await supabase
      .from("hospitals")
      .select("id")
      .eq("slug", hospital.slug)
      .maybeSingle();

    if (existing) {
      console.log(`  Updating: ${hospital.name} (${existing.id})`);
      const { data, error } = await supabase
        .from("hospitals")
        .update(hospital)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) { console.error(`    ERROR: ${error.message}`); continue; }
      hospitalIds[hospital.slug] = data.id;
      console.log(`    Updated OK`);
    } else {
      console.log(`  Creating: ${hospital.name}`);
      const { data, error } = await supabase
        .from("hospitals")
        .insert([hospital])
        .select("id")
        .single();
      if (error) { console.error(`    ERROR: ${error.message}`); continue; }
      hospitalIds[hospital.slug] = data.id;
      console.log(`    Created OK (${data.id})`);
    }
  }

  return hospitalIds;
}

async function seedTreatments(hospitalIds) {
  console.log("\n=== Seeding Treatments ===\n");

  const mainHospitalId = hospitalIds["immunehospital-magok"];
  if (!mainHospitalId) {
    console.error("  Main hospital (magok) not found, skipping treatments");
    return;
  }

  for (const tmpl of TREATMENT_TEMPLATES) {
    const treatment = { ...tmpl, hospital_id: mainHospitalId, is_published: true };

    const { data: existing } = await supabase
      .from("treatments")
      .select("id")
      .eq("slug", treatment.slug)
      .maybeSingle();

    if (existing) {
      console.log(`  Updating: ${treatment.name} (${existing.id})`);
      const { error } = await supabase
        .from("treatments")
        .update(treatment)
        .eq("id", existing.id);
      if (error) { console.error(`    ERROR: ${error.message}`); continue; }
      console.log(`    Updated OK`);
    } else {
      console.log(`  Creating: ${treatment.name}`);
      const { data, error } = await supabase
        .from("treatments")
        .insert([treatment])
        .select("id")
        .single();
      if (error) { console.error(`    ERROR: ${error.message}`); continue; }
      console.log(`    Created OK (${data.id})`);
    }
  }
}

async function main() {
  console.log("Myeonryeok Korean Medicine Hospital - Seed Script\n");
  const hospitalIds = await seedHospitals();
  await seedTreatments(hospitalIds);
  console.log("\n=== Done ===");
}

main().catch(console.error);
