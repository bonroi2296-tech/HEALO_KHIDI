import { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (
  request: NextRequest,
  context?: any,
) => Promise<Response> | Response;

/**
 * Wraps an API route handler with standardized error handling.
 *
 * Usage:
 *   export const GET = withErrorHandler(async (request) => {
 *     // your logic
 *     return NextResponse.json({ ok: true, data: result });
 *   });
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error: any) {
      const routePath = new URL(request.url).pathname;
      console.error(`[API Error] ${request.method} ${routePath}:`, error?.message || error);

      // Don't leak internal details in production
      const isDev = process.env.NODE_ENV === 'development';
      const detail = isDev ? error?.message : undefined;

      return NextResponse.json(
        { ok: false, error: 'internal_error', ...(detail && { detail }) },
        { status: 500 },
      );
    }
  };
}
