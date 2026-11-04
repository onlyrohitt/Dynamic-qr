import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { getAllQRs, getDashboardStats } from '@/lib/qr-storage';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { title: 'Dynamic QR Manager Pro – Multi-Customer Admin' };

export default async function DashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const [qrs, stats] = await Promise.all([
    getAllQRs(),
    getDashboardStats(),
  ]);

  return (
    <DashboardClient
      initialQrs={qrs}
      initialStats={stats}
      appUrl={appUrl}
      adminUsername={session}
    />
  );
}
