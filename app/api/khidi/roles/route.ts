/**
 * HEALO-KHIDI: User Roles API
 *
 * GET /api/khidi/roles — Return current user's roles (authenticated)
 * POST /api/khidi/roles — Assign role to user (admin-only)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { checkAdminAuth } = await import("../../../../src/lib/auth/checkAdminAuth");
    const authResult = await checkAdminAuth(request);

    // For GET, we require authentication (either user checking own roles or admin)
    if (!authResult.userId) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const { getSupabaseServerClient } = await import("../../../../src/lib/data/supabaseServerClient");
    const supabaseAdmin = getSupabaseServerClient();

    // Get current user's roles
    const userId = authResult.userId;

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api/khidi/roles] GET error:", error);
      return Response.json(
        { ok: false, error: "query_failed" },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      userId,
      roles: data || [],
    });
  } catch (error: any) {
    console.error("[api/khidi/roles] GET exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin-only: check authorization
    const { checkAdminAuth } = await import("../../../../src/lib/auth/checkAdminAuth");
    const authResult = await checkAdminAuth(request);

    if (!authResult.isAdmin) {
      return Response.json(
        { ok: false, error: "unauthorized - admin required" },
        { status: 403 }
      );
    }

    const payload = await request.json();

    // Validation
    if (!payload.userId) {
      return Response.json(
        { ok: false, error: "userId is required" },
        { status: 400 }
      );
    }

    if (!payload.role) {
      return Response.json(
        { ok: false, error: "role is required" },
        { status: 400 }
      );
    }

    const validRoles = ['patient', 'korean_hospital', 'local_clinic', 'agent', 'admin'];
    if (!validRoles.includes(payload.role)) {
      return Response.json(
        { ok: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import("../../../../src/lib/data/supabaseServerClient");
    const supabaseAdmin = getSupabaseServerClient();

    const insertData = {
      user_id: payload.userId,
      role: payload.role,
      organization_name: payload.organizationName || null,
      organization_id: payload.organizationId || null,
      language_preference: payload.languagePreference || 'ru',
      is_active: payload.isActive !== false, // default true
    };

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .insert([insertData])
      .select("*")
      .single();

    if (error) {
      // Check if it's a unique constraint violation
      if (error.code === "23505") {
        return Response.json(
          { ok: false, error: "User already has this role" },
          { status: 409 }
        );
      }
      console.error("[api/khidi/roles] POST error:", error);
      return Response.json(
        { ok: false, error: "insert_failed" },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/roles] Role assigned: ${payload.userId} → ${payload.role}`
    );

    return Response.json({
      ok: true,
      data: {
        id: data.id,
        user_id: data.user_id,
        role: data.role,
        organization_name: data.organization_name,
        is_active: data.is_active,
        created_at: data.created_at,
      },
    });
  } catch (error: any) {
    console.error("[api/khidi/roles] POST exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
