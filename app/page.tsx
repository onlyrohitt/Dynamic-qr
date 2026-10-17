import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';

/**
 * Root "/" redirects:
 * - Logged-in admin  →  /admin/dashboard
 * - Everyone else    →  /admin/login
 */
export default function RootPage() {
  const session = getAdminSession();
  if (session) {
    redirect('/admin/dashboard');
  } else {
    redirect('/admin/login');
  }
}
