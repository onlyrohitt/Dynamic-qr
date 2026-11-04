/**
 * GET /api/qr-code?code=...&size=800
 * Legacy & general-purpose QR generation endpoint.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getQRByCode, getAllQRs } from '@/lib/qr-storage';
import { generateQRPngBuffer, DEFAULT_THEME } from '@/lib/qr-themes';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const codeParam = searchParams.get('code');
  const rawSize = parseInt(searchParams.get('size') ?? '800', 10);
  const size = Math.min(Math.max(isNaN(rawSize) ? 800 : rawSize, 200), 2000);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  let targetCode = codeParam;
  let targetTheme = DEFAULT_THEME;

  if (codeParam) {
    const item = await getQRByCode(codeParam);
    if (item) {
      targetTheme = item.theme || DEFAULT_THEME;
    }
  } else {
    const all = await getAllQRs();
    if (all.length > 0) {
      targetCode = all[0].code;
      targetTheme = all[0].theme || DEFAULT_THEME;
    }
  }

  const redirectUrl = targetCode
    ? `${appUrl}/r/${encodeURIComponent(targetCode)}`
    : `${appUrl}/r`;

  try {
    const pngBuffer = await generateQRPngBuffer(redirectUrl, targetTheme, size);

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="dynamic-qr-${size}px.png"`,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[/api/qr-code]', err);
    return NextResponse.json({ error: 'Failed to generate QR code.' }, { status: 500 });
  }
}
