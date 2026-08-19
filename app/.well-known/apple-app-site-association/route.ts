/**
 * healwith: 애플 «유니버설 링크» 검증 파일  (GET /.well-known/apple-app-site-association)
 *
 * 안드로이드의 assetlinks.json 과 같은 역할 — 아이폰이 「이 주소는 앱이 받아도 되는가」를 여기서 확인한다.
 * 없으면 가입 인증 메일·상담방 초대 링크가 앱이 아니라 사파리로 열린다.
 *
 * ⚠️ 애플 규칙 3가지 (하나라도 틀리면 조용히 실패한다)
 *   1. 확장자 없이 정확히 이 경로여야 한다 (`.json` 붙이면 안 됨)
 *   2. Content-Type 이 `application/json`
 *   3. 리다이렉트 없이 200 으로 바로 응답 (사파리는 리다이렉트를 따라가지 않는다)
 *
 * PO 가 할 일 (딱 하나):
 *   애플 개발자 계정 → Membership 에서 **Team ID**(10자리)를 복사해
 *   환경변수 `APPLE_TEAM_ID` 에 붙여넣는다.
 *   그리고 Xcode/Codemagic 쪽에서 `com.apple.developer.associated-domains` 에
 *   `applinks:healwith.co.kr` 을 넣어야 한다(App.entitlements — 같이 넣어뒀다).
 *
 * 확인: https://healwith.co.kr/.well-known/apple-app-site-association 에서 appID 가 보이면 OK.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUNDLE_ID = "kr.co.healwith.app";

export async function GET() {
  const teamId = (process.env.APPLE_TEAM_ID || "").trim().toUpperCase();
  // Team ID 는 영숫자 10자리. 형식이 틀리면 빈 값으로 둔다 —
  // 깨진 파일을 주면 애플이 검증을 통째로 포기한다.
  const valid = /^[A-Z0-9]{10}$/.test(teamId);

  const body = valid
    ? {
        applinks: {
          details: [
            {
              appIDs: [`${teamId}.${BUNDLE_ID}`],
              components: [
                // 우리 사이트 전체를 앱으로 연다. 단 아래는 제외 —
                // 로그인/인증 왕복은 브라우저에서 끝나야 세션이 꼬이지 않는다.
                { "/": "/auth/*", exclude: true, comment: "인증 콜백은 브라우저에서 처리" },
                { "/": "/api/*", exclude: true, comment: "API 는 앱으로 열 대상이 아님" },
                { "/": "/*" },
              ],
            },
          ],
        },
        // 「이 앱과 웹은 «같은 로그인 정보»를 쓴다」 — 아이클라우드 키체인·1Password 등이
        // 웹에 저장된 healwith 계정을 앱에서도 찾게 해준다. 안드로이드의 get_login_creds 와 같은 짝.
        // 없으면 관리자가 화면을 훑어 칸을 «찍는데», 그러다 아이디·비밀번호 칸을 서로 바꿔 채운다.
        // (App.entitlements 에 webcredentials:healwith.co.kr 도 같이 있어야 실제로 동작한다.)
        webcredentials: {
          apps: [`${teamId}.${BUNDLE_ID}`],
        },
      }
    : {};

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
