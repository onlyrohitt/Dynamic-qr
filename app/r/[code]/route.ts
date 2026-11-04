/**
 * GET /r/[code]
 * Dynamic redirect route for customer QR codes.
 *
 * 1. Looks up the QR by unique code.
 * 2. Increments the scan analytics.
 * 3. Issues an immediate 302 redirect (uncached) to the customer's destination URL.
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

    // Issue 302 temporary redirect (never cached by browsers)
    return NextResponse.redirect(item.destination, {
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
