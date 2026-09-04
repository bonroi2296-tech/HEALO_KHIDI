/**
 * 첨부·서류를 «실제로 내려받아» 저장되는 파일 이름을 눈으로 대조한다.
 *
 * 왜 있나 (반성문 #181, 2026-09-02): 러시아어 첨부를 내려받으면 이름이
 * `%D0%98%D1%81…` 라는 퍼센트 문자열로 저장되고 있었다. 27일간 아무도 몰랐다 —
 * **비ASCII 이름으로 실제로 눌러보는 검사가 저장소에 한 건도 없었기 때문**이다.
 * 코드 모양을 보는 단위 시험(`sharedDocMeta.test.ts`)은 「우리가 아는 잘못된 방식」만 막는다.
 * 이 검사는 그것과 달리 **결과**를 본다 — 다른 방식으로 깨져도 여기서 걸린다.
 *
 * ⚠️ 이 파일은 「환경변수 없으면 스킵」 관례를 **일부러 따르지 않는다.**
 *    이 저장소는 스킵이 초록불로 보여 야간 검사가 8일간 조용히 죽어 있던 전례가 있다.
 *    그래서 **CI 에서 열쇠가 없으면 실패**시킨다(로컬에서만 스킵 + 무엇이 없는지 출력).
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAs } from "./fixtures/auth";
import { withDownloadName } from "../src/lib/documents/sharedDocMeta";
// @ts-expect-error — .mjs 유틸(타입 선언 없음). 값 끝의 리터럴 개행까지 벗기는 유일한 자리다.
import { loadEnvLocal } from "../scripts/_env.mjs";

// CI 는 워크플로가 env 로 넘긴다. 로컬은 그게 없어 «항상 스킵»이 되므로 여기서 읽어 준다
// (읽어 주지 않으면 개발자 기계에서는 이 검사가 영원히 안 돈다 = 있으나 마나).
if (!process.env.CI) {
  try {
    loadEnvLocal({ applyToProcess: true });
  } catch {
    /* .env.local 이 없어도 계속 — 아래에서 무엇이 없는지 알려준다 */
  }
}

// 우리 환자가 실제로 올리는 이름들. 언어마다 «인코딩이 필요한 글자»가 다르다.
const NAMES = [
  { label: "러시아어", file: "История болезни.pdf" },
  { label: "한국어", file: "진료기록 사본.pdf" },
  { label: "중국어", file: "报告 (1).pdf" },
  { label: "영어(대조군)", file: "medical record.pdf" },
];

const BUCKET = "attachments";
const PREFIX = "inquiry/e2e-filename"; // 이 검사가 만든 것만 이 아래에 둔다 — 끝나면 지운다

/**
 * 🛑 반드시 «검사 대상 서버가 보는 것과 같은» 저장소를 써야 한다.
 *
 * 함정 (2026-09-02 실제로 여기서 40분 헤맴): `.env.local` 에는 `E2E_SUPABASE_URL` 이
 * **다른 프로젝트**를 가리키고 있다. 그걸 먼저 집으면 이 검사는 A 저장소에 파일을 올리고
 * dev 서버는 B 저장소를 뒤져 «Object not found» 가 난다 — 증상이 「인증 실패」처럼 보인다.
 * CI 는 워크플로가 `NEXT_PUBLIC_SUPABASE_URL` 까지 E2E 값으로 덮으므로 자동으로 맞는다.
 * → 그러니 여기서는 **서버와 같은 이름의 값만** 읽는다.
 */
function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, key, missing: [!url && "NEXT_PUBLIC_SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean) };
}

/**
 * 열쇠·계정이 없을 때의 처리. **CI 면 실패**, 로컬이면 스킵.
 * 스킵을 CI 까지 들고 가면 「검사가 있는데 안 도는 상태」가 초록불로 보인다(#181 덧붙임).
 */
function requireOrSkip(missing: string[], what: string) {
  if (!missing.length) return false;
  const msg = `${what} 을 잴 수 없다 — 없는 값: ${missing.join(", ")}`;
  if (process.env.CI) throw new Error(`[검사가 돌지 못했다] ${msg}. CI 에서는 스킵하지 않는다.`);
  test.skip(true, `${msg} (로컬이라 건너뜀 — CI 였으면 실패)`);
  return true;
}

