/**
 * 404 화면 글자 — 서버(제목 <title>)와 클라이언트(본문)가 같은 표를 쓴다.
 * 2026-09-06: 제목이 「Page not found」 영어 고정이었고, 쿠키 없는 첫 방문은 본문까지 영어였다(proxy.ts 의 hasLocale 분기 참고).
 */
export const NOT_FOUND_COPY = {
  ko: { title: "페이지를 찾을 수 없습니다", body: "주소가 바뀌었거나 존재하지 않는 페이지예요.", home: "홈으로", inquiry: "상담 신청 →" },
  en: { title: "Page not found", body: "The page you're looking for doesn't exist or has moved.", home: "Home", inquiry: "Make an inquiry →" },
  ru: { title: "Страница не найдена", body: "Запрашиваемая страница не существует или была перемещена.", home: "На главную", inquiry: "Оставить заявку →" },
  kz: { title: "Бет табылмады", body: "Сұралған бет жоқ немесе жылжытылған.", home: "Басты бетке", inquiry: "Сұраныс қалдыру →" },
  zh: { title: "未找到页面", body: "您访问的页面不存在或已移动。", home: "返回首页", inquiry: "在线咨询 →" },
  ja: { title: "ページが見つかりません", body: "お探しのページは存在しないか、移動されました。", home: "ホームへ", inquiry: "お問い合わせ →" },
};
