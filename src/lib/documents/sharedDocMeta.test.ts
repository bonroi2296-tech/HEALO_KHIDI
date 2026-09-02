/**
 * 언어 알아맞히기 시험 — 「반만 맞는 추측」이 제일 해로워서(환자가 못 읽는 언어를 자기 것으로
 * 착각한다) 사람 이름에 걸리는 오탐을 특히 잰다.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { guessDocLang, docDisplayTitle, withDownloadName } from "./sharedDocMeta";

describe("guessDocLang", () => {
  it("파일명의 언어 토막을 읽는다", () => {
    expect(guessDocLang("SECOND OPINION_RU_AMANOV_TULEGEN.docx")).toBe("ru");
    expect(guessDocLang("COVER LETTER_KZ_AMANOV TOLEGEN.docx")).toBe("kz");
    expect(guessDocLang("안내문-korean.pdf")).toBe("ko");
  });

  it("사람 이름 속 글자에는 안 걸린다", () => {
    // TULEGEN 안의 EN, ENGLISH 아닌 것들. 토막으로 떨어져 있을 때만 센다.
    expect(guessDocLang("AMANOV_TULEGEN.pdf")).toBeNull();
    expect(guessDocLang("KOREA_HOSPITAL_INTRO.pdf")).toBeNull();
  });

  it("언어가 둘 이상 섞였으면 포기한다", () => {
    expect(guessDocLang("OPINION_RU_KZ.docx")).toBeNull();
  });

  it("단서가 없으면 null", () => {
    expect(guessDocLang("소견서.pdf")).toBeNull();
  });
});

describe("docDisplayTitle", () => {
  it("코디가 붙인 이름이 우선", () => {
    expect(docDisplayTitle("의사 소견서", "SECOND_OPINION_RU.docx")).toBe("의사 소견서");
  });

  it("이름이 없으면 파일명에서 확장자만 뗀다", () => {
    expect(docDisplayTitle("", "SECOND_OPINION_RU.docx")).toBe("SECOND_OPINION_RU");
    expect(docDisplayTitle(null, "안내문.pdf")).toBe("안내문");
  });
});

describe("withDownloadName", () => {
  it("저장 이름을 원본 파일명으로 박는다", () => {
    const out = withDownloadName(
      "https://x.supabase.co/storage/v1/object/sign/attachments/inquiry/60/shared/c065dd80-abc_SECOND_OPINION_RU.pdf?token=aaa",
      "SECOND OPINION_RU_AMANOV_TULEGEN.pdf"
    );
    expect(out).toContain("download=SECOND+OPINION_RU_AMANOV_TULEGEN.pdf");
    expect(out).toContain("token=aaa"); // 서명은 그대로 살아 있어야 한다
  });

  it("이미 붙어 있던 download 값은 갈아끼운다", () => {
    const out = withDownloadName("https://x/y.pdf?token=a&download=true", "소견서.pdf") || "";
    expect(out.match(/download=/g)).toHaveLength(1);
    expect(decodeURIComponent(out)).toContain("download=소견서.pdf");
  });

  it("주소가 없으면 null", () => {
    expect(withDownloadName(null, "a.pdf")).toBeNull();
  });

  // 2026-09-02 PO 제보: 러시아어 첨부를 내려받으면 «История болезни.docx» 가
  // `%D0%98%D1%81…` 라는 글자 그대로 저장됐다. 진범은 supabase-js 의 `{ download: 이름 }`
  // 옵션이 주소를 «두 번» 인코딩한 것(`%` → `%25`). 여기서는 한 겹만 인코딩되는지를 잰다.
  it("비ASCII 이름을 «한 겹만» 인코딩한다 (이중 인코딩 회귀)", () => {
    for (const name of ["История болезни.docx", "진료기록 사본.pdf", "报告 (1).pdf"]) {
      const out = withDownloadName("https://x.supabase.co/storage/v1/object/sign/a/b.pdf?token=t", name) || "";
      const got = new URL(out).searchParams.get("download");
      expect(got).toBe(name); // 되읽으면 원본 그대로
      expect(out).not.toContain("%25"); // `%` 가 한 번 더 인코딩된 흔적이 있으면 실패
    }
  });

  it("100% 라는 이름처럼 진짜 %가 든 이름도 되읽힌다", () => {
    const out = withDownloadName("https://x/y.pdf?token=t", "할인 100%.pdf") || "";
    expect(new URL(out).searchParams.get("download")).toBe("할인 100%.pdf");
  });
});

/**
 * 재발 방지 — 저장소 어디서도 `createSignedUrl(…, { download: "이름" })` 을 쓰면 안 된다.
 * supabase-js 가 주소를 두 번 인코딩해 비ASCII 파일명이 깨진다(위 시험의 원인).
 * 이름 대신 `{ download: true }`(빈 값) 는 `%` 를 안 만들어 안전하므로 허용한다.
 */
describe("createSignedUrl 의 download 옵션 금지", () => {
  it("이름을 넘기는 자리가 남아 있지 않다", () => {
    const root = path.resolve(__dirname, "../../..");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) continue;
        if (full === __filename) continue; // 이 시험 파일 자신의 주석은 센다고 의미 없다
        const src = fs.readFileSync(full, "utf8");
        // createSignedUrl(...) / createSignedUrls(...) 호출 안의 `download:` 가 true 가 아닌 경우
        for (const m of src.matchAll(/createSignedUrls?\([^;]{0,300}?download:\s*([^,}\s]+)/g)) {
          if (m[1] !== "true") hits.push(`${path.relative(root, full)} → download: ${m[1]}`);
        }
      }
    };
    for (const d of ["app", "src"]) walk(path.join(root, d));
    expect(hits).toEqual([]);
  });
});
