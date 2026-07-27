// 서버에서 «그 방문자 언어의 사전»을 HTML 안 <script> 로 인라인할 문자열을 만든다.
// 브라우저의 t() 는 이 window.__I18N__ 을 읽는다 (i18n/index.js 의 dictOf 참고).
//
// (이스케이프 처리를 layout.jsx 안에 두면 읽기도 고치기도 나빠서 별도 파일로 뺐다.)
import { DICTIONARY } from "./dictionary";

// <script> 안에 들어가므로 '</script' 를 만들 수 있는 '<' 를 막고,
// JS 소스에서 「줄바꿈」으로 취급되는 U+2028/U+2029 도 막는다.
// ⚠️ 이 두 글자는 소스에 날것으로 못 적는다(적는 순간 이 파일이 파싱 에러) → 코드로 만든다.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const UNSAFE = new RegExp("[<\\u2028\\u2029]", "g");
const ESCAPES = { "<": "\\u003c", [LS]: "\\u2028", [PS]: "\\u2029" };

/**
 * @param {string[]} langs  브라우저에 심을 언어들(보통 1개, 쿠키 언어가 다르면 2개)
 * @param {string} primary  못 받은 언어로 t() 를 부를 때 되돌아갈 기본 언어
 */
export function i18nInlineScript(langs, primary) {
  const payload = { __primary: primary };
  for (const code of langs) {
    // en 을 깔고 그 언어를 덮는다 = 그 언어에 없는 키가 영어로 채워진 「완성본」.
    // 덕분에 브라우저가 en 사전을 따로 안 받아도 t() 의 영어 폴백이 그대로 동작한다.
    payload[code] = code === "en" ? DICTIONARY.en : { ...DICTIONARY.en, ...(DICTIONARY[code] || {}) };
  }
  const json = JSON.stringify(payload).replace(UNSAFE, (c) => ESCAPES[c]);
  return `window.__I18N__=${json};`;
}
