import { NextRequest, NextResponse } from 'next/server';
import { generateStyledQRSvg } from '@/lib/qr-themes';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, theme } = body || {};

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Field "url" is required.' }, { status: 400 });
    }

    const svg = generateStyledQRSvg(url, theme || {});
    return NextResponse.json({ ok: true, svg });
  } catch (err: any) {
    console.error('[POST /api/qr-preview]', err);
    return NextResponse.json({ error: 'Failed to generate preview.' }, { status: 500 });
  }
}
