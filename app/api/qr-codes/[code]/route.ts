import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getQRByCode, updateQR, deleteQR, getDashboardStats } from '@/lib/qr-storage';
import { validateDestinationUrl, normaliseUrl } from '@/lib/validate';

function unauth() {
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const session = getAdminSession();
  if (!session) return unauth();

  const code = (params?.code || '').trim();
  const item = await getQRByCode(code);

  if (!item) {
    return NextResponse.json({ error: `QR code "${code}" not found.` }, { status: 404 });
  }

  return NextResponse.json({ ok: true, qr: item });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const session = getAdminSession();
  if (!session) return unauth();

  const code = (params?.code || '').trim();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 });
  }

  const updates: Record<string, any> = {};

  if (body.destination !== undefined) {
    if (typeof body.destination !== 'string') {
      return NextResponse.json({ error: 'Field "destination" must be a string.' }, { status: 400 });
    }
    const validationError = validateDestinationUrl(body.destination);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 422 });
    }
    updates.destination = normaliseUrl(body.destination);
  }

  if (body.label !== undefined) {
    if (typeof body.label !== 'string' || !body.label.trim()) {
      return NextResponse.json({ error: 'Label cannot be empty.' }, { status: 422 });
    }
    updates.label = body.label.trim();
  }

  if (body.theme !== undefined && typeof body.theme === 'object') {
    updates.theme = body.theme;
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  try {
    const updated = await updateQR(code, updates);
    if (!updated) {
      return NextResponse.json({ error: `QR code "${code}" not found.` }, { status: 404 });
    }

    const stats = await getDashboardStats();
    return NextResponse.json({ ok: true, qr: updated, stats });
  } catch (err: any) {
    console.error(`[PATCH /api/qr-codes/${code}]`, err);
    return NextResponse.json({ error: 'Failed to update QR code.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const session = getAdminSession();
  if (!session) return unauth();

  const code = (params?.code || '').trim();
  try {
    const success = await deleteQR(code);
    if (!success) {
      return NextResponse.json({ error: `QR code "${code}" not found.` }, { status: 404 });
    }

    const stats = await getDashboardStats();
    return NextResponse.json({ ok: true, stats });
  } catch (err: any) {
    console.error(`[DELETE /api/qr-codes/${code}]`, err);
    return NextResponse.json({ error: 'Failed to delete QR code.' }, { status: 500 });
  }
}
