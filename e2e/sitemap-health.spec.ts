import { test, expect } from "@playwright/test";

// ── 사이트맵 건강검진 — "사이트맵에 있다 = 실제로 열린다" 불변식 (POSTMORTEMS #88) ──
// 왜: 비공개 처리된 치료 6종이 스테일(빌드 시점 고정) 사이트맵에 남아 몇 달째 구글에
//     "있다"고 광고됨(열면 404 = 색인 신뢰 훼손). 코드·DB는 정상이었고 배포 캐시가 범인이라
//     정적 스캔(check:content)으로는 못 잡는 부류 — 실서비스를 매일 밤 기계로 확인한다.
// 실행 시점(정직하게): Production Nightly E2E(cron, 프로덕션 대상)와 main push 후 Full E2E,
//     workflow_dispatch. @smoke 태그가 없어 PR 게이트(e2e:smoke)에선 돌지 않는다 —
//     40+ 요청은 PR 게이트에 무겁고, 이 가드의 표적(배포 캐시 스테일)은 어차피 배포 후에만 존재.
// 검사 범위: <loc>(캐노니컬 /en)뿐 아니라 hreflang 대체 URL(<xhtml:link href>)까지 전부 —
//     주 타겟(ru·kz) 언어 변형이 죽는 회귀도 잡는다(#88 독립 리뷰 지적).
// 방식: URL의 도메인은 무시하고 경로만 대상 서버(baseURL)로 요청 — 도메인 하드코딩 무관.
//     네트워크 블립 오탐 방지: URL당 1회 재시도 후에만 실패로 집계.
test("사이트맵이 광고하는 모든 URL(hreflang 포함)이 살아있다(<400)", async ({ request }) => {
  test.setTimeout(420_000); // 약 230 URL, 8개씩 병렬

  const res = await request.get("/sitemap.xml");
  expect(res.ok(), "sitemap.xml 자체가 안 열림").toBeTruthy();
  const xml = await res.text();

  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const alternates = [...xml.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const paths = [...new Set([...locs, ...alternates].map((u) => new URL(u).pathname))];

  // DB 장애로 상세 URL이 통째로 빠진 "빈 사이트맵"이 200으로 서빙되는 퇴화도 잡는다
  // (정적 페이지만 있어도 24+이므로, 그보다 적으면 생성 자체가 비정상).
  expect(locs.length, "사이트맵 URL이 비정상적으로 적음 — 생성 실패/퇴화 의심").toBeGreaterThan(20);

  const fetchStatus = async (path: string): Promise<number> => {
    try {
      const r = await request.get(path, { failOnStatusCode: false, timeout: 60_000 });
      return r.status();
    } catch {
      return -1; // 네트워크 오류 — 재시도 대상
    }
  };

  const failures: string[] = [];
  const CHUNK = 8;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const chunk = paths.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (path) => {
        let status = await fetchStatus(path);
        if (status >= 400 || status === -1) status = await fetchStatus(path); // 블립 1회 재시도
        if (status >= 400 || status === -1) failures.push(`${status === -1 ? "ERR" : status} ${path}`);
      })
    );
  }

  expect(
    failures,
    `사이트맵이 광고하는 죽은 URL ${failures.length}건:\n${failures.sort().join("\n")}`
  ).toEqual([]);
});
