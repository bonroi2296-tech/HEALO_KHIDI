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
test("사이트맵이 광고하는 모든 URL(hreflang 포함)이 그 자체로 200 이다(3xx 도 실패)", async ({ request }) => {
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

  // ⚠️ maxRedirects: 0 — 2026-07-28 보강(POSTMORTEMS #139).
  // 원래는 리디렉션을 따라간 **최종** 상태를 봐서, 사이트맵이 「딴 데로 보내는 URL」을
  // 광고해도 200 으로 통과했다. 실제로 면력 지점 4개(×6언어=24 URL)가 /hospitals/immune 으로
  // 301 되면서 몇 주째 사이트맵에 실렸고, 구글은 「리디렉션이 포함된 페이지 = 색인 안 함」으로
  // 처리했다. 사이트맵에 실을 URL 은 그 자체가 200 이어야 한다 → 3xx 도 실패로 본다.
  // ⚠️ 단, «경로는 그대로인 호스트 정규화»(www→apex, http→https)는 리디렉션이 아니라 주소
  // 정규화다 — 프로덕션 나이틀리는 www 로 들어가므로 이걸 실패로 치면 전 URL 이 매일 밤 빨강이
  // 된다(독립 리뷰 지적). 판정 기준은 「상태코드가 3xx 인가」가 아니라 **「경로가 옮겨지는가」**다.
  const fetchStatus = async (path: string): Promise<number> => {
    try {
      const r = await request.get(path, { failOnStatusCode: false, timeout: 60_000, maxRedirects: 0 });
      const status = r.status();
      if (status < 300 || status >= 400) return status;
      const loc = r.headers()["location"];
      if (!loc) return status;
      const target = new URL(loc, r.url());
      if (target.pathname !== path) return status; // 경로가 바뀐다 = 진짜 리디렉션 → 실패
      // 경로 동일(호스트만 정규화) → 그 주소로 한 번 따라가 실제 상태를 본다
      const r2 = await request.get(target.href, { failOnStatusCode: false, timeout: 60_000, maxRedirects: 0 });
      return r2.status();
    } catch {
      return -1; // 네트워크 오류 — 재시도 대상
    }
  };
  const isBad = (status: number) => status === -1 || status >= 300;

  const failures: string[] = [];
  const CHUNK = 8;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const chunk = paths.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (path) => {
        let status = await fetchStatus(path);
        if (isBad(status)) status = await fetchStatus(path); // 블립 1회 재시도
        if (isBad(status)) failures.push(`${status === -1 ? "ERR" : status} ${path}`);
      })
    );
  }

  expect(
    failures,
    `사이트맵이 광고하는 죽은/딴 데로 보내는 URL ${failures.length}건 (3xx = 리디렉션도 실패):\n${failures.sort().join("\n")}`
  ).toEqual([]);
});
