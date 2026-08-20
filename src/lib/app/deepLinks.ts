/**
 * healwith: 앱으로 들어온 주소(앱 링크)를 «그 화면»으로 데려간다 — 스토어 앱 전용, 웹에선 no-op.
 *
 * 왜 필요한가 (2026-08-20 흉내기 실측):
 *   `https://healwith.co.kr/ko/hospitals` 를 눌렀더니 **앱은 열렸는데 첫 화면(/ru)이 떴다.**
 *   찬 상태(앱 꺼져 있을 때)·더운 상태(앱 켜져 있을 때) 둘 다 같았다.
 *   AndroidManifest 의 앱 링크 설정은 «어느 앱이 이 주소를 받을지»만 정한다. 받은 주소를
 *   화면으로 옮기는 건 캡시터가 «자동으로 안 해 준다» — `Bridge.java` 는 그 주소를 보관만 하고
 *   (`intentUri`) `@capacitor/app` 을 통해 웹에 알려줄 뿐이다. 우리 웹에는 그걸 듣는 코드가 없었다.
 *
 * 무엇이 망가져 있었나 (사용자가 실제로 겪는 것):
 *   · 상담 초대 링크(`/c/<코드>`)를 폰에서 누르면 상담방이 아니라 홈이 열린다 → 환자가 회의에 못 들어온다.
 *   · 가입 인증·비밀번호 재설정 메일의 링크도 마찬가지로 홈으로 떨어진다.
 *   · 구글 로그인은 **일부러 바깥 브라우저로 내보내고 앱 링크로 돌아오는** 설계다
 *     (capacitor.config.ts 의 allowNavigation 주석) — 돌아온 주소가 무시되면 로그인 왕복이 끊긴다.
 *
 * 안전선:
 *   우리 호스트에서 온 주소만 받는다. 그리고 옮길 때는 **경로만** 쓴다(호스트는 버린다) —
 *   `//evil.com` 같은 바깥으로의 튕김을 원천적으로 막기 위해서다.
 */

/** 앱 링크로 받아도 되는 호스트. capacitor.config.ts·AndroidManifest 의 목록과 짝이다. */
const ALLOWED_HOSTS = ["healwith.co.kr", "www.healwith.co.kr"];

/**
 * 받은 주소를 «우리 사이트 안 경로»로 바꾼다. 우리 것이 아니면 null.
 * (순수 함수 — 시험은 deepLinks.test.ts)
 */
export function toInternalPath(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (!ALLOWED_HOSTS.includes(u.hostname.toLowerCase())) return null;
  const path = `${u.pathname}${u.search}${u.hash}`;
  // 경로가 비면(도메인만 눌린 경우) 홈이므로 옮길 필요가 없다.
  if (!path || path === "/") return null;
  return path;
}

/** 지금 화면의 경로 — toInternalPath 가 돌려주는 것과 같은 모양이어야 비교가 된다. */
function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * 「이 시작 주소는 이미 썼다」 도장. 찍혀 있으면 true 를 돌려주고, 아니면 찍고 false 를 돌려준다.
 * (sessionStorage 를 못 쓰는 환경이면 «안 썼다»로 보고 한 번만 옮긴다 — 되풀이가 무한이 되진 않게
 *  옮긴 뒤 경로가 같아져서 위쪽 비교에 걸린다.)
 */
const LAUNCH_MARK = "healwith:launchUrlHandled";
function launchUrlConsumed(url: string): boolean {
  try {
    if (window.sessionStorage.getItem(LAUNCH_MARK) === url) return true;
    window.sessionStorage.setItem(LAUNCH_MARK, url);
    return false;
  } catch {
    return false;
  }
}

let registered = false;

export async function registerDeepLinks(): Promise<void> {
  if (typeof window === "undefined") return;
  if (registered) return;
  // ⚠️ 도장은 «기다리기 전에» 찍는다. 부품을 불러오는 동안(await) 이 함수가 한 번 더 불리면
  //    위 검사를 둘 다 통과해 받는 자리가 두 개 붙고, 링크 한 번에 화면을 두 번 옮긴다.
  //    같은 함정을 뒤로가기에서 실제로 밟았다(androidBackButton.ts 주석 — 한 번 누른 게 두 번 처리됐다).
  registered = true;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return; // 브라우저면 종료 — 주소창이 이미 그 일을 한다
    const { App } = await import("@capacitor/app");

    // ① 앱이 켜져 있는 동안 링크를 누른 경우
    await App.addListener("appUrlOpen", ({ url }) => {
      const path = toInternalPath(url);
      if (path && path !== currentPath()) window.location.assign(path);
    });

    // ② 앱이 꺼져 있다가 링크로 «켜진» 경우 — 위 사건은 이미 지나갔으므로 따로 물어봐야 한다.
    const launch = await App.getLaunchUrl();
    if (launch?.url && !launchUrlConsumed(launch.url)) {
      // ⚠️ 옮기기 «전에» 먼저 「썼다」고 도장을 찍는다. 이유는 두 가지이고 둘 다 실제로 밟았다
      //    (2026-08-20 흉내기 실측):
      //    ⓐ 되풀이 — 이 앱은 화면을 옮길 때마다 문서가 통째로 새로 뜨고, 그때 이 코드가 다시 돈다.
      //       getLaunchUrl() 은 앱이 살아 있는 동안 «계속 같은 값»을 돌려주므로 도장이 없으면
      //       같은 주소로 영원히 다시 옮긴다(performance.now() 가 2775ms → 1142ms 로 되감기는 것으로 확인).
      //    ⓑ 옛 주소가 새 링크를 덮어씀 — 앱이 켜진 상태에서 다른 링크를 누르면 ①이 그리로 옮기는데,
      //       새 화면에서 이 코드가 또 «처음 켤 때 주소»로 되돌려버린다. 실제로 /ko/hospitals 를
      //       눌렀는데 /ko/faq 로 튕겨 돌아갔다.
      //    도장은 sessionStorage — 앱을 끄면 같이 사라지므로 «앱을 켤 때마다 한 번»이 정확히 맞는다.
      const launchPath = toInternalPath(launch.url);
      if (launchPath && launchPath !== currentPath()) {
        // replace: 뒤로가기를 눌렀을 때 «홈 → 링크 화면»을 오가지 않게 한다.
        window.location.replace(launchPath);
      }
    }
  } catch {
    /* 플러그인이 없거나 네이티브가 아님 → 무시(웹에서 정상) */
  }
}
