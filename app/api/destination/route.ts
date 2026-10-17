/**
 * GET  /api/destination  — fetch current destination URL (auth required)
 * POST /api/destination  — update destination URL (auth required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateDestinationUrl, normaliseUrl } from '@/lib/validate';

function unauthorised() {
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

/* ── GET: read current URL ─────────────────────── */
export async function GET() {
  const session = getAdminSession();
  if (!session) return unauthorised();

  const { data, error } = await supabaseAdmin
    .from('qr_destination')
    .select('url, updated_at')
    .eq('id', 1)
    .single();

  if (error) {
    // Row might not exist yet (fresh setup)
    if (error.code === 'PGRST116') {
      return NextResponse.json({ url: null, updated_at: null });
    }
    console.error('[GET /api/destination]', error);
    return NextResponse.json({ error: 'Failed to read destination URL.' }, { status: 500 });
  }

  return NextResponse.json({ url: data.url, updated_at: data.updated_at });
}

/* ── POST: update URL ──────────────────────────── */
export async function POST(req: NextRequest) {
  const session = getAdminSession();
  if (!session) return unauthorised();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawUrl = (body as { url?: unknown }).url;
  if (typeof rawUrl !== 'string') {
    return NextResponse.json({ error: 'Field "url" must be a string.' }, { status: 400 });
  }

  const validationError = validateDestinationUrl(rawUrl);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  const cleanUrl = normaliseUrl(rawUrl);

  // Upsert row with id=1 (we always use a single row)
  const { error } = await supabaseAdmin
    .from('qr_destination')
    .upsert(
      { id: 1, url: cleanUrl, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('[POST /api/destination]', error);
    return NextResponse.json({ error: 'Failed to save URL to database.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: cleanUrl });
}