test.describe("내려받은 파일 이름이 원본 그대로인가 (실제 다운로드)", () => {
  test("@smoke 저장소에서 곧장 — 러시아어·한글·중국어", async ({ page }) => {
    const { url, key, missing } = supabaseEnv();
    if (requireOrSkip(missing, "저장소 왕복")) return;

    const sb = createClient(url!, key!);
    const uploaded: string[] = [];

    try {
      for (const { label, file } of NAMES) {
        // 저장소 경로는 늘 ASCII 다(업로드할 때 임의값을 붙인다) — 깨지는 건 «보여줄 이름» 쪽이다.
        const objectPath = `${PREFIX}/${Date.now()}-${uploaded.length}.pdf`;
        const { error: upErr } = await sb.storage
          .from(BUCKET)
          .upload(objectPath, Buffer.from("%PDF-1.4\n% e2e filename probe\n"), {
            contentType: "application/pdf",
            upsert: true,
          });
        // 통이 없거나 열쇠가 죽었으면 여기서 «명확하게» 터뜨린다.
        // 2026-08-30 에 「칩이 안 뜬다」의 진범이 «검사 DB 에 통이 0개»였는데
        // 그때는 이 실패가 화면 문제처럼 보였다 — 무엇이 없는지 메시지에 남긴다.
        expect(upErr, `저장소 업로드 실패(통 «${BUCKET}» 이 없거나 열쇠가 죽음): ${upErr?.message}`).toBeNull();
        uploaded.push(objectPath);

        const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(objectPath, 300);
        const downloadUrl = withDownloadName(signed!.signedUrl, file)!;

        const [dl] = await Promise.all([
          page.waitForEvent("download", { timeout: 30_000 }),
          page.evaluate((u) => {
            const a = document.createElement("a");
            a.href = u;
            document.body.appendChild(a);
            a.click();
          }, downloadUrl),
        ]);

        // 브라우저가 유니코드를 합성형으로 정규화해 저장하는 경우가 있다(자모 분해형 ↔ 합성형).
        // 글자는 같으므로 NFC 로 맞춰 비교한다.
        expect(
          dl.suggestedFilename().normalize("NFC"),
          `${label} 이름이 그대로 저장되지 않았다`
        ).toBe(file.normalize("NFC"));
      }
    } finally {
      if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded);
    }
  });

  test("@smoke 우리 창구를 거쳐서 — /api/attachments/sign", async ({ page }) => {
    const { url, key, missing } = supabaseEnv();
    const need = [...missing, !process.env.E2E_ADMIN_EMAIL && "E2E_ADMIN_EMAIL"].filter(Boolean) as string[];
    if (requireOrSkip(need, "창구 왕복")) return;

    await loginAs(page, "admin");
    const sb = createClient(url!, key!);
    const objectPath = `${PREFIX}/${Date.now()}-route.pdf`;

    try {
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(objectPath, Buffer.from("%PDF-1.4\n% e2e route probe\n"), {
          contentType: "application/pdf",
          upsert: true,
        });
      expect(upErr, `저장소 업로드 실패: ${upErr?.message}`).toBeNull();

      const wanted = "История болезни (копия).pdf";
      // 어드민 쿠키를 그대로 실어 우리 창구에 묻는다 — 라우트가 이름을 어떻게 붙이는지가 핵심.
      const res = await page.request.post("/api/attachments/sign", {
        data: { path: objectPath, download: wanted },
      });
      const body = await res.json().catch(() => ({}));
      // 실패하면 «무엇이 막았는지»가 바로 보여야 한다 — 상태 코드만으로는 인증 문제인지
      // 경로 문제인지 구분이 안 돼 원인 찾는 데 시간이 든다.
      expect(res.status(), `어드민 세션인데 서명 발급 실패. 응답: ${JSON.stringify(body)}`).toBe(200);
      expect(body.signedUrl, "창구가 주소를 안 내줬다").toBeTruthy();

      const [dl] = await Promise.all([
        page.waitForEvent("download", { timeout: 30_000 }),
        page.evaluate((u) => {
          const a = document.createElement("a");
          a.href = u;
          document.body.appendChild(a);
          a.click();
        }, body.signedUrl),
      ]);
      expect(dl.suggestedFilename().normalize("NFC")).toBe(wanted.normalize("NFC"));
    } finally {
      await sb.storage.from(BUCKET).remove([objectPath]);
    }
  });
});

/**
 * 동의서 PDF — 여기는 «이름이 깨지는» 게 아니라 «요청이 죽는» 자리였다.
 * 환자 이름이 키릴·한글이면 헤더에 못 실어 500 이 났다(2026-09-02 실측, 영어 이름만 200).
 */
test.describe("문서 발급이 비ASCII 환자 이름에서도 되는가", () => {
  test("@smoke 동의서 PDF — 키릴·한글 이름에서 500 이 나지 않는다", async ({ page }) => {
    if (requireOrSkip([!process.env.E2E_ADMIN_EMAIL && "E2E_ADMIN_EMAIL"].filter(Boolean) as string[], "동의서 발급"))
      return;

    await loginAs(page, "admin");

    for (const name of ["Иванов Тулеген", "김철수", "John Smith"]) {
      const res = await page.request.post("/api/pdf/consent/personal", {
        data: { lang: "ko", patient: { name, passport: "N0000000" } },
      });
      expect(res.status(), `환자 이름 «${name}» 으로 동의서 발급이 실패했다`).toBe(200);

      // 헤더에 원본 이름이 «되읽을 수 있게» 실려 있어야 한다(RFC 5987).
      const cd = res.headers()["content-disposition"] || "";
      const star = cd.match(/filename\*=UTF-8''([^;]+)/)?.[1];
      expect(star, `filename* 가 없다 — 비ASCII 이름이 소실된다: ${cd}`).toBeTruthy();
      expect(decodeURIComponent(star!)).toContain(name);
    }
  });
});
