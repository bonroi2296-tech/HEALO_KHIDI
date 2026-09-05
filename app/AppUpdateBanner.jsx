"use client";

/**
 * 앱이 옛 판일 때 화면 위에 뜨는 안내 띠.
 *
 * 🛑 **막지 않는다** (PO 결정 2026-08-28). 닫을 수 있고, 닫아도 앱은 그대로 쓸 수 있다.
 *    암환자 상담 서비스라 「못 들어오게 막는 것」이 훨씬 위험하다.
 *
 * 왜 있나: 이 앱은 웹을 그대로 띄우는 구조라 **웹 배포가 앱 업데이트보다 항상 먼저 나간다.**
 *    그 사이 구간에서 옛 앱을 쓰는 사람은 새 기능이 없어 화면이 고장난 것처럼 보인다
 *    (2026-08-28 애플 로그인이 실제로 그랬다). 각 기능의 폴백과 «별개»로, 여기서
 *    「업데이트하면 제대로 된다」는 것을 알려 준다.
 */

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/LangContext";
import { readAppBuild, needsUpdate, STORE_URL } from "@/lib/app/appUpdateNotice";

export default function AppUpdateBanner() {
  const langCode = useLang();
  const [platform, setPlatform] = useState(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let alive = true;
    // ⚠️ 화면을 그리는 도중이 아니라 마운트 «뒤»에 읽는다 — 서버에는 앱 정보가 없다.
    readAppBuild().then((info) => {
      if (!alive || !info) return;
      if (needsUpdate(info.platform, info.build)) setPlatform(info.platform);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!platform || closed) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3">
      <p className="flex-1 text-sm text-amber-900 leading-snug">
        {t("app.updateNotice", langCode)}
      </p>
      <a
        href={STORE_URL[platform]}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-sm font-semibold text-amber-900 underline underline-offset-2"
      >
        {t("app.updateAction", langCode)}
      </a>
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label={t("policy.close", langCode)}
        className="shrink-0 text-amber-700 hover:text-amber-900 text-lg leading-none px-1"
      >
        ×
      </button>
    </div>
  );
}
