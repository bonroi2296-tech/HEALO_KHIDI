import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ogLocaleFields, OG_LOCALE } from "./ogLocale";
import { LOCALES } from "./config";

/**
 * og:locale 이 «요청 언어»로 나가는지 잠근다.
 *
 * 왜 (2026-09-06 실서비스 실측): /ru 홈이 og:locale="en_US", /ru/treatments/digest 는 og:locale 없음.
 * 루트 layout 은 언어별로 채우는데, 페이지가 openGraph 를 «직접» 정의하면 Next 병합이 객체 단위라
 * layout 값이 통째로 빠진다. 그래서 규칙은 하나다 —
 *   openGraph 를 정의하는 page/layout 은 ①localizedMeta 를 쓰거나 ②ogLocaleFields(...) 를 펼치거나
 *   ③언어가 고정된 화면(/ru/…·/kk/…)만 locale 리터럴을 둔다.
 * 새 화면이 openGraph 를 손으로 짓고 locale 을 빠뜨리면 여기서 빨간불.
 */

describe("ogLocaleFields", () => {
  it("6개 언어 전부 OG 표기가 있고 kz 는 kk_KZ", () => {
    for (const l of LOCALES) expect(OG_LOCALE[l]).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    expect(OG_LOCALE.kz).toBe("kk_KZ");
  });
  it("요청 언어를 locale 로, 나머지를 alternateLocale 로", () => {
    const ru = ogLocaleFields("ru");
    expect(ru.locale).toBe("ru_RU");
    expect(ru.alternateLocale).not.toContain("ru_RU");
    expect(ru.alternateLocale).toHaveLength(LOCALES.length - 1);
  });
  it("모르는 언어·null 은 en_US 로 떨어진다 (빈 값 금지)", () => {
    expect(ogLocaleFields(null).locale).toBe("en_US");
    expect(ogLocaleFields("vi").locale).toBe("en_US");
  });
});

const APP_DIR = path.resolve(process.cwd(), "app");
const META_FILE = /^(page|layout)\.(jsx|tsx)$/;
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (META_FILE.test(entry.name)) out.push(p);
  }
  return out;
}

describe("openGraph 를 정의한 화면은 전부 og:locale 을 채운다", () => {
  const files = walk(APP_DIR).filter((f) => /\bopenGraph\s*:/.test(fs.readFileSync(f, "utf8")));
  it("대상 화면이 있다 (walk 가 비면 시험이 헛돈다)", () => {
    expect(files.length).toBeGreaterThan(5);
  });
  for (const f of files) {
    const rel = path.relative(process.cwd(), f);
    it(rel, () => {
      const src = fs.readFileSync(f, "utf8");
      const ok =
        /localizedMeta\(/.test(src) ||
        /ogLocaleFields\(/.test(src) ||
        // 언어 고정 화면(/ru/…·/kk/…)과 루트 layout 의 «언어화 안 된 요청» 기본값만 리터럴 허용
        /locale:\s*"(en_US|ko_KR|ru_RU|kk_KZ|zh_CN|ja_JP)"/.test(src);
      expect(ok, `${rel}: openGraph 에 og:locale 이 없다 — ...ogLocaleFields(locale) 를 펼쳐라`).toBe(true);
    });
  }
});
