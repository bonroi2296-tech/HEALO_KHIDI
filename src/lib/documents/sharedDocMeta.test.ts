/**
 * 언어 알아맞히기 시험 — 「반만 맞는 추측」이 제일 해로워서(환자가 못 읽는 언어를 자기 것으로
 * 착각한다) 사람 이름에 걸리는 오탐을 특히 잰다.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  guessDocLang,
  docDisplayTitle,
  withDownloadName,
  findBadDownloadOption,
  contentDisposition,
} from "./sharedDocMeta";

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
      expect(new URL(out).searchParams.get("download")).toBe(name);
      expect(out).not.toContain("%25"); // `%` 가 한 번 더 인코딩된 흔적이 있으면 실패
    }
  });

  it("이름에 진짜 %가 들어 있어도 되읽힌다", () => {
    const out = withDownloadName("https://x/y.pdf?token=t", "할인 100%.pdf") || "";
    expect(new URL(out).searchParams.get("download")).toBe("할인 100%.pdf");
  });
});

describe("findBadDownloadOption", () => {
  it("이름을 직접 넘기면 잡는다", () => {
    expect(findBadDownloadOption("createSignedUrl(p, 300, { download: name })")).toEqual(["name"]);
  });

  it("변수에 담아 넘겨도 잡는다 (2026-07-30 사고 형태)", () => {
    const src = "const signOpts = { download: downloadName };\ncreateSignedUrl(path, 300, signOpts);";
    expect(findBadDownloadOption(src)).toEqual(["downloadName"]);
  });

  it("`{ download: true }` 는 통과시킨다", () => {
    expect(findBadDownloadOption("createSignedUrls(paths, 600, { download: true })")).toEqual([]);
  });

  it("주석 속 주의 문구는 안 잡는다", () => {
    expect(findBadDownloadOption("// 쓰지 마라: { download: 이름 }\ncreateSignedUrl(p, 300);")).toEqual([]);
  });

  it("서명 주소를 안 만드는 파일은 아예 안 본다", () => {
    expect(findBadDownloadOption("const opts = { download: name };")).toEqual([]);
  });
});

describe("contentDisposition", () => {
  it("비ASCII 이름을 ASCII 대체본 + filename* 두 벌로 낸다", () => {
    const out = contentDisposition("История болезни.docx");
    expect(out).toContain("filename*=UTF-8''%D0%98");
    // 헤더에 실을 수 있는 것은 ASCII 뿐 — 하나라도 벗어나면 요청 자체가 죽는다(500)
    expect(/^[\x20-\x7E]*$/.test(out)).toBe(true);
  });

  it("되읽으면 원본 이름이 그대로 나온다", () => {
    for (const n of ["진료기록 사본.pdf", "Иванов Тулеген.pdf", "报告 (1).pdf"]) {
      const star = contentDisposition(n).match(/filename\*=UTF-8''(.+)$/)![1];
      expect(decodeURIComponent(star)).toBe(n);
    }
  });

  it("따옴표·개행을 헤더에 흘리지 않는다", () => {
    const out = contentDisposition('a"; x=1\r\nEvil: 1.pdf');
    expect(out).not.toContain('"; x=1');
    expect(out).not.toContain("\n");
  });

  it("inline 도 만든다", () => {
    expect(contentDisposition("sample.pdf", "inline")).toMatch(/^inline; /);
  });
});

/**
 * 재발 방지 (반성문 #181) — 서명 주소를 만드는 파일에서 `download: <이름>` 을 쓰면 안 된다.
 * supabase-js 가 주소를 두 번 인코딩해 비ASCII 파일명이 깨진다.
 */
describe("저장소 전수 — download 옵션이 남아 있지 않다", () => {
  it("app·src 어디에도 없다", () => {
    const root = path.resolve(__dirname, "../../..");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) continue;
        // 검사 «자신»은 뺀다 — 이 둘은 정규식·예시 문자열로 그 모양을 품고 있을 뿐
        //   실제로 서명 주소를 만들지 않는다(부르는 자리가 없으므로 위험도 없다).
        if (full === __filename) continue;
        if (full.endsWith(path.join("documents", "sharedDocMeta.ts"))) continue;
        for (const v of findBadDownloadOption(fs.readFileSync(full, "utf8"))) {
          hits.push(`${path.relative(root, full)} → download: ${v}`);
        }
      }
    };
    for (const d of ["app", "src"]) walk(path.join(root, d));
    expect(hits).toEqual([]);
  });
});

/**
 * 재발 방지 (2026-09-02 실측) — `Content-Disposition` 을 손으로 조립하지 마라.
 * 비ASCII 이름을 그대로 넣으면 «깨지는» 게 아니라 요청이 500 으로 죽는다.
 */
describe("저장소 전수 — Content-Disposition 을 손으로 조립한 자리가 없다", () => {
  it("전부 contentDisposition() 을 거친다", () => {
    const root = path.resolve(__dirname, "../../..");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) continue;
        if (full === __filename) continue;
        if (full.endsWith(path.join("documents", "sharedDocMeta.ts"))) continue;
        const src = fs.readFileSync(full, "utf8");
        // 주석은 뺀다(주의 문구가 걸리면 안 된다). 값이 contentDisposition( 으로 시작하면 통과.
        const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
        for (const m of code.matchAll(/["'`]?Content-Disposition["'`]?\s*:\s*([^,\n]+)/gi)) {
          if (!/^contentDisposition\(/.test(m[1].trim())) {
            hits.push(`${path.relative(root, full)} → ${m[1].trim().slice(0, 60)}`);
          }
        }
      }
    };
    for (const d of ["app", "src"]) walk(path.join(root, d));
    expect(hits).toEqual([]);
  });
});
