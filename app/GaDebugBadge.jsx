"use client";

import { useEffect, useState } from "react";
import { getGaHealth, onGaActivity, probeGaEndpoint } from "@/lib/ga";

/**
 * GA 자가진단 배지 — 주소 뒤에 `?ga_debug=1` 을 붙여 열었을 때만 화면에 뜬다.
 *
 * 왜 만들었나 (2026-07-30):
 *   분석은 **틀려도 화면이 멀쩡하다.** 실제로 실서비스에서 gtag.js 가 500 으로 죽었는데
 *   페이지는 완벽히 정상이었고, 그 사실을 아는 방법이 «개발자도구 콘솔을 열어서 읽기» 뿐이었다.
 *   그래서 확인이 필요할 때마다 사람이 DevTools 를 켜고 스크린샷을 찍어야 했다.
 *   → 판정에 필요한 값 5개를 화면에 그대로 띄운다. 한 번 보면 «됐나 안 됐나»가 끝난다.
 *
 * 일반 방문자에게는 절대 안 보인다(주소로 ga_debug=1 을 직접 붙여야만 켜짐).
 * 광고를 켠 뒤에도 그대로 쓴다 — 힐위드/프로벨에 붙일 때 이 화면이 곧 검수 체크리스트다.
 */
export default function GaDebugBadge({
  gaId,
  consentGranted,
  isProduction,
  isAdminPath,
  interacted,
  loadFailed,
  retried,
}) {
  const [health, setHealth] = useState({
    loaded: false, configured: false, reachable: null, sent: 0, last: "", internal: false,
  });
  const [closed, setClosed] = useState(false);

  // 이벤트가 나갈 때(구독) + 스크립트가 뒤늦게 내려오는 경우(1초 폴링) 둘 다 따라간다.
  // ⚠️ 닫은 뒤에는 반드시 멈춰야 한다 — `if (closed) return null` 은 «안 그리는 것»일 뿐
  //    컴포넌트가 사라지는 게 아니라서, 그냥 두면 타이머가 탭이 닫힐 때까지 1초마다 계속 돈다.
  //    (그리고 getGaHealth() 는 매번 «새 객체»를 주므로 값이 같아도 리렌더가 발생한다 → 값 비교로 막는다.)
  useEffect(() => {
    if (closed) return;
    const sync = () =>
      setHealth((prev) => {
        const next = getGaHealth();
        const same =
          prev.loaded === next.loaded && prev.configured === next.configured &&
          prev.reachable === next.reachable &&
          prev.sent === next.sent && prev.last === next.last && prev.internal === next.internal;
        return same ? prev : next;   // 순수 비교만 — 여기서 부수효과 금지
      });
    probeGaEndpoint();   // 수집 주소가 차단됐는지 1회 확인(진단 화면에서만 나가는 요청)
    sync();
    const off = onGaActivity(sync);
    const tm = setInterval(sync, 1000);
    return () => { off(); clearInterval(tm); };
  }, [closed]);

  if (closed) return null;

  const script = health.loaded
    ? { icon: "✅", text: "내려옴" }
    : loadFailed
      ? {
          icon: "❌",
          // 실측상 가장 흔한 원인이 광고차단기다(2026-07-30: AdGuard 가 «/* Blocked by AdGuard */»
          // 를 500 으로 돌려줬다). 원인을 여기 적어야 사람이 다음 행동을 안다.
          text: retried
            ? "실패(재시도했는데도 안 됨) — 광고차단기(AdGuard·uBlock 등)부터 꺼봐라"
            : "실패 — 재시도 중",
        }
      : !interacted
        ? { icon: "⏳", text: "대기 중 (아무 곳이나 한 번 터치하거나 5초 기다려라)" }
        : { icon: "⏳", text: "받는 중" };

  const rows = [
    ["측정 ID", gaId ? `✅ ${gaId}` : "❌ 없음"],
    ["쿠키 동의", consentGranted ? "✅ 모두 허용" : "❌ 없음 — 아래 쿠키창에서 «모두 허용»을 눌러라"],
    ["실서비스 모드", isProduction ? "✅" : "❌ 개발 모드 (여기선 원래 안 보냄)"],
    ["관리자 경로", isAdminPath ? "❌ /admin 은 일부러 제외" : "✅ 아님"],
    ["gtag.js", `${script.icon} ${script.text}`],
    // ⚠️ 이 줄은 «우리 탭 안의 사실»이다 — 대기줄에 실렸다는 뜻이지 도착했다는 뜻이 아니다.
    //    도착 여부는 아래 「수집 주소」 줄이 본다. 예전 문구(«GA 가 받았음»)는 과장이었다.
    ["화면 조회 전달", health.configured ? "✅ 대기줄에 실림" : "⏳ 아직"],
    [
      "수집 주소",
      health.reachable === null
        ? "⏳ 확인 중"
        : health.reachable
          ? "✅ 막힘 없음"
          : "❌ 광고차단기·DNS 가 막고 있다 — 이 기기에선 아무것도 도착하지 않는다",
    ],
  ];
  if (health.internal) rows.push(["직원 계정", "🚫 로그인이 직원이라 추적을 껐음 (로그아웃하고 봐라)"]);

  // ⚠️ 판정(ok)에 「우리 이벤트 건수」를 넣으면 안 된다 — 첫 화면만 보고 나간 방문에서는
  //    정상인데도 0 건이다(랜딩 조회는 gtag.js 가 스스로 보낸다 — ga.ts 의 isGaConfigured 주석).
  //    그걸 기준으로 삼으면 잘 되는 상태를 «실패»라고 표시한다. 건수는 «참고용»으로만 보여준다.
  //    수집 주소 차단은 «확인될 때까지(null)»는 판정을 깎지 않는다 — 확인 중에 빨간불을
  //    띄우면 잠깐 사이에 사람이 «고장»으로 읽는다. 차단이 «확정»된 경우에만 실패로 본다.
  const ok = health.loaded && health.configured && !health.internal && health.reachable !== false;

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 2147483000,
        maxWidth: 340,
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${ok ? "#0d9488" : "#dc2626"}`,
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
        font: "500 12px/1.55 system-ui, -apple-system, sans-serif",
        color: "#0f172a",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <strong style={{ color: ok ? "#0d9488" : "#dc2626", fontSize: 13 }}>
          {ok ? "GA 정상 — 들어가고 있음" : "GA 자가진단"}
        </strong>
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="자가진단 닫기"
          style={{
            marginLeft: "auto", border: "none", background: "transparent",
            cursor: "pointer", color: "#64748b", fontSize: 14, lineHeight: 1, padding: 2,
          }}
        >
          ✕
        </button>
      </div>

      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <span style={{ flex: "0 0 82px", color: "#64748b" }}>{label}</span>
          <span style={{ flex: 1, wordBreak: "keep-all" }}>{value}</span>
        </div>
      ))}

      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e2e8f0", color: "#64748b" }}>
        <div>
          우리 이벤트 <strong>{health.sent}건</strong>
          {health.sent > 0 ? ` (마지막: ${health.last})` : " — 첫 화면만 봤으면 0건이 정상"}
          <span style={{ color: "#94a3b8" }}> · 참고용(판정 아님)</span>
        </div>
        <div style={{ marginTop: 4 }}>
          위 줄이 다 ✅ 면 GA4 「DebugView」에도 몇 초 안에 뜬다. 끄려면 주소 뒤에 <code>?ga_debug=0</code>.
        </div>
      </div>
    </div>
  );
}
