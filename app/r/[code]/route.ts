/**
 * GET /r/[code]
 * Dynamic redirect & multi-link selection route for customer QR codes.
 *
 * 1. Looks up the QR by unique code.
 * 2. Increments the scan analytics.
 * 3. If WhatsApp or Instagram links are configured, displays a responsive, modern
 *    landing screen with three options:
 *      - Option 1: Destination Link / Website
 *      - Option 2: WhatsApp
 *      - Option 3: Instagram
 *    If only the primary destination URL is configured, immediately redirects (302).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getQRByCode, incrementScan } from '@/lib/qr-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = (params?.code || '').trim();

  if (!code) {
    return new NextResponse(renderStatusHtml({
      title: 'Missing Code',
      badge: 'Bad Request',
      badgeColor: '#ef4444',
      message: 'No QR code was provided in the request.',
      code: 'N/A',
    }), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const item = await getQRByCode(code);

    if (!item) {
      return new NextResponse(renderStatusHtml({
        title: 'QR Code Not Found',
        badge: 'Invalid Code',
        badgeColor: '#ef4444',
        message: `No active destination exists for code: "${code}". If you own this QR code, please contact your administrator.`,
        code,
      }), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (!item.is_active) {
      return new NextResponse(renderStatusHtml({
        title: 'QR Code Paused',
        badge: 'Temporarily Inactive',
        badgeColor: '#f59e0b',
        message: `This QR code ("${item.label}") has been paused by the administrator. Please check back later.`,
        code: item.code,
      }), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Increment scan analytics in background
    incrementScan(item.code).catch((err) =>
      console.error(`[r/${item.code}] Failed to increment scan count:`, err)
    );

    const hasMultiLinks = Boolean(item.whatsapp_url || item.instagram_url);

    // If WhatsApp or Instagram is present, present the 3-link interactive landing page
    if (hasMultiLinks) {
      return new NextResponse(renderMultiLinkHtml({
        label: item.label,
        code: item.code,
        destination: item.destination,
        whatsapp_url: item.whatsapp_url || undefined,
        instagram_url: item.instagram_url || undefined,
        theme: item.theme,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      });
    }

    // Otherwise, direct single 302 redirect to the destination URL
    let destinationUrl: URL;
    try {
      destinationUrl = new URL(item.destination);
      if (destinationUrl.protocol !== 'http:' && destinationUrl.protocol !== 'https:') {
        throw new Error(`Unsupported protocol: ${destinationUrl.protocol}`);
      }
    } catch (err) {
      console.error(`[r/${item.code}] Invalid destination URL "${item.destination}":`, err);
      return new NextResponse(renderStatusHtml({
        title: 'Invalid Destination',
        badge: 'Configuration Error',
        badgeColor: '#ef4444',
        message: `This QR code ("${item.label}") points to a destination that isn't a valid URL. Please ask the administrator to fix it in the dashboard.`,
        code: item.code,
      }), {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Issue 302 temporary redirect (never cached by browsers)
    return NextResponse.redirect(destinationUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err) {
    console.error(`[r/${code}] Redirect error:`, err);
    return new NextResponse(renderStatusHtml({
      title: 'Redirect Server Error',
      badge: 'Error',
      badgeColor: '#ef4444',
      message: 'An unexpected error occurred while resolving this destination URL.',
      code,
    }), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMultiLinkHtml({
  label,
  code,
  destination,
  whatsapp_url,
  instagram_url,
  theme,
}: {
  label: string;
  code: string;
  destination: string;
  whatsapp_url?: string;
  instagram_url?: string;
  theme?: any;
}) {
  const safeLabel = escapeHtml(label);
  const safeCode = escapeHtml(code);
  const safeDest = escapeHtml(destination);
  const safeWa = whatsapp_url ? escapeHtml(whatsapp_url) : '';
  const safeIg = instagram_url ? escapeHtml(instagram_url) : '';

  const fgColor = theme?.fgColor || '#38bdf8';
  const bgColor = theme?.bgColor || '#0b0f19';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <title>${safeLabel} – Connect</title>
  <meta name="theme-color" content="#0b0f19" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0b0f19;
      background-image: 
        radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.08) 0px, transparent 50%);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
    }
    .container {
      max-width: 420px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .profile-card {
      width: 100%;
      text-align: center;
      margin-bottom: 2rem;
    }
    .avatar {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.25rem;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 25px rgba(56, 189, 248, 0.35);
      border: 3px solid rgba(255, 255, 255, 0.15);
      overflow: hidden;
    }
    .avatar svg {
      width: 40px;
      height: 40px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      margin-bottom: 0.6rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin-bottom: 0.35rem;
      line-height: 1.25;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.88rem;
    }
    .links-group {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .link-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 1.1rem 1.25rem;
      border-radius: 16px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
      position: relative;
      overflow: hidden;
    }
    .link-btn:active {
      transform: scale(0.98);
    }
    .link-btn .left {
      display: flex;
      align-items: center;
      gap: 0.95rem;
    }
    .link-btn .icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .link-btn .icon-circle svg {
      width: 24px;
      height: 24px;
    }
    .link-btn .text-col {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .link-btn .btn-title {
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.2;
    }
    .link-btn .btn-desc {
      font-size: 0.78rem;
      opacity: 0.8;
      margin-top: 0.15rem;
    }
    .link-btn .arrow-icon {
      opacity: 0.6;
      transition: transform 0.2s;
    }
    .link-btn:hover .arrow-icon {
      opacity: 1;
      transform: translateX(3px);
    }

    /* Option 1: Destination / Website */
    .btn-website {
      background: #111827;
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #ffffff;
    }
    .btn-website .icon-circle {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }
    .btn-website:hover {
      background: #1e293b;
      border-color: #38bdf8;
      box-shadow: 0 6px 20px rgba(56, 189, 248, 0.25);
    }

    /* Option 2: WhatsApp */
    .btn-whatsapp {
      background: #0f241a;
      border: 1px solid rgba(37, 211, 102, 0.35);
      color: #ffffff;
    }
    .btn-whatsapp .icon-circle {
      background: #25D366;
      color: #ffffff;
    }
    .btn-whatsapp:hover {
      background: #143527;
      border-color: #25D366;
      box-shadow: 0 6px 20px rgba(37, 211, 102, 0.28);
    }

    /* Option 3: Instagram */
    .btn-instagram {
      background: #210d19;
      border: 1px solid rgba(225, 48, 108, 0.35);
      color: #ffffff;
    }
    .btn-instagram .icon-circle {
      background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
      color: #ffffff;
    }
    .btn-instagram:hover {
      background: #311425;
      border-color: #e1306c;
      box-shadow: 0 6px 20px rgba(225, 48, 108, 0.28);
    }

    .footer {
      margin-top: 2.5rem;
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="profile-card">
      <div class="avatar">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </div>
      <div class="badge">${safeCode}</div>
      <h1>${safeLabel}</h1>
      <p class="subtitle">Choose an option below to continue</p>
    </div>

    <div class="links-group">
      <!-- Option 1: Main Destination Link -->
      <a href="${safeDest}" class="link-btn btn-website" rel="noopener noreferrer">
        <div class="left">
          <div class="icon-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <div class="text-col">
            <span class="btn-title">Visit Website</span>
            <span class="btn-desc">Open destination link</span>
          </div>
        </div>
        <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </a>

      <!-- Option 2: WhatsApp -->
      ${safeWa ? `
      <a href="${safeWa}" class="link-btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
        <div class="left">
          <div class="icon-circle">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </div>
          <div class="text-col">
            <span class="btn-title">WhatsApp</span>
            <span class="btn-desc">Chat on WhatsApp</span>
          </div>
        </div>
        <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </a>` : ''}

      <!-- Option 3: Instagram -->
      ${safeIg ? `
      <a href="${safeIg}" class="link-btn btn-instagram" target="_blank" rel="noopener noreferrer">
        <div class="left">
          <div class="icon-circle">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <div class="text-col">
            <span class="btn-title">Instagram</span>
            <span class="btn-desc">Follow on Instagram</span>
          </div>
        </div>
        <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </a>` : ''}
    </div>

    <div class="footer">
      <span>Dynamic QR Powered Service</span>
    </div>
  </div>
</body>
</html>`;
}

function renderStatusHtml({
  title,
  badge,
  badgeColor,
  message,
  code,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  message: string;
  code: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title} – Dynamic QR</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0b0f19;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 2.5rem 2rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: ${badgeColor}20;
      color: ${badgeColor};
      border: 1px solid ${badgeColor}40;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.45rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: #f8fafc;
    }
    p {
      color: #94a3b8;
      font-size: 0.92rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .code-box {
      background: #1e293b;
      border: 1px dashed #334155;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.88rem;
      color: #38bdf8;
      display: inline-block;
      margin-bottom: 1.5rem;
    }
    .footer {
      font-size: 0.75rem;
      color: #64748b;
      border-top: 1px solid #1e293b;
      padding-top: 1.25rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${badge}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="code-box">Code: ${code}</div>
    <div class="footer">Dynamic QR Code Routing Service</div>
  </div>
</body>
</html>`;
}
