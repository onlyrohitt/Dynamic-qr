import { NextRequest, NextResponse } from 'next/server';
import { getQRByCode } from '@/lib/qr-storage';
import { generateStyledQRSvg, DEFAULT_THEME } from '@/lib/qr-themes';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = (params?.code || '').trim();
  const { searchParams } = new URL(req.url);
  const download = searchParams.get('download') === 'true' || searchParams.get('dl') === '1';

  const item = await getQRByCode(code);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectUrl = `${appUrl}/r/${encodeURIComponent(code || 'default')}`;

  const theme = item?.theme || DEFAULT_THEME;

  try {
    const svgString = generateStyledQRSvg(redirectUrl, theme);

    const headers: Record<string, string> = {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=3600',
    };

    if (download) {
      headers['Content-Disposition'] = `attachment; filename="qr-${code.toLowerCase()}.svg"`;
    }

    return new NextResponse(svgString, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error(`[GET /api/qr-svg/${code}]`, err);
    return NextResponse.json({ error: 'Failed to generate QR vector SVG.' }, { status: 500 });
  }
}
