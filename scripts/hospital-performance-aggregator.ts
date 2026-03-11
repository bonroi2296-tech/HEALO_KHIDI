/**
 * HEALO: 병원 성과 집계 스크립트
 * 
 * 목적:
 * - hospital_responses 데이터 기반으로 성과 통계 계산
 * - 베이지안 스무딩 적용
 * - 추천 시스템에 사용할 점수 생성
 * 
 * 사용법:
 * ```bash
 * # 전체 재계산
 * npx tsx scripts/hospital-performance-aggregator.ts refresh
 * 
 * # 글로벌 평균 갱신
 * npx tsx scripts/hospital-performance-aggregator.ts update-global-avg
 * 
 * # 특정 병원 조회
 * npx tsx scripts/hospital-performance-aggregator.ts show-hospital 1
 * 
 * # 추천 조회
 * npx tsx scripts/hospital-performance-aggregator.ts recommend --treatment 1 --country KR --language ko
 * ```
 * 
 * Cron 설정 예시:
 * 0 2 * * * cd /path/to/healo && npx tsx scripts/hospital-performance-aggregator.ts refresh
 */

import { supabaseAdmin } from "../src/lib/rag/supabaseAdmin";

/**
 * 베이지안 점수 계산
 * 
 * 공식: (m * P + n * p) / (m + n)
 * - m: Prior strength (가중치)
 * - P: Global average (전체 평균)
 * - n: Sample size (실제 데이터 수)
 * - p: Hospital rate (병원의 실제 전환율)
 */
function calculateBayesianScore(
  hospitalRate: number,
  sampleSize: number,
  globalAvg: number,
  priorStrength: number
): number {
  return (priorStrength * globalAvg + sampleSize * hospitalRate) / (priorStrength + sampleSize);
}

/**
 * 신뢰도 계산
 * 
 * 공식: n / (m + n)
 * - 데이터가 많을수록 1에 가까움
 * - 데이터가 없으면 0
 */
function calculateConfidence(sampleSize: number, priorStrength: number): number {
  return sampleSize / (priorStrength + sampleSize);
}

/**
 * ✅ 전체 통계 재계산
 */
