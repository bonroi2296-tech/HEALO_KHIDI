/**
 * HEALO-KHIDI: Consultation Messages API
 *
 * POST /api/khidi/consultation/[id]/messages — Send a text message
 * GET  /api/khidi/consultation/[id]/messages — Get messages for a consultation
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consultationId = parseInt(params.id);
    const payload = await request.json();

    // Validation
    if (!payload.senderId || !payload.messageText) {
      return Response.json(
        { ok: false, error: "senderId and messageText are required" },
        { status: 400 }
      );
    }

    const validRoles = ["patient", "doctor", "coordinator", "translator"];
    if (payload.senderRole && !validRoles.includes(payload.senderRole)) {
      return Response.json(
        { ok: false, error: "Invalid senderRole" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import(
      "../../../../../src/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    // Insert message
    const { data, error } = await supabaseAdmin
      .from("consultation_messages")
      .insert([
        {
          consultation_id: consultationId,
          sender_id: payload.senderId,
          sender_role: payload.senderRole || "patient",
          sender_name: payload.senderName || null,
          message_text: payload.messageText,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[api/khidi/consultation/messages] Insert error:", error);
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/consultation/${consultationId}/messages] New message from ${payload.senderId}`
    );

    return Response.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "[api/khidi/consultation/messages] Exception:",
      error
    );
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consultationId = parseInt(params.id);

    const { getSupabaseServerClient } = await import(
      "../../../../../src/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data, count, error } = await supabaseAdmin
      .from("consultation_messages")
      .select("*", { count: "exact" })
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(
        "[api/khidi/consultation/messages] GET error:",
        error
      );
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      data: data || [],
      total: count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error(
      "[api/khidi/consultation/messages] GET exception:",
      error
    );
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
