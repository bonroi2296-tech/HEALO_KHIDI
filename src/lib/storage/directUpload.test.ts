import { describe, it, expect } from "vitest";
import { sanitizeFileName, normalizeMime } from "./directUpload";

describe("저장소 파일 이름 세척", () => {
  // 🛑 이 검사가 지키는 불변식: «아스키만». 깨면 Supabase 가 키를 거부한다
  //    (실측 2026-08-03: 한글 키 → 서명은 200, PUT 에서 400 InvalidKey).
  it("아스키가 아닌 글자는 하나도 안 남는다", () => {
    for (const n of ["выписка.pdf", "신장_초음파.jpg", "检查结果.pdf", "ÉCHOGRAPHIE.pdf", "Қазақстан.pdf"]) {
      expect(sanitizeFileName(n)).toMatch(/^[a-zA-Z0-9._-]+$/);
    }
  });

  it("러시아어 이름은 «옮겨 적어» 알아볼 수 있게 남는다", () => {
    expect(sanitizeFileName("выписка.pdf")).toBe("vypiska.pdf");
    expect(sanitizeFileName("анализы крови.pdf")).toBe("analizy_krovi.pdf");
    // 대문자 첫 글자는 대문자로
    expect(sanitizeFileName("Выписка.pdf")).toBe("Vypiska.pdf");
  });

  it("카자흐어 글자도 옮겨진다", () => {
    expect(sanitizeFileName("Қазақстан.pdf")).toBe("Qazaqstan.pdf");
  });

  it("악센트 붙은 라틴 글자는 악센트만 떨어진다", () => {
    expect(sanitizeFileName("échographie.pdf")).toBe("echographie.pdf");
  });

  it("옮길 수 없는 글자(한글·중국어)면 «file» 로 떨어진다 — 「__.pdf」 금지", () => {
    expect(sanitizeFileName("신장_초음파_검사.jpg")).toBe("file.jpg");
    expect(sanitizeFileName("检查结果.pdf")).toBe("file.pdf");
    // 예전 동작이 이랬다 — 아무 정보도 없는 키
    expect(sanitizeFileName("신장_초음파_검사.jpg")).not.toBe("__.jpg");
  });

  it("아스키 이름은 건드리지 않는다", () => {
    expect(sanitizeFileName("MR_260626.pdf")).toBe("MR_260626.pdf");
    expect(sanitizeFileName("report-2026.final.pdf")).toBe("report-2026.final.pdf");
  });

  it("확장자 없는 낱장 영상 이름도 살아남는다", () => {
    expect(sanitizeFileName("IM_0001")).toBe("IM_0001");
    expect(sanitizeFileName("DICOMDIR")).toBe("DICOMDIR");
  });

  it(".dcm 은 브라우저가 형식을 못 알아봐도 보정된다", () => {
    expect(normalizeMime("IM_0001.dcm", "")).toBe("application/dicom");
    expect(normalizeMime("a.pdf", "application/pdf")).toBe("application/pdf");
  });
});
