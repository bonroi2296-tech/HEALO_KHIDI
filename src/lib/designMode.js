/**
 * HEALO Design Mode — Feature flag
 *
 * Controls which version of UI is rendered:
 * - "premium" (default): New D. Premium design (ink/gold/cream, Playfair + Inter)
 * - "legacy": Original Tailwind/Shadcn-style design
 *
 * ROLLBACK INSTRUCTIONS:
 * 1. Set Vercel environment variable: NEXT_PUBLIC_DESIGN=legacy
 * 2. Redeploy (or Vercel auto-redeploys on env change)
 * 3. All pages revert to pre-premium design instantly
 *
 * Can also be overridden per-request with ?design=legacy query param (client-side only).
 */

export const DEFAULT_MODE = "premium";

/**
 * Server-side / build-time read from env.
 * Safe for RSC, layouts, and middleware.
 */
export function getServerDesignMode() {
  const raw = process.env.NEXT_PUBLIC_DESIGN?.toLowerCase();
  if (raw === "legacy") return "legacy";
  return DEFAULT_MODE;
}

/**
 * Client-side mode. Checks:
 * 1. URL query param `?design=legacy` (highest priority, session-only)
 * 2. localStorage override (via toggle UI)
 * 3. Build-time env
 */
export function getClientDesignMode() {
  if (typeof window === "undefined") return getServerDesignMode();
  try {
    const qs = new URLSearchParams(window.location.search);
    const q = qs.get("design")?.toLowerCase();
    if (q === "legacy" || q === "premium") return q;
    const stored = window.localStorage.getItem("healo:design");
    if (stored === "legacy" || stored === "premium") return stored;
  } catch {
    /* ignore */
  }
  return getServerDesignMode();
}

/**
 * Toggle design mode in browser (for internal/preview use).
 * Stores in localStorage and reloads.
 */
export function toggleDesignMode() {
  if (typeof window === "undefined") return;
  const current = getClientDesignMode();
  const next = current === "premium" ? "legacy" : "premium";
  window.localStorage.setItem("healo:design", next);
  window.location.reload();
}

export function setDesignMode(mode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("healo:design", mode);
  window.location.reload();
}
