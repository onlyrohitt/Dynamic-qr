/**
 * Pure session encode/decode — no Next.js imports.
 * Safe to use in middleware (Edge runtime) AND in API routes (Node.js).
 */
import crypto from 'crypto';

export const SESSION_COOKIE = 'qr_admin_session';
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters.');
  }
  return s;
}

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', secret())
    .update(payload)
    .digest('base64url');
}

export function encodeSession(data: { username: string }): string {
  const payload = JSON.stringify({ ...data, iat: Date.now() });
  const b64 = Buffer.from(payload).toString('base64url');
  return `${b64}.${sign(b64)}`;
}

export function decodeSession(value: string): { username: string; iat: number } | null {
  try {
    const dot = value.lastIndexOf('.');
    if (dot === -1) return null;
    const b64 = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    if (!b64 || !sig) return null;
    if (sign(b64) !== sig) return null;
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (Date.now() - data.iat > MAX_AGE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookieHeader(value: string): string {
  return [
    `${SESSION_COOKIE}=${value}`,
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ].join('; ');
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}
