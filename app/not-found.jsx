import NotFoundClient from "./NotFoundClient";
import { getUiLocale } from "@/lib/i18n/metadata";
import { NOT_FOUND_COPY } from "@/lib/i18n/notFoundCopy";

// 제목도 방문자 언어로(2026-09-06 — 「Page not found」 고정이었다). 언어 판정은 layout 과 같은 getUiLocale.
export async function generateMetadata() {
  const lang = await getUiLocale();
  const c = NOT_FOUND_COPY[lang] || NOT_FOUND_COPY.en;
  return { title: c.title, robots: { index: false, follow: false } };
}

export default function NotFound() {
  return <NotFoundClient />;
}
