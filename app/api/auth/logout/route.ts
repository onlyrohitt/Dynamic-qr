import { NextResponse } from 'next/server';
import { clearSessionCookieHeader } from '@/lib/session';

export async function POST() {
  return NextResponse.json(
    { ok: true },
    { headers: { 'Set-Cookie': clearSessionCookieHeader() } }
  );
}
