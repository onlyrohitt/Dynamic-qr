import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAllQRs, createQR, getDashboardStats } from '@/lib/qr-storage';
import { validateDestinationUrl, normaliseUrl } from '@/lib/validate';

function unauth() {
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getAdminSession();
  if (!session) return unauth();

  try {
    const [qrs, stats] = await Promise.all([
      getAllQRs(),
      getDashboardStats(),
    ]);

    return NextResponse.json({ ok: true, qrs, stats });
  } catch (err: any) {
    console.error('[GET /api/qr-codes]', err);
    return NextResponse.json({ error: 'Failed to load QR codes.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getAdminSession();
  if (!session) return unauth();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 });
  }

  const { label, destination, code, theme } = body || {};

  if (!label || typeof label !== 'string' || !label.trim()) {
    return NextResponse.json({ error: 'Customer or campaign name is required.' }, { status: 422 });
  }

  if (!destination || typeof destination !== 'string') {
    return NextResponse.json({ error: 'Destination URL is required.' }, { status: 422 });
  }

  const validationError = validateDestinationUrl(destination);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  const cleanUrl = normaliseUrl(destination);

  try {
    const item = await createQR({
      label: label.trim(),
      destination: cleanUrl,
      code: typeof code === 'string' && code.trim() ? code.trim() : undefined,
      theme: typeof theme === 'object' ? theme : undefined,
    });

    const stats = await getDashboardStats();
    return NextResponse.json({ ok: true, qr: item, stats }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/qr-codes]', err);
    return NextResponse.json({ error: 'Failed to create QR code.' }, { status: 500 });
  }
}
