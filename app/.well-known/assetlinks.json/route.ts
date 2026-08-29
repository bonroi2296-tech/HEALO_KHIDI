/**
 * healwith: 안드로이드 «앱 링크» 검증 파일  (GET /.well-known/assetlinks.json)
 *
 * 이게 왜 필요한가:
 *   `AndroidManifest.xml` 에 「healwith.co.kr 주소는 앱이 받는다」고 선언(intent-filter autoVerify)해도,
 *   구글은 **사이트가 그 앱을 인정하는지** 이 파일로 확인한다. 없으면 검증에 실패해서
 *   가입 인증 메일·상담방 초대 링크가 여전히 크롬으로 열린다.
 *
 * 왜 정적 파일이 아니라 라우트인가:
 *   서명 키가 바뀌거나(키 교체) 지문이 늘어도 배포 없이 환경변수만 고치면 되기 때문이다.
 *
 * 🔴 **2026-08-30 정정 — 위에 「어시는 Play 콘솔 값을 볼 수 없다」고 적혀 있었는데 틀렸다.**
 *   앱 서명 지문은 화면에 «글자»로 없고 복사 버튼뿐이지만, `navigator.clipboard.writeText` 를
 *   가로채면 읽힌다(기억 `google-oauth-android-clients`). 그 오해 때문에 이 값이 「PO 손」으로
 *   분류돼 **정작 「지금 배포에 쓰이는 앱 서명 키」 하나가 빠진 채 두 달을 돌았다.**
 *     실측(2026-08-30): 실서비스 응답에는 «이전 앱 서명 키»와 «업로드 키»만 있었고,
 *     Play 콘솔 「앱 서명 → 기존 키」(SHA-1 `47:30:1E:B3:…`, 기억 표의 「지금 배포에 쓰임」)의
 *     SHA-256 이 없었다. 그 키로 서명된 앱에서는 링크 검증이 통과하지 못한다.
 *
 * 🔑 **그래서 지문을 «코드에» 둔다 — 환경변수는 «덧붙이는» 용도로만 쓴다.**
 *   ①지문은 공개값이다(Play 콘솔이 「이 스니펫을 복사해 붙여넣으라」며 그대로 준다).
 *   ②환경변수만 믿는 구조는 **빠뜨려도 조용하다** — 빈 배열이 나가고 앱 링크가 전부 죽는데
 *     화면엔 아무 표시가 없다. 실제로 그렇게 한 칸이 비어 있었다.
 *   새 키가 생기면 아래 목록에 «추가»하라(지우지 마라 — 옛 키로 서명된 앱이 아직 돈다).
 *
 * 확인 방법: https://healwith.co.kr/.well-known/assetlinks.json 을 열어 지문이 보이면 OK.
 *   (구글은 앱 설치 후 며칠 안에 자동 검증한다.)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PACKAGE_NAME = "kr.co.healwith.app";

/**
 * Play 콘솔 → 앱 서명에서 뽑은 SHA-256 지문. 셋 다 필요하다 — 어느 하나만 맞아도 검증되므로
 * 넣어서 손해가 없고, 빠지면 «그 키로 서명된 앱에서만» 조용히 링크가 죽는다.
 */
const KNOWN_FINGERPRINTS = [
  // 앱 서명 키 (지금 배포에 쓰임) — 콘솔 「기존 키」 열, SHA-1 은 47:30:1E:B3:…
  "C2:41:3B:DF:9B:1A:86:82:9A:B1:7D:A2:C4:5B:8B:07:B8:F9:0C:D8:D9:D3:D9:DF:39:DC:F5:E5:B8:91:C4:91",
  // 이전 앱 서명 키 — 2026-07-28 키 업그레이드 «전»에 서명된 앱들이 아직 이걸 쓴다.
  // Play 콘솔이 「디지털 애셋 링크 JSON」 스니펫으로 주는 값도 이것이다.
  "D8:A3:39:EE:BC:88:7B:96:EF:9C:BE:67:D4:58:8A:58:14:96:D3:FA:20:FD:CB:2A:B2:9A:E4:59:7A:84:7C:48",
  // 업로드 키 — Play 를 거치지 않고 직접 깐 판(내부 확인용 APK)이 이걸로 서명된다.
  "01:BD:09:B2:05:CD:71:FC:7F:82:95:01:2C:E2:CA:4A:B1:9D:FA:CB:57:79:AD:63:39:26:17:85:9B:F9:05:A6",
];

export async function GET() {
  const raw = process.env.ANDROID_APP_FINGERPRINTS || "";
  const fingerprints = [
    ...new Set(
      [...KNOWN_FINGERPRINTS, ...raw.split(",")]
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s)) // SHA-256 = 32바이트 = 콜론 구분 32칸
    ),
  ];

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
