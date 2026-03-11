export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "../../../../src/lib/auth/checkHospitalAuth";

export async function GET(request: NextRequest) {
  const result = await checkHospitalAuth(request);

  return Response.json({
    isHospitalUser: result.isHospitalUser,
    email: result.email,
    hospitalId: result.hospitalId,
    hospitalName: result.hospitalName,
    role: result.role,
    error: result.error,
  });
}
