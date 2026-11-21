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

/** Returns a valid http(s) URL object, or null if the destination is malformed. */
function toSafeRedirectUrl(destination: string | undefined | null): URL | null {
  if (!destination) return null;
  try {
    const url = new URL(destination);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const codeParam = searchParams.get('code');

  if (codeParam) {
    const item = await getQRByCode(codeParam);
    if (item && item.is_active) {
      const safeUrl = toSafeRedirectUrl(item.destination);
      if (safeUrl) {
        incrementScan(item.code).catch(() => {});
        return NextResponse.redirect(safeUrl, {
          status: 302,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
      }
      console.error(`[r?code=${codeParam}] Invalid destination URL "${item.destination}"`);
    }
  }

  // Look for any default or first active QR with a valid destination
  const all = await getAllQRs();
  for (const candidate of all) {
    if (!candidate.is_active) continue;
    const safeUrl = toSafeRedirectUrl(candidate.destination);
    if (!safeUrl) continue;

    incrementScan(candidate.code).catch(() => {});
    return NextResponse.redirect(safeUrl, {
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
