import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAllQRs, updateQR, createQR } from '@/lib/qr-storage';
import { validateDestinationUrl, normaliseUrl } from '@/lib/validate';

function unauthorised() {
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET() {
  const session = getAdminSession();
  if (!session) return unauthorised();

  const all = await getAllQRs();
  const first = all[0];

  return NextResponse.json({
    url: first?.destination ?? null,
    updated_at: first?.updated_at ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = getAdminSession();
  if (!session) return unauthorised();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawUrl = body?.url;
  if (typeof rawUrl !== 'string') {
    return NextResponse.json({ error: 'Field "url" must be a string.' }, { status: 400 });
  }

  const validationError = validateDestinationUrl(rawUrl);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  const cleanUrl = normaliseUrl(rawUrl);
  const all = await getAllQRs();

  if (all.length > 0) {
    await updateQR(all[0].code, { destination: cleanUrl });
  } else {
    await createQR({
      label: 'Main QR Code',
      destination: cleanUrl,
      code: 'MAIN-01',
    });
  }

  return NextResponse.json({ ok: true, url: cleanUrl });
}
