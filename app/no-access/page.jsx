/**
 * /no-access — 로그인은 됐지만 권한이 없는 보호구역에 들어왔을 때의 안내 페이지.
 *
 * 왜: 미들웨어(proxy.ts)가 비관리자를 말없이 /login 으로 되던져서
 *     "로그인 성공 토스트는 뜨는데 또 로그인 화면"인 혼란이 실제로 발생(2026-07-06 PO).
 *     거절 사유와 갈 곳을 알려주는 게 이 페이지의 전부다. 공개 라우트(내용 없음, noindex).
 */

export const metadata = {
  title: "접근 권한 없음",
  robots: { index: false, follow: false },
};

const AREA_LABEL = {
  admin: "관리자",
};

export default async function NoAccessPage({ searchParams }) {
  const sp = await searchParams;
  const areaLabel =
    typeof sp?.area === "string" && Object.hasOwn(AREA_LABEL, sp.area)
      ? AREA_LABEL[sp.area]
      : "요청하신";
  const fromRaw = typeof sp?.from === "string" ? sp.from : "";
  // open-redirect 차단: 내부 경로만 재로그인 목적지로 허용 (`//`·`/\` 우회 포함 차단)
  const from =
    fromRaw.startsWith("/") && !fromRaw.startsWith("//") && !fromRaw.startsWith("/\\")
      ? fromRaw
      : "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-3xl mb-3">🔒</p>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{areaLabel} 전용 화면입니다</h1>
        <p className="text-sm text-gray-500 mb-6">
          지금 로그인된 계정에는 이 화면에 들어갈 권한이 없습니다.
          <br />
          계정을 착각하셨다면 아래에서 다시 로그인하세요.
        </p>
        <div className="space-y-2">
          <a
            href={`/login?redirect=${encodeURIComponent(from)}`}
            className="block w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition"
          >
            다른 계정으로 로그인
          </a>
          <a
            href="/coordinator"
            className="block w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
          >
            코디네이터 화면으로
          </a>
          <a href="/" className="block w-full py-2.5 text-gray-400 text-xs hover:text-gray-600 transition">
            홈으로
          </a>
        </div>
      </div>
    </div>
  );
}
