/**
 * E2E B-3: 공개 AI 상담 — 의료 자료 첨부
 *
 * - 클립으로 파일을 붙이면 파일명 칩이 뜬다
 * - 칩의 × 로 다시 뗄 수 있다
 *
 * ⚠️ 2026-08-25 고침(옛 이름 intake-file-upload.spec.ts):
 *    예전엔 /intake 에서 input[type=file] 을 찾다 «없으면 건너뜀»으로 빠졌다. /intake 는 이미
 *    없어진 주소라(공개 문의 화면으로 넘어감, 입력칸 0개) 이 검사는 한 번도 돈 적이 없다.
 *    파일 붙이기가 실제로 사는 자리는 공개 AI 상담(ThreadChat)의 클립이다.
 *
 * 🛑 여기서 붙인 파일은 실서비스 저장소로 올라간다 — 그래서 «60바이트 더미 한 개»만 쓰고
 *    이름에 e2e 표식을 남긴다. 보내지는 않으므로 대화에는 안 남는다.
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";
import { openPublicChat } from "./fixtures/publicChat";

test.describe("AI 상담 자료 첨부", () => {
  let tempFilePath: string;

  test.beforeAll(() => {
    // 임시 더미 파일 생성 (실제 의료 문서 아님)
    tempFilePath = path.join(os.tmpdir(), "e2e-dummy-medical-doc.pdf");
    fs.writeFileSync(
      tempFilePath,
      "%PDF-1.4 E2E TEST DUMMY FILE — NOT REAL MEDICAL DOCUMENT"
    );
  });

  test.afterAll(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  test("파일을 붙이면 파일명 칩이 뜨고, × 로 뗄 수 있다", async ({ page }) => {
    test.setTimeout(120_000);

    await openPublicChat(page);

    // 클립 뒤의 input 은 숨겨져 있는 게 정상 — 존재 여부로 판정하고 파일을 직접 넣는다.
    const fileInput = page.locator('[data-testid="chat-file-input"]');
    await expect(fileInput, "채팅에 파일 붙이는 칸이 없다").toHaveCount(1);
    await fileInput.setInputFiles(tempFilePath);

    const chip = page.locator('[data-testid="chat-attachment"]').first();
    await expect(chip, "파일을 붙였는데 파일명 칩이 안 뜬다").toBeVisible({ timeout: 45_000 });
    await expect(chip).toContainText("e2e-dummy-medical-doc");

    // 뗄 수 있어야 한다 — 잘못 올린 자료를 못 빼면 환자 자료가 그대로 나간다.
    await chip.locator('[data-testid="chat-attachment-remove"]').click();
    await expect(page.locator('[data-testid="chat-attachment"]')).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});
