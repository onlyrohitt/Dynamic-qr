'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { validateDestinationUrl, normaliseUrl } from '@/lib/validate';

interface Props {
  initialUrl: string | null;
  initialUpdatedAt: string | null;
  redirectUrl: string;
  adminUsername: string;
}

export default function DashboardClient({
  initialUrl,
  initialUpdatedAt,
  redirectUrl,
  adminUsername,
}: Props) {
  const router = useRouter();

  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [editValue, setEditValue] = useState(initialUrl ?? '');
  const [isEditing, setIsEditing] = useState(!initialUrl); // open editor if no URL yet
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldError, setFieldError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /* ── Save new URL ────────────────────────────── */
  async function handleSave() {
    setFieldError('');
    setSaveMsg(null);

    const validationError = validateDestinationUrl(editValue);
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    const cleanUrl = normaliseUrl(editValue);
    setSaving(true);

    try {
      const res = await fetch('/api/destination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSaveMsg({ type: 'error', text: data.error ?? 'Failed to save URL.' });
      } else {
        setCurrentUrl(data.url);
        setUpdatedAt(new Date().toISOString());
        setIsEditing(false);
        setSaveMsg({ type: 'success', text: 'Destination URL updated. All future scans will go to the new URL.' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Network error. Check your connection.' });
    } finally {
      setSaving(false);
    }
  }

  /* ── Download QR PNG ─────────────────────────── */
  const handleDownload = useCallback(async (size: number) => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/qr-code?size=${size}`);
      if (!res.ok) throw new Error('Failed to generate QR code');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dynamic-qr-${size}px.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setSaveMsg({ type: 'error', text: 'Could not download QR code. Try again.' });
    } finally {
      setDownloading(false);
    }
  }, []);

  /* ── Logout ──────────────────────────────────── */
  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  /* ── Format date ─────────────────────────────── */
  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div className="top-bar">
        <div className="row" style={{ gap: '0.75rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dynamic QR Manager</span>
          <span className="tag tag-live">Live</span>
        </div>
        <div className="row" style={{ gap: '0.6rem' }}>
          <span className="muted" style={{ fontSize: '0.78rem' }}>
            {adminUsername}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? <span className="spinner" /> : 'Sign out'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        className="page-shell"
        style={{ paddingTop: '2rem', paddingBottom: '2rem', alignItems: 'stretch', maxWidth: '860px', margin: '0 auto', width: '100%' }}
      >
        {saveMsg && (
          <div
            className={`alert alert-${saveMsg.type}`}
            role="alert"
            style={{ marginBottom: '1rem' }}
          >
            <span>{saveMsg.type === 'success' ? '✓' : '⚠'}</span>
            <span>{saveMsg.text}</span>
          </div>
        )}

        <div className="dashboard">
          {/* ── Left column: URL manager ── */}
          <div className="card" style={{ gridColumn: '1' }}>
            <div className="col" style={{ marginBottom: '1rem' }}>
              <h2>Destination URL</h2>
              <p>Where the QR code redirects to. Change this any time — the printed QR code stays the same.</p>
            </div>

            <hr className="divider" />

            <div className="field">
              <label>Current destination</label>
              {currentUrl ? (
                <div className="url-display highlight">{currentUrl}</div>
              ) : (
                <div className="alert alert-info" style={{ marginTop: 0 }}>
                  <span>ℹ</span>
                  <span>No destination URL set. Add one below.</span>
                </div>
              )}
              {updatedAt && (
                <span className="muted">Last updated: {formatDate(updatedAt)}</span>
              )}
            </div>

            {!isEditing ? (
              <button
                className="btn btn-ghost"
                style={{ marginTop: '0.5rem' }}
                onClick={() => {
                  setEditValue(currentUrl ?? '');
                  setIsEditing(true);
                  setFieldError('');
                  setSaveMsg(null);
                }}
              >
                ✎ Change destination
              </button>
            ) : (
              <div className="col" style={{ marginTop: '0.5rem' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="dest-url">New destination URL</label>
                  <input
                    id="dest-url"
                    type="url"
                    placeholder="https://example.com/your-page"
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      setFieldError('');
                    }}
                    className={fieldError ? 'error' : ''}
                    disabled={saving}
                    autoFocus
                  />
                  {fieldError && (
                    <span style={{ color: 'var(--error)', fontSize: '0.8rem' }}>
                      {fieldError}
                    </span>
                  )}
                </div>

                <div className="row" style={{ marginTop: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner" /> Saving…
                      </>
                    ) : (
                      'Save destination'
                    )}
                  </button>
                  {currentUrl && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setFieldError('');
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            <hr className="divider" />

            <div className="col" style={{ gap: '0.3rem' }}>
              <label className="muted" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                Permanent redirect URL (encoded in QR)
              </label>
              <div className="url-display">{redirectUrl}</div>
              <span className="muted">
                This URL never changes — safe to print and distribute.
              </span>
            </div>
          </div>

          {/* ── Right column: QR code ── */}
          <div className="card" style={{ gridColumn: '2', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem', width: '100%', textAlign: 'left' }}>
              <h2>Your QR Code</h2>
              <p>Print this once. Change the destination as many times as you want.</p>
            </div>

            <hr className="divider" style={{ width: '100%' }} />

            {/* Live QR preview via img tag */}
            <div className="qr-wrapper" style={{ marginBottom: '0.5rem' }}>
              <img
                src="/api/qr-code?size=400"
                alt="QR code pointing to your redirect URL"
                width={220}
                height={220}
                style={{ display: 'block' }}
              />
            </div>

            <span className="muted" style={{ marginBottom: '1rem', fontSize: '0.75rem' }}>
              Scan to test → {redirectUrl}
            </span>

            <div className="col" style={{ width: '100%', gap: '0.5rem' }}>
              <label className="muted" style={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'left' }}>
                Download for printing
              </label>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDownload(800)}
                  disabled={downloading}
                >
                  800px
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => handleDownload(1200)}
                  disabled={downloading}
                >
                  {downloading ? (
                    <>
                      <span className="spinner" /> Generating…
                    </>
                  ) : (
                    '1200px (print)'
                  )}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDownload(2000)}
                  disabled={downloading}
                >
                  2000px
                </button>
              </div>
              <span className="muted" style={{ fontSize: '0.72rem' }}>
                Error correction level H — survives print wear & partial damage.
              </span>
            </div>
          </div>
        </div>

        {/* Info strip */}
        <div
          className="card"
          style={{ marginTop: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '1rem 1.5rem' }}
        >
          <InfoItem
            icon="🔄"
            title="How it works"
            body="The QR encodes your /r URL. Every scan hits your server, which looks up the current destination in Supabase and issues a 302 redirect."
          />
          <InfoItem
            icon="🔒"
            title="Security"
            body="Only you can change the destination. Credentials are validated server-side and never exposed to the browser."
          />
          <InfoItem
            icon="☁️"
            title="Always on"
            body="Deployed to Vercel — the QR keeps working even when your PC is off. See DEPLOYMENT.md."
          />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
      <div style={{ marginBottom: '0.2rem', fontSize: '0.8rem', fontWeight: 600 }}>
        {icon} {title}
      </div>
      <p style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}
