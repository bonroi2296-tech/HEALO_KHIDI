/**
 * 문의가 «어디서 · 어느 언어 화면에서» 들어왔는지 한 번만 잡아 두는 곳.
 *
 * 왜 필요한가: 지금 문의에 남는 언어는 폼에서 고른 «답변 희망 언어» 하나뿐이다.
 * 그래서 «러시아어 화면이 실제로 문의를 데려왔나», «검색인가 에이전시인가 광고인가»,
 * «어느 페이지를 보고 문의했나»를 숫자로 셀 수 없다. 다국어·콘텐츠에 들인 품이
 * 실적으로 이어졌는지 증명하려면 이 네 칸이 있어야 한다.
 *
 * 왜 «첫 진입 때 한 번»인가: 사이트 안에서 한 번이라도 이동하면 document.referrer 가
 * 우리 도메인으로 바뀐다 → 문의 폼에 도착한 시점에 재면 전부 «내부 이동»으로 찍혀
 * 자료가 통째로 쓸모없어진다. 그래서 들어온 순간에 잡아 세션 저장소에 넣고,
 * 제출할 때 꺼내 쓴다.
 *
 * 개인정보: 유입 주소를 통째로 들고 있지 않고 «호스트»만 남긴다(주소 뒤에 검색어·
 * 식별자가 붙어 오는 경로가 있다). 세션 저장소라 브라우저를 닫으면 사라지고,
 * 실제 저장은 PIPA 동의를 받은 문의 제출 시점에만 일어난다.
 */

const KEY = "healo_arrival";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];

// 주소 경로에 «비밀 열쇠»가 박혀 오는 화면들이 있다 — 상담 초대 링크(/c/<32자>),
// 설문(/survey/<토큰>), 의견서(/opinions/<토큰>). 그 화면에서 문의로 넘어오면 열쇠가
// 문의 표에 평문으로 남는다. 우리가 알고 싶은 건 «어느 종류의 페이지였나»뿐이므로 지운다.
// 판정: 숫자를 포함한 20자 이상 조각 = 사람이 지은 이름이 아니다.
//       («for-kazakh-patients»·«cost-calculator» 같은 진짜 경로는 숫자가 없어 안 걸린다.)
const TOKENISH = /\/(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{20,}(?=\/|$)/g;

/** 경로에서 비밀 열쇠로 보이는 조각을 지우고 길이를 자른다. */
export function safeLandingPath(p) {
  if (typeof p !== "string" || !p) return null;
  return p.replace(TOKENISH, "/:token").slice(0, 200);
}

/** 첫 진입 정보를 세션에 한 번만 기록. 두 번째 호출부터는 아무 일도 안 한다. */
export function captureArrival() {
  try {
    if (sessionStorage.getItem(KEY)) return;

    const params = new URLSearchParams(location.search);
    const utm = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 60);
    }

    let host = null;
    try {
      host = new URL(document.referrer).hostname;
    } catch {
      /* 직접 방문 · 앱에서 열림 → referrer 없음 */
    }
    // 내부 이동은 «유입»이 아니다. 첫 진입인데 우리 호스트면 새로고침 등이므로 비운다.
    if (host === location.hostname) host = null;

    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        referrerHost: host,
        utm: Object.keys(utm).length ? utm : null,
        landingPath: safeLandingPath(location.pathname),
      })
    );
  } catch {
    /* 시크릿 모드·저장소 차단 → 유입 기록 없이 그냥 진행(문의 접수는 막지 않는다) */
  }
}

/** 제출할 때 동봉할 값. 기록이 없으면 전부 null. */
export function getArrival(lang) {
  let saved = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) || "{}") || {};
  } catch {
    /* 손상된 값 → 없는 것으로 */
  }
  return {
    sourceLocale: lang || null,
    referrerHost: saved.referrerHost ?? null,
    landingPath: saved.landingPath ?? null,
    utm: saved.utm ?? null,
  };
}
