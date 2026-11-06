'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeItem, DashboardStats, QRThemeConfig, DotStyle, EyeStyle, FrameStyle, CenterIconType } from '@/lib/types';
import { THEME_PRESETS, DEFAULT_THEME } from '@/lib/qr-themes';
import { validateDestinationUrl, normaliseUrl } from '@/lib/validate';

interface Props {
  initialQrs: QRCodeItem[];
  initialStats: DashboardStats;
  appUrl: string;
  adminUsername: string;
}

export default function DashboardClient({
  initialQrs,
  initialStats,
  appUrl,
  adminUsername,
}: Props) {
  const router = useRouter();

  const [qrs, setQrs] = useState<QRCodeItem[]>(initialQrs);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loggingOut, setLoggingOut] = useState(false);

  // Quick Code Lookup State
  const [lookupInput, setLookupInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Directory Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  // Active / Selected QR Modal State
  const [selectedQR, setSelectedQR] = useState<QRCodeItem | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editTheme, setEditTheme] = useState<QRThemeConfig>(DEFAULT_THEME);
  const [savingDest, setSavingDest] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [modalMsg, setModalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalFieldError, setModalFieldError] = useState('');
  const [svgPreview, setSvgPreview] = useState<string>('');
  const [loadingSvg, setLoadingSvg] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newPreset, setNewPreset] = useState('midnight');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Print Card Modal State
  const [printQR, setPrintQR] = useState<QRCodeItem | null>(null);
  const [printSvg, setPrintSvg] = useState<string>('');

  // Global Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Global Escape key listener to close any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedQR(null);
        setIsCreateOpen(false);
        setPrintQR(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* ── Open Manager for a QR item ──────────────── */
  const openQRManager = useCallback((item: QRCodeItem) => {
    setSelectedQR(item);
    setEditUrl(item.destination);
    setEditLabel(item.label);
    setEditTheme({ ...DEFAULT_THEME, ...(item.theme || {}) });
    setModalMsg(null);
    setModalFieldError('');
    setLookupError(null);
  }, []);

  /* ── Fetch SVG Preview for active theme ──────── */
  useEffect(() => {
    if (!selectedQR) return;

    let active = true;
    setLoadingSvg(true);

    const redirectUrl = `${appUrl}/r/${encodeURIComponent(selectedQR.code)}`;

    fetch('/api/qr-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: redirectUrl,
        theme: editTheme,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (active && data.svg) {
          setSvgPreview(data.svg);
        }
      })
      .catch((err) => console.error('Failed to load SVG preview:', err))
      .finally(() => {
        if (active) setLoadingSvg(false);
      });

    return () => {
      active = false;
    };
  }, [selectedQR, editTheme, appUrl]);

  /* ── Quick Code Lookup Handler ───────────────── */
  const handleCodeLookup = async (codeToSearch?: string) => {
    const rawCode = (codeToSearch ?? lookupInput).trim().toUpperCase();
    if (!rawCode) {
      setLookupError('Please enter a code to search.');
      return;
    }

    setLookupError(null);

    // 1. Search locally
    const foundLocal = qrs.find((q) => q.code.toUpperCase() === rawCode);
    if (foundLocal) {
      openQRManager(foundLocal);
      setLookupInput('');
      return;
    }

    // 2. Fetch from API if not yet in state
    try {
      const res = await fetch(`/api/qr-codes/${encodeURIComponent(rawCode)}`);
      const data = await res.json();

      if (res.ok && data.qr) {
        setQrs((prev) => [data.qr, ...prev.filter((i) => i.code !== data.qr.code)]);
        openQRManager(data.qr);
        setLookupInput('');
      } else {
        setLookupError(`Code "${rawCode}" does not match any existing QR.`);
      }
    } catch {
      setLookupError('Network error while looking up code.');
    }
  };

  /* ── Save Destination URL ────────────────────── */
  const handleSaveDestination = async () => {
    if (!selectedQR) return;
    setModalFieldError('');
    setModalMsg(null);

    const err = validateDestinationUrl(editUrl);
    if (err) {
      setModalFieldError(err);
      return;
    }

    const clean = normaliseUrl(editUrl);
    setSavingDest(true);

    try {
      const res = await fetch(`/api/qr-codes/${encodeURIComponent(selectedQR.code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: clean,
          label: editLabel.trim() || selectedQR.label,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalMsg({ type: 'error', text: data.error || 'Failed to update destination.' });
      } else {
        const updated = data.qr;
        setQrs((prev) => prev.map((item) => (item.code === updated.code ? updated : item)));
        setSelectedQR(updated);
        setEditUrl(updated.destination);
        setEditLabel(updated.label);
        setModalMsg({ type: 'success', text: `Destination URL updated! Future scans of code ${updated.code} will redirect here.` });
        if (data.stats) setStats(data.stats);
      }
    } catch {
      setModalMsg({ type: 'error', text: 'Network error. Could not save URL.' });
    } finally {
      setSavingDest(false);
    }
  };

  /* ── Save Theme & Styling ────────────────────── */
  const handleSaveTheme = async () => {
    if (!selectedQR) return;
    setModalMsg(null);
    setSavingTheme(true);

    try {
      const res = await fetch(`/api/qr-codes/${encodeURIComponent(selectedQR.code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: editTheme }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalMsg({ type: 'error', text: data.error || 'Failed to save theme.' });
      } else {
        const updated = data.qr;
        setQrs((prev) => prev.map((item) => (item.code === updated.code ? updated : item)));
        setSelectedQR(updated);
        setModalMsg({ type: 'success', text: 'Custom design & theme saved successfully!' });
      }
    } catch {
      setModalMsg({ type: 'error', text: 'Network error while saving theme.' });
    } finally {
      setSavingTheme(false);
    }
  };

  /* ── Toggle QR Active State ──────────────────── */
  const handleToggleActive = async (item: QRCodeItem) => {
    const nextState = !item.is_active;

    try {
      const res = await fetch(`/api/qr-codes/${encodeURIComponent(item.code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextState }),
      });

      const data = await res.json();
      if (res.ok && data.qr) {
        setQrs((prev) => prev.map((q) => (q.code === item.code ? data.qr : q)));
        if (selectedQR && selectedQR.code === item.code) {
          setSelectedQR(data.qr);
        }
        if (data.stats) setStats(data.stats);
        setToast({
          type: 'success',
          text: `QR code ${item.code} is now ${nextState ? 'ACTIVE' : 'PAUSED'}.`,
        });
      }
    } catch {
      setToast({ type: 'error', text: 'Failed to toggle status.' });
    }
  };

  /* ── Create New QR ───────────────────────────── */
  const handleCreateNew = async () => {
    setCreateError('');
    if (!newLabel.trim()) {
      setCreateError('Customer / Campaign label is required.');
      return;
    }

    const valErr = validateDestinationUrl(newUrl);
    if (valErr) {
      setCreateError(valErr);
      return;
    }

    setCreating(true);

    try {
      const presetTheme = THEME_PRESETS[newPreset] || DEFAULT_THEME;
      const res = await fetch('/api/qr-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.trim(),
          code: newCode.trim() || undefined,
          destination: normaliseUrl(newUrl),
          theme: presetTheme,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create QR code.');
      } else {
        setQrs((prev) => [data.qr, ...prev]);
        if (data.stats) setStats(data.stats);
        setIsCreateOpen(false);
        setNewLabel('');
        setNewCode('');
        setNewUrl('');
        openQRManager(data.qr);
        setToast({ type: 'success', text: `Created new QR for ${data.qr.label} (Code: ${data.qr.code})!` });
      }
    } catch {
      setCreateError('Network error while creating QR code.');
    } finally {
      setCreating(false);
    }
  };

  /* ── Delete QR ───────────────────────────────── */
  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete QR code "${code}"? Any printed scans will no longer work.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/qr-codes/${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        setQrs((prev) => prev.filter((q) => q.code !== code));
        if (selectedQR && selectedQR.code === code) {
          setSelectedQR(null);
        }
        if (data.stats) setStats(data.stats);
        setToast({ type: 'success', text: `Deleted QR code "${code}".` });
      } else {
        alert(data.error || 'Failed to delete QR.');
      }
    } catch {
      alert('Network error while deleting QR.');
    }
  };

  /* ── Download Handler ────────────────────────── */
  const handleDownload = async (item: QRCodeItem, format: 'png' | 'svg', size = 800) => {
    const { code } = item;
    setDownloading(true);
    try {
      const endpoint = `/api/qr-svg/${encodeURIComponent(code)}?download=true`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Download failed');

      let blob = await res.blob();
      if (format === 'png') {
        const imageUrl = URL.createObjectURL(blob);
        try {
          const image = new Image();
          image.src = imageUrl;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = Math.round(size * image.height / image.width);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas is unavailable');
          context.fillStyle = item.theme?.bgColor || '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG conversion failed')), 'image/png'));
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeLabel = item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'customer';
      a.download = format === 'png' ? `${safeLabel}-${code.toLowerCase()}-${size}px.png` : `${safeLabel}-${code.toLowerCase()}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  /* ── Open Print Sheet ────────────────────────── */
  const handleOpenPrint = (item: QRCodeItem) => {
    setPrintQR(item);
    const redirectUrl = `${appUrl}/r/${encodeURIComponent(item.code)}`;

    fetch('/api/qr-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: redirectUrl,
        theme: item.theme || DEFAULT_THEME,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.svg) setPrintSvg(data.svg);
      });
  };

  /* ── Copy Helper ─────────────────────────────── */
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  /* ── Sign Out ────────────────────────────────── */
  const handleSignOut = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  /* ── Filtered List ───────────────────────────── */
  const filteredQrs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return qrs.filter((item) => {
      const matchesSearch =
        !q ||
        item.code.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.destination.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'paused' && !item.is_active);

      return matchesSearch && matchesStatus;
    }).sort((a, b) => (b.scan_count || 0) - (a.scan_count || 0));
  }, [qrs, searchQuery, statusFilter]);

  function formatDate(iso: string | null | undefined) {
    if (!iso) return 'Never';
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Bar ───────────────────────────────── */}
      <header className="top-bar">
        <div className="row" style={{ gap: '0.85rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className="col" style={{ gap: 0 }}>
            <div className="row" style={{ gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#f8fafc' }}>
                Dynamic QR Manager <span style={{ color: 'var(--accent)' }}>Pro</span>
              </span>
              <span className="tag tag-live">Multi-Customer</span>
            </div>
            <span className="muted" style={{ fontSize: '0.72rem' }}>
              Central Admin Control & Real-time Redirection
            </span>
          </div>
        </div>

        <div className="row" style={{ gap: '0.85rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              const randCode = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
              setNewCode(randCode);
              setNewLabel('');
              setNewUrl('');
              setCreateError('');
              setIsCreateOpen(true);
            }}
          >
            <span>+ Create Customer QR</span>
          </button>

          <div
            style={{
              height: 24,
              width: 1,
              background: 'var(--border)',
            }}
          />

          <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
            👤 {adminUsername}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleSignOut}
            disabled={loggingOut}
          >
            {loggingOut ? <span className="spinner" /> : 'Sign out'}
          </button>
        </div>
      </header>

      {/* ── Main Layout ───────────────────────────── */}
      <main style={{ maxWidth: 1140, margin: '0 auto', width: '100%', padding: '2rem 1.25rem', flex: 1 }}>
        {/* Global Toast */}
        {toast && (
          <div className={`alert alert-${toast.type}`} style={{ marginBottom: '1.25rem' }}>
            <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
            <span>{toast.text}</span>
          </div>
        )}

        {/* ── Hero Customer Code Lookup Bar ─────── */}
        <section className="hero-lookup-card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: '0.2rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--accent)' }}>🔍</span> Customer Code Quick Lookup
              </h2>
              <p style={{ fontSize: '0.85rem' }}>
                When a customer asks to change their destination URL, enter their unique code below to instantly inspect, update, or customize their QR.
              </p>
            </div>
            <span className="tag tag-blue" style={{ fontSize: '0.72rem' }}>
              Instant URL Routing
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCodeLookup();
            }}
            className="lookup-input-group"
          >
            <input
              type="text"
              placeholder="ENTER UNIQUE CODE (E.G. CAFE-901, VIP-778)..."
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minWidth: 160, padding: '0 1.5rem', fontSize: '0.95rem' }}
            >
              ⚡ Manage QR
            </button>
          </form>

          {lookupError && (
            <div className="alert alert-error" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
              <span>⚠</span>
              <span>{lookupError}</span>
            </div>
          )}

          {/* Quick chips of active customer codes */}
          <div className="row" style={{ marginTop: '0.85rem', gap: '0.45rem', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '0.75rem' }}>Quick select:</span>
            {qrs.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                className="code-pill"
                style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
                onClick={() => handleCodeLookup(item.code)}
                title={`Manage ${item.label}`}
              >
                {item.code} ({item.label.split(' ')[0]})
              </button>
            ))}
          </div>
        </section>

        {/* ── Stats Cards Strip ─────────────────── */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Customer QRs</span>
            <span className="stat-val" style={{ color: '#38bdf8' }}>{stats.totalQRs}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Scans Recorded</span>
            <span className="stat-val" style={{ color: '#10b981' }}>{stats.totalScans}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active Redirections</span>
            <span className="stat-val" style={{ color: '#a78bfa' }}>{stats.activeQRs} / {stats.totalQRs}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Top Scanned Code</span>
            <span className="stat-val" style={{ fontSize: '1.25rem', color: '#fbbf24' }}>
              {stats.topScannedCode ? `${stats.topScannedCode} · ${qrs.find((q) => q.code === stats.topScannedCode)?.scan_count || 0} scans` : 'No scans yet'}
            </span>
          </div>
        </div>

        {/* ── Customers Directory ───────────────── */}
        <section className="card" style={{ padding: '1.5rem' }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div className="col" style={{ gap: '0.2rem' }}>
              <h2>Customer QR Codes Directory</h2>
              <p>Each unique code is permanently bound to its printed QR. You can update its destination URL or design at any time.</p>
            </div>

            {/* Filter buttons */}
            <div className="row" style={{ gap: '0.5rem' }}>
              <div className="option-pill-group" style={{ margin: 0 }}>
                {(['all', 'active', 'paused'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`option-pill ${statusFilter === s ? 'active' : ''}`}
                    onClick={() => setStatusFilter(s)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search bar inside directory */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search by customer name, unique code, or destination URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.65rem 0.95rem' }}
            />
          </div>

          {/* Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer / Label</th>
                  <th>Current Destination URL</th>
                  <th>Theme & Style</th>
                  <th>Scans</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQrs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
                      No QR codes found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredQrs.map((item) => (
                    <tr key={item.id}>
                      {/* Code Badge */}
                      <td>
                        <div className="row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
                          <span className="code-pill">{item.code}</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem' }}
                            onClick={() => copyToClipboard(item.code, `code-${item.code}`)}
                            title="Copy code"
                          >
                            {copiedCode === `code-${item.code}` ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>

                      {/* Customer Label */}
                      <td>
                        <strong style={{ color: '#f8fafc', display: 'block' }}>{item.label}</strong>
                        <span className="muted" style={{ fontSize: '0.72rem' }}>
                          Updated {formatDate(item.updated_at)}
                        </span>
                      </td>

                      {/* Destination URL */}
                      <td style={{ maxWidth: 260 }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--accent)',
                            fontFamily: 'var(--mono)',
                            fontSize: '0.8rem',
                          }}
                          title={item.destination}
                        >
                          {item.destination}
                        </div>
                        <span className="muted" style={{ fontSize: '0.7rem' }}>
                          Redirects: /r/{item.code}
                        </span>
                      </td>

                      {/* Theme Indicator */}
                      <td>
                        <div className="row" style={{ gap: '0.4rem' }}>
                          <span
                            className="theme-dot"
                            style={{
                              background: item.theme?.fgColor || '#000',
                              border: `2px solid ${item.theme?.bgColor || '#fff'}`,
                            }}
                          />
                          <span style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}>
                            {item.theme?.preset || 'Custom'}
                          </span>
                        </div>
                      </td>

                      {/* Scans */}
                      <td>
                        <span style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--mono)' }}>
                          {item.scan_count || 0}
                        </span>
                        <div className="muted" style={{ fontSize: '0.7rem' }}>
                          Last: {formatDate(item.last_scanned_at)}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`tag ${item.is_active ? 'tag-live' : 'tag-paused'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title="Click to toggle active/paused"
                        >
                          {item.is_active ? '● Active' : '⏸ Paused'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openQRManager(item)}
                          >
                            ✎ Manage & Theme
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenPrint(item)}
                            title="Print Card"
                          >
                            🖨️
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDownload(item.code, 'png', 1200)}
                            title="Download PNG"
                          >
                            📥
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(item.code)}
                            title="Delete QR"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════ */}
      {/* ── MODAL: QR Manager & Customizer ──────────── */}
      {/* ══════════════════════════════════════════════ */}
      {selectedQR && (
        <div className="modal-overlay" onClick={() => setSelectedQR(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 940 }}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="row" style={{ gap: '0.65rem' }}>
                <span className="code-pill" style={{ fontSize: '0.9rem' }}>
                  {selectedQR.code}
                </span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc' }}>
                  {editLabel || selectedQR.label}
                </span>
                <span className={`tag ${selectedQR.is_active ? 'tag-live' : 'tag-paused'}`}>
                  {selectedQR.is_active ? 'Active' : 'Paused'}
                </span>
              </div>

              <div className="row" style={{ gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleOpenPrint(selectedQR)}
                >
                  🖨️ Print Sheet
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '1rem', padding: '0.3rem 0.6rem' }}
                  onClick={() => setSelectedQR(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Split 2 columns */}
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
              {/* ── Left Column: Destination URL & Details ── */}
              <div className="col" style={{ gap: '1.2rem' }}>
                {modalMsg && (
                  <div className={`alert alert-${modalMsg.type}`} style={{ margin: 0 }}>
                    <span>{modalMsg.type === 'success' ? '✓' : '⚠'}</span>
                    <span>{modalMsg.text}</span>
                  </div>
                )}

                {/* Destination URL Field */}
                <div className="card" style={{ padding: '1.25rem', background: 'var(--surface-2)' }}>
                  <div className="field" style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="modal-dest-url" style={{ color: '#fff', fontSize: '0.85rem' }}>
                      Redirect Destination URL (Where scans go)
                    </label>
                    <input
                      id="modal-dest-url"
                      type="url"
                      value={editUrl}
                      onChange={(e) => {
                        setEditUrl(e.target.value);
                        setModalFieldError('');
                      }}
                      className={modalFieldError ? 'error' : ''}
                      placeholder="https://example.com/customer-page"
                    />
                    {modalFieldError && (
                      <span style={{ color: 'var(--error)', fontSize: '0.78rem' }}>
                        {modalFieldError}
                      </span>
                    )}
                  </div>

                  <div className="field" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem' }}>Customer / Campaign Label</label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Customer Name"
                    />
                  </div>

                  <div className="row" style={{ gap: '0.6rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={handleSaveDestination}
                      disabled={savingDest}
                    >
                      {savingDest ? <span className="spinner" /> : '💾 Save Destination URL'}
                    </button>

                    <a
                      href={editUrl.startsWith('http') ? editUrl : `https://${editUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.8rem' }}
                      title="Test destination in new tab"
                    >
                      🔗 Test Link
                    </a>
                  </div>
                </div>

                {/* Permanent Link Info */}
                <div className="col" style={{ gap: '0.35rem' }}>
                  <label className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    Permanent Scan URL (Encoded inside this QR code):
                  </label>
                  <div className="row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
                    <div className="url-display highlight" style={{ flex: 1, margin: 0 }}>
                      {`${appUrl}/r/${selectedQR.code}`}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyToClipboard(`${appUrl}/r/${selectedQR.code}`, 'modal-url')}
                    >
                      {copiedCode === 'modal-url' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <span className="muted" style={{ fontSize: '0.72rem' }}>
                    This URL never changes. When printed, you can redirect it anywhere, anytime.
                  </span>
                </div>

                {/* Stats & Status */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.65rem',
                    background: 'var(--surface-2)',
                    padding: '0.9rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <span className="muted" style={{ fontSize: '0.7rem' }}>Total Scans</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>
                      {selectedQR.scan_count || 0}
                    </div>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: '0.7rem' }}>Last Scanned</span>
                    <div style={{ fontSize: '0.78rem', color: '#f1f5f9' }}>
                      {formatDate(selectedQR.last_scanned_at)}
                    </div>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: '0.7rem' }}>Status</span>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(selectedQR)}
                        className={`tag ${selectedQR.is_active ? 'tag-live' : 'tag-paused'}`}
                        style={{ cursor: 'pointer', border: 'none', marginTop: '0.2rem' }}
                      >
                        {selectedQR.is_active ? 'Active' : 'Paused'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="col" style={{ gap: '0.45rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)' }}>
                    Export & Download High Resolution
                  </label>
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDownload(selectedQR, 'png', 800)}
                      disabled={downloading}
                    >
                      PNG 800px
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleDownload(selectedQR, 'png', 1200)}
                      disabled={downloading}
                    >
                      PNG 1200px (Print)
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDownload(selectedQR, 'svg')}
                      disabled={downloading}
                    >
                      SVG (Vector)
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Right Column: QR Theme & Visual Customizer ── */}
              <div className="col" style={{ gap: '1.2rem', alignItems: 'center' }}>
                {/* Live SVG Preview Box */}
                <div
                  style={{
                    width: 240,
                    height: 240,
                    borderRadius: 16,
                    padding: 8,
                    background: editTheme.bgColor || '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border)',
                    position: 'relative',
                  }}
                >
                  {loadingSvg && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span className="spinner" />
                    </div>
                  )}

                  {svgPreview ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: svgPreview }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <img
                      src={`/api/qr-image/${encodeURIComponent(selectedQR.code)}?size=400`}
                      alt="QR preview"
                      width={220}
                      height={220}
                      style={{ display: 'block', borderRadius: 8 }}
                    />
                  )}
                </div>

                {/* Theme Customizer Controls */}
                <div className="card" style={{ width: '100%', padding: '1.1rem', background: 'var(--surface-2)' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <h3 style={{ fontSize: '0.88rem' }}>🎨 Theme & Design Presets</h3>
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={handleSaveTheme}
                      disabled={savingTheme}
                    >
                      {savingTheme ? <span className="spinner" /> : '✓ Save Theme'}
                    </button>
                  </div>

                  {/* Preset chips */}
                  <div className="theme-picker-grid">
                    {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        className={`theme-chip ${editTheme.preset === key ? 'active' : ''}`}
                        onClick={() => {
                          setEditTheme((prev) => ({
                            ...prev,
                            ...preset,
                            preset: key,
                            frameText: prev.frameText || preset.frameText,
                          }));
                        }}
                      >
                        <span
                          className="theme-dot"
                          style={{
                            background: preset.fgColor,
                            border: `2px solid ${preset.bgColor}`,
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                          {key}
                        </span>
                      </button>
                    ))}
                  </div>

                  <hr className="divider" style={{ margin: '0.85rem 0' }} />

                  {/* Dot Style & Eye Shape Pickers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="muted" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                        Dot Pattern
                      </label>
                      <div className="option-pill-group">
                        {(['squares', 'rounded', 'dots'] as DotStyle[]).map((ds) => (
                          <button
                            key={ds}
                            type="button"
                            className={`option-pill ${editTheme.dotStyle === ds ? 'active' : ''}`}
                            onClick={() => setEditTheme((prev) => ({ ...prev, dotStyle: ds }))}
                            style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem', textTransform: 'capitalize' }}
                          >
                            {ds}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="muted" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                        Corner Eyes
                      </label>
                      <div className="option-pill-group">
                        {(['square', 'rounded', 'circle'] as EyeStyle[]).map((es) => (
                          <button
                            key={es}
                            type="button"
                            className={`option-pill ${editTheme.eyeStyle === es ? 'active' : ''}`}
                            onClick={() => setEditTheme((prev) => ({ ...prev, eyeStyle: es }))}
                            style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem', textTransform: 'capitalize' }}
                          >
                            {es}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Frame & Banner Banner */}
                  <div style={{ marginTop: '0.85rem' }}>
                    <label className="muted" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                      Frame Style & Banner
                    </label>
                    <div className="option-pill-group">
                      {(['none', 'banner-bottom', 'banner-top'] as FrameStyle[]).map((fs) => (
                        <button
                          key={fs}
                          type="button"
                          className={`option-pill ${editTheme.frameStyle === fs ? 'active' : ''}`}
                          onClick={() => setEditTheme((prev) => ({ ...prev, frameStyle: fs }))}
                          style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem' }}
                        >
                          {fs === 'none' ? 'No Frame' : fs === 'banner-bottom' ? 'Bottom Banner' : 'Top Banner'}
                        </button>
                      ))}
                    </div>

                    {editTheme.frameStyle !== 'none' && (
                      <input
                        type="text"
                        value={editTheme.frameText || ''}
                        onChange={(e) => setEditTheme((prev) => ({ ...prev, frameText: e.target.value }))}
                        placeholder="Banner text (e.g. SCAN ME, VISIT MENU)"
                        style={{ marginTop: '0.45rem', fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}
                      />
                    )}
                  </div>

                  {/* Center Icon */}
                  <div style={{ marginTop: '0.85rem' }}>
                    <label className="muted" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                      Center Badge Icon or Customer Logo
                    </label>
                    <div className="option-pill-group">
                      {(['none', 'globe', 'store', 'coffee', 'utensils', 'star', 'link', 'phone'] as CenterIconType[]).map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className={`option-pill ${editTheme.centerIcon === icon ? 'active' : ''}`}
                          onClick={() => setEditTheme((prev) => ({ ...prev, centerIcon: icon }))}
                          style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem', textTransform: 'capitalize' }}
                        >
                          {icon === 'none' ? 'None' : icon}
                        </button>
                      ))}
                    </div>
                    <div className="row" style={{ gap: '0.5rem', marginTop: '0.45rem' }}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        aria-label="Upload customer logo for QR center badge"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 256 * 1024) {
                            setModalMsg({ type: 'error', text: 'Logo must be 256 KB or smaller.' });
                            e.currentTarget.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setEditTheme((prev) => ({ ...prev, centerLogo: reader.result as string, centerIcon: 'none' }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        style={{ fontSize: '0.72rem', minWidth: 0 }}
                      />
                      {editTheme.centerLogo && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditTheme((prev) => ({ ...prev, centerLogo: undefined }))}>
                          Remove logo
                        </button>
                      )}
                    </div>
                    <span className="muted" style={{ fontSize: '0.68rem' }}>PNG, JPG or WebP; max 256 KB. Save design to apply.</span>
                  </div>

                  {/* Custom Colors */}
                  <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                    <div className="col" style={{ flex: 1, gap: '0.2rem' }}>
                      <span className="muted" style={{ fontSize: '0.7rem' }}>Dots Color</span>
                      <div className="row" style={{ gap: '0.3rem' }}>
                        <input
                          type="color"
                          value={editTheme.fgColor}
                          onChange={(e) => setEditTheme((prev) => ({ ...prev, fgColor: e.target.value }))}
                          style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>{editTheme.fgColor}</span>
                      </div>
                    </div>

                    <div className="col" style={{ flex: 1, gap: '0.2rem' }}>
                      <span className="muted" style={{ fontSize: '0.7rem' }}>Background</span>
                      <div className="row" style={{ gap: '0.3rem' }}>
                        <input
                          type="color"
                          value={editTheme.bgColor}
                          onChange={(e) => setEditTheme((prev) => ({ ...prev, bgColor: e.target.value }))}
                          style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>{editTheme.bgColor}</span>
                      </div>
                    </div>

                    <div className="col" style={{ flex: 1, gap: '0.2rem' }}>
                      <span className="muted" style={{ fontSize: '0.7rem' }}>Corner Eyes</span>
                      <div className="row" style={{ gap: '0.3rem' }}>
                        <input
                          type="color"
                          value={editTheme.eyeColor || editTheme.fgColor}
                          onChange={(e) => setEditTheme((prev) => ({ ...prev, eyeColor: e.target.value }))}
                          style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>{editTheme.eyeColor || editTheme.fgColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ── MODAL: Create New Customer QR ───────────── */}
      {/* ══════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc' }}>
                Create New Customer QR
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsCreateOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body col" style={{ gap: '1rem' }}>
              {createError && (
                <div className="alert alert-error">
                  <span>⚠</span>
                  <span>{createError}</span>
                </div>
              )}

              <div className="field">
                <label>Customer or Campaign Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Bella Italia Bistro, Acme Flyer..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="field">
                <label>Unique Code (Identifier for customer)</label>
                <div className="row" style={{ gap: '0.5rem', flexWrap: 'nowrap' }}>
                  <input
                    type="text"
                    placeholder="e.g. BISTRO-101"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setNewCode('CUST-' + Math.floor(1000 + Math.random() * 9000))}
                    title="Generate random code"
                  >
                    🎲 Random
                  </button>
                </div>
                <span className="muted" style={{ fontSize: '0.72rem' }}>
                  This code will be printed or encoded: {appUrl}/r/{newCode || 'CODE'}
                </span>
              </div>

              <div className="field">
                <label>Destination URL (Where scans redirect) *</label>
                <input
                  type="url"
                  placeholder="https://example.com/menu"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Starting Theme Preset</label>
                <div className="theme-picker-grid">
                  {Object.entries(THEME_PRESETS).slice(0, 4).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      className={`theme-chip ${newPreset === key ? 'active' : ''}`}
                      onClick={() => setNewPreset(key)}
                    >
                      <span
                        className="theme-dot"
                        style={{
                          background: preset.fgColor,
                          border: `2px solid ${preset.bgColor}`,
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                        {key}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="row" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleCreateNew}
                  disabled={creating}
                >
                  {creating ? <span className="spinner" /> : 'Create QR Code'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ── MODAL: Printable Customer Sheet ─────────── */}
      {/* ══════════════════════════════════════════════ */}
      {printQR && (
        <div className="modal-overlay" onClick={() => setPrintQR(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540 }}
          >
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                Printable QR Display Card
              </span>
              <div className="row" style={{ gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.print()}
                >
                  🖨️ Print (Ctrl+P)
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPrintQR(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
              {/* Target printable card */}
              <div
                className="print-card-target"
                style={{
                  background: '#fff',
                  color: '#000',
                  padding: '2.5rem 2rem',
                  borderRadius: 16,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  display: 'inline-block',
                  maxWidth: 380,
                  width: '100%',
                }}
              >
                <h2 style={{ color: '#0f172a', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {printQR.label}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Scan with your mobile camera
                </p>

                <div
                  style={{
                    width: 240,
                    height: 240,
                    margin: '0 auto 1.25rem',
                  }}
                  dangerouslySetInnerHTML={{ __html: printSvg }}
                />

                <div
                  style={{
                    background: '#f1f5f9',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 8,
                    padding: '0.5rem 0.75rem',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.82rem',
                    color: '#334155',
                    marginBottom: '0.5rem',
                  }}
                >
                  Customer Code: <strong>{printQR.code}</strong>
                </div>

                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Dynamic redirect: {appUrl}/r/{printQR.code}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
