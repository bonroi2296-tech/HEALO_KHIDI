/**
 * HEALO: 관리자 알림 테스트 스크립트
 * 
 * 사용법:
 * ```bash
 * # 설정 검증
 * npx tsx scripts/test-admin-notification.ts validate
 * 
 * # 테스트 알림 발송
 * npx tsx scripts/test-admin-notification.ts send
 * 
 * # 최근 알림 이벤트 조회
 * npx tsx scripts/test-admin-notification.ts list
 * 
 * # 통계 조회
 * npx tsx scripts/test-admin-notification.ts stats
 * ```
 */

import { validateNotificationConfig, sendAdminNotification } from "../src/lib/notifications/adminNotifier";
import { getActiveRecipients, getAllRecipients } from "../src/lib/notifications/recipients";
import { supabaseAdmin } from "../src/lib/rag/supabaseAdmin";

/**
 * ✅ 설정 검증
 */
async function validateConfig() {
  console.log("\n🔍 알림 설정 검증\n");

  const config = validateNotificationConfig();

  console.log("제공자:", config.provider);
  console.log("ENV 관리자 수:", config.adminCount);
  console.log("ENV 유효성:", config.valid ? "✅ 정상" : "⚠️ 문제 있음");

  if (config.issues.length > 0) {
    console.log("\nENV 문제점:");
    config.issues.forEach((issue) => console.log(`  - ${issue}`));
  }

  console.log("\n환경변수:");
  console.log(`  NOTIFY_PROVIDER: ${process.env.NOTIFY_PROVIDER || "(미설정)"}`);
  console.log(`  ADMIN_PHONE_NUMBERS: ${process.env.ADMIN_PHONE_NUMBERS ? "설정됨" : "(미설정)"}`);
  
  if (config.provider === "sms") {
    console.log(`  SMS_PROVIDER: ${process.env.SMS_PROVIDER || "(미설정)"}`);
  }

  // DB 수신자 확인
  console.log("\nDB 수신자:");
  const dbResult = await getAllRecipients();
  
  if (dbResult.success) {
    const activeCount = dbResult.recipients?.filter((r) => r.is_active).length || 0;
    const inactiveCount = dbResult.recipients?.length || 0 - activeCount;
    
    console.log(`  총 ${dbResult.recipients?.length || 0}명 (활성: ${activeCount}, 비활성: ${inactiveCount})`);
    
    if (activeCount > 0) {
      console.log("\n  활성 수신자:");
      dbResult.recipients
        ?.filter((r) => r.is_active)
        .forEach((r) => {
          console.log(`    - ${r.label} (${r.phone_masked})`);
        });
    }
  } else {
    console.log(`  ⚠️ 조회 실패: ${dbResult.error}`);
  }

  // 실제 사용될 수신자
  console.log("\n실제 사용될 수신자:");
  const activeRecipients = await getActiveRecipients();
  console.log(`  ${activeRecipients.length}명 (출처: ${activeRecipients[0]?.source || "없음"})`);

  console.log();
}

/**
 * ✅ 테스트 알림 발송
 */
async function sendTestNotification() {
  console.log("\n📱 테스트 알림 발송\n");

  const testPayload = {
    inquiryId: 99999,
    nationality: "KR",
    treatmentType: "rhinoplasty",
    contactMethod: "WhatsApp",
    leadQuality: "hot",
    priorityScore: 85,
    createdAt: new Date().toISOString(),
  };

  console.log("페이로드:", JSON.stringify(testPayload, null, 2));
  console.log("\n발송 중...\n");

  try {
    await sendAdminNotification(testPayload as any);
    console.log("✅ 발송 완료!");
    console.log("\n확인:");
    console.log("  - Console 모드: 터미널 출력 확인");
    console.log("  - SMS 모드: 휴대폰 수신 확인 (1-2분 소요)");
    console.log("  - 알림톡 모드: 카톡 수신 확인 (1-2분 소요)");
    console.log();
  } catch (error: any) {
    console.error("❌ 발송 실패:", error.message);
  }
}

/**
 * ✅ 최근 알림 이벤트 조회
 */
