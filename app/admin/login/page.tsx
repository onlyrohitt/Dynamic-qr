import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata = { title: 'Admin Login – Dynamic QR Manager Pro' };

export default function LoginPage() {
  const session = getAdminSession();
  if (session) redirect('/admin/dashboard');

  return (
    <div className="page-shell">
      <div className="card" style={{ maxWidth: 460 }}>
        <div className="col" style={{ marginBottom: '1.75rem', textAlign: 'center', alignItems: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.4)',
              marginBottom: '0.75rem',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>Dynamic QR Manager Pro</h1>
          <p style={{ fontSize: '0.85rem' }}>Central Multi-Customer Administration Portal</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
