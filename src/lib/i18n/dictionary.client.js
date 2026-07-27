// 브라우저용 «빈 껍데기» 사전.
//
// next.config.js 가 클라이언트 빌드에서만 dictionary.js → 이 파일로 바꿔치기한다.
// 그래서 21개 언어 통짜 사전(gzip 269KB)이 브라우저 번들에 안 들어간다.
// 브라우저의 실제 문구는 layout 이 넣은 `/i18n/<lang>.js` 가 채우는 window.__I18N__ 에서 온다
// (i18n/index.js 의 dictOf() 참고).
//
// ⚠️ 여기에 무언가를 채우지 마라. 채우는 순간 그만큼이 전 페이지 번들로 다시 들어간다.
export const DICTIONARY = {};
