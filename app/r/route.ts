/**
 * GET /r
 *
 * This is the URL that gets encoded into the QR code.
 * It reads the current destination from Supabase and issues a 302 redirect.
 *
 * WHY 302 (temporary) and NOT 301 (permanent)?
 *   301 redirects are cached by browsers indefinitely.
 *   If we used 301, scanning the QR after changing the URL would
 *   still go to the OLD destination from the browser cache.
 *   302 is never cached, so every scan hits this server fresh.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('qr_destination')
      .select('url')
      .eq('id', 1)
      .single();

    if (error || !data?.url) {
      // Fallback if DB not set up yet
      return NextResponse.json(
        { error: 'Destination URL not configured. Log in to set one.' },
        { status: 503 }
      );
    }

    return NextResponse.redirect(data.url, {
      status: 302,
      headers: {
        // Explicitly prevent all caching
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err) {
    console.error('[/r] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
