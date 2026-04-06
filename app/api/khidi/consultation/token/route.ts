/**
 * LiveKit Token Generation API
 *
 * POST /api/khidi/consultation/token
 * Body: { roomName, participantName, participantRole }
 *
 * Returns a JWT token for joining a LiveKit room.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return Response.json(
        { ok: false, error: "LiveKit credentials not configured" },
        { status: 503 }
      );
    }

    const { roomName, participantName, participantRole } = await request.json();

    if (!roomName || !participantName) {
      return Response.json(
        { ok: false, error: "roomName and participantName are required" },
        { status: 400 }
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: JSON.stringify({ role: participantRole || "participant" }),
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    return Response.json({
      ok: true,
      token: jwt,
      roomName,
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation/token] Error:", error);
    return Response.json(
      { ok: false, error: error.message || "Token generation failed" },
      { status: 500 }
    );
  }
}
