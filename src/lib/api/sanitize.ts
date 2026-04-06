/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 */

/** Strip HTML tags from a string */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/** Escape HTML special characters */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Sanitize user input string: trim, strip HTML, limit length */
export function sanitizeString(
  input: unknown,
  maxLength: number = 5000,
): string {
  if (typeof input !== 'string') return '';
  return stripHtml(input).trim().slice(0, maxLength);
}

/** Sanitize an object's string values recursively */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  maxLength: number = 5000,
): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      (result as any)[key] = sanitizeString(result[key], maxLength);
    } else if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
      (result as any)[key] = sanitizeObject(result[key], maxLength);
    }
  }
  return result;
}

/** Validate and sanitize an email address */
export function sanitizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const email = input.trim().toLowerCase();
  const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
  return emailRegex.test(email) ? email : null;
}

/** Validate UUID format */
export function isValidUuid(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

/** Validate numeric ID */
export function isValidNumericId(input: unknown): boolean {
  if (typeof input === 'number') return Number.isInteger(input) && input > 0;
  if (typeof input === 'string') return /^\d+$/.test(input) && parseInt(input) > 0;
  return false;
}

/** Clamp a numeric value within bounds */
export function clampNumber(
  input: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const num = Number(input);
  if (isNaN(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}
