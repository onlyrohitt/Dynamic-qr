
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'qr_admin_session';
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

async function verifySession(value: string): Promise<boolean> {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) return false;

    const parts = value.split('.');
    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    if (!payload || !signature) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')
        .padEnd(Math.ceil(signature.length / 4) * 4, '=')),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(payload)
    );

    if (!valid) return false;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(
      atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')),
      (c) => c.charCodeAt(0)
    );

    const session = JSON.parse(new TextDecoder().decode(bytes));

    return (
      typeof session.username === 'string' &&
      typeof session.iat === 'number' &&
      Date.now() - session.iat >= 0 &&
      Date.now() - session.iat <= MAX_AGE_MS
    );
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin/')) {
    return NextResponse.next();
  }

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const rawCookie = req.cookies.get(SESSION_COOKIE)?.value;

  if (!rawCookie || !(await verifySession(rawCookie))) {
    const response = NextResponse.redirect(
      new URL('/admin/login', req.url)
    );
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
