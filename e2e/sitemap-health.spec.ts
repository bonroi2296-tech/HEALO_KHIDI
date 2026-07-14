import { test, expect } from "@playwright/test";

// ── 사이트맵 건강검진 — "사이트맵에 있다 = 실제로 열린다" 불변식 (POSTMORTEMS #88) ──
// 왜: 비공개 처리된 치료 6종이 스테일(빌드 시점 고정) 사이트맵에 남아 몇 달째 구글에
//     "있다"고 광고됨(열면 404 = 색인 신뢰 훼손). 코드·DB는 정상이었고 배포 캐시가 범인이라
//     정적 스캔(check:content)으로는 못 잡는 부류 — 실서비스를 매일 밤 기계로 확인한다.
// 실행: Production Nightly E2E(cron, 프로덕션 대상)에 자동 편입. PR/로컬 전체 E2E에서도
//     돌지만 로컬 서버 사이트맵 기준이라 통과가 정상(@smoke 아님 — PR 게이트는 그대로).
// 방식: <loc>의 도메인은 무시하고 경로만 대상 서버(baseURL)로 요청 — 도메인 하드코딩 무관.
test("사이트맵이 광고하는 모든 URL이 살아있다(<400)", async ({ request }) => {
  test.setTimeout(180_000); // 39경로 × 6언어 순차 요청 여유

  const res = await request.get("/sitemap.xml");
  expect(res.ok(), "sitemap.xml 자체가 안 열림").toBeTruthy();
  const xml = await res.text();

  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length, "사이트맵 URL이 비정상적으로 적음 — 생성 실패 의심").toBeGreaterThan(10);

  const failures: string[] = [];
  for (const loc of locs) {
    const path = new URL(loc).pathname;
    const r = await request.get(path, { failOnStatusCode: false });
    if (r.status() >= 400) failures.push(`${r.status()} ${path}`);
  }

  expect(
    failures,
    `사이트맵이 광고하는 죽은 URL ${failures.length}건:\n${failures.join("\n")}`
  ).toEqual([]);
});