async function refreshStats() {
  console.log("\n🔄 병원 성과 통계 재계산 시작...\n");

  try {
    // SQL 함수 호출
    const { data, error } = await supabaseAdmin.rpc("refresh_hospital_performance_stats");

    if (error) {
      console.error("❌ Error:", error.message);
      return;
    }

    console.log("✅", data);
    console.log("\n📊 통계 재계산 완료!\n");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

/**
 * ✅ 글로벌 평균 갱신
 */
async function updateGlobalAverage() {
  console.log("\n🌍 글로벌 평균 계산 중...\n");

  try {
    // 전체 병원의 평균 계산
    const { data: stats, error } = await supabaseAdmin
      .from("hospital_responses")
      .select("response_status");

    if (error || !stats) {
      console.error("❌ Error:", error?.message);
      return;
    }

    const total = stats.length;
    const interested = stats.filter((s) => s.response_status === "interested").length;
    const booked = stats.filter((s) => ["booked", "completed"].includes(s.response_status)).length;
    const completed = stats.filter((s) => s.response_status === "completed").length;

    const globalInterestRate = interested / total;
    const globalBookingRate = booked / total;
    const globalCompletionRate = completed / total;

    console.log("계산된 글로벌 평균:");
    console.log(`  - Interest Rate: ${(globalInterestRate * 100).toFixed(1)}%`);
    console.log(`  - Booking Rate: ${(globalBookingRate * 100).toFixed(1)}%`);
    console.log(`  - Completion Rate: ${(globalCompletionRate * 100).toFixed(1)}%`);
    console.log(`  - Sample Size: ${total}\n`);

    // 업데이트
    const { error: updateError } = await supabaseAdmin
      .from("hospital_performance_global_avg")
      .update({
        global_interest_rate: globalInterestRate,
        global_booking_rate: globalBookingRate,
        global_completion_rate: globalCompletionRate,
        last_calculated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updateError) {
      console.error("❌ Error:", updateError.message);
      return;
    }

    console.log("✅ 글로벌 평균 업데이트 완료!\n");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

/**
 * ✅ 특정 병원 성과 조회
 */
async function showHospitalPerformance(hospitalId: number) {
  console.log(`\n📊 병원 #${hospitalId} 성과 조회\n`);

  try {
    const { data: hospital, error: hospitalError } = await supabaseAdmin
      .from("hospitals")
      .select("*")
      .eq("id", hospitalId)
      .single();

    if (hospitalError || !hospital) {
      console.error("❌ 병원을 찾을 수 없습니다.");
      return;
    }

    console.log(`병원명: ${hospital.name}\n`);

    // 통계 조회
    const { data: stats, error: statsError } = await supabaseAdmin
      .from("hospital_performance_stats")
      .select("*")
      .eq("hospital_id", hospitalId)
      .eq("period", "last_30d")
      .is("treatment_id", null)
      .is("country", null)
      .is("language", null)
      .single();

    if (statsError || !stats) {
      console.log("ℹ️  통계 데이터가 없습니다. (리드 전달 기록 없음)\n");
      return;
    }

    console.log("=== 최근 30일 성과 ===");
    console.log(`전달된 리드: ${stats.leads_sent}건`);
    console.log(`관심 표명: ${stats.leads_interested}건`);
    console.log(`예약 확정: ${stats.leads_booked}건`);
    console.log(`시술 완료: ${stats.leads_completed}건`);
    console.log();

    console.log("=== 전환율 ===");
    console.log(`관심률: ${(stats.interest_rate * 100).toFixed(1)}%`);
    console.log(`예약율: ${(stats.booking_rate * 100).toFixed(1)}%`);
    console.log(`완료율: ${(stats.completion_rate * 100).toFixed(1)}%`);
    console.log();

    console.log("=== 속도 ===");
    if (stats.avg_first_response_minutes) {
      const hours = (stats.avg_first_response_minutes / 60).toFixed(1);
      console.log(`평균 응답 시간: ${hours}시간`);
    }
    console.log();

    console.log("=== 베이지안 점수 ===");
    console.log(`점수: ${(stats.bayesian_score * 100).toFixed(1)}/100`);
    console.log(`신뢰도: ${(stats.confidence_level * 100).toFixed(1)}%`);
    console.log(`샘플 크기: ${stats.sample_size}건`);
    console.log();

    const tier =
      stats.bayesian_score >= 0.7
        ? "🔥 Excellent"
        : stats.bayesian_score >= 0.5
        ? "⭐ Good"
        : stats.bayesian_score >= 0.3
        ? "📊 Average"
        : "📉 Below Average";

    console.log(`성과 등급: ${tier}\n`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

/**
 * ✅ 추천 병원 조회
 */
async function getRecommendations(filters: {
  treatment?: number;
  country?: string;
  language?: string;
  limit?: number;
}) {
  console.log("\n🎯 병원 추천 조회\n");
  console.log("조건:");
  if (filters.treatment) console.log(`  - 시술: ${filters.treatment}`);
  if (filters.country) console.log(`  - 국가: ${filters.country}`);
  if (filters.language) console.log(`  - 언어: ${filters.language}`);
  console.log();

  try {
    let query = supabaseAdmin
      .from("hospital_performance_stats")
      .select(
        `
        hospital_id,
        bayesian_score,
        confidence_level,
        sample_size,
        leads_sent,
        leads_booked,
        leads_completed,
        booking_rate,
        completion_rate,
        avg_first_response_minutes,
        hospitals (name)
      `
      )
      .eq("period", "last_30d");

    if (filters.treatment) {
      query = query.eq("treatment_id", filters.treatment);
    } else {
      query = query.is("treatment_id", null);
    }

    if (filters.country) {
      query = query.eq("country", filters.country);
    } else {
      query = query.is("country", null);
    }

    if (filters.language) {
      query = query.eq("language", filters.language);
    } else {
      query = query.is("language", null);
    }

    const { data, error } = await query
      .order("bayesian_score", { ascending: false })
      .limit(filters.limit || 5);

    if (error) {
      console.error("❌ Error:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log("ℹ️  추천 가능한 병원이 없습니다.\n");
      return;
    }

    console.log("=== 추천 병원 ===\n");

    data.forEach((hospital: any, index: number) => {
      const h = hospital.hospitals;
      const score = (hospital.bayesian_score * 100).toFixed(1);
      const confidence = (hospital.confidence_level * 100).toFixed(1);

      console.log(`${index + 1}. ${h?.name || "Unknown Hospital"}`);
      console.log(`   점수: ${score}/100 (신뢰도: ${confidence}%)`);
      console.log(`   데이터: ${hospital.sample_size}건`);
      console.log(`   예약율: ${(hospital.booking_rate * 100).toFixed(1)}%`);
      console.log(`   완료율: ${(hospital.completion_rate * 100).toFixed(1)}%`);

      if (hospital.avg_first_response_minutes) {
        const hours = (hospital.avg_first_response_minutes / 60).toFixed(1);
        console.log(`   응답 속도: ${hours}시간`);
      }

      const level =
        hospital.bayesian_score >= 0.7 && hospital.sample_size >= 10
          ? "🔥 강력 추천"
          : hospital.bayesian_score >= 0.5 && hospital.sample_size >= 5
          ? "⭐ 추천"
          : hospital.bayesian_score >= 0.3 || hospital.sample_size >= 3
          ? "📊 고려 가능"
          : "📉 데이터 부족";

      console.log(`   추천 등급: ${level}`);
      console.log();
    });
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

/**
 * ✅ 전체 병원 성과 대시보드
 */
async function showDashboard() {
  console.log("\n📊 병원 성과 대시보드\n");

  try {
    const { data, error } = await supabaseAdmin
      .from("hospital_performance_stats")
      .select(
        `
        hospital_id,
        bayesian_score,
        confidence_level,
        sample_size,
        leads_sent,
        leads_booked,
        booking_rate,
        hospitals (name)
      `
      )
      .eq("period", "last_30d")
      .is("treatment_id", null)
      .is("country", null)
      .is("language", null)
      .order("bayesian_score", { ascending: false });

    if (error) {
      console.error("❌ Error:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log("ℹ️  데이터가 없습니다.\n");
      return;
    }

    console.table(
      data.map((h: any) => ({
        병원: h.hospitals?.name || "Unknown",
        점수: (h.bayesian_score * 100).toFixed(1),
        "신뢰도(%)": (h.confidence_level * 100).toFixed(1),
        "리드 수": h.leads_sent,
        예약: h.leads_booked,
        "예약율(%)": (h.booking_rate * 100).toFixed(1),
      }))
    );
    console.log();
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

/**
 * ✅ 베이지안 시뮬레이션 (테스트용)
 */
async function simulateBayesian() {
  console.log("\n🧪 베이지안 스무딩 시뮬레이션\n");

  const globalAvg = 0.3; // 30%
  const priorStrength = 10;

  const scenarios = [
    { name: "신생 병원 (2/2 = 100%)", success: 2, total: 2 },
    { name: "중견 병원 (8/10 = 80%)", success: 8, total: 10 },
    { name: "대형 병원 (40/100 = 40%)", success: 40, total: 100 },
    { name: "부진 병원 (1/20 = 5%)", success: 1, total: 20 },
  ];

  console.log(`글로벌 평균: ${(globalAvg * 100).toFixed(1)}%`);
  console.log(`Prior Strength (m): ${priorStrength}\n`);

  scenarios.forEach((s) => {
    const rawRate = s.success / s.total;
    const bayesianScore = calculateBayesianScore(rawRate, s.total, globalAvg, priorStrength);
    const confidence = calculateConfidence(s.total, priorStrength);

    console.log(`${s.name}`);
    console.log(`  실제 전환율: ${(rawRate * 100).toFixed(1)}%`);
    console.log(`  베이지안 점수: ${(bayesianScore * 100).toFixed(1)}%`);
    console.log(`  신뢰도: ${(confidence * 100).toFixed(1)}%`);
    console.log();
  });

  console.log("💡 해석:");
  console.log("- 신생 병원: 100%지만 데이터 부족 → 점수 낮음 (전체 평균에 가까움)");
  console.log("- 대형 병원: 실제 40%에 가까운 점수 (데이터 많아서 신뢰도 높음)");
  console.log();
}

/**
 * 사용법 표시
 */
function showUsage() {
  console.log(`
HEALO 병원 성과 집계 도구

사용법:
  npx tsx scripts/hospital-performance-aggregator.ts <명령> [옵션]

명령:
  refresh                                    전체 통계 재계산
  update-global-avg                          글로벌 평균 갱신
  show-hospital <id>                         특정 병원 성과 조회
  recommend [--treatment N] [--country XX] [--language YY] [--limit N]
                                             추천 병원 조회
  dashboard                                  전체 병원 성과 대시보드
  simulate                                   베이지안 시뮬레이션

예시:
  npx tsx scripts/hospital-performance-aggregator.ts refresh
  npx tsx scripts/hospital-performance-aggregator.ts show-hospital 1
  npx tsx scripts/hospital-performance-aggregator.ts recommend --treatment 1 --country KR --language ko
  npx tsx scripts/hospital-performance-aggregator.ts dashboard

Cron 설정:
  매일 새벽 2시 재계산
  0 2 * * * cd /path/to/healo && npx tsx scripts/hospital-performance-aggregator.ts refresh
  `);
}

/**
 * 메인 실행
 */
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case "refresh":
        await refreshStats();
        break;

      case "update-global-avg":
        await updateGlobalAverage();
        break;

      case "show-hospital":
        if (!args[0]) {
          console.error("❌ 병원 ID가 필요합니다.");
          showUsage();
          process.exit(1);
        }
        await showHospitalPerformance(parseInt(args[0]));
        break;

      case "recommend": {
        const filters: any = {};
        for (let i = 0; i < args.length; i += 2) {
          const key = args[i].replace("--", "");
          const value = args[i + 1];
          if (key === "treatment" || key === "limit") {
            filters[key] = parseInt(value);
          } else {
            filters[key] = value;
          }
        }
        await getRecommendations(filters);
        break;
      }

      case "dashboard":
        await showDashboard();
        break;

      case "simulate":
        await simulateBayesian();
        break;

      default:
        showUsage();
        break;
    }

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main();
}
