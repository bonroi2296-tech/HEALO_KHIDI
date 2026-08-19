/**
 * healwith: 안드로이드 «앱 링크» 검증 파일  (GET /.well-known/assetlinks.json)
 *
 * 이게 왜 필요한가:
 *   `AndroidManifest.xml` 에 「healwith.co.kr 주소는 앱이 받는다」고 선언(intent-filter autoVerify)해도,
 *   구글은 **사이트가 그 앱을 인정하는지** 이 파일로 확인한다. 없으면 검증에 실패해서
 *   가입 인증 메일·상담방 초대 링크가 여전히 크롬으로 열린다.
 *
 * 왜 정적 파일이 아니라 라우트인가:
 *   필요한 값(앱 서명 지문 SHA-256)은 **Play 콘솔에서 뽑아야** 하고 어시는 볼 수 없다.
 *   파일로 두면 PO 가 JSON 을 직접 만들어야 하지만, 라우트로 두면 **환경변수에 값 하나만 붙여넣으면 된다.**
 *   서명 키가 바뀌거나(키 교체) 지문이 늘어도 배포 없이 환경변수만 고치면 된다.
 *
 * PO 가 할 일 (딱 하나):
 *   Play 콘솔 → 앱 → 「앱 서명」 → **앱 서명 키 인증서**의 SHA-256 지문을 복사해서
 *   환경변수 `ANDROID_APP_FINGERPRINTS` 에 붙여넣는다.
 *   여러 개면 쉼표로 구분(예: 업로드 키 + 앱 서명 키 둘 다 넣는 게 안전).
 *
 * 확인 방법: https://healwith.co.kr/.well-known/assetlinks.json 을 열어 지문이 보이면 OK.
 *   (구글은 앱 설치 후 며칠 안에 자동 검증한다.)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PACKAGE_NAME = "kr.co.healwith.app";

export async function GET() {
  const raw = process.env.ANDROID_APP_FINGERPRINTS || "";
  const fingerprints = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s)); // SHA-256 = 32바이트 = 콜론 구분 32칸

  // 지문이 없으면 «빈 배열»을 준다. 잘못된 값을 주는 것보다 낫다 —
  // 구글은 형식이 깨진 파일을 만나면 검증을 아예 포기한다.
  const body = fingerprints.length
    ? [
        {
          // handle_all_urls  = 「이 앱이 우리 웹 주소를 열 수 있다」(앱 링크)
          // get_login_creds  = 「이 앱과 웹은 «같은 로그인 정보»를 쓴다」(비밀번호 공유)
          //   ⚠️ 두 번째가 없으면 폰 비밀번호 관리자가 웹에 저장된 healwith 계정을 앱에서 «못 찾아»
          //      화면을 훑어 칸을 찍는다 → 아이디·비밀번호 칸을 서로 바꿔 채우는 사고가 난다
          //      (2026-08-14 PO 갤럭시 S25 Ultra 실기기 신고. 순정 안드로이드 흉내기에선 재현 안 됨).
          relation: [
            "delegate_permission/common.handle_all_urls",
            "delegate_permission/common.get_login_creds",
          ],
          target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // 지문이 바뀌면 빨리 반영되도록 짧게 캐시한다.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
