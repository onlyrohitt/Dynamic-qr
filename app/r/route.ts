/**
 * GET /r
 * Fallback redirect handler.
 * If query param ?code=... is given, forwards to /r/[code].
 * Otherwise redirects to the first active QR or displays informative notice.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAllQRs, getQRByCode, incrementScan } from '@/lib/qr-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const codeParam = searchParams.get('code');

  if (codeParam) {
    const item = await getQRByCode(codeParam);
    if (item && item.is_active) {
      incrementScan(item.code).catch(() => {});
      return NextResponse.redirect(item.destination, {
        status: 302,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }
  }

  // Look for any default or first active QR
  const all = await getAllQRs();
  const active = all.find((q) => q.is_active);

  if (active) {
    incrementScan(active.code).catch(() => {});
    return NextResponse.redirect(active.destination, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  }

  return NextResponse.json(
    { message: 'Dynamic QR Service is active. Access customer routes via /r/[code].' },
    { status: 200 }
  );
}