async function listRecentEvents() {
  console.log("\n📋 최근 알림 이벤트 (10건)\n");

  try {
    const { data, error } = await supabaseAdmin
      .from("inquiry_events")
      .select("id, inquiry_id, event_type, event_data, created_at")
      .in("event_type", ["admin_notified", "admin_notify_failed"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Error:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log("ℹ️  이벤트가 없습니다.");
      return;
    }

    data.forEach((event: any) => {
      const icon = event.event_type === "admin_notified" ? "✅" : "❌";
      const date = new Date(event.created_at).toLocaleString("ko-KR");

      console.log(`${icon} Inquiry #${event.inquiry_id} - ${date}`);
      console.log(`   타입: ${event.event_type}`);

      if (event.event_data) {
        const data = event.event_data;
        if (data.provider) console.log(`   제공자: ${data.provider}`);
        if (data.message_id) console.log(`   메시지 ID: ${data.message_id}`);
        if (data.masked_to) console.log(`   수신: ${data.masked_to}`);
        if (data.error) console.log(`   에러: ${data.error}`);
      }

      console.log();
    });
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

/**
 * ✅ 알림 통계
 */
async function showStats() {
  console.log("\n📊 알림 통계\n");

  try {
    // 오늘
    const { data: today, error: todayError } = await supabaseAdmin
      .from("inquiry_events")
      .select("event_type")
      .in("event_type", ["admin_notified", "admin_notify_failed"])
      .gte("created_at", new Date().toISOString().split("T")[0]);

    if (todayError) {
      console.error("❌ Error:", todayError.message);
      return;
    }

    const todaySuccess = today?.filter((e) => e.event_type === "admin_notified").length || 0;
    const todayFailed = today?.filter((e) => e.event_type === "admin_notify_failed").length || 0;
    const todayTotal = todaySuccess + todayFailed;
    const todayRate = todayTotal > 0 ? ((todaySuccess / todayTotal) * 100).toFixed(1) : "0.0";

    console.log("=== 오늘 ===");
    console.log(`성공: ${todaySuccess}건`);
    console.log(`실패: ${todayFailed}건`);
    console.log(`성공률: ${todayRate}%`);
    console.log();

    // 최근 7일
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: week, error: weekError } = await supabaseAdmin
      .from("inquiry_events")
      .select("event_type")
      .in("event_type", ["admin_notified", "admin_notify_failed"])
      .gte("created_at", sevenDaysAgo.toISOString());

    if (weekError) {
      console.error("❌ Error:", weekError.message);
      return;
    }

    const weekSuccess = week?.filter((e) => e.event_type === "admin_notified").length || 0;
    const weekFailed = week?.filter((e) => e.event_type === "admin_notify_failed").length || 0;
    const weekTotal = weekSuccess + weekFailed;
    const weekRate = weekTotal > 0 ? ((weekSuccess / weekTotal) * 100).toFixed(1) : "0.0";

    console.log("=== 최근 7일 ===");
    console.log(`성공: ${weekSuccess}건`);
    console.log(`실패: ${weekFailed}건`);
    console.log(`성공률: ${weekRate}%`);
    console.log();

    // 실패 원인 분석
    if (weekFailed > 0) {
      const { data: failures } = await supabaseAdmin
        .from("inquiry_events")
        .select("event_data")
        .eq("event_type", "admin_notify_failed")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (failures && failures.length > 0) {
        console.log("=== 실패 원인 ===");

        const errorCounts = new Map<string, number>();
        failures.forEach((f: any) => {
          const error = f.event_data?.error || "unknown";
          errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        });

        Array.from(errorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([error, count]) => {
            console.log(`  - ${error}: ${count}건`);
          });

        console.log();
      }
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

/**
 * 사용법 표시
 */
function showUsage() {
  console.log(`
HEALO 관리자 알림 테스트 도구

사용법:
  npx tsx scripts/test-admin-notification.ts <명령>

명령:
  validate     알림 설정 검증 (ENV + DB)
  send         테스트 알림 발송
  list         최근 알림 이벤트 조회 (10건)
  stats        알림 통계 (오늘 + 최근 7일)

예시:
  npx tsx scripts/test-admin-notification.ts validate
  npx tsx scripts/test-admin-notification.ts send
  npx tsx scripts/test-admin-notification.ts stats

관리자 UI:
  /admin/settings/notifications
  → DB 기반 수신자 관리 (CRUD)
  `);
}

/**
 * 메인 실행
 */
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case "validate":
        await validateConfig();
        break;

      case "send":
        await sendTestNotification();
        break;

      case "list":
        await listRecentEvents();
        break;

      case "stats":
        await showStats();
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
