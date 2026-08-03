/**
 * 헬스체크 — 실제 DB 연결까지 확인(얕은 {ok} 금지).
 *
 * 과거: 정적 { status: "ok" } 만 반환 → DB 가 죽어도 200 을 줘서
 *       uptime 모니터가 장애를 못 잡았다(관측 최약점).
 * 이제: 공개 테이블(hospitals)에 가벼운 head count(행 0개, 카운트만) 로
 *       DB 연결을 실측한다. 실패/타임아웃이면 503(degraded) 로 정직하게 알린다.
 *
 * 보안: 에러 원문 노출 금지(코드형만), anon 클라이언트로 최소 권한, PII 없음.
 */
import { supabaseAnonServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
// uptime 모니터가 매번 실측하도록 캐시/정적화 금지
export const dynamic = "force-dynamic";

const DB_PROBE_TIMEOUT_MS = 3000;

export async function GET() {
  const started = Date.now();
  let dbOk = false;

  try {
    // 가벼운 연결 확인: head:true → 행은 안 가져오고 count 만. limit(1) 로 비용 최소화.
    const probe = supabaseAnonServer
      .from("hospitals")
      .select("id", { count: "exact", head: true })
      .limit(1);

    const timeout = new Promise<{ error: unknown }>((resolve) =>
      setTimeout(() => resolve({ error: new Error("db_probe_timeout") }), DB_PROBE_TIMEOUT_MS)
    );

    const { error } = (await Promise.race([probe, timeout])) as { error: unknown };
    dbOk = !error;
    if (error) {
      // 에러 원문은 서버 로그에만(응답엔 코드형만 노출)
      console.error("[api/health] db probe failed:", error);
    }
  } catch (e) {
    console.error("[api/health] db probe threw:", e);
    dbOk = false;
  }

  const ok = dbOk;
  return Response.json(
    {
      status: ok ? "ok" : "degraded",
      db: dbOk ? "up" : "down",
      latency_ms: Date.now() - started,
      timestamp: new Date().toISOString(),
      service: "khidi",
      // 「지금 실서비스로 돌고 있는 코드가 어느 커밋인가」.
      // 예비 배포 창구(.github/workflows/daily-deploy.yml)가 이 값을 보고 «이미 나갔나»를 판정한다.
      // 그 판정 하나 때문에 열쇠(Vercel API 토큰)를 새로 만들지 않으려고 여기에 싣는다.
      // 저장소가 공개라 커밋 번호는 이미 누구나 볼 수 있다 — 새로 새는 정보가 없다.
      // 두 갈래로 읽는다: 빌드 시점에 박은 값(next.config.js) → 실행 중 시스템 변수.
      // 한쪽이 비어도 다른 쪽이 채운다 — 둘 다 비면 창구가 «모르면 짓는다»로 돈다(안전한 쪽).
      commit: process.env.BUILD_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
