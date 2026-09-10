/**
 * 계약 회귀 테스트 — 「환자에게 보낼 서류」 목록 (GET /api/coordinator/inquiries/[id]/shared-documents)
 *
 * 잠그는 계약: staff 만 · 줄마다 **저장소 경로(path)** 를 같이 내려준다.
 *
 * 왜 path 를 테스트로 못박나 (2026-09-10, 문의 #316): 코디 화면의 번역 단추가 이 경로로
 *   /api/attachments/translate 를 부른다. 예전엔 이 응답에 경로가 없어서 «환자에게 보낼 서류»
 *   칸에 올라온 이대(EUMC) 러시아어 견적서를 아무도 번역할 수 없었다. 응답에서 이 칸이
 *   조용히 빠지면 단추가 **말없이 사라진다**(오류도 안 난다) → 그래서 계약으로 잠근다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  authOk: true,
  selected: "" as string,
  rows: [] as any[],
}));

vi.mock("@/lib/auth/requirePortalAuth", () => ({
  requirePortalAuth: async () =>
    h.authOk
      ? { success: true, userId: "u1", email: "coord@healwith.co.kr", isAdmin: false, appRole: "coordinator" }
      : { success: false, response: Response.json({ ok: false, error: "unauthorized" }, { status: 401 }) },
}));

vi.mock("@/lib/rag/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: (cols: string) => {
        h.selected = cols;
        const chain: any = {
          eq: () => chain,
          order: async () => ({ data: h.rows, error: null }),
        };
        return chain;
      },
    }),
    storage: {
      from: () => ({
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((p) => ({ path: p, signedUrl: `https://sb.test/${p}?token=x` })),
        }),
      }),
    },
  },
}));

import { GET } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/coordinator/inquiries/316/shared-documents") as any;

const ROW = {
  id: "c5b83e10-2482-4257-a401-5810ba544bad",
  file_name: "이대_견적서.pdf",
  title: null,
  lang: "ru",
  storage_path: "inquiry/316/shared/abc_이대_견적서.pdf",
  mime: "application/pdf",
  size_bytes: 313524,
  note: null,
  visible_to_patient: true,
  shared_at: "2026-09-10T04:29:38.896Z",
  created_at: "2026-09-10T04:29:34.338Z",
};

beforeEach(() => { h.authOk = true; h.selected = ""; h.rows = [ROW]; });

describe("coordinator/shared-documents GET", () => {
  it("줄마다 저장소 경로(path)를 내려준다 — 번역 단추가 이걸로 파일을 찾는다", async () => {
    const res = await GET(req(), ctx("316"));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.ok).toBe(true);
    expect(j.documents).toHaveLength(1);
    expect(j.documents[0].path).toBe(ROW.storage_path);
    // 경로가 없으면 화면이 단추를 못 그린다 → 빈 문자열·null 도 실패로 본다.
    expect(j.documents[0].path).toBeTruthy();
  });

  it("select 에 storage_path 가 남아 있다 — 컬럼을 빼면 path 가 조용히 undefined 가 된다", () => {
    return GET(req(), ctx("316")).then(() => {
      expect(h.selected).toContain("storage_path");
    });
  });

  it("staff 가 아니면 401 — 경로는 한 줄도 새지 않는다", async () => {
    h.authOk = false;
    const res = await GET(req(), ctx("316"));
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain("inquiry/316");
  });

  it("잘못된 id 는 400", async () => {
    const res = await GET(req(), ctx("abc"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_id");
  });
});
