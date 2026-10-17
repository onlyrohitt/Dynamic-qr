/**
 * GET /api/qr-code?size=800
 *
 * Generates the QR code PNG server-side.
 * The QR code always encodes YOUR_APP_URL/r — the permanent redirect endpoint.
 * Auth required (so the URL is not publicly guessable via this endpoint).
 */
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectUrl = `${appUrl}/r`;

  const { searchParams } = new URL(req.url);
  const rawSize = parseInt(searchParams.get('size') ?? '800', 10);
  const size = Math.min(Math.max(rawSize, 200), 2000); // clamp 200–2000px

  try {
    const pngBuffer = await QRCode.toBuffer(redirectUrl, {
      type: 'png',
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H', // highest error correction — survives printing wear
    });

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="dynamic-qr-${size}px.png"`,
        'Cache-Control': 'private, max-age=86400', // cache 24h — QR URL never changes
      },
    });
  } catch (err) {
    console.error('[/api/qr-code]', err);
    return NextResponse.json({ error: 'Failed to generate QR code.' }, { status: 500 });
  }
}
