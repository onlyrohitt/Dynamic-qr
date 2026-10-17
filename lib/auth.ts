/**
 * Server-side auth helper (Node.js / App Router only).
 * Reads the session cookie via next/headers.
 * Do NOT import this in middleware.ts.
 */
import { cookies } from 'next/headers';
import { SESSION_COOKIE, decodeSession } from './session';

/** Returns the logged-in admin username, or null if not authenticated. */
export function getAdminSession(): string | null {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    const session = decodeSession(raw);
    return session?.username ?? null;
  } catch {
    return null;
  }
}
