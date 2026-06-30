export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "@/lib/auth/checkHospitalAuth";

export async function GET(request: NextRequest) {
  const result = await checkHospitalAuth(request);

  // ⚠️ result.error 는 내부 인증 에러 원문(raw message)을 담을 수 있어 그대로 노출 금지
  // (CLAUDE.md 보안규칙). 클라이언트는 isHospitalUser 로 분기 — 미인증이면 코드형만.
  return Response.json({
    isHospitalUser: result.isHospitalUser,
    email: result.email,
    hospitalId: result.hospitalId,
    hospitalName: result.hospitalName,
    role: result.role,
    ...(result.isHospitalUser ? {} : { error: "not_authorized" }),
  });
}
