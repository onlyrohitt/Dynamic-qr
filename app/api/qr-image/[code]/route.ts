import { NextRequest, NextResponse } from 'next/server';
import { getQRByCode } from '@/lib/qr-storage';
import { generateQRPngBuffer, DEFAULT_THEME } from '@/lib/qr-themes';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = (params?.code || '').trim();
  const { searchParams } = new URL(req.url);

  const rawSize = parseInt(searchParams.get('size') ?? '800', 10);
  const size = Math.min(Math.max(isNaN(rawSize) ? 800 : rawSize, 200), 2400);
  const download = searchParams.get('download') === 'true' || searchParams.get('dl') === '1';

  const item = await getQRByCode(code);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectUrl = `${appUrl}/r/${encodeURIComponent(code || 'default')}`;

  const theme = item?.theme || DEFAULT_THEME;

  // Allow query overrides if provided
  const fg = searchParams.get('fg') || theme.fgColor;
  const bg = searchParams.get('bg') || theme.bgColor;

  try {
    const pngBuffer = await generateQRPngBuffer(
      redirectUrl,
      { ...theme, fgColor: fg, bgColor: bg },
      size
    );

    const headers: Record<string, string> = {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
    };

    if (download) {
      headers['Content-Disposition'] = `attachment; filename="qr-${code.toLowerCase()}-${size}px.png"`;
    }

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error(`[GET /api/qr-image/${code}]`, err);
    return NextResponse.json({ error: 'Failed to generate QR image.' }, { status: 500 });
  }
}
