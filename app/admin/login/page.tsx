import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata = { title: 'Admin Login – Dynamic QR' };

export default function LoginPage() {
  // Already logged in? Go straight to dashboard
  const session = getAdminSession();
  if (session) redirect('/admin/dashboard');

  return (
    <div className="page-shell">
      <div className="card">
        <div className="col" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <h1>Admin Login</h1>
          </div>
          <p>Sign in to manage your QR code destination.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
