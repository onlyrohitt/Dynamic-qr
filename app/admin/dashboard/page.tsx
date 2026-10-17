import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard – Dynamic QR' };

export default async function DashboardPage() {
  // Server-side auth guard
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectUrl = `${appUrl}/r`;

  // Pre-fetch current destination for instant render
  const { data } = await supabaseAdmin
    .from('qr_destination')
    .select('url, updated_at')
    .eq('id', 1)
    .maybeSingle();

  return (
    <DashboardClient
      initialUrl={data?.url ?? null}
      initialUpdatedAt={data?.updated_at ?? null}
      redirectUrl={redirectUrl}
      adminUsername={session}
    />
  );
}
