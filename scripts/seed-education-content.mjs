/**
 * Seed Education Content Script
 *
 * 위암(stomach) 기준 6단계 × 5카테고리 = 30개 교육 콘텐츠를 생성하고
 * Gemini로 6개 언어 자동 번역합니다.
 *
 * 사용법: node scripts/seed-education-content.mjs
 * 필요 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (또는 ANON_KEY), GOOGLE_GENERATIVE_AI_API_KEY
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey
);

const llmModel = google("gemini-flash-latest");

const LANGS_TO_TRANSLATE = ["en", "zh", "ja", "ru", "kz"];

// ── Seed Data: stomach cancer × 6 phases × 5 categories ──

const SEED_DATA = [
  // week_1
  { cancer_type: "stomach", phase: "week_1", category: "medication",
    title: "수술 후 1주차 투약 안내",
    body: "수술 후 처방된 항생제와 진통제를 정해진 시간에 복용하세요. 위장보호제(PPI)를 아침 식사 30분 전에 공복 상태로 복용합니다. 약물 복용 시 어지러움이나 구역감이 심하면 담당 의료진에게 즉시 알려주세요." },
  { cancer_type: "stomach", phase: "week_1", category: "diet",
    title: "수술 후 1주차 식단 가이드",
    body: "미음이나 맑은 유동식부터 시작합니다. 한 번에 50-100ml 소량씩 자주 나누어 드세요. 너무 차갑거나 뜨거운 음식은 피하고, 미지근한 온도로 섭취합니다. 충분한 수분 섭취가 중요합니다." },
  { cancer_type: "stomach", phase: "week_1", category: "exercise",
    title: "수술 후 1주차 활동 안내",
    body: "병실 내 가벼운 보행 운동을 시작합니다. 하루 2-3회, 5-10분 정도 천천히 걷기를 권합니다. 복부에 힘이 들어가는 동작은 피하세요. 기침이나 재채기 시 베개로 복부를 감싸 보호합니다." },
  { cancer_type: "stomach", phase: "week_1", category: "warning_signs",
    title: "수술 후 주의해야 할 경고 신호",
    body: "다음 증상이 나타나면 즉시 의료진에게 연락하세요: 38.5도 이상의 고열, 수술 부위의 심한 통증이나 부종, 구토에 피가 섞여 나올 때, 대변이 검은색이거나 혈변이 보일 때, 호흡 곤란이 발생할 때." },
  { cancer_type: "stomach", phase: "week_1", category: "mental_health",
    title: "수술 후 심리적 안정 가이드",
    body: "수술 후 불안감이나 우울감은 자연스러운 반응입니다. 충분한 휴식을 취하고, 가족이나 친구와 감정을 나누세요. 수면에 어려움이 있다면 의료진에게 말씀해 주세요. 천천히 회복되고 있음을 기억하세요." },

  // week_2
  { cancer_type: "stomach", phase: "week_2", category: "medication",
    title: "2주차 복약 관리",
    body: "항생제 복용이 종료되는 시기입니다. 의사의 지시 없이 약물을 임의로 중단하지 마세요. 위산분비억제제는 계속 복용합니다. 진통제 사용량을 점차 줄여갑니다." },
  { cancer_type: "stomach", phase: "week_2", category: "diet",
    title: "2주차 식단 진행",
    body: "죽이나 부드러운 유동식으로 진행합니다. 하루 5-6회 소량으로 나누어 먹습니다. 단백질 보충을 위해 두부, 계란찜 등을 추가합니다. 당분이 많은 음료는 덤핑증후군을 유발할 수 있으니 주의합니다." },
  { cancer_type: "stomach", phase: "week_2", category: "exercise",
    title: "2주차 운동 가이드",
    body: "하루 15-20분 산책을 시작합니다. 계단 오르기는 아직 자제합니다. 가벼운 스트레칭으로 관절 유연성을 유지합니다. 피로감이 심하면 쉬어가며 운동합니다." },
  { cancer_type: "stomach", phase: "week_2", category: "warning_signs",
    title: "2주차 경고 신호",
    body: "식사 후 심한 복통, 구토, 설사가 반복되면 덤핑증후군일 수 있습니다. 수술 부위의 발적, 분비물, 벌어짐이 있으면 즉시 내원하세요. 체중이 급격히 감소하면 영양 상태 점검이 필요합니다." },
  { cancer_type: "stomach", phase: "week_2", category: "mental_health",
    title: "2주차 정서 관리",
    body: "퇴원 후 일상 복귀에 대한 걱정은 자연스럽습니다. 무리하지 않는 범위에서 일상 활동을 재개하세요. 환자 커뮤니티 참여도 도움이 됩니다. 필요시 전문 심리 상담을 요청하세요." },

  // month_1
  { cancer_type: "stomach", phase: "month_1", category: "medication",
    title: "1개월차 약물 관리",
    body: "위산분비억제제(PPI)를 지속 복용합니다. 빈혈 예방을 위해 철분제나 비타민 B12 보충이 필요할 수 있습니다. 항암 치료 예정인 경우 항암제 부작용에 대해 의료진과 상의하세요." },
  { cancer_type: "stomach", phase: "month_1", category: "diet",
    title: "1개월차 영양 관리",
    body: "부드러운 일반식으로 점진적 전환합니다. 고단백 식단(살코기, 생선, 두부)을 유지합니다. 식사량은 기존의 1/3-1/2로 하되, 하루 5-6회 나눠 먹습니다. 비타민과 미네랄 보충제 복용을 고려합니다." },
  { cancer_type: "stomach", phase: "month_1", category: "exercise",
    title: "1개월차 활동 가이드",
    body: "하루 30분 보행 운동을 목표로 합니다. 가벼운 가사활동 재개가 가능합니다. 무거운 물건 들기(5kg 이상)는 아직 자제합니다. 운동 강도를 서서히 높여갑니다." },
  { cancer_type: "stomach", phase: "month_1", category: "warning_signs",
    title: "1개월차 주의사항",
    body: "역류성 증상(속쓰림, 신물)이 지속되면 약물 조정이 필요합니다. 식사 후 심한 복부팽만감이나 구역감이 있으면 보고하세요. 체중 감소가 지속적이면 영양 보충 계획을 재점검합니다." },
  { cancer_type: "stomach", phase: "month_1", category: "mental_health",
    title: "1개월차 심리 관리",
    body: "체형 변화와 식습관 변화에 적응하는 시기입니다. 스트레스를 관리할 수 있는 취미활동을 찾아보세요. 명상이나 심호흡 연습이 불안 감소에 도움됩니다. 정기적으로 감정 일기를 쓰는 것을 추천합니다." },

  // month_3
  { cancer_type: "stomach", phase: "month_3", category: "medication",
    title: "3개월차 약물 점검",
    body: "항암 치료 중이라면 부작용 관리에 집중합니다. PPI 복용 지속 여부를 의료진과 상의합니다. 빈혈 수치를 정기 검사합니다. 보충제 복용 계획을 재점검합니다." },
  { cancer_type: "stomach", phase: "month_3", category: "diet",
    title: "3개월차 식단 안정화",
    body: "식사 패턴이 안정되는 시기입니다. 다양한 식품군을 균형 있게 섭취합니다. 당분 과다 섭취를 피하고, 섬유질 섭취를 점차 늘립니다. 음주와 카페인은 계속 제한합니다." },
  { cancer_type: "stomach", phase: "month_3", category: "exercise",
    title: "3개월차 운동 확대",
    body: "중강도 유산소 운동(빠른 걷기, 자전거)을 시작합니다. 주 3-5회, 30-45분 운동을 권합니다. 가벼운 근력 운동도 가능합니다. 운동 전후 충분한 수분을 섭취합니다." },
  { cancer_type: "stomach", phase: "month_3", category: "warning_signs",
    title: "3개월차 경과 관찰",
    body: "정기 CT 검사와 혈액검사 일정을 확인하세요. 새로운 통증이나 덩어리가 만져지면 보고합니다. 지속적인 피로감이나 체중 감소에 주의합니다. 항암 치료 부작용(탈모, 구내염 등)에 대한 관리를 합니다." },
  { cancer_type: "stomach", phase: "month_3", category: "mental_health",
    title: "3개월차 정서 회복",
    body: "사회적 활동을 점진적으로 늘려가세요. 재발에 대한 걱정은 정상적인 반응입니다. 암 생존자 지지 그룹 참여를 고려해 보세요. 직장 복귀를 계획 중이라면 단계적 복귀를 추천합니다." },

  // month_6
  { cancer_type: "stomach", phase: "month_6", category: "medication",
    title: "6개월차 약물 재평가",
    body: "항암 치료 종료 후 유지 약물을 확인합니다. PPI 장기 복용의 부작용(골밀도 감소 등)을 모니터링합니다. 비타민 B12 주기적 주사가 필요할 수 있습니다. 약물 부작용이 의심되면 반드시 상담합니다." },
  { cancer_type: "stomach", phase: "month_6", category: "diet",
    title: "6개월차 식이요법",
    body: "거의 정상식에 가까운 식사가 가능해집니다. 식사량은 기존의 2/3 수준으로 회복됩니다. 영양 균형을 위해 정기 영양 상담을 받습니다. 가공식품과 붉은 고기 섭취를 줄입니다." },
  { cancer_type: "stomach", phase: "month_6", category: "exercise",
    title: "6개월차 운동 계획",
    body: "주 150분 이상 중강도 유산소 운동을 목표합니다. 수영, 요가 등 다양한 운동을 시도합니다. 근력 운동을 주 2회 이상 포함합니다. 체력에 맞는 운동 강도를 유지합니다." },
  { cancer_type: "stomach", phase: "month_6", category: "warning_signs",
    title: "6개월차 정기 검진",
    body: "CT, 내시경 등 정기 검진 일정을 준수합니다. 종양표지자 검사(CEA, CA 19-9) 결과를 확인합니다. 원인 불명의 체중 감소나 식욕 저하에 주의합니다. 새로운 증상은 빠르게 보고합니다." },
  { cancer_type: "stomach", phase: "month_6", category: "mental_health",
    title: "6개월차 삶의 질 관리",
    body: "일상생활의 정상화에 집중합니다. 재발 불안이 줄어드는 시기이지만, 필요시 전문 상담을 받습니다. 건강한 생활 습관(수면, 식단, 운동)을 루틴으로 만듭니다. 긍정적인 마인드셋을 유지하는 것이 중요합니다." },

  // year_1
  { cancer_type: "stomach", phase: "year_1", category: "medication",
    title: "1년차 장기 약물 관리",
    body: "유지 약물 복용 계획을 재점검합니다. 철분, 칼슘, 비타민 D 보충 상태를 확인합니다. 골밀도 검사를 고려합니다. 약물 조정이 필요하면 의료진과 상의합니다." },
  { cancer_type: "stomach", phase: "year_1", category: "diet",
    title: "1년차 장기 영양 관리",
    body: "건강한 식습관을 장기적으로 유지합니다. 항암 식이(채소, 과일, 통곡물 위주)를 권합니다. 적정 체중을 유지합니다. 연 1회 영양 평가를 받습니다." },
  { cancer_type: "stomach", phase: "year_1", category: "exercise",
    title: "1년차 운동 유지",
    body: "규칙적인 운동 습관을 유지합니다. 주 150-300분 중강도 유산소 + 주 2회 근력 운동이 이상적입니다. 체력 수준에 맞는 스포츠 활동도 가능합니다. 지속적인 신체 활동이 재발 예방에 도움됩니다." },
  { cancer_type: "stomach", phase: "year_1", category: "warning_signs",
    title: "1년차 장기 추적 관찰",
    body: "연 2회 정기 검진(CT, 내시경, 혈액검사)을 받습니다. 림프절 부종, 새로운 덩어리, 지속적 통증에 주의합니다. 5년간 정기 추적이 필요합니다. 검진 일정을 달력에 기록해 두세요." },
  { cancer_type: "stomach", phase: "year_1", category: "mental_health",
    title: "1년차 심리적 성장",
    body: "암 생존 1주년은 중요한 이정표입니다. 경험을 통해 얻은 삶의 가치를 돌아보세요. 다른 환자들에게 도움을 줄 수 있는 활동(멘토링 등)을 고려합니다. 앞으로의 건강한 삶을 위한 장기 계획을 세웁니다." },
];

// ── Translation ──

async function translateContent(title, body, targetLangs) {
  const i18n = {};

  for (const lang of targetLangs) {
    const langName = { en: "English", zh: "Chinese", ja: "Japanese", ru: "Russian", kz: "Kazakh" }[lang];

    try {
      const { text } = await generateText({
        model: llmModel,
        prompt: `Translate the following Korean medical education content to ${langName}.
Return ONLY a JSON object with "title" and "body" fields. No markdown code fences.

Title: ${title}
Body: ${body}`,
      });

      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      i18n[lang] = { title: parsed.title, body: parsed.body };
      console.log(`  ✓ ${lang}`);
    } catch (err) {
      console.error(`  ✗ ${lang}: ${err.message}`);
      i18n[lang] = { title, body }; // fallback to Korean
    }

    // Rate limit pause
    await new Promise(r => setTimeout(r, 500));
  }

  return i18n;
}

// ── Main ──

async function main() {
  console.log(`\n=== Education Content Seed ===`);
  console.log(`Total items: ${SEED_DATA.length}`);
  console.log(`Languages: ko (source) + ${LANGS_TO_TRANSLATE.join(", ")}\n`);

  let inserted = 0;
  let skipped = 0;

  for (const item of SEED_DATA) {
    console.log(`[${inserted + skipped + 1}/${SEED_DATA.length}] ${item.phase}/${item.category}: ${item.title}`);

    // Check if already exists
    const { data: existing } = await supabase
      .from("education_contents")
      .select("id")
      .eq("cancer_type", item.cancer_type)
      .eq("phase", item.phase)
      .eq("category", item.category)
      .maybeSingle();

    if (existing) {
      console.log("  → Already exists, skipping");
      skipped++;
      continue;
    }

    // Translate
    console.log("  Translating...");
    const i18n = await translateContent(item.title, item.body, LANGS_TO_TRANSLATE);

    // Insert
    const { error } = await supabase
      .from("education_contents")
      .insert([{
        cancer_type: item.cancer_type,
        phase: item.phase,
        category: item.category,
        title: item.title,
        body: item.body,
        i18n,
      }]);

    if (error) {
      console.error(`  ✗ Insert failed: ${error.message}`);
    } else {
      console.log("  ✓ Inserted");
      inserted++;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}, Failed: ${SEED_DATA.length - inserted - skipped}`);
}

main().catch(console.error);
