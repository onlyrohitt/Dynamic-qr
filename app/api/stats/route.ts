/**
 * GET /api/stats
 * Returns fresh dashboard statistics directly from the database.
 * Used by the dashboard client for live stat refresh without a full page reload.
 */
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getDashboardStats } from '@/lib/qr-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const stats = await getDashboardStats();
    return NextResponse.json({ ok: true, stats });
  } catch (err: any) {
    console.error('[GET /api/stats]', err);
    return NextResponse.json({ error: 'Failed to load stats.' }, { status: 500 });
  }
}
