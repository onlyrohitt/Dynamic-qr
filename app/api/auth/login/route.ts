import { NextRequest, NextResponse } from 'next/server';
import { encodeSession, sessionCookieHeader } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body ?? {};

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const expectedUsername = process.env.ADMIN_USERNAME ?? 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD ?? '';

    if (!expectedPassword) {
      console.error('ADMIN_PASSWORD is not set in .env.local');
      return NextResponse.json({ error: 'Server misconfiguration: ADMIN_PASSWORD not set.' }, { status: 500 });
    }

    const usernameMatch = username.trim() === expectedUsername;
    const passwordMatch = password === expectedPassword;

    if (!usernameMatch || !passwordMatch) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const cookieValue = encodeSession({ username: expectedUsername });
    const setCookie = sessionCookieHeader(cookieValue);

    console.log('[login] Success for:', expectedUsername);

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'Set-Cookie': setCookie } }
    );
  } catch (err) {
    console.error('[/api/auth/login]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
